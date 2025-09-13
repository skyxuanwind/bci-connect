import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from '../../config/axios';
import Avatar from '../../components/Avatar';
import LoadingSpinner from '../../components/LoadingSpinner';
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

  useEffect(() => {
    fetchCoachees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

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

  return (
    <div className="space-y-6">
      <div className="bg-primary-800 border border-gold-600 rounded-lg p-6 shadow-elegant">
        <h1 className="text-2xl font-semibold text-gold-100">教練儀表板</h1>
        <p className="mt-2 text-gold-300">歡迎來到教練專區。您可以在此查看並管理指派給您的學員。</p>
      </div>

      {/* 搜尋列 */}
      <div className="bg-primary-800 border border-gold-600 rounded-lg p-4">
        <form onSubmit={onSubmitSearch} className="space-y-3">
          <div>
            <label className="label">
              <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
              搜尋學員
            </label>
            <div className="flex gap-3">
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
          </div>
        </form>
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
              {coachees.map((member) => (
                <div key={member.id} className="card hover:shadow-lg transition-shadow duration-200">
                  <div className="p-6">
                    {/* Avatar and Basic Info */}
                    <div className="flex items-center mb-4">
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