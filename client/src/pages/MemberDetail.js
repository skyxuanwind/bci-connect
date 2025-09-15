import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';
import {
  UserIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarIcon,
  ArrowLeftIcon,
  MapPinIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';

const MemberDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [member, setMember] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', dueDate: '' });
  const [logContent, setLogContent] = useState('');
  const [logFiles, setLogFiles] = useState([]);
  const [savingTask, setSavingTask] = useState(false);
  const [savingLog, setSavingLog] = useState(false);
  const [badges, setBadges] = useState([]);
  // 新增：專案計畫狀態
  const [projectPlan, setProjectPlan] = useState(null);
  const [loadingPlan, setLoadingPlan] = useState(false);

  useEffect(() => {
    loadMemberDetail();
  }, [id]);

  useEffect(() => {
    if (member?.id) {
      fetchOnboardingTasks();
      fetchCoachLogs();
      fetchBadges();
      fetchProjectPlan();
    }
  }, [member?.id]);

  const fetchOnboardingTasks = async () => {
    try {
      const resp = await axios.get(`/api/users/member/${id}/onboarding-tasks`);
      setTasks(resp.data.tasks || []);
    } catch (e) {
      console.error('Failed to load onboarding tasks', e);
    }
  };

  const fetchCoachLogs = async () => {
    try {
      const resp = await axios.get(`/api/users/member/${id}/coach-logs`);
      setLogs(resp.data.logs || []);
    } catch (e) {
      console.error('Failed to load coach logs', e);
    }
  };

  // 新增：抓取專案計畫
  const fetchProjectPlan = async () => {
    try {
      setLoadingPlan(true);
      const resp = await axios.get(`/api/users/member/${id}/project-plan`);
      setProjectPlan(resp.data || null);
    } catch (e) {
      console.error('Failed to load project plan', e);
    } finally {
      setLoadingPlan(false);
    }
  };

  const fetchBadges = async () => {
    try {
      const resp = await axios.get(`/api/users/member/${id}/badges`);
      setBadges(Array.isArray(resp.data) ? resp.data : []);
    } catch (err) {
      console.error('Failed to load honor badges:', err);
    }
  };

  const canCreateCoachItems = user?.isCoach || user?.isAdmin;
  const isSelf = user?.id === member?.id;
  const canUpdateTaskStatus = isSelf || canCreateCoachItems;

  const createTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title.trim()) return;
    setSavingTask(true);
    try {
      const payload = {
        title: taskForm.title.trim(),
        description: taskForm.description?.trim() || undefined,
        dueDate: taskForm.dueDate || undefined,
      };
      const resp = await axios.post(`/api/users/member/${id}/onboarding-tasks`, payload);
      setTasks([resp.data.task, ...tasks]);
      setTaskForm({ title: '', description: '', dueDate: '' });
    } catch (e) {
      console.error('Create task failed', e);
    } finally {
      setSavingTask(false);
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const resp = await axios.put(`/api/users/onboarding-tasks/${taskId}`, { status });
      setTasks(tasks.map(t => t.id === taskId ? resp.data.task : t));
      // 若任務完成，可能觸發授予徽章，刷新徽章列表
      if (status === 'completed') {
        fetchBadges();
      }
    } catch (e) {
      console.error('Update task status failed', e);
    }
  };

  const createLog = async (e) => {
    e.preventDefault();
    if (!logContent.trim() && (!logFiles || logFiles.length === 0)) return;
    setSavingLog(true);
    try {
      const formData = new FormData();
      formData.append('content', logContent.trim());
      if (logFiles && logFiles.length > 0) {
        Array.from(logFiles).forEach((f) => formData.append('files', f));
      }
      const resp = await axios.post(`/api/users/member/${id}/coach-logs`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setLogs([resp.data.log, ...logs]);
      setLogContent('');
      setLogFiles([]);
    } catch (e) {
      console.error('Create log failed', e);
    } finally {
      setSavingLog(false);
    }
  };

  const loadMemberDetail = async () => {
    try {
      const response = await axios.get(`/api/users/member/${id}`);
      setMember(response.data.member);
    } catch (error) {
      console.error('Failed to load member detail:', error);
      if (error.response?.status === 403) {
        setError('您沒有權限查看此會員的詳細資料');
      } else if (error.response?.status === 404) {
        setError('找不到此會員');
      } else {
        setError('載入會員資料時發生錯誤');
      }
    } finally {
      setLoading(false);
    }
  };

  const getMembershipLevelText = (level) => {
    const levels = {
      1: '核心',
    2: '幹部',
    3: '會員'
    };
    return levels[level] || '未設定';
  };

  const getMembershipLevelBadge = (level) => {
    const badges = {
      1: 'level-1',
      2: 'level-2',
      3: 'level-3'
    };
    
    return (
      <span className={`badge ${badges[level] || 'bg-gray-500'} text-sm px-3 py-1 rounded-full font-medium text-white`}>
        {getMembershipLevelText(level)}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { text: '正常', class: 'badge-success' },
      pending_approval: { text: '待審核', class: 'badge-warning' },
      suspended: { text: '暫停', class: 'badge-danger' },
      blacklisted: { text: '黑名單', class: 'badge-danger' }
    };
    
    const config = statusConfig[status] || { text: '未知', class: 'badge-info' };
    
    return (
      <span className={`badge ${config.class} text-sm px-3 py-1 rounded-full font-medium`}>
        {config.text}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return '未知';
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Taipei'
    });
  };

  const handleSendMessage = () => {
    if (member?.id) {
      navigate(`/meetings?schedule_with=${member.id}`);
    }
  };

  // GBC 任務識別（以標題包含關鍵字為過渡方案）
  const isGbcTask = (t) => typeof t?.title === 'string' && t.title.includes('GBC 深度交流表');
  const sortedTasks = React.useMemo(() => {
    if (!Array.isArray(tasks)) return [];
    const arr = [...tasks];
    // 置頂：GBC 任務排最前
    arr.sort((a, b) => {
      const aG = isGbcTask(a) ? 1 : 0;
      const bG = isGbcTask(b) ? 1 : 0;
      if (aG !== bG) return bG - aG;
      // 其次：未完成優先（pending / in_progress 排前，completed 排後）
      const order = { pending: 0, in_progress: 1, completed: 2 };
      const sa = order[a.status] ?? 9;
      const sb = order[b.status] ?? 9;
      if (sa !== sb) return sa - sb;
      // 再次：截止日近者在前；無截止日排後
      const da = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const db = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return da - db;
    });
    return arr;
  }, [tasks]);

  const getBadgeVariant = (code) => {
    switch (code) {
      case 'FIRST_TASK_COMPLETED':
        return 'badge-success';
      case 'PROFILE_COMPLETED':
        return 'badge-info';
      case 'FIRST_CONFIRMED_REFERRAL':
        return 'badge-warning';
      default:
        return '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">無法載入會員資料</h3>
        <p className="mt-1 text-sm text-gray-500">{error}</p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/members')}
            className="btn-primary"
          >
            返回會員列表
          </button>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="text-center py-12">
        <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">找不到會員</h3>
        <p className="mt-1 text-sm text-gray-500">此會員可能已被刪除或不存在</p>
        <div className="mt-6">
          <button
            onClick={() => navigate('/members')}
            className="btn-primary"
          >
            返回會員列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Back Button */}
      <div className="flex items-center">
        <button
          onClick={() => navigate('/members')}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
        >
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          返回會員列表
        </button>
      </div>

      {/* Member Header */}
      <div className="bg-gradient-primary text-white rounded-lg p-6">
        <div className="flex items-center">
          <div className="w-20 h-20 bg-white bg-opacity-20 rounded-full overflow-hidden">
             <Avatar 
               src={member?.profilePictureUrl} 
               alt={member?.name}
               size="2xl"
               className="bg-white bg-opacity-20"
               fallbackIcon={UserIcon}
               fallbackIconClass="text-white"
             />
           </div>
          <div className="ml-6 flex-1">
            <h1 className="text-3xl font-bold">{member?.name}</h1>
            <p className="text-blue-100 mt-1">{member?.email}</p>
            <div className="flex items-center space-x-4 mt-3">
              {member?.membershipLevel ? getMembershipLevelBadge(member.membershipLevel) : null}
              {member?.status ? getStatusBadge(member.status) : null}
            </div>
          </div>
        </div>
      </div>

      {/* 新增：專案計畫 */}
      <div id="project-plan" className="card mt-6">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">專案計畫（12 項自動判定）</h2>
        </div>
        <div className="p-6">
          {loadingPlan && (
            <div className="flex items-center"><LoadingSpinner size="sm" /><span className="ml-3 text-gray-600">載入專案計畫中...</span></div>
          )}
          {!loadingPlan && projectPlan && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm text-gray-600">完成度</div>
                  <div className="text-sm font-medium text-gray-900">{projectPlan.summary.percent}%</div>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-3 bg-primary-600" style={{ width: `${projectPlan.summary.percent}%` }} />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                {projectPlan.items.map((item) => (
                  <div key={item.key} className="flex items-start p-3 border rounded-lg">
                    {item.completed ? (
                      <CheckCircleIcon className="h-5 w-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircleIcon className="h-5 w-5 text-gray-300 mt-0.5" />
                    )}
                    <div className="ml-3">
                      <div className={`text-sm font-medium ${item.completed ? 'text-gray-900' : 'text-gray-500'}`}>{item.title}</div>
                      {typeof item.value !== 'undefined' && (
                        <div className="text-xs text-gray-500 mt-0.5">目前：{item.value}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {!loadingPlan && !projectPlan && (
            <div className="text-sm text-gray-600">尚無可顯示的專案計畫資料</div>
          )}
        </div>
      </div>

      {/* Member Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">基本資料</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center">
              <UserIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">姓名</p>
                <p className="text-sm text-gray-600">{member.name}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <EnvelopeIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">電子郵件</p>
                <p className="text-sm text-gray-600">{member.email}</p>
              </div>
            </div>
            
            {member.contactNumber && (
              <div className="flex items-center">
                <PhoneIcon className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <p className="text-sm font-medium text-gray-900">聯絡電話</p>
                  <p className="text-sm text-gray-600">{member.contactNumber}</p>
                </div>
              </div>
            )}
            
            <div className="flex items-center">
              <CalendarIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">加入時間</p>
                <p className="text-sm text-gray-600">{formatDate(member.createdAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Professional Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">職業資料</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center">
              <BuildingOfficeIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">公司</p>
                <p className="text-sm text-gray-600">{member.company || '未提供'}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <BriefcaseIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">職稱</p>
                <p className="text-sm text-gray-600">{member.title || '未提供'}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <TagIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">產業別</p>
                <p className="text-sm text-gray-600">{member.industry || '未提供'}</p>
              </div>
            </div>
            
            <div className="flex items-center">
              <MapPinIcon className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-900">所屬分會</p>
                <p className="text-sm text-gray-600">{member.chapterName || '未設定'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Membership Information */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">會員資訊</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-2">會員等級</p>
            {member.membershipLevel ? getMembershipLevelBadge(member.membershipLevel) : null}
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-2">帳號狀態</p>
            {member.status ? getStatusBadge(member.status) : null}
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm font-medium text-gray-900 mb-2">加入時間</p>
            <p className="text-sm text-gray-600">{formatDate(member.createdAt)}</p>
          </div>
        </div>
      </div>

      {/* Honor Badges */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">榮譽徽章</h2>
        </div>
        <div className="p-6">
          {badges && badges.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {badges.map((b) => (
                <div key={b.id} className={`badge ${getBadgeVariant(b.code)}`} title={b.description || ''}>
                  <span className="font-semibold">{b.name}</span>
                  {b.awardedAt && (
                    <span className="ml-2 text-xs opacity-80">{new Date(b.awardedAt).toLocaleDateString('zh-TW')}</span>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-gray-600 text-sm">尚未獲得徽章</div>
          )}
        </div>
      </div>

      {/* Onboarding Tasks */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">入職任務</h2>
        </div>
        <div className="p-6 space-y-4">
          {canCreateCoachItems && (
            <form onSubmit={createTask} className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  type="text"
                  className="input col-span-1 md:col-span-1"
                  placeholder="任務標題"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  required
                />
                <input
                  type="text"
                  className="input col-span-1 md:col-span-1"
                  placeholder="描述（可選）"
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                />
                <input
                  type="date"
                  className="input col-span-1 md:col-span-1"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>
              <button className="btn-primary" disabled={savingTask}>
                {savingTask ? '建立中...' : '新增任務'}
              </button>
            </form>
          )}

          <div className="space-y-3">
            {sortedTasks.length === 0 && <p className="text-sm text-gray-600">目前沒有任務</p>}
            {sortedTasks.map(t => {
              const gbc = isGbcTask(t);
              return (
                <div key={t.id} className={`p-4 border rounded-lg flex items-center justify-between ${gbc ? 'border-gold-600 bg-primary-900' : ''}`}>
                  <div>
                    <p className="font-medium text-gray-900 flex items-center">
                      {gbc && <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gold-600 text-primary-900 mr-2">核心</span>}
                      {t.title}
                    </p>
                    {t.description && <p className="text-sm text-gray-600 mt-1">{t.description}</p>}
                    <div className="text-xs text-gray-500 mt-1">
                      狀態：{t.status === 'pending' ? '未開始' : t.status === 'in_progress' ? '進行中' : '已完成'}
                      {t.dueDate && <span className="ml-3">截止：{new Date(t.dueDate).toLocaleDateString('zh-TW')}</span>}
                    </div>
                  </div>
                  {canUpdateTaskStatus && (
                    <div className="flex items-center space-x-2">
                      <button className="btn-secondary" onClick={() => updateTaskStatus(t.id, 'pending')}>未開始</button>
                      <button className="btn-secondary" onClick={() => updateTaskStatus(t.id, 'in_progress')}>進行中</button>
                      <button className="btn-primary" onClick={() => updateTaskStatus(t.id, 'completed')}>完成</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* One-on-One Meeting Schedule */}
      {member.interviewData && (
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">一對一面談表</h2>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-4">此會員已完成一對一面談表填寫，可查看其商務合作意向。</p>
            <Link 
              to={`/member-interview/${member.id}`}
              className="btn-primary inline-flex items-center"
            >
              <UserIcon className="h-4 w-4 mr-2" />
              查看面談表
            </Link>
          </div>
        </div>
      )}

      {/* Coach Logs */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">教練紀錄</h2>
        </div>
        <div className="p-6 space-y-4">
          {canCreateCoachItems && (
            <form onSubmit={createLog} className="space-y-3">
              <textarea
                className="input w-full h-24"
                placeholder="輸入教練紀錄..."
                value={logContent}
                onChange={(e) => setLogContent(e.target.value)}
              />
              <div className="flex items-center justify-between gap-3">
                <input
                  type="file"
                  multiple
                  onChange={(e) => setLogFiles(e.target.files)}
                  className="text-sm text-gray-600"
                />
                <button className="btn-primary" disabled={savingLog}>
                  {savingLog ? '新增中...' : '新增紀錄'}
                </button>
              </div>
              {logFiles && logFiles.length > 0 && (
                <div className="text-xs text-gray-500">已選擇 {logFiles.length} 個附件</div>
              )}
            </form>
          )}

          <div className="space-y-3">
            {logs.length === 0 && <p className="text-sm text-gray-600">尚無教練紀錄</p>}
            {logs.map(l => (
              <div key={l.id} className="p-4 border rounded-lg">
                <div className="text-sm text-gray-500 mb-1">{new Date(l.createdAt).toLocaleString('zh-TW')}</div>
                <p className="text-gray-900 whitespace-pre-line">{l.content}</p>
                {Array.isArray(l.attachments) && l.attachments.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {l.attachments.map((a, idx) => (
                      <div key={idx} className="text-sm">
                        <a href={a.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                          附件 {idx + 1} {a.originalFilename ? `- ${a.originalFilename}` : ''}
                        </a>
                        <span className="ml-2 text-xs text-gray-500">{a.mimeType || a.format || a.resourceType}</span>
                      </div>
                    ))}
                  </div>
                )}
                {l.coachName && <div className="text-xs text-gray-500 mt-2">由 {l.coachName} 建立</div>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-center space-x-4">
        <button
          onClick={() => navigate('/members')}
          className="btn-secondary"
        >
          返回會員列表
        </button>
        
        {/* Additional actions can be added here based on user permissions */}
        {user?.id === member.id && (
          <Link to="/profile" className="btn-primary">
            編輯個人資料
          </Link>
        )}
        
        {/* Meeting Schedule Button */}
        {user?.id !== member.id && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={handleSendMessage} className="btn-primary w-full flex items-center justify-center">
              傳送訊息
            </button>
            <button onClick={() => navigate(`/meetings?schedule_with=${member.id}`)} className="btn-secondary w-full flex items-center justify-center">
              安排會議
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemberDetail;