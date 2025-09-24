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
  const [batchingEnabled, setBatchingEnabled] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState([]);

  // 新增：以伺服器為主的會員狀態覆蓋（用於 POST 成功與 SSE 事件）
  const applyMemberStates = (memberId, flatOrNested) => {
    try {
      const isFlat = flatOrNested && typeof flatOrNested === 'object' && Object.keys(flatOrNested).some(k => String(k).includes('_'));
      const nested = isFlat ? flattenToNested(flatOrNested) : (flatOrNested || {});
      setChecklistStates(prev => {
        const out = { ...prev };
        const mid = String(memberId);
        const prevMember = out[mid] || {};
        const newMember = nested[mid] || {};
        // 深度合併：以伺服器回傳覆蓋同鍵，保留未回傳鍵
        const mergedMember = { ...prevMember };
        Object.keys(newMember).forEach(cardId => {
          mergedMember[cardId] = { ...(mergedMember[cardId] || {}) };
          Object.keys(newMember[cardId] || {}).forEach(itemId => {
            mergedMember[cardId][itemId] = !!newMember[cardId][itemId];
          });
        });
        out[mid] = mergedMember;
        localStorage.setItem('coachDashboardChecklistStatesV2', JSON.stringify(out));
        return out;
      });
    } catch (e) {
      console.warn('applyMemberStates 失敗', e);
    }
  };

  const updateCheckboxState = (memberId, cardId, itemId, newState) => {
    const prevVal = getNested(checklistStates, memberId, cardId, itemId, false);
    // 本地樂觀更新
    setChecklistStates(prev => {
      const next = setNested({ ...prev }, memberId, cardId, itemId, newState);
      localStorage.setItem('coachDashboardChecklistStatesV2', JSON.stringify(next));
      return next;
    });
    if (batchingEnabled) {
      setPendingUpdates(prev => [...prev, { memberId, cardId, itemId, value: !!newState }]);
    } else {
      axios.post(`/api/users/member/${memberId}/project-plan/checklist`, { states: [{ memberId, cardId, itemId, value: !!newState }] })
        .then(({ data }) => {
          if (data && data.states) {
            applyMemberStates(memberId, data.states);
          }
        })
        .catch((err) => {
          // 回滾本地狀態，維持與伺服器一致
          setChecklistStates(prev => {
            const next = setNested({ ...prev }, memberId, cardId, itemId, prevVal);
            localStorage.setItem('coachDashboardChecklistStatesV2', JSON.stringify(next));
            return next;
          });
          toast.error(err?.response?.data?.message || '更新失敗，已回復原狀');
        });
    }
  };

  const getCheckboxState = (memberId, cardId, itemId, defaultState = false) => {
    return getNested(checklistStates, memberId, cardId, itemId, defaultState);
  };

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
      const response = await axios.get(`/api/users/${id}`);
      setMember(response.data);
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
    (async () => {
      try {
        const { data } = await axios.get(`/api/users/member/${id}/project-plan/checklist`);
        const serverFlat = (data?.states && typeof data.states === 'object') ? data.states : {};
        // 改為以伺服器為主覆蓋指定會員的狀態，避免合併造造成不一致
        applyMemberStates(id, serverFlat);
      } catch (e) {
        console.warn('載入勾選狀態失敗，使用本地資料繼續', e?.response?.data || e.message);
      }
    })();
  }, [id, fetchMemberData, fetchProjectPlan]);

  // SSE 連線狀態
  const [sseStatus, setSseStatus] = useState('connecting');
  // SSE 訂閱：即時同步教練任務勾選狀態
  useEffect(() => {
    if (!id) return;
    let es;
    try {
      setSseStatus('connecting');
      const url = `/api/users/member/${id}/project-plan/events`;
      es = new EventSource(url, { withCredentials: true });

      es.onopen = () => {
        setSseStatus('connected');
      };

      const onChecklistUpdated = (e) => {
        try {
          const payload = JSON.parse(e.data || '{}');
          const flat = (payload?.states && typeof payload.states === 'object') ? payload.states : {};
          const targetMemberId = payload?.memberId || id;
          applyMemberStates(targetMemberId, flat);
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

  const getMembershipLevelBadge = (level) => {
    const badges = {
      1: { text: '金級會員', class: 'bg-yellow-100 text-yellow-800' },
      2: { text: '銀級會員', class: 'bg-gray-100 text-gray-800' },
      3: { text: '銅級會員', class: 'bg-orange-100 text-orange-800' }
    };
    const badge = badges[level] || { text: '未知', class: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.class}`}>
        {badge.text}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const badges = {
      'active': { text: '啟用', class: 'bg-green-100 text-green-800' },
      'pending': { text: '待審核', class: 'bg-yellow-100 text-yellow-800' },
      'suspended': { text: '停權', class: 'bg-red-100 text-red-800' }
    };
    const badge = badges[status] || { text: '未知', class: 'bg-gray-100 text-gray-800' };
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
        applyMemberStates(id, data.states);
      }
      toast.success('批次提交成功');
      setPendingUpdates([]);
    } catch (e) {
      toast.error(e?.response?.data?.message || '批次提交失敗');
    }
  };

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
        <Link to="/members" className="text-blue-600 hover:text-blue-800">
          返回會員列表
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 返回按鈕 */}
      <div className="mb-6">
        <Link
          to={`/members/${id}`}
          className="inline-flex items-center text-blue-600 hover:text-blue-800"
        >
          <ChevronLeftIcon className="h-5 w-5 mr-1" />
          返回會員詳情
        </Link>
      </div>

      {/* 會員基本資訊 */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-6 text-white mb-8">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <Avatar
              src={member?.profilePictureUrl}
              alt={member?.name}
              size="xl"
              className="bg-white bg-opacity-20"
              fallbackIcon={UserIcon}
              fallbackIconClass="text-white"
            />
          </div>
          <div className="ml-6 flex-1">
            <h1 className="text-2xl font-bold">{member?.name}</h1>
            <p className="text-blue-100 mt-1">{member?.email}</p>
            <div className="flex items-center space-x-4 mt-3">
              {member?.membershipLevel ? getMembershipLevelBadge(member.membershipLevel) : null}
              {member?.status ? getStatusBadge(member.status) : null}
            </div>
          </div>
          <div className="flex-shrink-0">
            <ChartBarIcon className="h-12 w-12 text-blue-200" />
          </div>
        </div>
      </div>

      {/* 專案計劃內容 */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center">
            <ChartBarIcon className="h-6 w-6 mr-2 text-blue-600" />
            專案計劃（12 項自動判定）
          </h2>
        </div>
        <div className="p-6">
          {loadingPlan && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-600">載入專案計劃中...</span>
            </div>
          )}
          {!loadingPlan && projectPlan && (
            <> 
              {/* 進度總覽 */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-lg font-medium text-gray-900">完成進度</div>
                  <div className="text-2xl font-bold text-blue-600">
                    {projectPlan.summary?.percent || 0}%
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="bg-blue-600 h-3 rounded-full transition-all duration-300" style={{ width: `${projectPlan.summary?.percent || 0}%` }}></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>已完成 {projectPlan.summary?.completedCount || 0} 項</span>
                  <span>共 {projectPlan.summary?.total || 0} 項</span>
                </div>
                {/* 手動勾選完成度統計 */}
                {(() => {
                  const spec = [
                    { cardId: 'core_member_approval', items: ['create_group','member_data','send_email'] },
                    { cardId: 'day_before_oath', items: ['attendance_time','self_intro_50sec','dress_code','business_cards','four_week_plan','send_email'] },
                    { cardId: 'ceremony_day', items: ['intro_guide','environment_intro','core_staff_intro'] },
                    { cardId: 'networking_time', items: ['networking_guide'] },
                    { cardId: 'meeting_guidelines', items: ['phone_silent','simple_explanation'] }
                  ];
                  const manualTotal = spec.reduce((sum, s) => sum + s.items.length, 0);
                  const manualChecked = spec.reduce((sum, s) => sum + s.items.filter(itemId => getCheckboxState(id, s.cardId, itemId, false)).length, 0);
                  const manualPercent = manualTotal ? Math.round((manualChecked / manualTotal) * 100) : 0;
                  return (
                    <div className="flex justify-between text-sm text-gray-600 mt-2">
                      <span>手動勾選已完成 {manualChecked} 項</span>
                      <span>手動勾選完成率 {manualPercent}% （共 {manualTotal} 項）</span>
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
                      <div className="ml-2 flex items-center gap-1 text-xs text-gray-700 bg-gray-100 rounded px-2 py-0.5">
                        <span className={`inline-block w-2 h-2 rounded-full ${info.dot}`}></span>
                        <span>SSE {info.text}</span>
                      </div>
                    );
                  })()}
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-gold-300">批次提交</span>
                    <button type="button" className="btn-secondary px-2 py-1" onClick={() => setBatchingEnabled(b => !b)}>{batchingEnabled ? 'ON' : 'OFF'}</button>
                    <button type="button" className="btn-primary px-2 py-1" disabled={!pendingUpdates.length} onClick={sendBatchUpdates}>提交更動 ({pendingUpdates.length})</button>
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
                      emailTemplate: `${member?.name || '{memberName}'}您好:\n\n我是GBC教練{'{coachName}'}，代表性行業是{'{coachIndustry}'}，是未來4週陪伴您進入系統及融入分會的專屬教練，群組是本屆會長、副會長。\n\n未來如有任何問題，歡迎在群組請與我們提出及聯絡。\n\n最後，GBC所有教練歡迎您的加入，一同成長！`
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
                      details: [
                        '加入各大LINE群LINE群：新會員專案群、GBC聊天群、活動公告欄（請勿回覆）、分組第__組、軟性活動接龍群',
                        '系統教學：一對一、引薦單、引薦金額意義及操作'
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
                      details: [
                        '兩天內確認系統是否能登入',
                        { id: 'interview_form_check', text: '教學系統個人深度交流表填寫', subtext: `面談表狀態：${p?.hasInterview ? '✅ 學員已完成面談表填寫' : '❌ 學員尚未填寫面談表'}`, completed: p?.hasInterview || false, type: 'auto_detect', progressBar: { show: true, value: p?.hasInterview ? 100 : 0, label: p?.hasInterview ? '已完成' : '未填寫' } },
                        '幫你的新會員曝光介紹及見證導生的產品或服務，重點在讓新會員覺得有被重視',
                        '多先參訪夥伴或體驗產品'
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
                      details: [
                        { id: 'guide_guest_purpose', text: '引導新會員為何帶來賓' },
                        { id: 'invite_agent_meeting', text: '引導新會員邀請代理人參觀例會議程' },
                        { id: 'deep_communication_form', text: '深度交流表完成', subtext: p?.hasInterview ? '✅ 學員已完成面談表填寫' : '❌ 學員尚未填寫面談表', completed: p?.hasInterview || false, type: 'auto_detect', progressBar: { value: p?.hasInterview ? 100 : 0, label: p?.hasInterview ? '已完成' : '未填寫', color: p?.hasInterview ? 'green' : 'red' } },
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
                      details: [
                        { id: 'system_usage_check', text: '確認新會員系統使用狀況及進度' },
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
                      details: [
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
                      details: [
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
                                    <ul className="space-y-3">
                                      {currentCard.checklistItems.map((detail, index) => (
                                        <li key={index} className="flex items-start">
                                          <input type="checkbox" id={`chk-${currentCard.id}-${detail.id}`} checked={getCheckboxState(id, currentCard.id, detail.id, detail.completed)} onChange={(e) => updateCheckboxState(id, currentCard.id, detail.id, e.target.checked)} className="mt-1 mr-3 h-4 w-4 text-gold-500 bg-primary-700 border-gold-600 rounded focus:ring-gold-500 focus:ring-2" />
                                          <label htmlFor={`chk-${currentCard.id}-${detail.id}`} className="leading-relaxed cursor-pointer">
                                            {detail.text}
                                          </label>
                                        </li>
                                      ))}
                                    </ul>
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
                                                  <label htmlFor={`detail-${index}`} className="leading-relaxed font-medium cursor-pointer">{detail.text}</label>
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
                                              <span className="leading-relaxed">{typeof detail === 'string' ? detail : detail.text}</span>
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
  Object.entries(flat).forEach(([k, v]) => {
    const parts = String(k).split('_');
    if (parts.length < 3) return;
    const memberId = parts[0];
    const cardId = parts[1];
    const itemId = parts.slice(2).join('_'); // 允許 itemId 內含底線
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