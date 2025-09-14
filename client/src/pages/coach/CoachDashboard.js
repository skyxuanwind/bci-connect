import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../config/axios';
import Avatar from '../../components/Avatar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toast } from 'react-toastify';
import {
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  PhoneIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

const CoachDashboard = () => {
  // 搜尋與分頁狀態
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  // 資料狀態
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

  // 批量分配
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkTitle, setBulkTitle] = useState('');
  const [bulkDescription, setBulkDescription] = useState('');
  const [bulkDueDate, setBulkDueDate] = useState('');
  const [bulkSubmitting, setBulkSubmitting] = useState(false);

  // 進度過濾與排序
  const [filterNoInterview, setFilterNoInterview] = useState(() => {
    try { return JSON.parse(localStorage.getItem('coachFilterNoInterview') || 'false'); } catch { return false; }
  });
  const [filterNoNfc, setFilterNoNfc] = useState(() => {
    try { return JSON.parse(localStorage.getItem('coachFilterNoNfc') || 'false'); } catch { return false; }
  });
  const [sortKey, setSortKey] = useState(() => localStorage.getItem('coachSortKey') || 'default'); // default | overdue_desc | meetings_desc

  const canPrev = useMemo(() => page > 1, [page]);
  const canNext = useMemo(() => page < (pagination?.totalPages || 1), [page, pagination]);

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
      if (search && search.trim()) params.search = search.trim();
      if (filterNoInterview) params.noInterview = 'true';
      if (filterNoNfc) params.noNfc = 'true';
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

  useEffect(() => {
    fetchCoachees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, filterNoInterview, filterNoNfc, sortKey]);

  useEffect(() => {
    fetchTaskStats();
    fetchProgress();
  }, []);

  // 持久化：篩選與排序
  useEffect(() => {
    try { localStorage.setItem('coachFilterNoInterview', JSON.stringify(filterNoInterview)); } catch {}
    try { localStorage.setItem('coachFilterNoNfc', JSON.stringify(filterNoNfc)); } catch {}
    try { localStorage.setItem('coachSortKey', sortKey || 'default'); } catch {}
  }, [filterNoInterview, filterNoNfc, sortKey]);

  const onSubmitSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchCoachees();
  };

  const clearSearch = () => {
    setSearch('');
    setPage(1);
    fetchCoachees();
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      return [...prev, id];
    });
  };

  const selectAllCurrentPage = () => {
    const ids = coachees.map((m) => m.id);
    setSelectedIds(ids);
  };

  const clearSelection = () => setSelectedIds([]);

  // 派生：根據進度資料進行過濾與排序（僅作用於當前頁列表）
  const visibleCoachees = useMemo(() => {
    let list = Array.isArray(coachees) ? [...coachees] : [];

    // 過濾條件
    if (filterNoInterview) {
      list = list.filter(m => {
        const p = progressById[m.id];
        return p ? !p.hasInterview : true; // 若進度未載入，暫時保留
      });
    }
    if (filterNoNfc) {
      list = list.filter(m => {
        const p = progressById[m.id];
        return p ? !p.hasNfcCard : true;
      });
    }

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
  }, [coachees, progressById, filterNoInterview, filterNoNfc, sortKey]);

  // GBC 模板工具：設定標準任務內容與預設截止時間（+7 天）
  const formatDateTimeLocal = (date) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  const applyGbcTemplate = () => {
    setBulkTitle('完成 GBC 深度交流表');
    setBulkDescription('請完成 GBC 深度交流表，內容將用於 AI 智慧合作網絡分析，協助快速媒合潛在合作夥伴。');
    const d = new Date();
    d.setDate(d.getDate() + 7);
    d.setHours(23, 59, 0, 0);
    setBulkDueDate(formatDateTimeLocal(d));
  };

  const submitBulk = async (e) => {
    e.preventDefault();
    if (!bulkTitle.trim()) {
      toast.error('請輸入任務標題');
      return;
    }
    if (selectedIds.length === 0) {
      toast.error('請至少選擇一位學員');
      return;
    }
    try {
      setBulkSubmitting(true);
      await axios.post('/api/users/onboarding-tasks/bulk', {
        memberIds: selectedIds,
        title: bulkTitle.trim(),
        description: bulkDescription || undefined,
        dueDate: bulkDueDate || undefined,
      });
      toast.success('批量分配成功');
      setBulkTitle('');
      setBulkDescription('');
      setBulkDueDate('');
      setSelectedIds([]);
      fetchCoachees();
      fetchTaskStats();
    } catch (e) {
      console.error('批量分配失敗:', e);
      toast.error(e.response?.data?.message || '批量分配任務失敗');
    } finally {
      setBulkSubmitting(false);
    }
  };

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
            <div className="text-2xl font-semibold text-red-300">{taskStats.overdue}</div>
          </div>
        </div>
      </div>

      {/* 搜尋列 */}
      <div className="bg-primary-800 border border-gold-600 rounded-lg p-4">
        <form onSubmit={onSubmitSearch} className="space-y-3">
          <div>
            <label className="label">
              <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
              搜尋學員
            </label>
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 flex gap-3">
                <input
                  type="text"
                  placeholder="搜尋姓名、公司或職稱..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input flex-1"
                />
                <button type="submit" className="btn-primary">搜尋</button>
                <button type="button" onClick={clearSearch} className="btn-secondary">清除</button>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <input id="filter-no-interview" type="checkbox" className="h-4 w-4" checked={filterNoInterview} onChange={(e) => { setFilterNoInterview(e.target.checked); setPage(1); }} />
                  <label htmlFor="filter-no-interview" className="text-sm text-gold-200">僅看未完成面談</label>
                </div>
                <div className="flex items-center gap-2">
                  <input id="filter-no-nfc" type="checkbox" className="h-4 w-4" checked={filterNoNfc} onChange={(e) => { setFilterNoNfc(e.target.checked); setPage(1); }} />
                  <label htmlFor="filter-no-nfc" className="text-sm text-gold-200">僅看未有NFC卡</label>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gold-200">排序</label>
                  <select className="input py-1" value={sortKey} onChange={(e) => { setSortKey(e.target.value); setPage(1); }}>
                    <option value="default">預設</option>
                    <option value="overdue_desc">逾期任務數（多→少）</option>
                    <option value="meetings_desc">會議次數（多→少）</option>
                  </select>
                </div>
                {(filterNoInterview || filterNoNfc || sortKey !== 'default') && (
                  <button
                    type="button"
                    onClick={() => { setFilterNoInterview(false); setFilterNoNfc(false); setSortKey('default'); setPage(1); fetchCoachees(); }}
                    className="btn-secondary py-1 px-2"
                  >重置篩選/排序</button>
                )}
              </div>
            </div>
            {(filterNoInterview || filterNoNfc || sortKey !== 'default') && (
              <div className="mt-2 text-xs text-gold-300">已套用過濾/排序（跨頁生效）。</div>
            )}
          </div>
        </form>
      </div>

      {/* 學員列表 */}
      <div className="bg-primary-800 border border-gold-600 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-medium text-gold-100">我的學員</h2>
          <div className="flex items-center gap-3 text-sm text-gold-300">
            <span>共 {pagination?.totalMembers || 0} 位</span>
            <span className="text-gold-400">｜已選 {selectedIds.length} 位</span>
            <button type="button" onClick={selectAllCurrentPage} className="btn-secondary py-1 px-2">全選本頁</button>
            <button type="button" onClick={clearSelection} className="btn-secondary py-1 px-2">清除選取</button>
          </div>
        </div>

        {/* 批量分配區塊 */}
        {selectedIds.length > 0 && (
          <div className="mb-6 p-4 border border-gold-600 rounded-lg bg-primary-900">
            <h3 className="text-gold-100 font-medium mb-3">批量分配入職任務</h3>
            <form onSubmit={submitBulk} className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                type="text"
                className="input"
                placeholder="任務標題（必填）"
                value={bulkTitle}
                onChange={(e) => setBulkTitle(e.target.value)}
                required
              />
              <input
                type="datetime-local"
                className="input"
                placeholder="截止日期（可選）"
                value={bulkDueDate}
                onChange={(e) => setBulkDueDate(e.target.value)}
              />
              <div className="flex gap-3">
                <button type="submit" disabled={bulkSubmitting} className="btn-primary flex-1">
                  {bulkSubmitting ? '分配中...' : '批量分配'}
                </button>
                <button type="button" onClick={clearSelection} className="btn-secondary">取消</button>
              </div>
              <div className="md:col-span-3">
                <textarea
                  className="input w-full h-20"
                  placeholder="任務描述（可選）"
                  value={bulkDescription}
                  onChange={(e) => setBulkDescription(e.target.value)}
                />
              </div>
              <div className="md:col-span-3 flex items-center gap-3">
                <button type="button" onClick={applyGbcTemplate} className="btn-secondary">
                  套用「GBC 深度交流表」模板
                </button>
                <span className="text-sm text-gold-300">一鍵帶入標題/描述，並預設 7 天後截止</span>
              </div>
            </form>
          </div>
        )}

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
              {visibleCoachees.map((member) => (
                <div key={member.id} className="card hover:shadow-lg transition-shadow duration-200">
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
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${progressById[member.id]?.hasInterview ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-200'}`}>
                                  面談
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${progressById[member.id]?.hasMbtiType ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-200'}`}>
                                  MBTI
                                </span>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${progressById[member.id]?.hasNfcCard ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-200'}`}>
                                  NFC
                                </span>
                              </div>
                              <div className="mt-1 flex flex-wrap gap-1">
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-700 text-gold-100">
                                  錢包 {Number(progressById[member.id]?.walletCount ?? 0)}
                                </span>
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
                                  名片點擊 {Number(progressById[member.id]?.businessMedia?.cardClicks ?? 0)}
                                </span>
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary-700 text-gold-100">
                                  CTA {Number(progressById[member.id]?.businessMedia?.ctaClicks ?? 0)}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={selectedIds.includes(member.id)}
                        onChange={() => toggleSelect(member.id)}
                        aria-label={`選取 ${member.name}`}
                      />
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
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        查看詳情
                      </Link>

                      {member.interviewData && (
                        <Link
                          to={`/member-interview/${member.id}`}
                          className="w-full btn-primary flex items-center justify-center text-sm"
                        >
                          面談表
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
    </div>
  );
};

export default CoachDashboard;