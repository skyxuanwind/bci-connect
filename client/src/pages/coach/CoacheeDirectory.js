import React, { useEffect, useMemo, useState, useCallback } from 'react';
import axios from '../../config/axios';
import Avatar from '../../components/Avatar';
import LoadingSpinner from '../../components/LoadingSpinner';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';

const CoacheeDirectory = () => {
  const { isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(24);
  const [members, setMembers] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalMembers: 0, limit });

  const [progressById, setProgressById] = useState({});

  const fetchCoachees = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const resp = await axios.get('/api/users/all-coachees', { params: { page, limit } });
      const data = resp.data || {};
      setMembers(Array.isArray(data.coachees) ? data.coachees : []);
      setPagination(data.pagination || { currentPage: page, totalPages: 1, totalMembers: 0, limit });
    } catch (e) {
      console.error('載入學員目錄失敗:', e);
      setError(e.response?.data?.message || '載入學員目錄失敗');
      setMembers([]);
      setPagination({ currentPage: 1, totalPages: 1, totalMembers: 0, limit });
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  const fetchProgress = useCallback(async () => {
    try {
      const resp = await axios.get('/api/users/my-coachees/progress');
      const list = resp.data?.progress || [];
      const map = {};
      list.forEach(item => { if (item && item.userId != null) map[item.userId] = item; });
      setProgressById(map);
    } catch (e) {
      console.error('載入進度概況失敗:', e);
    }
  }, []);

  useEffect(() => { fetchCoachees(); }, [fetchCoachees]);
  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const visible = useMemo(() => Array.isArray(members) ? members : [], [members]);

  // 強制引用 isAdmin 以避免未使用警告（實際亦有在 JSX 中使用）
  const adminView = isAdmin();

  const renderCard = (m) => {
    const p = progressById[m.id] || {};
    const prog = p.progress || {};
    const percent = Math.round(Number(prog.overallPercent ?? 0));
    const hasInterview = !!p.hasInterview;
    const hasMbti = !!p.hasMbtiType;
    const hasNfc = !!p.hasNfcCard;
    const foundationViewed = !!p.foundationViewed;

    return (
      <div key={m.id} className="card p-4">
        <div className="flex items-center">
          <Avatar src={m.profilePictureUrl} alt={m.name} size="large" />
          <div className="ml-3">
            <div className="text-sm font-semibold text-gold-100 truncate">{m.name}</div>
            <div className="text-xs text-gold-300 truncate">{m.industry || m.title || ''}</div>
            {m.coach && m.coach.name && (
              <div className="text-xs text-blue-300 truncate">教練: {m.coach.name}</div>
            )}
          </div>
        </div>

        <div className="mt-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm sm:text-xs text-gold-300">進度</span>
            <span className="text-sm sm:text-xs text-gold-100 font-semibold">{percent}%</span>
          </div>
          <div className="w-full h-3 sm:h-2 bg-primary-700 rounded">
            <div className={`h-3 sm:h-2 rounded ${percent >= 80 ? 'bg-green-500' : percent >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${percent}%` }} />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-4 gap-1">
          {[{k:'面談',v:hasInterview},{k:'MBTI',v:hasMbti},{k:'NFC',v:hasNfc},{k:'地基',v:foundationViewed}].map((it) => (
            <span key={it.k} className={`${it.v ? 'bg-green-700 text-green-100' : 'bg-gray-700 text-gray-200'} inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium justify-center`}>
              {it.v ? <CheckCircleIcon className="h-3 w-3 mr-1"/> : <XCircleIcon className="h-3 w-3 mr-1"/>}{it.k}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-primary-800 border border-gold-600 rounded-lg p-6 shadow-elegant">
        <h1 className="text-2xl font-semibold text-gold-100">學員目錄</h1>
        <p className="mt-2 text-gold-300">瀏覽所有被指派到教練的學員名單，包含其教練資訊與入職進度。{adminView ? '（管理員視角）' : ''}</p>
      </div>

      <div className="bg-primary-800 border border-gold-600 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gold-300">共 {pagination?.totalMembers || 0} 位</div>
        </div>
        {loading ? (
          <div className="flex items-center justify-center h-48"><LoadingSpinner size="large" /></div>
        ) : error ? (
          <div className="text-red-300">{error}</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {visible.map(renderCard)}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gold-300">第 {pagination?.currentPage || page} / {pagination?.totalPages || 1} 頁</div>
              <div className="space-x-2">
                <button className="btn-secondary" disabled={(pagination?.currentPage || page) <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>上一頁</button>
                <button className="btn-secondary" disabled={(pagination?.currentPage || page) >= (pagination?.totalPages || 1)} onClick={() => setPage((p) => p + 1)}>下一頁</button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CoacheeDirectory;