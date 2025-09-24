import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import Avatar from '../components/Avatar';
import LoadingSpinner from '../components/LoadingSpinner';
import { ChevronLeftIcon, ClipboardDocumentListIcon, CalendarIcon, ChartBarIcon } from '@heroicons/react/24/outline';

const MemberProgress = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const memberId = Number(id);
  const [member, setMember] = useState(null);
  const [projectPlan, setProjectPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchMember = async () => {
    const res = await axios.get(`/api/users/member/${memberId}`);
    setMember(res.data);
  };
  const fetchProjectPlan = async () => {
    const res = await axios.get(`/api/users/member/${memberId}/project-plan`);
    setProjectPlan(res.data);
  };

  useEffect(() => {
    if (!Number.isFinite(memberId)) return;
    setLoading(true);
    Promise.all([fetchMember(), fetchProjectPlan()])
      .catch(() => setError('載入資料失敗'))
      .finally(() => setLoading(false));
  }, [memberId]);

  // 新增：SSE 訂閱入職任務事件，動態刷新專案計劃
  useEffect(() => {
    if (!Number.isFinite(memberId)) return;
    let es;
    try {
      es = new EventSource(`/api/users/member/${memberId}/onboarding-events`, { withCredentials: true });
      const refresh = () => { fetchProjectPlan().catch(() => {}); };
      es.addEventListener('onboarding-task-created', refresh);
      es.addEventListener('onboarding-task-updated', refresh);
      es.addEventListener('heartbeat', () => {});
      es.onerror = (err) => { console.warn('會員進度 SSE 連線錯誤:', err); };
    } catch (e) {
      console.warn('建立會員進度 SSE 失敗:', e);
    }
    return () => { try { es && es.close(); } catch (_) {} };
  }, [memberId]);

  const p = useMemo(() => {
    if (!projectPlan) return {};
    return {
      hasInterview: !!(projectPlan.has_interview ?? projectPlan.hasInterview),
      hasMbtiType: !!(projectPlan.has_mbti_type ?? projectPlan.hasMbtiType),
      hasNfcCard: !!(projectPlan.has_nfc_card ?? projectPlan.hasNfcCard),
      hasProfilePicture: !!(projectPlan.has_profile_picture ?? projectPlan.hasProfilePicture),
      hasContactNumber: !!(projectPlan.has_contact_number ?? projectPlan.hasContactNumber),
      foundationViewed: !!(projectPlan.foundation_viewed ?? projectPlan.foundationViewed),
      meetingsCount: Number(projectPlan.meetings_count ?? projectPlan.meetingsCount ?? 0),
      referralsSent: Number(projectPlan.referrals_sent ?? projectPlan.referralsSent ?? 0),
      referralsReceivedConfirmed: Number(projectPlan.referrals_received_confirmed ?? projectPlan.referralsReceivedConfirmed ?? 0),
      bmCardClicks: Number(projectPlan.bm_card_clicks ?? projectPlan.bmCardClicks ?? 0),
      bmCtaClicks: Number(projectPlan.bm_cta_clicks ?? projectPlan.bmCtaClicks ?? 0),
      eventsCount: Number(projectPlan.events_count ?? projectPlan.eventsCount ?? 0),
      tasks: {
        pending: Number(projectPlan.pending ?? 0),
        inProgress: Number(projectPlan.in_progress ?? 0),
        completed: Number(projectPlan.completed ?? 0),
        overdue: Number(projectPlan.overdue ?? 0)
      }
    };
  }, [projectPlan]);

  const calcCard = (card) => {
    let c = 0, t = 0;
    (card.checklistItems || []).forEach(g => (g.details || []).forEach(d => { t += 1; if (d.completed) c += 1; }));
    return { completed: c, total: t, percentage: t ? Math.round((c / t) * 100) : 0 };
  };
  const calcOverall = (arr) => {
    let c = 0, t = 0;
    arr.forEach(card => { const r = calcCard(card); c += r.completed; t += r.total; });
    return { completed: c, total: t, percentage: t ? Math.round((c / t) * 100) : 0 };
  };

  const items = useMemo(() => ([
    { id: 'interview', title: '學員面談', checklistItems: [ { id: 'interview_form', label: '完成入會面談', details: [{ id: 'done', label: '已完成', completed: !!p?.hasInterview }] } ] },
    { id: 'profile', title: '個人資料與系統設定', checklistItems: [ { id: 'avatar', label: '上傳大頭照', details: [{ id: 'done', label: '完成', completed: !!p?.hasProfilePicture }] }, { id: 'phone', label: '填寫聯絡電話', details: [{ id: 'done', label: '完成', completed: !!p?.hasContactNumber }] } ] },
    { id: 'mbti', title: 'MBTI 型態', checklistItems: [ { id: 'mbti', label: '填寫 MBTI', details: [{ id: 'done', label: '完成', completed: !!p?.hasMbtiType }] } ] },
    { id: 'nfc', title: 'NFC 名片', checklistItems: [ { id: 'nfc', label: '設定名片', details: [{ id: 'done', label: '完成', completed: !!p?.hasNfcCard }] } ] },
    { id: 'foundation', title: '商會地基', checklistItems: [ { id: 'foundation', label: '閱讀商會地基', details: [{ id: 'done', label: '完成', completed: !!p?.foundationViewed }] } ] },
  ]), [p]);

  const overall = useMemo(() => calcOverall(items), [items]);

  if (loading) return <div className="p-6 sm:p-8"><LoadingSpinner size="large" /></div>;
  if (error) return <div className="p-6 text-red-300">{error}</div>;
  if (!member) return <div className="p-6 text-gold-200">找不到會員資料</div>;

  const percentShow = overall.percentage;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <button onClick={() => navigate(-1)} className="inline-flex items-center text-gold-300 hover:text-gold-100"><ChevronLeftIcon className="h-5 w-5 mr-1" /> 返回</button>
        <div className="flex items-center"><Avatar src={member.profilePictureUrl} alt={member.name} size="medium" /><div className="ml-3"><div className="text-gold-100 font-semibold">{member.name}</div><div className="text-sm text-gold-400 truncate">{member.company} ・ {member.title}</div></div></div>
      </div>

      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-1"><span className="text-sm sm:text-xs text-gold-300">整體完成度</span><span className="text-sm sm:text-xs text-gold-100 font-semibold">{percentShow}%</span></div>
        <div className="w-full h-3 sm:h-2 bg-primary-700 rounded"><div className={`h-3 sm:h-2 rounded ${percentShow >= 80 ? 'bg-green-500' : percentShow >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${percentShow}%` }} /></div>
        <div className="mt-2 text-xs text-gold-400">已完成 {overall.completed} / {overall.total}</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map(card => { const prog = calcCard(card); return (
          <div key={card.id} className="card p-4">
            <div className="flex items-center justify-between mb-2"><div className="font-semibold text-gold-100">{card.title}</div><div className="text-xs text-gold-400">{prog.completed}/{prog.total} ({prog.percentage}%)</div></div>
            <div className="w-full h-3 sm:h-2 bg-primary-700 rounded mb-2"><div className={`h-3 sm:h-2 rounded ${prog.percentage >= 80 ? 'bg-green-500' : prog.percentage >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${prog.percentage}%` }} /></div>
            <ul className="space-y-1">{card.checklistItems.map(group => (
              <li key={group.id} className="text-gold-200 text-sm"><div className="font-medium mb-1">{group.label || '任務'}</div>{(group.details || []).map(d => (
                <div key={d.id} className="flex items-center justify-between text-sm"><span className="text-gold-300">• {d.label}</span><span className={`text-xs font-medium ${d.completed ? 'text-green-400' : 'text-gold-500'}`}>{d.completed ? '完成' : '未完成'}</span></div>
              ))}</li>
            ))}</ul>
          </div>
        );})}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        <div className="card p-3"><div className="text-xs text-gold-400 mb-1 inline-flex items-center"><CalendarIcon className="h-4 w-4 mr-1"/>會議互動</div><div className="text-gold-100 text-lg font-semibold">{p.meetingsCount || 0}</div></div>
        <div className="card p-3"><div className="text-xs text-gold-400 mb-1 inline-flex items-center"><ClipboardDocumentListIcon className="h-4 w-4 mr-1"/>任務完成</div><div className="text-gold-100 text-lg font-semibold">{p.tasks?.completed || 0}</div></div>
        <div className="card p-3"><div className="text-xs text-gold-400 mb-1 inline-flex items-center"><ChartBarIcon className="h-4 w-4 mr-1"/>BM 點擊</div><div className="text-gold-100 text-lg font-semibold">{p.bmCardClicks || 0}</div></div>
        <div className="card p-3"><div className="text-xs text-gold-400 mb-1">活動參與</div><div className="text-gold-100 text-lg font-semibold">{p.eventsCount || 0}</div></div>
      </div>
    </div>
  );
};

export default MemberProgress;