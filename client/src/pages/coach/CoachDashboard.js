import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../config/axios';
import Avatar from '../../components/Avatar';
import LoadingSpinner from '../../components/LoadingSpinner';
import DressCodeExamples from '../../components/DressCodeExamples';
import {
  BuildingOfficeIcon,
  BriefcaseIcon,
  PhoneIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon,
  CalendarIcon,
  ClipboardDocumentListIcon,
  EnvelopeIcon,
  ChartBarIcon,
  ClockIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';

const CoachDashboard = () => {
  // 分頁狀態（已移除搜尋）
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  // const navigate = useNavigate();

  const { user, isCoach: isCoachCtx } = useAuth();
  const iAmCoach = !!(isCoachCtx && isCoachCtx());

  // 資料狀態（教練視圖）
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coachees, setCoachees] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalMembers: 0, limit });

  // 進度概況
  const [progressById, setProgressById] = useState({});
  // 已移除未使用的 progressLoading 以清理警告
  const [selectedMember, setSelectedMember] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const canPrev = useMemo(() => page > 1, [page]);

  // 12張卡片進度條邏輯
  const totalCards = 12; // 總共12張卡片
  const progressPercentage = ((currentCardIndex + 1) / totalCards) * 100;

  // 進度條組件
  const ProgressBar = ({ current, total, className = "" }) => {
    const percentage = (current / total) * 100;
    
    return (
      <div className={`w-full ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gold-300">學習進度</span>
          <span className="text-sm text-gold-400">{current}/{total}</span>
        </div>
        <div className="w-full bg-primary-700 rounded-full h-2.5">
          <div 
            className="bg-gradient-to-r from-gold-500 to-gold-400 h-2.5 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gold-500">已完成 {Math.round(percentage)}%</span>
          <span className="text-xs text-gold-500">剩餘 {total - current} 張</span>
        </div>
      </div>
    );
  };

  const canNext = useMemo(() => page < (pagination?.totalPages || 1), [page, pagination]);

  // 當選擇不同學員時重置卡片索引
  useEffect(() => {
    setCurrentCardIndex(0);
  }, [selectedMember?.id]);

  // Modal 內操作狀態
  const [actionLoading, setActionLoading] = useState(false);
  
  // 專案計劃狀態
  const [projectPlans, setProjectPlans] = useState({});
  const [projectPlanLoading, setProjectPlanLoading] = useState({});
  // 任務統計狀態
  const [taskStats, setTaskStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0 });
  const [statsLoading, setStatsLoading] = useState(false);


  // 學員視圖（非教練）
  const [myTasks, setMyTasks] = useState([]);
  const [myTasksLoading, setMyTasksLoading] = useState(false);
  const [myCoach, setMyCoach] = useState(null);
  const [myTaskUpdating, setMyTaskUpdating] = useState({}); // { [taskId]: true }
  const [myCoachLogs, setMyCoachLogs] = useState([]);
  
  // 卡片勾選狀態管理 - 添加持久化
  const [checklistStates, setChecklistStates] = useState(() => {
    const saved = localStorage.getItem('coachDashboardChecklistStates');
    return saved ? JSON.parse(saved) : {};
  });
  
  // 核心會員狀態
  const [coreMembers, setCoreMembers] = useState([]);
  const [coreMembersLoading, setCoreMembersLoading] = useState(false);
  
  // 幹部會員狀態
  const [staffMembers, setStaffMembers] = useState([]);
  const [staffMembersLoading, setStaffMembersLoading] = useState(false);
  
  // 更新勾選框狀態 - 添加持久化
  const updateCheckboxState = (memberId, itemId, detailId, newState) => {
    const key = `${memberId}_${itemId}_${detailId}`;
    const newStates = {
      ...checklistStates,
      [key]: newState
    };
    setChecklistStates(newStates);
    localStorage.setItem('coachDashboardChecklistStates', JSON.stringify(newStates));
  };
  
  // 獲取勾選框狀態
  const getCheckboxState = (memberId, itemId, detailId, defaultState = false) => {
    const key = `${memberId}_${itemId}_${detailId}`;
    return checklistStates[key] !== undefined ? checklistStates[key] : defaultState;
  };

  // 處理勾選項目 - 添加持久化
  const handleChecklistToggle = (cardId, itemId) => {
    const newStates = {
      ...checklistStates,
      [cardId]: {
        ...checklistStates[cardId],
        [itemId]: !checklistStates[cardId]?.[itemId]
      }
    };
    setChecklistStates(newStates);
    localStorage.setItem('coachDashboardChecklistStates', JSON.stringify(newStates));
  };

  // 複製郵件模板
  const copyEmailTemplate = (template, memberName = '學員姓名', coachName = user?.name || '教練姓名', coachIndustry = user?.industry || '教練行業') => {
    const emailContent = template
      .replace(/OO/g, memberName)
      .replace(/{memberName}/g, memberName)
      .replace(/{coachName}/g, coachName)
      .replace(/{coachIndustry}/g, coachIndustry);
    
    navigator.clipboard.writeText(emailContent).then(() => {
      toast.success('郵件內容已複製到剪貼板');
    }).catch(() => {
      toast.error('複製失敗，請手動複製');
    });
  };

  // 發送郵件 - 使用 GBC 系統
  const sendEmail = async (template, memberEmail, memberName = '學員姓名', coachName = user?.name || '教練姓名', coachIndustry = user?.industry || '教練行業') => {
    // 調試：檢查 selectedMember 的完整內容
    console.log('調試 selectedMember:', selectedMember);
    console.log('調試 memberEmail:', memberEmail);
    console.log('調試 selectedMember?.email:', selectedMember?.email);
    
    // 驗證必要參數
    if (!memberEmail) {
      toast.error('無法發送郵件：學員信箱地址不存在');
      return;
    }
    
    if (!template) {
      toast.error('無法發送郵件：郵件模板內容為空');
      return;
    }
    
    const emailContent = template
      .replace(/{memberName}/g, memberName)
      .replace(/{coachName}/g, coachName)
      .replace(/{coachIndustry}/g, coachIndustry);
    
    try {
      // 使用 GBC 系統發送郵件
      const response = await axios.post('/api/emails/send', {
        to: memberEmail,
        subject: 'GBC新會員歡迎信',
        content: emailContent,
        type: 'welcome'
      });
      
      toast.success('郵件已通過 GBC 系統發送');
    } catch (error) {
      console.error('發送郵件失敗:', error);
      
      // 顯示具體的錯誤信息
      const errorMessage = error.response?.data?.message || '郵件發送失敗';
      toast.error(`發送失敗：${errorMessage}`);
      
      // 如果 GBC 系統發送失敗，回退到 mailto
      const subject = 'GBC新會員歡迎信';
      const mailtoLink = `mailto:${memberEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(emailContent)}`;
      window.open(mailtoLink);
      toast.warning('已打開郵件客戶端作為備用方案');
    }
  };

  const getMembershipLevelBadge = (level) => {
    const badges = {
      1: { text: '核心', class: 'level-1' },
      2: { text: '幹部', class: 'level-2' },
      3: { text: '會員', class: 'level-3' }
    };
    const badge = badges[level] || { text: '未設定', class: 'bg-gray-500' };
    return (
      <span className={`badge ${badge.class} text-xs px-2 py-1 rounded-full font-medium`}>
        {badge.text}
      </span>
    );
  };

  const fetchCoachees = async () => {
    try {
      setLoading(true);
      setError('');
      const params = { page, limit };
      
      const resp = await axios.get('/api/users/my-coachees', { params });
      const data = resp.data || {};
      setCoachees(Array.isArray(data.coachees) ? data.coachees : []);
      setPagination(data.pagination || { currentPage: page, totalPages: 1, totalMembers: 0, limit });
    } catch (e) {
      console.error('載入學員列表失敗:', e);
      setError(e.response?.data?.message || '載入學員列表失敗');
      setCoachees([]);
      setPagination({ currentPage: 1, totalPages: 1, totalMembers: 0, limit });
    } finally {
      setLoading(false);
    }
  };

  const fetchTaskStats = async () => {
    try {
      setStatsLoading(true);
      const resp = await axios.get('/api/users/my-coachees/task-stats');
      const s = resp.data || {};
      setTaskStats({
        total: Number(s.total || 0),
        pending: Number(s.pending || 0),
        inProgress: Number(s.inProgress || 0),
        completed: Number(s.completed || 0),
        overdue: Number(s.overdue || 0)
      });
    } catch (e) {
      console.error('載入任務統計失敗:', e);
    } finally {
      setStatsLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      const resp = await axios.get('/api/users/my-coachees/progress');
      const list = resp.data?.progress || [];
      const map = {};
      list.forEach(item => {
        if (item && item.userId != null) map[item.userId] = item;
      });
      setProgressById(map);
    } catch (e) {
      console.error('載入進度概況失敗:', e);
    } finally {
      // no-op
    }
  };

  // 非教練視圖：載入自己的任務與教練資訊
  const fetchMyView = async () => {
    if (!user?.id) return;
    setMyTasksLoading(true);
    try {
      // 取得自己的任務
      const tResp = await axios.get(`/api/users/member/${user.id}/onboarding-tasks`);
      setMyTasks(Array.isArray(tResp.data?.tasks) ? tResp.data.tasks : []);

      // 取得教練公開資訊（若有教練）
      if (user.coachUserId) {
        try {
          const cResp = await axios.get(`/api/users/${user.coachUserId}/public`);
          setMyCoach(cResp.data?.user || null);
        } catch (err) {
          console.warn('取得教練公開資訊失敗或不存在');
          setMyCoach({ id: user.coachUserId });
        }
      } else {
        setMyCoach(null);
      }

      // 取得教練紀錄（唯讀）
      try {
        const lResp = await axios.get(`/api/users/member/${user.id}/coach-logs`);
        setMyCoachLogs(Array.isArray(lResp.data?.logs) ? lResp.data.logs : []);
      } catch (err) {
        console.warn('取得教練紀錄失敗');
        setMyCoachLogs([]);
      }
    } catch (e) {
      console.error('載入我的任務失敗:', e);
      setMyTasks([]);
      setMyCoachLogs([]);
    } finally {
      setMyTasksLoading(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    if (!taskId) return;
    setMyTaskUpdating(prev => ({ ...prev, [taskId]: true }));
    try {
      const p = axios.put(`/api/users/onboarding-tasks/${taskId}`, { status });
      await toast.promise(p, {
        loading: '更新任務中…',
        success: status === 'completed' ? '任務已完成' : '已更新任務狀態',
        error: (err) => err?.response?.data?.message || '更新任務失敗'
      }, {
        id: `task-${taskId}`,
        duration: 4000,
        style: { background: '#1f2937', color: '#fde68a', border: '1px solid #b45309' }
      });
      await fetchMyView();
    } catch (e) {
      // 錯誤已由 toast 顯示
    } finally {
      setMyTaskUpdating(prev => ({ ...prev, [taskId]: false }));
    }
  };

  // 獲取核心會員名單
  const fetchCoreMembers = async () => {
    try {
      setCoreMembersLoading(true);
      const resp = await axios.get('/api/users/core-members');
      setCoreMembers(resp.data?.coreMembers || []);
    } catch (e) {
      console.error('載入核心會員名單失敗:', e);
      setCoreMembers([]);
    } finally {
      setCoreMembersLoading(false);
    }
  };

  // 獲取幹部會員名單
  const fetchStaffMembers = async () => {
    try {
      setStaffMembersLoading(true);
      const resp = await axios.get('/api/users/staff-members');
      setStaffMembers(resp.data?.staffMembers || []);
    } catch (e) {
      console.error('載入幹部會員名單失敗:', e);
      setStaffMembers([]);
    } finally {
      setStaffMembersLoading(false);
    }
  };

  useEffect(() => {
    if (iAmCoach) return;
    fetchMyView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iAmCoach, user?.id, user?.coachUserId]);

  useEffect(() => {
    if (!iAmCoach) return;
    fetchCoachees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, iAmCoach]);

  useEffect(() => {
    if (!iAmCoach) return;
    fetchTaskStats();
    fetchProgress();
    fetchCoreMembers();
    fetchStaffMembers();
  }, [iAmCoach]);

    const visibleCoachees = useMemo(() => {
    let list = Array.isArray(coachees) ? [...coachees] : [];
    return list;
  }, [coachees, progressById]);

  // Modal 內動作
  const closeModal = () => {
    setSelectedMember(null);
  };

  // 獲取專案計劃
  const fetchProjectPlan = async (memberId) => {
    if (projectPlans[memberId] || projectPlanLoading[memberId]) return;
    
    setProjectPlanLoading(prev => ({ ...prev, [memberId]: true }));
    try {
      const response = await axios.get(`/api/users/member/${memberId}/project-plan`);
      setProjectPlans(prev => ({ ...prev, [memberId]: response.data }));
    } catch (error) {
      console.error('獲取專案計劃失敗:', error);
      setProjectPlans(prev => ({ ...prev, [memberId]: null }));
    } finally {
      setProjectPlanLoading(prev => ({ ...prev, [memberId]: false }));
    }
  };



  // 更新會員狀態
  const updateMemberStatus = async (memberId, newStatus) => {
    setActionLoading(true);
    try {
      await axios.put(`/api/admin/users/${memberId}/status`, { status: newStatus });
      toast.success(`會員狀態已更新為${newStatus === 'active' ? '活躍' : '非活躍'}`);
      // 更新本地狀態
      setCoachees(prev => prev.map(member => 
        member.id === memberId ? { ...member, status: newStatus } : member
      ));
      if (selectedMember && selectedMember.id === memberId) {
        setSelectedMember(prev => ({ ...prev, status: newStatus }));
      }
    } catch (error) {
      console.error('更新會員狀態失敗:', error);
      toast.error(error.response?.data?.message || '更新會員狀態失敗');
    } finally {
      setActionLoading(false);
    }
  };

  const progressSummary = (memberId) => {
    const p = progressById[memberId] || {};
    const prog = p?.progress || {};
    const percent = Math.round(Number(prog?.overallPercent ?? 0));
    const profileScore = Number(prog?.profileScore ?? 0);
    const systemScore = Number(prog?.systemScore ?? 0);
    const bonusMbti = Number(prog?.bonusMbti ?? 0);
    return { p, percent, profileScore, systemScore, bonusMbti };
  };

  // 非教練視圖：僅顯示教練資訊
  if (!iAmCoach) {
    return (
      <div className="space-y-6">
        <div className="bg-primary-800 border border-gold-600 rounded-lg p-3 sm:p-6 shadow-elegant">
          <h1 className="text-xl sm:text-2xl font-semibold text-gold-100">教練專區</h1>
          <p className="mt-2 text-gold-300">此頁面僅供教練使用。</p>
        </div>

        <div className="bg-primary-800 border border-gold-600 rounded-lg p-3 sm:p-6">
          <div className="flex items-center justify-between mb-2 sm:mb-4">
            <h2 className="text-lg sm:text-xl font-medium text-gold-100">教練資訊</h2>
          </div>

          {/* 教練資訊 */}
          <div className="mb-2 sm:mb-4">
            <div className="text-sm text-gold-300 mb-2">我的教練：</div>
            {user?.coachUserId ? (
              myCoach ? (
                <div className="flex items-center gap-2 sm:gap-3">
                  <Avatar src={myCoach.profilePictureUrl} alt={myCoach.name} size="small" />
                  <div>
                    <div className="text-sm text-gold-100 font-semibold">{myCoach.name || `ID: ${myCoach.id}`}</div>
                    {myCoach.email && (
                      <div className="text-sm sm:text-xs text-gold-300 flex items-center gap-1">
                        <EnvelopeIcon className="h-3.5 w-3.5" />
                        <a href={`mailto:${myCoach.email}`} className="hover:underline text-gold-200">{myCoach.email}</a>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gold-300">載入中…</div>
              )
            ) : (
              <span className="text-xs px-2 py-1 rounded-full bg-gray-700 text-gray-200">指派教練中</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-primary-800 border border-gold-600 rounded-lg p-3 sm:p-6 shadow-elegant">
        <h1 className="text-xl sm:text-2xl font-semibold text-gold-100">教練儀表板</h1>
        <p className="mt-2 text-gold-300">歡迎來到教練專區。您可以在此查看並管理指派給您的學員。</p>
      </div>

      

      {/* 搜尋列 */}
      <div className="bg-primary-800 border border-gold-600 rounded-lg p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <label className="text-sm text-gold-200">排序</label>
            
            
          </div>
        </div>
        
      </div>

      {/* 學員列表 */}
      <div className="bg-primary-800 border border-gold-600 rounded-lg p-3 sm:p-6">
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-medium text-gold-100">我的學員</h2>
          <div className="text-sm text-gold-300">
            共 {pagination?.totalMembers || 0} 位
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <LoadingSpinner size="large" />
          </div>
        ) : error ? (
          <div className="text-red-300">{error}</div>
        ) : coachees.length === 0 ? (
          <div className="text-center py-12">
            <EyeIcon className="mx-auto h-12 w-12 text-gold-400" />
            <h3 className="mt-2 text-base sm:text-sm font-medium text-gold-100">尚未有指派的學員</h3>
            <p className="mt-1 text-sm text-gold-300">當管理員為會員指派您為教練後，名單將顯示於此。</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:p-4 sm:gap-3 sm:p-6">
              {visibleCoachees.map((member) => {
                const { p, percent } = progressSummary(member.id);
                const missing = {
                  interview: !(p?.hasInterview),
                  mbti: !(p?.hasMbtiType),
                  nfc: !(p?.hasNfcCard),
                  foundation: !(p?.foundationViewed)
                };
                return (
                  <div key={member.id} className="card hover:shadow-lg transition-shadow duration-200 cursor-pointer relative" onClick={() => {
                  setSelectedMember(member);
                  fetchProjectPlan(member.id);
                }}>
                    <div className="p-3 sm:p-4">
                                                {/* 核心會員名單 */}
                                                {item.type === 'core_members_list' && (
                                                  <div className="mt-3">
                                                    {item.loading ? (
                                                      <div className="text-xs text-gold-400">載入核心會員名單中...</div>
                                                    ) : item.coreMembers && item.coreMembers.length > 0 ? (
                                                      <div className="space-y-2">
                                                        <div className="text-sm sm:text-xs text-gold-300 font-semibold">核心會員名單：</div>
                                                        <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                                                          {item.coreMembers.map((member, memberIndex) => (
                                                            <div key={member.id || memberIndex} className="flex items-center justify-between bg-primary-800/40 p-2 rounded border border-gold-700/30">
                                                              <div className="flex items-center space-x-2">
                                                                <Avatar 
                                                                  src={member.profilePicture} 
                                                                  name={member.name} 
                                                                  size="sm" 
                                                                />
                                                                <div>
                                                                  <div className="text-sm sm:text-xs text-gold-300 font-medium">{member.name}</div>
                                                                  <div className="text-[10px] text-gold-500">{member.industry || member.company}</div>
                                                                </div>
                                                              </div>
                                                              <button
                                                                onClick={() => handleChecklistToggle(currentCard.id, `core_member_${member.id}`)}
                                                                className={`w-4 h-4 rounded border transition-colors ${
                                                                  checklistStates[currentCard.id]?.[`core_member_${member.id}`] 
                                                                    ? 'bg-green-500 border-green-500' 
                                                                    : 'border-gold-400 hover:border-gold-300'
                                                                }`}
                                                              >
                                                                {checklistStates[currentCard.id]?.[`core_member_${member.id}`] && (
                                                                  <CheckCircleIcon className="h-3 w-3 text-white" />
                                                                )}
                                                              </button>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <div className="text-xs text-gold-500">暫無核心會員資料</div>
                                                    )}
                                                  </div>
                                                )}
                                                {/* 干部會員名單 */}
                                                {item.type === 'staff_members_list' && (
                                                  <div className="mt-3">
                                                    {staffMembersLoading ? (
                                                      <div className="text-xs text-gold-400">載入干部會員名單中...</div>
                                                    ) : staffMembers && staffMembers.length > 0 ? (
                                                      <div className="space-y-2">
                                                        <div className="text-xs text-purple-300 font-semibold">干部會員名單：</div>
                                                        <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                                                          {staffMembers.map((member, memberIndex) => (
                                                            <div key={member.id || memberIndex} className="flex items-center justify-between bg-primary-800/40 p-2 rounded border border-purple-700/30">
                                                              <div className="flex items-center space-x-2">
                                                                <Avatar 
                                                                  src={member.profilePicture} 
                                                                  name={member.name} 
                                                                  size="sm" 
                                                                />
                                                                <div>
                                                                  <div className="text-xs text-purple-300 font-medium">{member.name}</div>
                                                                  <div className="text-[10px] text-purple-500">{member.industry || member.company}</div>
                                                                </div>
                                                              </div>
                                                              <button
                                                                onClick={() => handleChecklistToggle(currentCard.id, `staff_member_${member.id}`)}
                                                                className={`w-4 h-4 rounded border transition-colors ${
                                                                  checklistStates[currentCard.id]?.[`staff_member_${member.id}`] 
                                                                    ? 'bg-green-500 border-green-500' 
                                                                    : 'border-purple-400 hover:border-purple-300'
                                                                }`}
                                                              >
                                                                {checklistStates[currentCard.id]?.[`staff_member_${member.id}`] && (
                                                                  <CheckCircleIcon className="h-3 w-3 text-white" />
                                                                )}
                                                              </button>
                                                            </div>
                                                          ))}
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <div className="text-xs text-purple-500">暫無干部會員資料</div>
                                                    )}
                                                  </div>
                                        )}
                                    </div>
                                  </div>
                                )}

                                {/* 詳細信息列表 */}
                                  {/* 詳細信息列表：暫時移除以隔離語法錯誤 */}

                                {/* 郵件模板和發信功能 */}
                                {currentCard.emailTemplate && (
                                  <div className="mt-4 p-3 sm:p-4 bg-primary-600/30 rounded-lg border border-gold-600/30">
                                    <div className="text-sm text-gold-300 mb-2 font-semibold">郵件模板：</div>
                                    <div className="text-xs text-gold-400 mb-2 sm:mb-3 leading-relaxed whitespace-pre-line bg-primary-800/50 p-3 rounded border max-h-32 overflow-y-auto">
                                      {currentCard.emailTemplate}
                                    </div>
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => copyEmailTemplate(currentCard.emailTemplate, selectedMember?.name)}
                                        className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                                      >
                                        <ClipboardDocumentListIcon className="h-4 w-4" />
                                        一鍵複製
                                      </button>
                                      <button
                                        onClick={() => sendEmail(currentCard.emailTemplate, selectedMember?.email, selectedMember?.name)}
                                        className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                                      >
                                        <EnvelopeIcon className="h-4 w-4" />
                                        發送郵件
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <div className="text-sm px-3 py-2 rounded-full font-medium bg-gold-600/20 text-gold-200 border border-gold-600">
                                  {currentCard.category}
                                </div>
                              </div>
                            </div>
                            
                            {/* 狀態顯示 */}
                            {currentCard.completed && (
                              <div className="flex items-center justify-between">
                                <div className="text-base font-bold text-green-400">
                                  ✓ 已完成
                                </div>
                                <div className="text-sm text-green-300 font-medium">
                                  狀態良好
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* 頂部進度條 */}
                        <div className="mt-2">
                          <div className="w-full h-2 bg-primary-700/50 rounded-full border border-gold-700/50 overflow-hidden">
                            <div className="h-full bg-gold-500" style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }} />
                          </div>
                          <div className="mt-1 text-xs text-gold-300 text-right">
                            {Math.round(progressPercentage)}% ({currentCardIndex + 1} / {totalCards})
                          </div>
                        </div>

                        {/* 左右切換按鈕 */}
                        <button
                          onClick={prevCard}
                          className="absolute left-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary-600/90 border border-gold-600 flex items-center justify-center hover:bg-primary-500 transition-colors shadow-lg backdrop-blur-sm"
                        >
                          <ChevronLeftIcon className="h-5 w-5 text-gold-300" />
                        </button>
                        <button
                          onClick={nextCard}
                          className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary-600/90 border border-gold-600 flex items-center justify-center hover:bg-primary-500 transition-colors shadow-lg backdrop-blur-sm"
                        >
                          <ChevronRightIcon className="h-5 w-5 text-gold-300" />
                        </button>
                      </div>
                      
                      {/* 底部統計 */}
                      <div className="p-3 border-t border-gold-700/50 bg-primary-800/50">
                        <div className="flex items-center justify-between text-xs">
                          <div className="text-gold-300">
                            已完成: {attachmentItems.filter(item => item.completed).length} / {attachmentItems.length}
                          </div>
                          <div className="text-gold-400">
                            完成率: {Math.round((attachmentItems.filter(item => item.completed).length / attachmentItems.length) * 100)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 快捷操作 */}
              <div className="mt-6">
                {/* 快捷操作 */}
                <div className="text-xl font-bold text-gold-100 mb-2 sm:mb-3">快捷操作</div>
                


                {/* 快捷操作 */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={`/meetings?schedule_with=${selectedMember.id}`}
                    className="btn-secondary inline-flex items-center text-base px-4 py-2"
                  >
                    <CalendarIcon className="h-5 w-5 mr-1" /> 安排會議
                  </a>
                  <Link
                    to={`/members/${selectedMember.id}`}
                    className="btn-secondary text-base px-4 py-2"
                  >
                    查看詳情
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachDashboard;
