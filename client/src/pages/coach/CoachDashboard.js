import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../config/axios';
import Avatar from '../../components/Avatar';
import LoadingSpinner from '../../components/LoadingSpinner';
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
  EnvelopeIcon
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

  // 任務統計
  const [taskStats, setTaskStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0 });
  const [statsLoading, setStatsLoading] = useState(false);
  // 進度概況
  const [progressById, setProgressById] = useState({});
  // 已移除未使用的 progressLoading 以清理警告
  const [selectedMember, setSelectedMember] = useState(null);
  const [sortKey, setSortKey] = useState(() => localStorage.getItem('coachSortKey') || 'default'); // default | overdue_desc | meetings_desc
  const canPrev = useMemo(() => page > 1, [page]);
  const canNext = useMemo(() => page < (pagination?.totalPages || 1), [page, pagination]);

  // Modal 內操作狀態
  const [actionLoading, setActionLoading] = useState(false);
  const [quickTitle, setQuickTitle] = useState('');
  const [quickDue, setQuickDue] = useState('');

  // 學員視圖（非教練）
  const [myTasks, setMyTasks] = useState([]);
  const [myTasksLoading, setMyTasksLoading] = useState(false);
  const [myCoach, setMyCoach] = useState(null);
  const [myTaskUpdating, setMyTaskUpdating] = useState({}); // { [taskId]: true }
  const [myCoachLogs, setMyCoachLogs] = useState([]);

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
      // 套用排序參數（搜尋與舊篩選已移除）
      if (sortKey && sortKey !== 'default') params.sort = sortKey;

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

  useEffect(() => {
    if (iAmCoach) return;
    fetchMyView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [iAmCoach, user?.id, user?.coachUserId]);

  useEffect(() => {
    if (!iAmCoach) return;
    fetchCoachees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortKey, iAmCoach]);

  useEffect(() => {
    if (!iAmCoach) return;
    fetchTaskStats();
    fetchProgress();
  }, [iAmCoach]);

  // 持久化：排序（舊的兩個篩選已移除）
  useEffect(() => {
    try { localStorage.setItem('coachSortKey', sortKey || 'default'); } catch {}
  }, [sortKey]);

  const visibleCoachees = useMemo(() => {
    let list = Array.isArray(coachees) ? [...coachees] : [];

    // 排序
    if (sortKey === 'overdue_desc') {
      list.sort((a, b) => {
        const ao = Number(a?.taskCounts?.overdue ?? 0);
        const bo = Number(b?.taskCounts?.overdue ?? 0);
        return bo - ao;
      });
    } else if (sortKey === 'meetings_desc') {
      list.sort((a, b) => {
        const am = Number(progressById[a.id]?.meetingsCount ?? 0);
        const bm = Number(progressById[b.id]?.meetingsCount ?? 0);
        return bm - am;
      });
    }

    return list;
  }, [coachees, progressById, sortKey]);

  // Modal 內動作
  const closeModal = () => {
    setSelectedMember(null);
    setQuickTitle('');
    setQuickDue('');
  };

  const assignTask = async (title, dueDate) => {
    if (!selectedMember) return;
    if (actionLoading) return; // 防止重複按
    const t = (title || quickTitle || '').trim();
    if (!t) {
      toast.error('請輸入任務標題');
      return;
    }
    setActionLoading(true);
    try {
      const p = axios.post('/api/users/onboarding-tasks/bulk', {
        memberIds: [selectedMember.id],
        title: t,
        description: null,
        dueDate: dueDate || quickDue || undefined
      });
      await toast.promise(p, {
        loading: '指派任務中…',
        success: `已指派任務給 ${selectedMember?.name || '學員'}`,
        error: (err) => err?.response?.data?.message || '指派任務失敗'
      }, {
        id: 'assign-task',
        duration: 4000,
        style: { background: '#1f2937', color: '#fde68a', border: '1px solid #b45309' }
      });
      fetchTaskStats();
      // 不強制重新載入列表以省流量
    } catch (e) {
      console.error('指派任務失敗', e);
    } finally {
      setActionLoading(false);
    }
  };

  const createCoachLog = async (content) => {
    if (!selectedMember) return;
    const c = (content || '').trim();
    if (!c) return;
    setActionLoading(true);
    try {
      await axios.post(`/api/users/member/${selectedMember.id}/coach-logs`, { content: c });
      toast.success('教練紀錄已新增');
    } catch (e) {
      console.error('新增教練紀錄失敗', e);
      toast.error(e.response?.data?.message || '新增教練紀錄失敗');
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

  // 非教練視圖：我的任務進度
  if (!iAmCoach) {
    const total = myTasks.length;
    const completed = myTasks.filter(t => t.status === 'completed').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    return (
      <div className="space-y-6">
        <div className="bg-primary-800 border border-gold-600 rounded-lg p-6 shadow-elegant">
          <h1 className="text-2xl font-semibold text-gold-100">任務進度</h1>
          <p className="mt-2 text-gold-300">在此查看您目前的入職任務與教練資訊。</p>
        </div>

        <div className="bg-primary-800 border border-gold-600 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium text-gold-100">進度概覽</h2>
            {myTasksLoading && <span className="text-sm text-gold-300">載入中...</span>}
          </div>

          {/* 教練資訊 */}
          <div className="mb-4">
            <div className="text-sm text-gold-300 mb-2">我的教練：</div>
            {user?.coachUserId ? (
              myCoach ? (
                <div className="flex items-center gap-3">
                  <Avatar src={myCoach.profilePictureUrl} alt={myCoach.name} size="small" />
                  <div>
                    <div className="text-sm text-gold-100 font-semibold">{myCoach.name || `ID: ${myCoach.id}`}</div>
                    {myCoach.email && (
                      <div className="text-xs text-gold-300 flex items-center gap-1">
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

          {/* 進度條 */}
          <div>
            <div className="flex items-center justify-between">
              <div className="text-sm text-gold-300">完成度</div>
              <div className="text-sm text-gold-100 font-semibold">{percent}%</div>
            </div>
            <div className="w-full h-2 bg-primary-700 rounded mt-1">
              <div className={`h-2 rounded ${percent >= 80 ? 'bg-green-500' : percent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${percent}%` }} />
            </div>
            <div className="mt-1 text-[11px] text-gold-400">完成 {completed}/{total}</div>
          </div>
        </div>

        {/* 任務清單 */}
        <div className="bg-primary-800 border border-gold-600 rounded-lg p-6">
          <h2 className="text-xl font-medium text-gold-100 mb-3">我的任務</h2>
          {myTasksLoading ? (
            <div className="py-6"><LoadingSpinner /></div>
          ) : (
            <div className="space-y-2">
              {myTasks.length === 0 && (
                <div className="text-gold-300 text-sm">目前沒有任務</div>
              )}
              {myTasks.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 rounded-md border border-gold-700 bg-primary-700/40">
                  <div>
                    <div className="text-gold-100 font-medium">{t.title}</div>
                    <div className="text-xs text-gold-400">
                      狀態：{t.status === 'completed' ? '已完成' : t.status === 'in_progress' ? '進行中' : '待辦'}
                      {t.dueDate ? ` ・ 截止：${new Date(t.dueDate).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {t.status !== 'completed' ? (
                      <button
                        type="button"
                        className="btn-primary px-3 py-1.5 text-sm"
                        onClick={() => updateTaskStatus(t.id, 'completed')}
                        disabled={!!myTaskUpdating[t.id]}
                      >
                        {myTaskUpdating[t.id] ? '更新中…' : '標記完成'}
                      </button>
                    ) : (
                      <span className="text-xs px-2 py-1 rounded-full bg-green-700 text-green-100">已完成</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 教練紀錄（唯讀） */}
        <div className="bg-primary-800 border border-gold-600 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-medium text-gold-100">教練紀錄（唯讀）</h2>
          </div>
          {myTasksLoading ? (
            <div className="py-6"><LoadingSpinner /></div>
          ) : (
            <div className="space-y-3">
              {myCoachLogs.length === 0 && (
                <div className="text-gold-300 text-sm">尚無教練紀錄</div>
              )}
              {myCoachLogs.map(log => (
                <div key={log.id} className="p-3 rounded-md border border-gold-700 bg-primary-700/40">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gold-100 font-semibold">{log.coachName}</div>
                    <div className="text-[11px] text-gold-400">{new Date(log.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="mt-1 text-sm text-gold-200 whitespace-pre-wrap">{log.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-primary-800 border border-gold-600 rounded-lg p-6 shadow-elegant">
        <h1 className="text-2xl font-semibold text-gold-100">教練儀表板</h1>
        <p className="mt-2 text-gold-300">歡迎來到教練專區。您可以在此查看並管理指派給您的學員。</p>
      </div>

      {/* 任務統計 */}
      <div className="bg-primary-800 border border-gold-600 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium text-gold-100">待辦任務統計</h2>
          {statsLoading && <span className="text-sm text-gold-300">載入中...</span>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="card p-3 text-center">
            <div className="text-xs text-gold-300">總數</div>
            <div className="text-2xl font-semibold text-gold-100">{taskStats.total}</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-xs text-gold-300">待辦</div>
            <div className="text-2xl font-semibold text-yellow-200">{taskStats.pending}</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-xs text-gold-300">進行中</div>
            <div className="text-2xl font-semibold text-blue-200">{taskStats.inProgress}</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-xs text-gold-300">已完成</div>
            <div className="text-2xl font-semibold text-green-200">{taskStats.completed}</div>
          </div>
          <div className="card p-3 text-center">
            <div className="text-xs text-gold-300">逾期</div>
            <div className="text-2xl font-semibold text-red-200">{taskStats.overdue}</div>
          </div>
        </div>
      </div>

      {/* 搜尋列 */}
      <div className="bg-primary-800 border border-gold-600 rounded-lg p-4">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gold-200">排序</label>
            <select className="input py-1" value={sortKey} onChange={(e) => { setSortKey(e.target.value); setPage(1); }}>
              <option value="default">預設</option>
              <option value="overdue_desc">逾期任務數（多→少）</option>
              <option value="meetings_desc">會議次數（多→少）</option>
            </select>
            {sortKey !== 'default' && (
              <button
                type="button"
                onClick={() => { setSortKey('default'); setPage(1); fetchCoachees(); }}
                className="btn-secondary py-1 px-2"
              >重置</button>
            )}
          </div>
        </div>
        {sortKey !== 'default' && (
          <div className="mt-2 text-xs text-gold-300">已套用排序（跨頁生效）。</div>
        )}
      </div>

      {/* 學員列表 */}
      <div className="bg-primary-800 border border-gold-600 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium text-gold-100">我的學員</h2>
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
            <h3 className="mt-2 text-sm font-medium text-gold-100">尚未有指派的學員</h3>
            <p className="mt-1 text-sm text-gold-300">當管理員為會員指派您為教練後，名單將顯示於此。</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {visibleCoachees.map((member) => {
                const { p, percent } = progressSummary(member.id);
                const missing = {
                  interview: !(p?.hasInterview),
                  mbti: !(p?.hasMbtiType),
                  nfc: !(p?.hasNfcCard),
                  foundation: !(p?.foundationViewed)
                };
                return (
                  <div key={member.id} className="card hover:shadow-lg transition-shadow duration-200 cursor-pointer relative" onClick={() => setSelectedMember(member)}>
                    {/* 未完成紅點提示 */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {missing.interview && <span title="未完成：面談" className="h-2 w-2 rounded-full bg-red-500 shadow" />}
                      {missing.mbti && <span title="未完成：MBTI" className="h-2 w-2 rounded-full bg-red-500 shadow" />}
                      {missing.nfc && <span title="未完成：NFC" className="h-2 w-2 rounded-full bg-red-500 shadow" />}
                      {missing.foundation && <span title="未完成：地基" className="h-2 w-2 rounded-full bg-red-500 shadow" />}
                    </div>
                    <div className="p-6">
                      {/* Header: Name + Select */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center">
                          <Avatar 
                            src={member.profilePictureUrl} 
                            alt={member.name}
                            size="large"
                          />
                          <div className="ml-3 flex-1">
                            <h3 className="text-sm font-medium text-gold-100 truncate">
                              {member.name}
                            </h3>
                            <div className="mt-1">
                              {getMembershipLevelBadge(member.membershipLevel)}
                            </div>
                            {member.taskCounts && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-yellow-700 text-yellow-100">
                                  待 {Number(member.taskCounts.pending || 0)}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-700 text-blue-100">
                                  進 {Number(member.taskCounts.inProgress || 0)}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-700 text-green-100">
                                  完 {Number(member.taskCounts.completed || 0)}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-700 text-red-100">
                                  逾 {Number(member.taskCounts.overdue || 0)}
                                </span>
                              </div>
                            )}
                            {/* 進度概況徽章 */}
                            {progressById[member.id] && (
                              <>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  <span className={`${progressById[member.id]?.hasInterview ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-200'} inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium`}>
                                    {progressById[member.id]?.hasInterview ? (
                                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                                    ) : (
                                      <XCircleIcon className="h-3 w-3 mr-1" />
                                    )}
                                    面談
                                  </span>
                                  <span className={`${progressById[member.id]?.hasMbtiType ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-200'} inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium`}>
                                    {progressById[member.id]?.hasMbtiType ? (
                                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                                    ) : (
                                      <XCircleIcon className="h-3 w-3 mr-1" />
                                    )}
                                    MBTI
                                  </span>
                                  <span className={`${progressById[member.id]?.hasNfcCard ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-200'} inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium`}>
                                    {progressById[member.id]?.hasNfcCard ? (
                                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                                    ) : (
                                      <XCircleIcon className="h-3 w-3 mr-1" />
                                    )}
                                    NFC
                                  </span>
                                  <span className={`${progressById[member.id]?.foundationViewed ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-200'} inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium`}>
                                    {progressById[member.id]?.foundationViewed ? (
                                      <CheckCircleIcon className="h-3 w-3 mr-1" />
                                    ) : (
                                      <XCircleIcon className="h-3 w-3 mr-1" />
                                    )}
                                    地基
                                  </span>
                                </div>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-700 text-gold-100">
                                    會議 {Number(progressById[member.id]?.meetingsCount ?? 0)}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-700 text-gold-100">
                                    推薦出 {Number(progressById[member.id]?.referralsSent ?? 0)}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-700 text-gold-100">
                                    推薦成 {Number(progressById[member.id]?.referralsReceivedConfirmed ?? 0)}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-700 text-gold-100">
                                    活動 {Number(progressById[member.id]?.eventsCount ?? 0)}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-700 text-gold-100">
                                    名片點擊 {Number(progressById[member.id]?.businessMedia?.cardClicks ?? 0)}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-700 text-gold-100">
                                    CTA {Number(progressById[member.id]?.businessMedia?.ctaClicks ?? 0)}
                                  </span>
                                </div>

                                {/* 進度條 */}
                                {(() => {
                                  const percentShow = percent;
                                  const { profileScore, systemScore, bonusMbti } = progressSummary(member.id);
                                  return (
                                    <div className="mt-3">
                                      <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs text-gold-300">進度</span>
                                        <span className="text-xs text-gold-100 font-semibold">{percentShow}%</span>
                                      </div>
                                      <div className="w-full h-2 bg-primary-700 rounded">
                                        <div
                                          className={`h-2 rounded ${percentShow >= 80 ? 'bg-green-500' : percentShow >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                          style={{ width: `${percentShow}%` }}
                                        />
                                      </div>
                                      <div className="mt-1 text-[11px] text-gold-400">
                                        基礎 {profileScore}/60 ・ 系統 {systemScore}/40{bonusMbti > 0 ? ` ・ MBTI +${bonusMbti}` : ''}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Company and Title */}
                      <div className="space-y-2 mb-4">
                        <div className="flex items-center text-sm text-gold-300">
                          <BuildingOfficeIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{member.company}</span>
                        </div>
                        <div className="flex items-center text-sm text-gold-300">
                          <BriefcaseIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span className="truncate">{member.title}</span>
                        </div>
                      </div>

                      {/* Chapter */}
                      {member.chapterName && (
                        <div className="mb-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gold-600 text-primary-900">
                            {member.chapterName}
                          </span>
                        </div>
                      )}

                      {/* Contact Info */}
                      {member.contactNumber && (
                        <div className="mb-4">
                          <div className="flex items-center text-sm text-gold-300">
                            <PhoneIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{member.contactNumber}</span>
                          </div>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="mt-4 space-y-2">
                        <Link
                          to={`/members/${member.id}`}
                          className="w-full btn-secondary flex items-center justify-center text-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <EyeIcon className="h-4 w-4 mr-2" />
                          查看詳情
                        </Link>
                        {member.interviewData && (
                          <Link
                            to={`/member-interview/${member.id}`}
                            className="w-full btn-primary flex items-center justify-center text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            面談表
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gold-300">
                第 {pagination?.currentPage || page} / {pagination?.totalPages || 1} 頁
              </div>
              <div className="space-x-2">
                <button
                  type="button"
                  disabled={!canPrev}
                  onClick={() => canPrev && setPage(page - 1)}
                  className={`btn-secondary inline-flex items-center ${!canPrev ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <ChevronLeftIcon className="h-4 w-4 mr-1" /> 上一頁
                </button>
                <button
                  type="button"
                  disabled={!canNext}
                  onClick={() => canNext && setPage(page + 1)}
                  className={`btn-secondary inline-flex items-center ${!canNext ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  下一頁 <ChevronRightIcon className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 進度總覽彈窗 & 快捷 CTA */}
      {selectedMember && (
        <div className="fixed inset-0 z-40">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="absolute inset-x-4 md:inset-x-0 md:left-1/2 md:-translate-x-1/2 top-10 md:top-20 z-50 bg-primary-800 border border-gold-600 rounded-lg shadow-elegant w-auto md:w-[720px]">
            <div className="flex items-center justify-between p-4 border-b border-gold-700">
              <div className="flex items-center">
                <Avatar src={selectedMember.profilePictureUrl} alt={selectedMember.name} size="medium" />
                <div className="ml-3">
                  <div className="text-gold-100 font-semibold">{selectedMember.name}</div>
                  <div className="text-xs text-gold-300">{selectedMember.company} ・ {selectedMember.title}</div>
                </div>
              </div>
              <button className="icon-button" onClick={closeModal}>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 md:p-6">
              {/* 進度概覽 */}
              {(() => {
                const { p, percent, profileScore, systemScore, bonusMbti } = progressSummary(selectedMember.id);
                return (
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gold-300">進度</div>
                      <div className="text-sm text-gold-100 font-semibold">{percent}%</div>
                    </div>
                    <div className="w-full h-2 bg-primary-700 rounded mt-1">
                      <div className={`h-2 rounded ${percent >= 80 ? 'bg-green-500' : percent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${percent}%` }} />
                    </div>
                    <div className="mt-1 text-[11px] text-gold-400">基礎 {profileScore}/60 ・ 系統 {systemScore}/40{bonusMbti > 0 ? ` ・ MBTI +${bonusMbti}` : ''}</div>

                    {/* 狀態徽章 */}
                    <div className="mt-3 flex flex-wrap gap-1">
                      <span className={`${p?.hasInterview ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-200'} inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium`}>
                        {p?.hasInterview ? <CheckCircleIcon className="h-3 w-3 mr-1"/> : <XCircleIcon className="h-3 w-3 mr-1"/>}
                        面談
                      </span>
                      <span className={`${p?.hasMbtiType ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-200'} inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium`}>
                        {p?.hasMbtiType ? <CheckCircleIcon className="h-3 w-3 mr-1"/> : <XCircleIcon className="h-3 w-3 mr-1"/>}
                        MBTI
                      </span>
                      <span className={`${p?.hasNfcCard ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-200'} inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium`}>
                        {p?.hasNfcCard ? <CheckCircleIcon className="h-3 w-3 mr-1"/> : <XCircleIcon className="h-3 w-3 mr-1"/>}
                        NFC
                      </span>
                      <span className={`${p?.foundationViewed ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-200'} inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium`}>
                        {p?.foundationViewed ? <CheckCircleIcon className="h-3 w-3 mr-1"/> : <XCircleIcon className="h-3 w-3 mr-1"/>}
                        地基
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* 快捷操作 */}
              <div className="mt-6">
                {/* 快捷操作 */}
                <div className="text-xl font-bold text-gold-100 mb-3">快捷操作</div>
                
                {/* 一鍵指派任務 */}
                <div className="bg-primary-700/40 rounded-md p-3 border border-gold-700">
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardDocumentListIcon className="h-4 w-4 text-gold-300" />
                    <div className="text-base font-semibold text-gold-100">一鍵指派任務</div>
                  </div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {['填寫面談表', '完成面談', '設定/更新 NFC 名片', '完成入會地基'].map((tpl) => (
                      <button
                        key={tpl}
                        type="button"
                        onClick={() => assignTask(tpl)}
                        className="px-3 py-1.5 text-sm rounded-md bg-primary-600 hover:bg-primary-500 border border-gold-700 text-gold-100"
                        disabled={actionLoading}
                      >
                        {tpl}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      className="input flex-1 text-base"
                      placeholder="自訂任務標題（例如：補交名片連結）"
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                    />
                    <input
                      type="date"
                      className="input w-48 text-base"
                      value={quickDue}
                      onChange={(e) => setQuickDue(e.target.value)}
                    />
                    <button type="button" className="btn-primary whitespace-nowrap text-base px-4 py-2" onClick={() => assignTask()} disabled={actionLoading}>
                      指派
                    </button>
                  </div>
                </div>

                {/* 安排會議 */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <a
                    href={`/meetings?schedule_with=${selectedMember.id}`}
                    className="btn-secondary inline-flex items-center text-base px-4 py-2"
                  >
                    <CalendarIcon className="h-5 w-5 mr-1" /> 安排會議
                  </a>
                  {/* 以教練紀錄替代「標記面談完成」的快速紀錄 */}
                  <button
                    type="button"
                    className="btn-secondary text-base px-4 py-2"
                    onClick={() => createCoachLog('已完成面談（快速標記於教練紀錄）')}
                    disabled={actionLoading}
                  >
                    標記面談完成
                  </button>
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