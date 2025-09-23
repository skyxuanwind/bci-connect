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
  const [page, setPage] = useState(1);
  const [limit] = useState(12);
  const { user, isCoach: isCoachCtx } = useAuth();
  const iAmCoach = !!(isCoachCtx && isCoachCtx());

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [coachees, setCoachees] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalMembers: 0, limit });

  const [progressById, setProgressById] = useState({});
  const [selectedMember, setSelectedMember] = useState(null);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

  const [actionLoading, setActionLoading] = useState(false);

  const [projectPlans, setProjectPlans] = useState({});
  const [projectPlanLoading, setProjectPlanLoading] = useState({});

  const [taskStats, setTaskStats] = useState({ total: 0, pending: 0, inProgress: 0, completed: 0, overdue: 0 });
  const [statsLoading, setStatsLoading] = useState(false);

  const [myTasks, setMyTasks] = useState([]);
  const [myTasksLoading, setMyTasksLoading] = useState(false);
  const [myCoach, setMyCoach] = useState(null);
  const [myTaskUpdating, setMyTaskUpdating] = useState({});
  const [myCoachLogs, setMyCoachLogs] = useState([]);

  const [checklistStates, setChecklistStates] = useState(() => {
    try {
      const raw = localStorage.getItem('coach_checklist_states');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [coreMembers, setCoreMembers] = useState([]);
  const [coreMembersLoading, setCoreMembersLoading] = useState(false);
  const [staffMembers, setStaffMembers] = useState([]);
  const [staffMembersLoading, setStaffMembersLoading] = useState(false);

  const updateCheckboxState = (memberId, itemId, detailId, newState) => {
    setChecklistStates((prev) => {
      const next = { ...prev };
      if (!next[memberId]) next[memberId] = {};
      if (!next[memberId][itemId]) next[memberId][itemId] = {};
      next[memberId][itemId][detailId] = newState;
      localStorage.setItem('coach_checklist_states', JSON.stringify(next));
      return next;
    });
  };

  const getCheckboxState = (memberId, itemId, detailId, defaultState = false) => {
    return !!(checklistStates?.[memberId]?.[itemId]?.[detailId] ?? defaultState);
  };

  const handleChecklistToggle = (cardId, itemId) => {
    setChecklistStates((prev) => {
      const next = { ...prev };
      if (!next[cardId]) next[cardId] = {};
      next[cardId][itemId] = !next[cardId]?.[itemId];
      localStorage.setItem('coach_checklist_states', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (!iAmCoach) return;
    const fetchCoachees = async () => {
      try {
        setLoading(true);
        const { data } = await axios.get('/api/users/my-coachees', { params: { page, limit, includeInactive: true } });
        setCoachees(Array.isArray(data.coachees) ? data.coachees : []);
        setPagination(
          data.pagination || {
            currentPage: data?.pagination?.currentPage || page,
            totalPages: data?.pagination?.totalPages || 1,
            totalMembers: data?.pagination?.totalMembers || (Array.isArray(data.coachees) ? data.coachees.length : 0),
            limit
          }
        );
      } catch (e) {
        setError(e?.response?.data?.message || '載入學員列表失敗');
      } finally {
        setLoading(false);
      }
    };

    fetchCoachees();
  }, [iAmCoach, page, limit]);

  const fetchProjectPlan = async (memberId) => {
    try {
      setProjectPlanLoading((prev) => ({ ...prev, [memberId]: true }));
      const { data } = await axios.get(`/api/users/member/${memberId}/project-plan`);
      setProjectPlans((prev) => ({ ...prev, [memberId]: data || {} }));
    } catch (e) {
      toast.error('載入任務內容失敗');
    } finally {
      setProjectPlanLoading((prev) => ({ ...prev, [memberId]: false }));
    }
  };

  const progressSummary = (memberId) => {
    const p = progressById[memberId] || {};
    const profileScore = (p.profile || 0);
    const systemScore = (p.system || 0);
    const bonusMbti = p.hasMbtiType ? 5 : 0;
    const percent = Math.min(100, Math.round(((profileScore + systemScore + bonusMbti) / 105) * 100));
    return { p, percent, profileScore, systemScore, bonusMbti };
  };

  const closeModal = () => {
    setSelectedMember(null);
    setCurrentCardIndex(0);
  };

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
              {coachees.map((member) => {
                const { percent } = progressSummary(member.id);
                return (
                  <div
                    key={member.id}
                    className="card hover:shadow-lg transition-shadow duration-200 cursor-pointer relative"
                    onClick={() => {
                      setSelectedMember(member);
                      fetchProjectPlan(member.id);
                    }}
                  >
                    <div className="p-3 sm:p-4">
                      <div className="flex items-center mb-2 sm:mb-3">
                        <Avatar src={member.profilePictureUrl} alt={member.name} size="medium" />
                        <div className="ml-3 flex-1">
                          <h3 className="text-base sm:text-sm font-medium text-gold-100 truncate">{member.name}</h3>
                          <div className="text-sm sm:text-xs text-gold-300 truncate">{member.company}</div>
                        </div>
                      </div>
                      {(() => {
                        const percentShow = percent;
                        return (
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm sm:text-xs text-gold-300">進度</span>
                              <span className="text-sm sm:text-xs text-gold-100 font-semibold">{percentShow}%</span>
                            </div>
                            <div className="w-full h-3 sm:h-2 bg-primary-700 rounded">
                              <div
                                className={`h-3 sm:h-2 rounded ${percentShow >= 80 ? 'bg-green-500' : percentShow >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${percentShow}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div className="text-sm text-gold-300">
                第 {pagination?.currentPage || page} / {pagination?.totalPages || 1} 頁
              </div>
              <div className="space-x-2">
                <button
                  type="button"
                  disabled={pagination.currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={`btn-secondary inline-flex items-center ${pagination.currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <ChevronLeftIcon className="h-4 w-4 mr-1" /> 上一頁
                </button>
                <button
                  type="button"
                  disabled={pagination.currentPage >= pagination.totalPages}
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  className={`btn-secondary inline-flex items-center ${pagination.currentPage >= pagination.totalPages ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  下一頁 <ChevronRightIcon className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedMember && (
        <div className="fixed inset-0 z-40 overflow-y-auto touch-pan-y">
          <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
          <div className="relative mx-4 md:inset-x-0 md:left-1/2 md:-translate-x-1/2 my-6 md:my-10 z-50 bg-primary-800 border border-gold-600 rounded-lg shadow-elegant w-auto md:w-[720px] max-h-[92svh] overflow-y-auto">
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-gold-700">
              <div className="flex items-center">
                <Avatar src={selectedMember.profilePictureUrl} alt={selectedMember.name} size="medium" />
                <div className="ml-3">
                  <div className="text-gold-100 font-semibold">{selectedMember.name}</div>
                  <div className="text-sm sm:text-xs text-gold-300">{selectedMember.company} ・ {selectedMember.title}</div>
                </div>
              </div>
              <button className="icon-button" onClick={closeModal}>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 sm:p-4 md:p-3 sm:p-6">
              {(() => {
                const { p, percent, profileScore, systemScore, bonusMbti } = progressSummary(selectedMember.id);
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
                    emailTemplate: `{memberName}您好:\n\n我是GBC教練{coachName}，代表性行業是{coachIndustry}，是未來4週陪伴您進入系統及融入分會的專屬教練，群組是本屆會長、副會長。\n\n未來如有任何問題，歡迎在群組請與我們提出及聯絡。\n\n最後，GBC所有教練歡迎您的加入，一同成長！`
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
                        subtext: `大家好，我是${selectedMember?.industry || selectedMember?.company || 'OOO'}代表，${selectedMember?.name || 'XXX'}\n主要產品/服務內容\n成功見證\n主要代表性客戶\n獨特銷售或專業項\n請幫我引薦對象`,
                        completed: false
                      },
                      {
                        id: 'explain_goals_foundation',
                        text: '再次說明共同目標、GBC地基及成功經驗',
                        subtext: `GBC地基狀態：${selectedMember?.profile?.foundationViewed ? '✅ 學員已閱讀商會地基' : '❌ 學員尚未閱讀商會地基'}`,
                        completed: false
                      }
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
                    checklistItems: [
                      { id: 'attendance_time', text: '出席時間 14:00', completed: false },
                      { id: 'self_intro_50sec', text: '50秒自我介紹', completed: false },
                      { id: 'dress_code', text: '服裝儀容，範例：(插上附件)', completed: false },
                      { id: 'business_cards', text: '準備30張名片', completed: false },
                      { id: 'four_week_plan', text: '4週導生計畫', completed: false },
                      { id: 'send_email', text: '發送給學員信件', completed: false }
                    ],
                    emailTemplate: `${selectedMember?.name || 'OO'}您好:\n\n提醒您\n今天需請您練習50秒自我介紹!\n掌握好上台狀況很重要，若怕緊張可以帶上手稿上台，請不要帶手機看稿！\n\n參與例會時注意事項:\n1.例會及培訓時請穿著正式服裝、配戴Pin章及名牌(襯衫、西裝、洋裝、皮鞋等)\n2.請帶名片(30張以上)\n3.明日到場時間14:00到達，我們將協助您教學以及認識夥伴。`,
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
                      { id: 'intro_guide', text: '關心50秒自我介紹引薦單介紹內容', completed: false },
                      { id: 'environment_intro', text: '介紹環境', completed: false },
                      { id: 'core_staff_intro', text: '介紹核心幹部及職位內容', completed: false }
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
                      { id: 'guide_networking', text: '引導新會員認識會員及來賓(尤其要介紹與新會員同產業類別或可以合作的會員)', completed: false }
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
                      { id: 'phone_silent', text: '提醒手機關機或靜音，請全程專注投入議程，盡量不使用手機', completed: false },
                      { id: 'simple_explanation', text: '議程中如有需要說明，也請簡單說明即可，讓新會員專心參與議程', completed: false }
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
                      '加入各大LINE群：新會員專案群、GBC聊天群、地基活動公告欄（請勿回覆）、分組第__組、軟性活動接龍群',
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
                    checklistItems: [
                      '兩天內確認系統是否能登入',
                      {
                        id: 'interview_form_check',
                        text: '教學系統個人深度交流表填寫',
                        subtext: `面談表狀態：${p?.hasInterview ? '✅ 學員已完成面談表填寫' : '❌ 學員尚未填寫面談表'}`,
                        completed: p?.hasInterview || false
                      },
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
                    checklistItems: [
                      { id: 'guide_guest_purpose', text: '引導新會員為何帶來賓', completed: false },
                      { id: 'invite_agent_meeting', text: '引導新會員邀請代理人參觀例會議程', completed: false },
                      { id: 'deep_communication_form', text: '深度交流表完成', subtext: p?.hasInterview ? '✅ 學員已完成面談表填寫' : '❌ 學員尚未填寫面談表', completed: p?.hasInterview || false },
                      { id: 'core_member_one_on_one', text: '優先與核心一對一', subtext: `系統偵測到 ${coreMembers.length} 位核心權限會員`, completed: false }
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
                      { id: 'system_usage_check', text: '確認新會員系統使用狀況及進度', completed: false },
                      { id: 'staff_one_on_one', text: '與幹部一對一狀況交流及回報進度', subtext: `系統偵測到 ${staffMembers.length} 位干部權限會員`, completed: false }
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
                      { id: 'system_status_check', text: '確認新會員使用系統狀況及進度', completed: false },
                      { id: 'core_staff_one_on_one', text: '確認與核心及幹部一對一進度狀況', completed: false },
                      { id: 'presentation_optimization', text: '優化自我介紹及介紹主題簡報(50秒、20分鐘)', completed: false }
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
                      { id: 'core_staff_one_on_one_final', text: '核心幹部一對一', completed: false },
                      { id: 'system_training_complete', text: '完成系統教學', completed: false },
                      { id: 'basic_referral_behavior', text: '完成基本引薦行為', completed: false },
                      { id: 'group_announcement_welcome', text: '公告群組歡迎與其一對一', completed: false }
                    ],
                    completed: p?.graduationComplete || false,
                    category: '結業認證',
                    priority: 'high'
                  }
                ];
                const currentCard = attachmentItems[currentCardIndex] || attachmentItems[0];
                const showDetails = currentCard?.details && currentCard.details.length > 0 && !currentCard.checklistItems;
                return (
                  <div>
                    <div>
                      <div className="flex items-center justify-between">
                        <div className="text-sm text-gold-300">進度</div>
                        <div className="text-sm text-gold-100 font-semibold">{percent}%</div>
                      </div>
                      <div className="w-full h-3 sm:h-2 bg-primary-700 rounded mt-1">
                        <div className={`${percent >= 80 ? 'bg-green-500' : percent >= 50 ? 'bg-yellow-500' : 'bg-red-500'} h-3 sm:h-2 rounded`} style={{ width: `${percent}%` }} />
                      </div>
                      <div className="mt-1 text-[11px] text-gold-400">基礎 {profileScore}/60 ・ 系統 {systemScore}/40{bonusMbti > 0 ? ` ・ MBTI +${bonusMbti}` : ''}</div>
                    </div>

                    <div className="mt-6">
                      <div className="flex items-center gap-2 mb-2 sm:mb-3">
                        <ClipboardDocumentListIcon className="h-5 w-5 text-gold-300" />
                        <div className="text-lg font-semibold text-gold-100">教練任務</div>
                      </div>

                      <div className="relative p-3 sm:p-4 border border-gold-600 rounded-lg bg-primary-800/40">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="text-base sm:text-sm font-semibold text-gold-100">{currentCard.title}</div>
                            <div className="text-xs text-gold-400">{currentCard.subtitle}</div>
                            {currentCard.description && (
                              <div className="mt-2 text-sm text-gold-300 leading-relaxed">{currentCard.description}</div>
                            )}

                            {currentCard.checklistItems && (
                              <div className="mt-3 space-y-2">
                                {currentCard.checklistItems.map((item, index) => {
                                  const itemId = typeof item === 'string' ? `item_${index}` : item.id;
                                  const itemText = typeof item === 'string' ? item : item.text;
                                  const defaultCompleted = typeof item === 'object' && 'completed' in item ? !!item.completed : false;
                                  return (
                                    <div key={itemId} className="flex items-center justify-between bg-primary-800/40 p-2 rounded border border-gold-700/30">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="checkbox"
                                          checked={getCheckboxState(selectedMember.id, currentCard.id, itemId, defaultCompleted)}
                                          onChange={(e) => updateCheckboxState(selectedMember.id, currentCard.id, itemId, e.target.checked)}
                                          className="h-4 w-4 text-gold-500 bg-primary-700 border-gold-600 rounded focus:ring-gold-500 focus:ring-2"
                                        />
                                        <span className="text-sm text-gold-300">
                                          {itemText}
                                          {typeof item === 'object' && item.subtext ? (
                                            <span className="block text-xs text-gold-400 mt-0.5">{item.subtext}</span>
                                          ) : null}
                                        </span>
                                      </div>
                                      <button
                                        onClick={() => handleChecklistToggle(currentCard.id, itemId)}
                                        className={`w-4 h-4 rounded border transition-colors ${
                                          checklistStates[currentCard.id]?.[itemId]
                                            ? 'bg-green-500 border-green-500'
                                            : 'border-gold-400 hover:border-gold-300'
                                        }`}
                                      >
                                        {checklistStates[currentCard.id]?.[itemId] && (
                                          <CheckCircleIcon className="h-3 w-3 text-white" />
                                        )}
                                      </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {currentCard.details && currentCard.details.length > 0 && !currentCard.checklistItems && (
                                <div className="mt-3">
                                  <div className="text-sm text-gold-300 mb-2 font-semibold">詳細內容：</div>
                                  <ul className="text-sm text-gold-400 space-y-3">
                                    {currentCard.details.map((detail, index) => (
                                      <li key={typeof detail === 'string' ? `detail_${index}` : detail.id} className="flex items-start">
                                        <span className="text-gold-500 mr-2 text-base">•</span>
                                        <span className="leading-relaxed">{typeof detail === 'string' ? detail : detail.text}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {currentCard.emailTemplate && (
                                <div className="mt-4 p-3 sm:p-4 bg-primary-600/30 rounded-lg border border-gold-600/30">
                                  <div className="text-sm text-gold-300 mb-2 font-semibold">郵件模板：</div>
                                  <div className="text-xs text-gold-400 mb-2 sm:mb-3 leading-relaxed whitespace-pre-line bg-primary-800/50 p-3 rounded border max-h-32 overflow-y-auto">
                                    {currentCard.emailTemplate}
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={async () => {
                                        try {
                                          await navigator.clipboard.writeText(currentCard.emailTemplate || '');
                                          toast.success('已複製郵件模板');
                                        } catch (err) {
                                          toast.error('複製失敗，請手動選取文字');
                                        }
                                      }}
                                      className="btn-secondary text-xs px-3 py-1.5 flex items-center gap-1"
                                    >
                                      <ClipboardDocumentListIcon className="h-4 w-4" />
                                      一鍵複製
                                    </button>
                                    <button
                                      onClick={() => {
                                        const subject = encodeURIComponent('GBC 教練郵件');
                                        const body = encodeURIComponent(currentCard.emailTemplate || '');
                                        if (typeof window !== 'undefined') {
                                          window.location.href = `mailto:${selectedMember?.email || ''}?subject=${subject}&body=${body}`;
                                        }
                                      }}
                                      className="btn-primary text-xs px-3 py-1.5 flex items-center gap-1"
                                    >
                                      <EnvelopeIcon className="h-4 w-4" />
                                      發送郵件
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="text-sm px-3 py-2 rounded-full font-medium bg-gold-600/20 text-gold-200 border border-gold-600">
                              {currentCard.category}
                            </div>
                          </div>
                        </div>

                        <button
                          onClick={() => setCurrentCardIndex((i) => Math.max(0, i - 1))}
                          className="absolute left-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary-600/90 border border-gold-600 flex items-center justify-center hover:bg-primary-500 transition-colors shadow-lg backdrop-blur-sm"
                        >
                          <ChevronLeftIcon className="h-5 w-5 text-gold-300" />
                        </button>
                        <button
                          onClick={() => setCurrentCardIndex((i) => Math.min(attachmentItems.length - 1, i + 1))}
                          className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-primary-600/90 border border-gold-600 flex items-center justify-center hover:bg-primary-500 transition-colors shadow-lg backdrop-blur-sm"
                        >
                          <ChevronRightIcon className="h-5 w-5 text-gold-300" />
                        </button>

                        <div className="p-3 border-t border-gold-700/50 bg-primary-800/50">
                          <div className="flex items-center justify-between text-xs">
                            <div className="text-gold-300">已完成: {attachmentItems.filter((i) => i.completed).length} / {attachmentItems.length}</div>
                            <div className="text-gold-400">完成率: {Math.round((attachmentItems.filter((i) => i.completed).length / attachmentItems.length) * 100)}</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6">
                        <div className="text-xl font-bold text-gold-100 mb-2 sm:mb-3">快捷操作</div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <a href={`/meetings?schedule_with=${selectedMember.id}`} className="btn-secondary inline-flex items-center text-base px-4 py-2">
                            <CalendarIcon className="h-5 w-5 mr-1" /> 安排會議
                          </a>
                          <Link to={`/members/${selectedMember.id}`} className="btn-secondary text-base px-4 py-2">
                            查看詳情
                          </Link>
                        </div>
                      </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoachDashboard;