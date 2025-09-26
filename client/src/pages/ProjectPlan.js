import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from '../config/axios';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';
import {
  UserIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';
// 新增：黑金樣式中的服裝儀容附件展示
import DressCodeExamples from '../components/DressCodeExamples';
// 新增：提示複製郵件內容
import { toast } from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const ProjectPlan = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const [member, setMember] = useState(null);
  const [projectPlan, setProjectPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingPlan, setLoadingPlan] = useState(true);
  const [error, setError] = useState(null);
  // 新增：教練任務滑動索引與勾選狀態持久化（沿用 CoachDashboard 的鍵值，確保一致）
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [checklistStates, setChecklistStates] = useState(() => {
    const savedV2 = localStorage.getItem('coachDashboardChecklistStatesV2');
    if (savedV2) return JSON.parse(savedV2);
    const savedV1 = localStorage.getItem('coachDashboardChecklistStates');
    if (savedV1) return flattenToNested(JSON.parse(savedV1));
    return {};
  });
  const [batchingEnabled, setBatchingEnabled] = useState(false); // 預設關閉批次模式，確保即時同步
  const [pendingUpdates, setPendingUpdates] = useState([]);
  const [recentUpdates, setRecentUpdates] = useState(new Map()); // 追蹤最近的本地更新，防止SSE覆蓋
  // 已移除：卡片級變更與提交狀態（SSE 即時同步下不再需要）

  // 新增：核心/幹部會員名單狀態
  const [coreMembers, setCoreMembers] = useState([]);
  const [staffMembers, setStaffMembers] = useState([]);
  const [coreMembersLoading, setCoreMembersLoading] = useState(false);
  const [staffMembersLoading, setStaffMembersLoading] = useState(false);

  // 新增：從專案計劃映射自動偵測欄位，與 MemberProgress 對齊
  const p = React.useMemo(() => {
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
      understoodGuidelines: !!(projectPlan.understood_guidelines ?? projectPlan.understoodGuidelines),
      weekOneComplete: !!(projectPlan.week_one_complete ?? projectPlan.weekOneComplete),
      weekTwoComplete: !!(projectPlan.week_two_complete ?? projectPlan.weekTwoComplete),
      weekThreeComplete: !!(projectPlan.week_three_complete ?? projectPlan.weekThreeComplete),
      weekFourComplete: !!(projectPlan.week_four_complete ?? projectPlan.weekFourComplete),
      graduationComplete: !!(projectPlan.graduation_complete ?? projectPlan.graduationComplete),
      progress: { overallPercent: Number(projectPlan.summary?.percent ?? 0) }
    };
  }, [projectPlan]);



  const fetchMemberData = useCallback(async () => {
    try {
      setLoading(true);
      // 修正：正確的會員資料 API 路徑，並取出 member 物件
      const response = await axios.get(`/api/users/member/${id}`);
      setMember(response.data?.member || response.data || null);
    } catch (err) {
      console.error('Failed to fetch member data:', err);
      setError('無法載入會員資料');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchProjectPlan = useCallback(async () => {
    try {
      setLoadingPlan(true);
      const response = await axios.get(`/api/users/member/${id}/project-plan`);
      setProjectPlan(response.data || null);
    } catch (err) {
      console.error('Failed to load project plan:', err);
      setError('無法載入專案計劃');
    } finally {
      setLoadingPlan(false);
    }
  }, [id]);

  useEffect(() => {
    fetchMemberData();
    fetchProjectPlan();
    // 初始化載入勾選狀態
    (async () => {
      try {
        console.log(`[DEBUG] 開始載入初始勾選狀態: memberId=${id}`);
        const { data } = await axios.get(`/api/users/member/${id}/project-plan/checklist`);
        const serverFlat = (data?.states && typeof data.states === 'object') ? data.states : {};
        console.log(`[DEBUG] 從服務器載入的初始狀態:`, serverFlat);
        applyMemberStates(id, serverFlat, true); // 標記為API響應
        console.log(`[DEBUG] 初始狀態載入完成`);
      } catch (e) {
        console.warn('載入勾選狀態失敗，使用空狀態繼續', e?.response?.data || e.message);
        setChecklistStates({});
      }
    })();
  }, [id, fetchMemberData, fetchProjectPlan]);

  // 載入核心/幹部會員名單（沿用 CoachDashboard API）
  const fetchCoreMembers = useCallback(async () => {
    try {
      setCoreMembersLoading(true);
      const resp = await axios.get('/api/users/core-members');
      setCoreMembers(resp.data?.coreMembers || []);
    } catch (e) {
      console.warn('載入核心會員失敗', e?.response?.data || e.message);
      setCoreMembers([]);
    } finally {
      setCoreMembersLoading(false);
    }
  }, []);

  const fetchStaffMembers = useCallback(async () => {
    try {
      setStaffMembersLoading(true);
      const resp = await axios.get('/api/users/staff-members');
      setStaffMembers(resp.data?.staffMembers || []);
    } catch (e) {
      console.warn('載入幹部會員失敗', e?.response?.data || e.message);
      setStaffMembers([]);
    } finally {
      setStaffMembersLoading(false);
    }
  }, []);

  // 初始載入核心/幹部名單
  useEffect(() => {
    fetchCoreMembers();
    fetchStaffMembers();
  }, [fetchCoreMembers, fetchStaffMembers]);

  // SSE 連線狀態
  const [sseStatus, setSseStatus] = useState('connecting');
  // SSE 訂閱：即時同步教練任務勾選狀態
  useEffect(() => {
    if (!id) return;
    let es;
    try {
      setSseStatus('connecting');
      const url = `/api/users/member/${id}/project-plan/events`;
      console.log(`[DEBUG] 建立SSE連接: ${url}`);
      es = new EventSource(url, { withCredentials: true });

      es.onopen = () => {
        console.log(`[DEBUG] SSE連接已建立`);
        setSseStatus('connected');
      };

      const onChecklistUpdated = (e) => {
        try {
          console.log(`[DEBUG] 收到SSE事件 project-plan-checklist-updated:`, e.data);
          const payload = JSON.parse(e.data || '{}');
          const flat = (payload?.states && typeof payload.states === 'object') ? payload.states : {};
          const targetMemberId = payload?.memberId || id;
          console.log(`[DEBUG] 應用狀態更新: memberId=${targetMemberId}, states=`, flat);
          applyMemberStates(targetMemberId, flat, false); // 標記為SSE事件，不是API響應
        } catch (err) {
          console.warn('解析 SSE 勾選狀態更新事件失敗:', err);
        }
      };

      es.addEventListener('project-plan-checklist-updated', onChecklistUpdated);
      es.addEventListener('heartbeat', () => {});
      es.onerror = (err) => {
        console.warn('專案計劃 SSE 連線錯誤:', err);
        setSseStatus('reconnecting');
      };
    } catch (e) {
      console.warn('建立專案計劃 SSE 失敗:', e);
      setSseStatus('reconnecting');
    }

    return () => {
      if (es) {
        try { es.close(); } catch (_) {}
      }
      setSseStatus('closed');
    };
  }, [id]);

  // 勾選狀態：套用伺服器返回狀態（支援 flat 物件或陣列格式），並與本地合併
  function applyMemberStates(memberId, states, isApiResponse = false) {
    try {
      const now = Date.now();
      // 將 states 轉為嵌套結構 { memberId: { cardId: { itemId: bool } } }
      let nested = {};
      if (Array.isArray(states)) {
        states.forEach(s => {
          if (!s || typeof s !== 'object') return;
          const mid = String(s.memberId || member?.id || memberId);
          const cid = String(s.cardId || '');
          const iid = String(s.itemId || '');
          if (!mid || !cid || !iid) return;
          setNested(nested, mid, cid, iid, !!s.value);
        });
      } else if (states && typeof states === 'object') {
        nested = flattenToNested(states);
      }

      // 合併到現有狀態（避免短時間內本地更新被覆蓋：若最近有本地更新，則跳過服務器覆蓋）
      setChecklistStates(prev => {
        const merged = { ...prev };
        Object.entries(nested).forEach(([mid, cards]) => {
          Object.entries(cards || {}).forEach(([cid, items]) => {
            Object.entries(items || {}).forEach(([iid, val]) => {
              const key = `${mid}_${cid}_${iid}`;
              const ts = recentUpdates.get(key);
              if (ts && (now - ts) < 1500 && !isApiResponse) {
                // 在 1.5 秒內的本地更新，略過 SSE 覆蓋
                return;
              }
              setNested(merged, mid, cid, iid, !!val);
            });
          });
        });
        // 同步到本地儲存（僅保留最新完整狀態的快照）
        try { localStorage.setItem('coachDashboardChecklistStatesV2', JSON.stringify(merged)); } catch (_) {}
        return merged;
      });
    } catch (e) {
      console.warn('applyMemberStates 失敗:', e);
    }
  }

  // 讀取勾選狀態（若不存在，回傳預設值）
  function getCheckboxState(memberId, cardId, itemId, defaultState = false) {
    return getNested(checklistStates, memberId, cardId, itemId, defaultState);
  }

  // 更新勾選狀態：立即更新本地，並依模式決定即時提交或加入批次
  async function updateCheckboxState(memberId, cardId, itemId, newState) {
    const key = `${memberId}_${cardId}_${itemId}`;
    const now = Date.now();
    // 1) 先更新本地狀態，提升互動即時性
    setChecklistStates(prev => {
      const next = { ...prev };
      setNested(next, memberId, cardId, itemId, !!newState);
      try { localStorage.setItem('coachDashboardChecklistStatesV2', JSON.stringify(next)); } catch (_) {}
      return next;
    });

    // 記錄最近本地更新，避免 SSE 立即覆蓋
    setRecentUpdates(prev => {
      const m = new Map(prev);
      m.set(key, now);
      return m;
    });

    // 已移除：記錄卡片級變更（SSE 即時同步，不再需要卡片級提交）

    // 依模式同步到伺服器
    if (batchingEnabled) {
      setPendingUpdates(prev => ([...prev, { memberId, cardId, itemId, value: !!newState }]));
      return;
    }

    try {
      const { data } = await axios.post(`/api/users/member/${memberId}/project-plan/checklist`, {
        states: [{ memberId, cardId, itemId, value: !!newState }]
      });
      if (data && data.states) {
        applyMemberStates(memberId, data.states, true);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || '同步失敗，請稍後重試');
    }
  }

  const getMembershipLevelBadge = (level) => {
    const badges = {
      1: { text: '金級會員', class: 'bg-primary-800/60 text-gold-300 border border-gold-700' },
      2: { text: '銀級會員', class: 'bg-primary-800/60 text-gold-300 border border-gold-700' },
      3: { text: '銅級會員', class: 'bg-primary-800/60 text-gold-300 border border-gold-700' }
    };
    const badge = badges[level] || { text: '未知', class: 'bg-primary-800/60 text-gold-300 border border-gold-700' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.class}`}>
        {badge.text}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      'active': { text: '啟用', class: 'bg-primary-800/60 text-gold-300 border border-gold-700' },
      'pending': { text: '待審核', class: 'bg-primary-800/60 text-gold-300 border border-gold-700' },
      'suspended': { text: '停權', class: 'bg-primary-800/60 text-gold-300 border border-gold-700' }
    };
    const badge = badges[status] || { text: '未知', class: 'bg-primary-800/60 text-gold-300 border border-gold-700' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.class}`}>
        {badge.text}
      </span>
    );
  };

  const sendBatchUpdates = async () => {
    if (!pendingUpdates.length) return;
    try {
      const { data } = await axios.post(`/api/users/member/${id}/project-plan/checklist`, { states: pendingUpdates });
      if (data && data.states) {
        applyMemberStates(id, data.states, true); // 標記為API響應
      }
      toast.success('批次提交成功');
      setPendingUpdates([]);
    } catch (e) {
      toast.error(e?.response?.data?.message || '批次提交失敗');
    }
  };

  // 已移除：卡片級提交函式（SSE 即時同步 + 頂部批次提交即可）

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error}</div>
        <Link to="/coach" className="text-gold-300 hover:text-gold-100">
          回到 教練儀表板
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 返回按鈕 */}
      <div className="mb-6">
        <Link
          to="/coach"
          className="inline-flex items-center text-gold-300 hover:text-gold-100"
        >
          <ChevronLeftIcon className="h-5 w-5 mr-1" />
          回到 教練儀表板
        </Link>
      </div>

      {/* 會員基本資訊 */}
      <div className="bg-primary-800 border border-gold-600 rounded-lg shadow-lg p-6 text-gold-100 mb-8">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Avatar
              src={member?.profilePictureUrl}
              alt={member?.name}
              size="xl"
              className="bg-primary-700/40"
              fallbackIcon={UserIcon}
              fallbackIconClass="text-gold-200"
            />
          </div>
          <div className="ml-6 flex-1">
            <h1 className="text-2xl font-bold text-gold-100">{member?.name}</h1>
            <p className="text-gold-300 mt-1">{member?.email}</p>
            <div className="flex items-center space-x-4 mt-3">
              {member?.membershipLevel ? getMembershipLevelBadge(member.membershipLevel) : null}
              {member?.status ? getStatusBadge(member.status) : null}
            </div>
          </div>
          <div className="flex-shrink-0">
            <ChartBarIcon className="h-12 w-12 text-gold-400" />
          </div>
        </div>
      </div>

      {/* 專案計劃內容 */}
      <div className="bg-primary-800 border border-gold-600 rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gold-600">
          <h2 className="text-xl font-semibold text-gold-100 flex items-center">
            <ChartBarIcon className="h-6 w-6 mr-2 text-gold-400" />
            專案計劃（12 項自動判定）
          </h2>
        </div>
        <div className="p-6">
          {loadingPlan && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gold-300">載入專案計劃中...</span>
            </div>
          )}
          {!loadingPlan && projectPlan && (
            <> 
              {/* 進度總覽 */}
              <div className="mb-8">
                {(() => {
                  const percentShow = Math.round(Number(projectPlan?.summary?.percent ?? 0));
                  return (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gold-300">進度</span>
                        <span className="text-sm text-gold-100 font-semibold">{percentShow}%</span>
                      </div>
                      <div className="w-full h-3 sm:h-2 bg-primary-700 rounded">
                        <div
                          className={`h-3 sm:h-2 rounded ${percentShow >= 80 ? 'bg-green-500' : percentShow >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${percentShow}%` }}
                        />
                      </div>
                    </>
                  );
                })()}
                {/* 勾選完成度統計（移除「手動」字樣） */}
                {(() => {
                  const spec = [
                    { cardId: 'core_member_approval', items: ['create_group','member_data','send_email'] },
                    { cardId: 'pre_oath_preparation', items: ['self_intro_template','explain_goals_foundation'] },
                    { cardId: 'day_before_oath', items: ['attendance_time','self_intro_50sec','dress_code','business_cards','four_week_plan','send_email'] },
                    { cardId: 'ceremony_day', items: ['intro_guide','environment_intro','core_staff_intro'] },
                    { cardId: 'networking_time', items: ['networking_guide'] },
                    { cardId: 'meeting_guidelines', items: ['phone_silent','simple_explanation'] },
                    { cardId: 'post_meeting', items: ['join_line_groups','system_teaching'] },
                    { cardId: 'one_week_followup', items: ['check_login','interview_form_check','expose_products','visit_partners'] },
                    { cardId: 'second_week', items: ['guide_guest_purpose','invite_agent_meeting','deep_communication_form','core_member_one_on_one'] },
                    { cardId: 'third_week', items: ['system_usage_check','staff_one_on_one'] },
                    { cardId: 'fourth_week', items: ['system_status_check','core_staff_one_on_one','presentation_optimization'] },
                    { cardId: 'graduation_standards', items: ['core_staff_one_on_one_final','system_training_complete','basic_referral_behavior','group_announcement_welcome'] }
                  ];
                  const manualTotal = spec.reduce((sum, s) => sum + s.items.length, 0);
                  const manualChecked = spec.reduce((sum, s) => sum + s.items.filter(itemId => getCheckboxState(id, s.cardId, itemId, false)).length, 0);
                  return (
                    <div className="flex justify-between text-sm text-gold-300 mt-2">
                      <span>勾選已完成 {manualChecked} 項</span>
                      <span>共 {manualTotal} 項</span>
                    </div>
                  );
                })()}
                {/* 勾選完成度統計（移除「手動」字樣） */}
                {(() => {
                  const spec = [
                    { cardId: 'core_member_approval', items: ['create_group','member_data','send_email'] },
                    { cardId: 'pre_oath_preparation', items: ['self_intro_template','explain_goals_foundation'] },
                    { cardId: 'day_before_oath', items: ['attendance_time','self_intro_50sec','dress_code','business_cards','four_week_plan','send_email'] },
                    { cardId: 'ceremony_day', items: ['intro_guide','environment_intro','core_staff_intro'] },
                    { cardId: 'networking_time', items: ['networking_guide'] },
                    { cardId: 'meeting_guidelines', items: ['phone_silent','simple_explanation'] },
                    { cardId: 'post_meeting', items: ['join_line_groups','system_teaching'] },
                    { cardId: 'one_week_followup', items: ['check_login','interview_form_check','expose_products','visit_partners'] },
                    { cardId: 'second_week', items: ['guide_guest_purpose','invite_agent_meeting','deep_communication_form','core_member_one_on_one'] },
                    { cardId: 'third_week', items: ['system_usage_check','staff_one_on_one'] },
                    { cardId: 'fourth_week', items: ['system_status_check','core_staff_one_on_one','presentation_optimization'] },
                    { cardId: 'graduation_standards', items: ['core_staff_one_on_one_final','system_training_complete','basic_referral_behavior','group_announcement_welcome'] }
                  ];
                  const manualTotal = spec.reduce((sum, s) => sum + s.items.length, 0);
                  const manualChecked = spec.reduce((sum, s) => sum + s.items.filter(itemId => getCheckboxState(id, s.cardId, itemId, false)).length, 0);
                  const manualPercent = manualTotal ? Math.round((manualChecked / manualTotal) * 100) : 0;
                  return (
                    <div className="flex justify-between text-sm text-gold-300 mt-2">
                      <span>勾選已完成 {manualChecked} 項</span>
                      <span>勾選完成率 {manualPercent}% （共 {manualTotal} 項）</span>
                    </div>
                  );
                })()}
              </div>

              {/* 教練任務：12 張卡片（黑金樣式，非彈窗，直接顯示） */}
              <div className="mt-8">
                <div className="flex items-center gap-2 mb-3">
                  <ChartBarIcon className="h-5 w-5 text-gold-300" />
                  <div className="text-lg font-semibold text-gold-100">教練任務</div>
                  {(() => {
                    const map = {
                      connecting: { text: '連線中', dot: 'bg-yellow-500' },
                      connected: { text: '已連線', dot: 'bg-green-500' },
                      reconnecting: { text: '斷線，自動重試中', dot: 'bg-red-500 animate-pulse' },
                      closed: { text: '已關閉', dot: 'bg-gray-400' },
                    };
                    const info = map[sseStatus] || map.connecting;
                    return (
                      <div className="ml-2 flex items-center gap-1 text-xs text-gold-300 bg-primary-800/40 border border-gold-700/40 rounded px-2 py-0.5 hidden">
                        <span className={`inline-block w-2 h-2 rounded-full ${info.dot}`}></span>
                        <span>SSE {info.text}</span>
                      </div>
                    );
                  })()}
                  <div className="ml-auto flex items-center gap-2 hidden">
                    <span className="text-xs text-gold-300">
                      批次提交 {batchingEnabled ? '(已啟用 - 需手動提交)' : '(即時同步)'}
                    </span>
                    <button 
                      type="button" 
                      className={`px-2 py-1 text-xs ${batchingEnabled ? 'btn-warning' : 'btn-secondary'}`}
                      onClick={() => setBatchingEnabled(b => !b)}
                      title={batchingEnabled ? '點擊關閉批次模式，啟用即時同步' : '點擊啟用批次模式，手動提交更改'}
                    >
                      {batchingEnabled ? 'ON' : 'OFF'}
                    </button>
                    {batchingEnabled && (
                      <button 
                        type="button" 
                        className="btn-primary px-2 py-1 text-xs" 
                        disabled={!pendingUpdates.length} 
                        onClick={sendBatchUpdates}
                        title="提交所有累積的更改到服務器"
                      >
                        提交更動 ({pendingUpdates.length})
                      </button>
                    )}
                  </div>
                </div>
                {(() => {
                  const attachmentItems = [
                    {
                      id: 'core_member_approval',
                      title: '核心會員完成準予加入GBC',
                      subtitle: '對象：新會員、教練',
                      description: '教練需執行以下項目，完成後可勾選確認',
                      details: [
                        '建立群組',
                        '新會員提供基本資料及一張專業形象照片（基本資料系統自動抓學員的個人資料和大頭貼，大頭貼是能夠讓教練下載的）',
                        '發送給學員信件'
                      ],
                      completed: p?.hasInterview || false,
                      category: '基礎建立',
                      priority: 'high',
                      checklistItems: [
                        { id: 'create_group', text: '建立群組', completed: false },
                        { id: 'member_data', text: '新會員提供基本資料及一張專業形象照片', completed: false },
                        { id: 'send_email', text: '發送給學員信件', completed: false }
                      ],
                      emailTemplate: `${member?.name || '{memberName}'}您好:\n\n我是GBC教練{coachName}，代表性行業是{coachIndustry}，是未來4週陪伴您進入系統及融入分會的專屬教練，群組是本屆會長、副會長。\n\n未來如有任何問題，歡迎在群組請與我們提出及聯絡。\n\n最後，GBC所有教練歡迎您的加入，一同成長！`
                    },
                    {
                      id: 'pre_oath_preparation',
                      title: '新會員宣誓前3-7天準備',
                      subtitle: '對象：新會員、教練',
                      description: '協助新會員準備自我介紹範本及說明共同目標',
                      details: [
                        {
                          id: 'self_intro_template',
                          text: '協助新會員準備50秒自我介紹範本',
                          subtext: `大家好，我是${member?.industry || member?.company || 'OOO'}代表，${member?.name || 'XXX'}\n主要產品/服務內容\n成功見證\n主要代表性客戶\n獨特銷售或專業項\n請幫我引薦對象`,
                          completed: false,
                          type: 'checkbox'
                        },
                        { id: 'explain_goals_foundation', text: '再次說明共同目標及成功經驗', subtext: '', completed: false, type: 'checkbox' }
                      ],
                      completed: false,
                      category: '準備階段',
                      priority: 'high'
                    },
                    {
                      id: 'day_before_oath',
                      title: '宣誓前一天',
                      subtitle: '對象：新會員、教練',
                      description: '前一天提醒新會員內容',
                      details: [
                        { id: 'attendance_time', text: '出席時間 14:00', completed: false, type: 'checkbox' },
                        { id: 'self_intro_50sec', text: '50秒自我介紹', completed: false, type: 'checkbox' },
                        { id: 'dress_code', text: '服裝儀容，範例：(插上附件)', completed: false, type: 'checkbox' },
                        { id: 'business_cards', text: '準備30張名片', completed: false, type: 'checkbox' },
                        { id: 'four_week_plan', text: '4週導生計畫', completed: false, type: 'checkbox' },
                        { id: 'send_email', text: '發送給學員信件', completed: false, type: 'checkbox' }
                      ],
                      emailTemplate: `${member?.name || 'OO'}您好:\n\n提醒您\n今天需請您練習50秒自我介紹!\n掌握好上台狀況很重要，若怕緊張可以帶上手稿上台，請不要帶手機看稿！\n\n參與例會時注意事項:\n1.例會及培訓時請穿著正式服裝、配戴Pin章及名牌(襯衫、西裝、洋裝、皮鞋等)\n2.請帶名片(30張以上)\n3.明日到場時間14:00到達，我們將協助您教學以及認識夥伴。`,
                      completed: false,
                      category: '最終準備',
                      priority: 'high'
                    },
                    {
                      id: 'ceremony_day',
                      title: '第一天14:00宣前會',
                      subtitle: '對象：新會員、教練',
                      description: '教練需執行以下項目，完成後可勾選確認',
                      checklistItems: [
                        { id: 'intro_guide', text: '關心50秒自我介紹引薦單介紹內容' },
                        { id: 'environment_intro', text: '介紹環境' },
                        { id: 'core_staff_intro', text: '介紹核心幹部及職位內容' }
                      ],
                      completed: false,
                      category: '宣誓儀式',
                      priority: 'high'
                    },
                    {
                      id: 'networking_time',
                      title: '交流時間',
                      subtitle: '引導新會員認識會員及來賓',
                      description: '引導新會員認識會員及來賓(尤其要介紹與新會員同產業類別或可以合作的會員)',
                      checklistItems: [
                        { id: 'networking_guide', text: '引導新會員認識會員及來賓(尤其要介紹與新會員同產業類別或可以合作的會員)' }
                      ],
                      completed: false,
                      category: '社交建立',
                      priority: 'medium'
                    },
                    {
                      id: 'meeting_guidelines',
                      title: '例會中注意事項',
                      subtitle: '提醒手機關機或靜音、議程中如有需要說明，也請簡單說明即可，讓新會員專心參與議程',
                      description: '確保新會員了解例會禮儀和參與規範',
                      checklistItems: [
                        { id: 'phone_silent', text: '提醒手機關機或靜音，請全程專注投入議程，盡量不使用手機' },
                        { id: 'simple_explanation', text: '議程中如有需要說明，也請簡單說明即可，讓新會員專心參與議程' }
                      ],
                      completed: p?.understoodGuidelines || false,
                      category: '會議禮儀',
                      priority: 'medium'
                    },
                    {
                      id: 'post_meeting',
                      title: '會後',
                      subtitle: '對象：新會員、教練',
                      description: '執行：1.加入各大LINE群 2.系統教學',
                      checklistItems: [
                        { id: 'join_line_groups', text: '加入各大LINE群 LINE群：新會員專案群、GBC聊天群、活動公告欄（請勿回覆）、分組第__組、軟性活動接龍群' },
                        { id: 'system_teaching', text: '系統教學：一對一、引薦單、引薦金額意義及操作' }
                      ],
                      completed: false,
                      category: '系統整合',
                      priority: 'high'
                    },
                    {
                      id: 'one_week_followup',
                      title: '一週內需完成',
                      subtitle: '對象：教練',
                      description: '執行：1.兩天內確認系統是否能登入 2.教學系統個人深度交流表填寫 3.幫你的新會員曝光介紹及見證導生的產品或服務 4.多先參訪夥伴或體驗產品',
                      checklistItems: [
                        { id: 'check_login', text: '兩天內確認系統是否能登入' },
                        { id: 'interview_form_check', text: '教學系統個人深度交流表填寫', subtext: '', completed: getCheckboxState(id, 'one_week_followup', 'interview_form_check', p?.hasInterview || false), progressBar: { show: false, value: getCheckboxState(id, 'one_week_followup', 'interview_form_check', p?.hasInterview || false) ? 100 : 0, label: getCheckboxState(id, 'one_week_followup', 'interview_form_check', p?.hasInterview || false) ? '已完成' : '' } },
                        { id: 'expose_products', text: '幫你的新會員曝光介紹及見證導生的產品或服務，重點在讓新會員覺得有被重視' },
                        { id: 'visit_partners', text: '多先參訪夥伴或體驗產品' }
                      ],
                      completed: p?.weekOneComplete || false,
                      category: '跟進確認',
                      priority: 'high'
                    },
                    {
                      id: 'second_week',
                      title: '第二週',
                      subtitle: '對象：新會員、教練',
                      description: '執行：1.引導新會員為何帶來賓 2.引導新會員邀請代理人參觀例會議程 3.深度交流表完成 4.優先與核心一對一',
                      checklistItems: [
                        { id: 'guide_guest_purpose', text: '引導新會員為何帶來賓' },
                        { id: 'invite_agent_meeting', text: '引導新會員邀請代理人參觀例會議程' },
                        { id: 'deep_communication_form', text: '深度交流表完成', subtext: '', completed: p?.hasInterview || false, progressBar: { value: p?.hasInterview ? 100 : 0, label: p?.hasInterview ? '已完成' : '', color: p?.hasInterview ? 'green' : 'red' } },
                        { id: 'core_members_list', text: `系統偵測到 ${coreMembers.length} 位核心權限會員`, type: 'core_members_list', coreMembers: coreMembers, loading: coreMembersLoading },
                        { id: 'core_member_one_on_one', text: '優先與核心一對一' }
                      ],
                      completed: p?.weekTwoComplete || false,
                      category: '深度整合',
                      priority: 'medium'
                    },
                    {
                      id: 'third_week',
                      title: '第三週',
                      subtitle: '對象：新會員、教練',
                      description: '執行：1.確認新會員系統使用狀況及進度 2.與幹部一對一狀況交流及回報進度',
                      checklistItems: [
                        { id: 'system_usage_check', text: '確認新會員系統使用狀況及進度' },
                        { id: 'staff_members_list', text: `系統偵測到 ${staffMembers.length} 位幹部權限會員`, type: 'staff_members_list', staffMembers: staffMembers, loading: staffMembersLoading },
                        { id: 'staff_one_on_one', text: '與幹部一對一狀況交流及回報進度' }
                      ],
                      completed: p?.weekThreeComplete || false,
                      category: '進度追蹤',
                      priority: 'medium'
                    },
                    {
                      id: 'fourth_week',
                      title: '第四週',
                      subtitle: '對象：新會員、教練',
                      description: '執行：1.確認新會員使用系統狀況及進度 2.確認與核心及幹部一對一進度狀況 3.優化自我介紹及介紹主題簡報(50秒、20分鐘)',
                      checklistItems: [
                        { id: 'system_status_check', text: '確認新會員使用系統狀況及進度' },
                        { id: 'core_staff_one_on_one', text: '確認與核心及幹部一對一進度狀況' },
                        { id: 'presentation_optimization', text: '優化自我介紹及介紹主題簡報(50秒、20分鐘)' }
                      ],
                      completed: p?.weekFourComplete || false,
                      category: '技能提升',
                      priority: 'high'
                    },
                    {
                      id: 'graduation_standards',
                      title: '結業標準',
                      subtitle: '對象：新會員',
                      description: '執行：1.核心幹部一對一 2.完成系統教學 3.完成基本引薦行為 4.公告群組歡迎與其一對一',
                      checklistItems: [
                        { id: 'core_staff_one_on_one_final', text: '核心幹部一對一' },
                        { id: 'system_training_complete', text: '完成系統教學' },
                        { id: 'basic_referral_behavior', text: '完成基本引薦行為' },
                        { id: 'group_announcement_welcome', text: '公告群組歡迎與其一對一' }
                      ],
                      completed: p?.graduationComplete || false,
                      category: '結業認證',
                      priority: 'high'
                    }
                  ];
                  const currentCard = attachmentItems[currentCardIndex] || attachmentItems[0];
                  const nextCard = () => setCurrentCardIndex((prev) => (prev + 1) % attachmentItems.length);
                  const prevCard = () => setCurrentCardIndex((prev) => (prev - 1 + attachmentItems.length) % attachmentItems.length);
                  const getCardStyle = () => 'border-gold-600 bg-primary-700/50';
                  const getStatusColor = (completed) => (completed ? 'text-green-400' : 'text-gold-400');
                  const copyEmailTemplate = (template) => {
                    const emailContent = (template || '')
                      .replace(/\{memberName\}/g, member?.name || '學員姓名')
                      .replace(/\{coachName\}/g, user?.name || '教練')
                      .replace(/\{coachIndustry\}/g, user?.industry || user?.company || '行業');
                    navigator.clipboard.writeText(emailContent).then(() => toast.success('郵件內容已複製')).catch(() => toast.error('複製失敗'));
                  };
                  const sendEmail = async (template, toEmail, memberName) => {
                    try {
                      const subject = `${memberName || member?.name || ''} 教練通知`;
                      const content = (template || '')
                        .replace(/\{memberName\}/g, memberName || member?.name || '學員')
                        .replace(/\{coachName\}/g, user?.name || '教練')
                        .replace(/\{coachIndustry\}/g, user?.industry || user?.company || '行業');
                      const to = toEmail || member?.email;
                      if (!to) {
                        toast.error('找不到學員的收件信箱');
                        return;
                      }
                      await axios.post('/api/emails/send', { to, subject, content, type: 'project_plan' });
                      toast.success('郵件已發送');
                    } catch (e) {
                      const msg = e?.response?.data?.message || '郵件發送失敗';
                      toast.error(msg);
                    }
                  };
                  return (
                    <div className="bg-primary-700/40 rounded-lg border border-gold-700 overflow-hidden">
                      {/* 卡片導航指示器 */}
                      <div className="flex items-center justify-between p-3 border-b border-gold-700/50">
                        <div className="flex gap-1">
                          {attachmentItems.map((_, index) => (
                            <button
                              key={index}
                              onClick={() => setCurrentCardIndex(index)}
                              className={`w-2 h-3 sm:h-2 rounded-full transition-colors ${index === currentCardIndex ? 'bg-gold-400' : 'bg-gold-700'}`}
                              aria-label={`切換到卡片 ${index + 1}`}
                            />
                          ))}
                        </div>
                        <div className="text-sm sm:text-xs text-gold-300">{currentCardIndex + 1} / {attachmentItems.length}</div>
                      </div>
                      {/* 主要卡片內容 */}
                      <div className="relative">
                        <div className="px-12 py-6 max-h-96 overflow-y-auto">
                          <div className={`rounded-lg border-2 p-4 sm:p-6 transition-all duration-300 ${getCardStyle()}`}>
                            {/* 標題區 */}
                            <div className="flex items-start justify-between mb-3 sm:mb-4">
                              <div className="flex-1 pr-4">
                                <div className="flex items-center gap-2 sm:gap-3 mb-2">
                                  {currentCard.completed ? (
                                    <CheckCircleIcon className="h-7 w-7 text-green-400" />
                                  ) : (
                                    <ClockIcon className="h-7 w-7 text-gold-400" />
                                  )}
                                  <h3 className={`text-xl font-bold ${getStatusColor(currentCard.completed)}`}>{currentCard.title}</h3>
                                </div>
                                <p className="text-base text-gold-300 mb-2 font-medium">{currentCard.subtitle}</p>
                                <p className="text-sm text-gold-400 mb-2 leading-relaxed">{currentCard.description}</p>
                                {/* 詳細內容或勾選清單 */}
                                {currentCard.checklistItems && currentCard.checklistItems.length > 0 && (
                                  <div className="mt-2">
                                    <div className="text-sm text-gold-300 mb-2 font-semibold">執行清單：</div>
                                    {(() => {
                                      const allCoreChecked = coreMembers.length > 0 && coreMembers.every(m => getCheckboxState(id, 'second_week', `core_member_${m.id}`, false));
                                      const allStaffChecked = staffMembers.length > 0 && staffMembers.every(m => getCheckboxState(id, 'third_week', `staff_member_${m.id}`, false));
                                      return (
                                        <ul className="space-y-3">
                                          {currentCard.checklistItems.map((detail, index) => (
                                            <li key={index} className="flex items-start">
                                              {/* 名單型子項目的自訂渲染 */}
                                              {detail.type === 'core_members_list' ? (
                                                <div className="flex-1">
                                                  <span className="leading-relaxed text-gold-100">{detail.text}</span>
                                                  <div className="ml-0 mt-2 w-full">
                                                    {detail.loading ? (
                                                      <div className="text-xs text-gold-400">載入核心會員名單中...</div>
                                                    ) : detail.coreMembers && detail.coreMembers.length > 0 ? (
                                                      <div className="space-y-2">
                                                        <div className="text-sm sm:text-xs text-gold-300 font-semibold">核心會員名單：</div>
                                                        <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                                                          {detail.coreMembers.map((m, mi) => (
                                                            <div key={m.id || mi} className="flex items-center justify-between bg-primary-800/40 p-2 rounded border border-gold-700/30">
                                                              <div className="flex items-center space-x-2">
                                                                <Avatar src={m.profilePicture} name={m.name} size="sm" />
                                                                <div>
                                                                  <div className="text-sm sm:text-xs text-gold-300 font-medium">{m.name}</div>
                                                                  <div className="text-[10px] text-gold-500">{m.industry || m.company}</div>
                                                                </div>
                                                              </div>
                                                              <input
                                                                type="checkbox"
                                                                checked={getCheckboxState(id, currentCard.id, `core_member_${m.id}`, false)}
                                                                onChange={(e) => updateCheckboxState(id, currentCard.id, `core_member_${m.id}`, e.target.checked)}
                                                                className="w-4 h-4 text-gold-500 bg-primary-700 border-gold-600 rounded focus:ring-gold-500 focus:ring-2"
                                                              />
                                                            </div>
                                                          ))}
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <div className="text-xs text-gold-500">暫無核心會員資料</div>
                                                    )}
                                                  </div>
                                                </div>
                                              ) : detail.type === 'staff_members_list' ? (
                                                <div className="flex-1">
                                                  <span className="leading-relaxed text-gold-100">{detail.text}</span>
                                                  <div className="ml-0 mt-2 w-full">
                                                    {detail.loading ? (
                                                      <div className="text-xs text-gold-400">載入幹部會員名單中...</div>
                                                    ) : detail.staffMembers && detail.staffMembers.length > 0 ? (
                                                      <div className="space-y-2">
                                                        <div className="text-sm sm:text-xs text-gold-300 font-semibold">幹部會員名單：</div>
                                                        <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
                                                          {detail.staffMembers.map((m, mi) => (
                                                            <div key={m.id || mi} className="flex items-center justify-between bg-primary-800/40 p-2 rounded border border-gold-700/30">
                                                              <div className="flex items-center space-x-2">
                                                                <Avatar src={m.profilePicture} name={m.name} size="sm" />
                                                                <div>
                                                                  <div className="text-sm sm:text-xs text-gold-300 font-medium">{m.name}</div>
                                                                  <div className="text-[10px] text-gold-500">{m.industry || m.company}</div>
                                                                </div>
                                                              </div>
                                                              <input
                                                                type="checkbox"
                                                                checked={getCheckboxState(id, currentCard.id, `staff_member_${m.id}`, false)}
                                                                onChange={(e) => updateCheckboxState(id, currentCard.id, `staff_member_${m.id}`, e.target.checked)}
                                                                className="w-4 h-4 text-gold-500 bg-primary-700 border-gold-600 rounded focus:ring-gold-500 focus:ring-2"
                                                              />
                                                            </div>
                                                          ))}
                                                        </div>
                                                      </div>
                                                    ) : (
                                                      <div className="text-xs text-gold-500">暫無幹部會員資料</div>
                                                    )}
                                                  </div>
                                                </div>
                                              ) : (
                                                // 一般項目與受 gating 控制的主選項
                                                <>
                                                  <input
                                                    type="checkbox"
                                                    id={`chk-${currentCard.id}-${detail.id}`}
                                                    checked={getCheckboxState(id, currentCard.id, detail.id, detail.completed)}
                                                    onChange={(e) => updateCheckboxState(id, currentCard.id, detail.id, e.target.checked)}
                                                    disabled={(detail.id === 'core_member_one_on_one' && !allCoreChecked) || (detail.id === 'staff_one_on_one' && !allStaffChecked)}
                                                    className={`mt-1 mr-3 h-4 w-4 text-gold-500 bg-primary-700 border-gold-600 rounded focus:ring-gold-500 focus:ring-2 ${(detail.id === 'core_member_one_on_one' && !allCoreChecked) || (detail.id === 'staff_one_on_one' && !allStaffChecked) ? 'opacity-60 cursor-not-allowed' : ''}`}
                                                  />
                                                  <label htmlFor={`chk-${currentCard.id}-${detail.id}`} className="leading-relaxed cursor-pointer text-gold-100">
                                                    {detail.text}
                                                  </label>
                                                  {(detail.id === 'core_member_one_on_one' && !allCoreChecked) && (
                                                    <div className="ml-7 mt-1 text-xs text-red-400 leading-relaxed">必須先完成勾選所有核心會員名單，才能勾選此主選項</div>
                                                  )}
                                                  {(detail.id === 'staff_one_on_one' && !allStaffChecked) && (
                                                    <div className="ml-7 mt-1 text-xs text-red-400 leading-relaxed">必須先完成勾選所有幹部會員名單，才能勾選此主選項</div>
                                                  )}
                                                  {detail.subtext && (
                                                    <div className="ml-7 mt-1 text-xs text-gold-400 leading-relaxed whitespace-pre-line bg-primary-800/30 p-3 rounded-lg border border-gold-700/40 w-full">{detail.subtext}</div>
                                                  )}
                                                  {detail.progressBar?.show && (
                                                    <div className="ml-7 mt-2 w-full">
                                                      <div className="w-full bg-gold-900/40 rounded-full h-2">
                                                        <div className={`h-2 rounded-full ${detail.progressBar.value === 100 ? 'bg-gold-500' : 'bg-gold-800/80'}`} style={{ width: `${detail.progressBar.value}%` }}></div>
                                                      </div>
                                                      <div className="mt-1 text-2xs text-gold-400">{detail.progressBar.label || ''}</div>
                                                    </div>
                                                  )}
                                                </>
                                              )}
                                            </li>
                                          ))}
                                        </ul>
                                      );
                                    })()}
                                  </div>
                                )}
                                {currentCard.details && currentCard.details.length > 0 && !currentCard.checklistItems && (
                                  <div className="mt-2">
                                    <div className="text-sm text-gold-300 mb-2 font-semibold">詳細內容：</div>
                                    <ul className="text-sm text-gold-400 space-y-3">
                                      {currentCard.details.map((detail, index) => (
                                        <li key={index} className="flex items-start">
                                          {typeof detail === 'object' && detail.type === 'checkbox' ? (
                                            <div className="w-full">
                                              <div className="flex items-start">
                                                <input type="checkbox" id={`detail-${index}`} checked={getCheckboxState(id, currentCard.id, detail.id, detail.completed)} onChange={(e) => updateCheckboxState(id, currentCard.id, detail.id, e.target.checked)} className="mt-1 mr-3 h-4 w-4 text-gold-500 bg-primary-700 border-gold-600 rounded focus:ring-gold-500 focus:ring-2" />
                                                <div className="flex-1">
                                                  <label htmlFor={`detail-${index}`} className="leading-relaxed font-medium cursor-pointer text-gold-100">{detail.text}</label>
                                                  {detail.subtext && (
                                                    <div className="mt-2 text-xs text-gold-500 leading-relaxed whitespace-pre-line bg-primary-800/30 p-2 rounded border border-gold-700/30">{detail.subtext}</div>
                                                  )}
                                                  {detail.id === 'dress_code' && (
                                                    <div className="mt-3"><DressCodeExamples /></div>
                                                  )}
                                                </div>
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              <span className="text-gold-500 mr-2 text-base">•</span>
                                              <span className="leading-relaxed text-gold-100">{typeof detail === 'string' ? detail : detail.text}</span>
                                            </>
                                          )}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {currentCard.emailTemplate && (
                                  <div className="mt-4 p-4 bg-primary-600/30 rounded-lg border border-gold-600/30">
                                    <div className="text-sm text-gold-300 mb-2 font-semibold">郵件模板</div>
                                    <pre className="text-xs sm:text-sm text-gold-200 whitespace-pre-wrap">{currentCard.emailTemplate}</pre>
                                    <div className="mt-3 flex gap-2">
                                      <button type="button" className="btn-secondary px-3 py-1" onClick={() => copyEmailTemplate(currentCard.emailTemplate)}>一鍵複製</button>
                                      <button type="button" className="btn-primary px-3 py-1" onClick={() => sendEmail(currentCard.emailTemplate, member?.email, member?.name)}>一鍵寄出</button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* 底部完成統計 */}
                            <div className="mt-4 pt-3 border-t border-gold-700/40 flex items-center justify-between text-sm">
                                  <div className="text-gold-300">已完成: {attachmentItems.filter(item => item.completed).length} / {attachmentItems.length}</div>
                                  <div className="text-gold-300">完成率: {Math.round((attachmentItems.filter(item => item.completed).length / attachmentItems.length) * 100)}%</div>
                                </div>
                                
                                {/* 已移除：卡片級變更提示與提交按鈕（即時同步模式下不需要手動提交） */}
                          </div>
                        </div>
                        {/* 左右切換按鈕 */}
                        <button type="button" onClick={prevCard} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full border border-gold-700 bg-primary-800/60 hover:bg-primary-700/60">
                          <ChevronLeftIcon className="h-5 w-5 text-gold-300" />
                        </button>
                        <button type="button" onClick={nextCard} className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full border border-gold-700 bg-primary-800/60 hover:bg-primary-700/60">
                          <ChevronRightIcon className="h-5 w-5 text-gold-300" />
                        </button>
                      </div>
                    </div>
                  );
                })()}
              </div>
              {/* 最後更新時間 */}
              {projectPlan.summary?.lastUpdated && (
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <div className="flex items-center text-sm text-gray-500">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    最後更新：{new Date(projectPlan.summary.lastUpdated).toLocaleString('zh-TW')}
                  </div>
                </div>
              )}
            </>
          )}
          
          {!loadingPlan && !projectPlan && (
            <div className="text-center py-12">
              <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <div className="text-lg text-gray-600 mb-2">尚無專案計劃資料</div>
              <div className="text-sm text-gray-500">
                專案計劃將根據會員的活動參與情況自動生成
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectPlan;

// 轉換工具：flat -> nested
const flattenToNested = (flat) => {
  const nested = {};
  if (!flat || typeof flat !== 'object') return nested;
  // 明確列出所有教練任務卡片的合法 cardId，避免錯誤拆分（例如 ceremony_day、core_member_approval 等）
  const knownCardIds = new Set([
    'core_member_approval',
    'pre_oath_preparation',
    'day_before_oath',
    'ceremony_day',
    'networking_time',
    'meeting_guidelines',
    'post_meeting',
    'one_week_followup',
    'second_week',
    'third_week',
    'fourth_week',
    'graduation_standards'
  ]);

  Object.entries(flat).forEach(([k, v]) => {
    const key = String(k);
    const firstUnderscore = key.indexOf('_');
    if (firstUnderscore <= 0) return;
    const memberId = key.slice(0, firstUnderscore);
    const rest = key.slice(firstUnderscore + 1); // 例如 'ceremony_day_intro_guide'

    let cardId = null;
    let itemId = null;

    // 優先使用「已知卡片ID的最長前綴匹配」來取得 cardId 與 itemId
    for (const cid of knownCardIds) {
      if (rest === cid) {
        // 沒有項目 id（極少數情況），略過
        cardId = cid;
        itemId = null;
        break;
      }
      if (rest.startsWith(cid + '_')) {
        cardId = cid;
        itemId = rest.slice(cid.length + 1);
        break;
      }
    }

    // 後備方案：維持舊的「前兩段」拆分邏輯（避免未知卡片ID時完全失效）
    if (!cardId) {
      const parts = rest.split('_');
      if (parts.length < 2) return;
      cardId = parts[0];
      itemId = parts.slice(1).join('_');
    }

    if (!memberId || !cardId || !itemId) return;

    nested[memberId] = nested[memberId] || {};
    nested[memberId][cardId] = nested[memberId][cardId] || {};
    nested[memberId][cardId][itemId] = !!v;
  });
  return nested;
};

const getNested = (state, memberId, cardId, itemId, defaultVal = false) => {
  return !!(state?.[memberId]?.[cardId]?.[itemId] ?? defaultVal);
};

const setNested = (state, memberId, cardId, itemId, value) => {
  if (!state[memberId]) state[memberId] = {};
  if (!state[memberId][cardId]) state[memberId][cardId] = {};
  state[memberId][cardId][itemId] = !!value;
  return state;
};

const mergeNested = (a, b) => {
  const out = JSON.parse(JSON.stringify(a || {}));
  Object.keys(b || {}).forEach(memberId => {
    out[memberId] = out[memberId] || {};
    Object.keys(b[memberId] || {}).forEach(cardId => {
      out[memberId][cardId] = out[memberId][cardId] || {};
      Object.keys(b[memberId][cardId] || {}).forEach(itemId => {
        out[memberId][cardId][itemId] = !!b[memberId][cardId][itemId];
      });
    });
  });
  return out;
};