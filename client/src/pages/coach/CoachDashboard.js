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
  XCircleIcon
} from '@heroicons/react/24/outline';

const CoachDashboard = () => {
  // 分頁狀態（已移除搜尋）
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  // const navigate = useNavigate();

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
      // 套用篩選與排序參數（搜尋已移除）
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
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <input id="filter-no-interview" type="checkbox" className="h-4 w-4" checked={filterNoInterview} onChange={(e) => { setFilterNoInterview(e.target.checked); setPage(1); }} />
              <label htmlFor="filter-no-interview" className="text-sm text-gold-200">僅看未完成面談</label>
            </div>
            <div className="flex items-center gap-2">
              <input id="filter-no-nfc" type="checkbox" className="h-4 w-4" checked={filterNoNfc} onChange={(e) => { setFilterNoNfc(e.target.checked); setPage(1); }} />
              <label htmlFor="filter-no-nfc" className="text-sm text-gold-200">僅看未有NFC卡</label>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gold-200">排序</label>
            <select className="input py-1" value={sortKey} onChange={(e) => { setSortKey(e.target.value); setPage(1); }}>
              <option value="default">預設</option>
              <option value="overdue_desc">逾期任務數（多→少）</option>
              <option value="meetings_desc">會議次數（多→少）</option>
            </select>
            {(filterNoInterview || filterNoNfc || sortKey !== 'default') && (
              <button
                type="button"
                onClick={() => { setFilterNoInterview(false); setFilterNoNfc(false); setSortKey('default'); setPage(1); fetchCoachees(); }}
                className="btn-secondary py-1 px-2"
              >重置</button>
            )}
          </div>
        </div>
        {(filterNoInterview || filterNoNfc || sortKey !== 'default') && (
          <div className="mt-2 text-xs text-gold-300">已套用過濾/排序（跨頁生效）。</div>
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
              {visibleCoachees.map((member) => (
                <div key={member.id} className="card hover:shadow-lg transition-shadow duration-200 cursor-pointer">
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
                                const prog = progressById[member.id]?.progress;
                                const percent = Math.round(Number(prog?.overallPercent ?? 0));
                                const profileScore = Number(prog?.profileScore ?? 0);
                                const systemScore = Number(prog?.systemScore ?? 0);
                                const bonusMbti = Number(prog?.bonusMbti ?? 0);
                                return (
                                  <div className="mt-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs text-gold-300">進度</span>
                                      <span className="text-xs text-gold-100 font-semibold">{percent}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-primary-700 rounded">
                                      <div
                                        className={`h-2 rounded ${percent >= 80 ? 'bg-green-500' : percent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                        style={{ width: `${percent}%` }}
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