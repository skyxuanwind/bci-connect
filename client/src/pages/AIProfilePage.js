import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import axios from '../config/axios';
import {
  UserIcon,
  CpuChipIcon,
  ChartBarIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  LightBulbIcon,
  BriefcaseIcon,
  UsersIcon,
  TrophyIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

const AIProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showSourceDetails, setShowSourceDetails] = useState(false);
  // 相似會員狀態
  const [similarMembers, setSimilarMembers] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [similarError, setSimilarError] = useState('');
  const [minScore, setMinScore] = useState(70);
  const [limit, setLimit] = useState(8);
  // 引薦稿 Dialog 狀態
  const [referralDialogOpen, setReferralDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [referralSubject, setReferralSubject] = useState('');
  const [referralMessage, setReferralMessage] = useState('');
  const [referralAmount, setReferralAmount] = useState(0);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [creatingReferral, setCreatingReferral] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchAnalysis();
    fetchSimilarMembers();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await axios.get('/api/ai-profiles/me');
      if (response.data.success) {
        setProfile(response.data.data);
      }
    } catch (error) {
      console.error('獲取AI畫像失敗:', error);
      toast.error('獲取AI畫像失敗');
    }
  };

  const fetchAnalysis = async () => {
    try {
      const response = await axios.get('/api/ai-profiles/me/analysis');
      if (response.data.success) {
        const data = response.data.data || {};
        setAnalysis({
          lastAnalyzed: data.lastAnalyzed || null,
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : []
        });
      }
    } catch (error) {
      console.error('獲取分析報告失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  // 取得相似會員
  const fetchSimilarMembers = async () => {
    setSimilarLoading(true);
    setSimilarError('');
    try {
      const resp = await axios.get('/api/ai-profiles/me/similar-members', {
        params: { minScore, limit }
      });
      if (resp.data?.success) {
        const list = resp.data?.data?.similarMembers || [];
        setSimilarMembers(Array.isArray(list) ? list : []);
      } else {
        setSimilarMembers([]);
      }
    } catch (e) {
      console.error('獲取相似會員失敗:', e);
      setSimilarError('無法取得相似會員');
      setSimilarMembers([]);
    } finally {
      setSimilarLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    setUpdating(true);
    try {
      const response = await axios.post('/api/ai-profiles/me/update', {
        forceUpdate: true
      });
      if (response.data.success) {
        setProfile(response.data.data);
        toast.success('AI畫像更新成功');
        await fetchAnalysis();
        await fetchSimilarMembers();
      }
    } catch (error) {
      console.error('更新AI畫像失敗:', error);
      toast.error('更新AI畫像失敗');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '尚未更新';
    return new Date(dateString).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei' });
  };

  const getCompletenessColor = (completeness) => {
    if (completeness >= 80) return 'text-green-600';
    if (completeness >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCompletenessBarColor = (completeness) => {
    if (completeness >= 80) return 'bg-green-500';
    if (completeness >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // 方便渲染的快捷存取
  const aiInsights = profile?.profile?.ai_insights || {};
  const commStyle = aiInsights?.communication_style || profile?.profile?.conversational_data?.communication_style || {};
  const mbtiSummary = aiInsights?.mbti_summary || '';
  // 開啟引薦稿對話框並一鍵生成草稿
  const openReferralDialog = async (member) => {
    setSelectedMember(member);
    setReferralDialogOpen(true);
    setReferralSubject('');
    setReferralMessage('');
    setReferralAmount(0);
    await generateReferralDraft(member);
  };

  const closeReferralDialog = () => {
    setReferralDialogOpen(false);
    setSelectedMember(null);
    setReferralSubject('');
    setReferralMessage('');
    setReferralAmount(0);
    setGeneratingDraft(false);
    setCreatingReferral(false);
  };

  const generateReferralDraft = async (member) => {
    try {
      setGeneratingDraft(true);
      const payload = {
        name: member?.name || '',
        company: member?.company || '',
        title: member?.title || '',
        email: member?.email || '',
        phone: member?.contact_number || member?.phone || '',
        tags: Array.isArray(member?.skills) ? member.skills : [],
        notes: '',
        last_interaction: '',
        goal: '請產生一段用於向該會員自我介紹並建立引薦合作的訊息草稿',
        channelPreference: member?.email ? 'email' : ''
      };
      const resp = await axios.post('/api/ai/contacts/followup-suggestion', payload);
      const data = resp?.data?.data || {};
      const draft = data?.draft || {};
      if (draft?.subject) setReferralSubject(draft.subject);
      if (draft?.message) setReferralMessage(draft.message);
      if (!draft?.message) {
        setReferralMessage(`您好${member?.name ? '，' + member.name : ''}：\n\n我在 GBC 商務菁英會上看見您（${member?.company || ''}${member?.title ? '／' + member.title : ''}），覺得彼此背景可互補，期待先相互認識並探索可行合作或轉介機會。若您方便，想安排一個 20 分鐘的線上交流，時間可由您指定。\n\n謝謝，期待您的回覆！`);
      }
    } catch (e) {
      console.warn('AI 生成引薦稿失敗，使用備援文案:', e?.message);
      setReferralMessage(`您好${member?.name ? '，' + member.name : ''}：\n\n我在 GBC 商務菁英會上看見您（${member?.company || ''}${member?.title ? '／' + member.title : ''}），覺得彼此背景可互補，期待先相互認識並探索可行合作或轉介機會。若您方便，想安排一個 20 分鐘的線上交流，時間可由您指定。\n\n謝謝，期待您的回覆！`);
    } finally {
      setGeneratingDraft(false);
    }
  };

  const submitReferral = async () => {
    if (!selectedMember) return;
    if (!referralMessage || referralMessage.trim().length < 10) {
      toast.error('請先確認引薦稿內容');
      return;
    }
    try {
      setCreatingReferral(true);
      const payload = {
        referred_to_id: selectedMember.id,
        referral_amount: Number.isFinite(Number(referralAmount)) ? Number(referralAmount) : 0,
        description: referralMessage
      };
      const resp = await axios.post('/api/referrals/create', payload);
      if (resp.status === 201) {
        toast.success('引薦已發送');
        closeReferralDialog();
      } else {
        toast.error(resp?.data?.error || '引薦發送失敗');
      }
    } catch (e) {
      console.error('建立引薦失敗:', e);
      toast.error(e?.response?.data?.error || '建立引薦失敗');
    } finally {
      setCreatingReferral(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* 頁面標題 */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            {/* 改為黑金主題色 */}
            <CpuChipIcon className="h-8 w-8 text-yellow-400" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">AI 深度畫像</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">智能分析您的商業特質與合作潛力</p>
            </div>
          </div>
          <button
            onClick={handleUpdateProfile}
            disabled={updating}
            className="btn-gold inline-flex items-center justify-center w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? (
              <>
                <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                更新中...
              </>
            ) : (
              <>
                <ArrowPathIcon className="-ml-1 mr-2 h-4 w-4" />
                更新畫像
              </>
            )}
          </button>
        </div>
      </div>

      {/* 畫像概覽卡片 */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">畫像概覽</h2>
          <div className="text-right text-sm text-gray-500">
            <div>最後更新: {formatDate(profile?.lastUpdated)}</div>
            {analysis?.lastAnalyzed && (
              <div>最後AI分析: {formatDate(analysis.lastAnalyzed)}</div>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 完整度 */}
          <div className="text-center">
            <div className="mb-2">
              <span className={`text-2xl font-bold ${getCompletenessColor(profile?.profileCompleteness || 0)}`}>
                {profile?.profileCompleteness || 0}%
              </span>
            </div>
            <div className="w-full bg-yellow-900/30 rounded-full h-2 mb-2">
              <div 
                className={`h-2 rounded-full ${getCompletenessBarColor(profile?.profileCompleteness || 0)}`}
                style={{ width: `${profile?.profileCompleteness || 0}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">畫像完整度</p>
          </div>

          {/* 數據來源 */}
          <div className="text-center">
            <div className="mb-2">
              <ChartBarIcon className="h-8 w-8 text-yellow-400 mx-auto" />
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {(Object.values(profile?.profile?.data_sources || {}).filter(src => src && src.last_update).length) || 0} 個
            </p>
            <p className="text-sm text-gray-600">數據來源</p>
          </div>

          {/* 分析維度 */}
          <div className="text-center">
            <div className="mb-2">
              <BriefcaseIcon className="h-8 w-8 text-yellow-400 mx-auto" />
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {profile?.profile?.ai_insights?.personality_traits?.length || 0} 項
            </p>
            <p className="text-sm text-gray-600">個性特質</p>
          </div>
        </div>

        {/* 資料來源詳情展開面板 */}
        <div className="mt-4 border-t pt-4">
          <button
            type="button"
            onClick={() => setShowSourceDetails((v) => !v)}
            className="w-full flex items-center justify-between text-left text-sm font-medium text-yellow-300 hover:text-yellow-200"
          >
            <span>資料來源詳情</span>
            {showSourceDetails ? (
              <ChevronUpIcon className="h-4 w-4" />
            ) : (
              <ChevronDownIcon className="h-4 w-4" />
            )}
          </button>

          {showSourceDetails && (
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 靜態資料 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">靜態資料</div>
                <div className="mt-2 text-gray-900">最後更新：{formatDate(profile?.profile?.data_sources?.static?.last_update)}</div>
                <div className="mt-1 text-sm">
                  <span className="text-gray-600">信心度：</span>
                  <span
                    className={`${(profile?.profile?.data_sources?.static?.confidence || 0) >= 80
                      ? 'text-green-600'
                      : (profile?.profile?.data_sources?.static?.confidence || 0) >= 50
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    } font-medium`}
                  >
                    {(profile?.profile?.data_sources?.static?.confidence ?? 0)}%
                  </span>
                </div>
              </div>

              {/* 行為資料 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">行為資料</div>
                <div className="mt-2 text-gray-900">最後更新：{formatDate(profile?.profile?.data_sources?.behavioral?.last_update)}</div>
                <div className="mt-1 text-sm">
                  <span className="text-gray-600">信心度：</span>
                  <span
                    className={`${(profile?.profile?.data_sources?.behavioral?.confidence || 0) >= 80
                      ? 'text-green-600'
                      : (profile?.profile?.data_sources?.behavioral?.confidence || 0) >= 50
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    } font-medium`}
                  >
                    {(profile?.profile?.data_sources?.behavioral?.confidence ?? 0)}%
                  </span>
                </div>
              </div>

              {/* 對話資料 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600">對話資料</div>
                <div className="mt-2 text-gray-900">最後更新：{formatDate(profile?.profile?.data_sources?.conversational?.last_update)}</div>
                <div className="mt-1 text-sm">
                  <span className="text-gray-600">信心度：</span>
                  <span
                    className={`${(profile?.profile?.data_sources?.conversational?.confidence || 0) >= 80
                      ? 'text-green-600'
                      : (profile?.profile?.data_sources?.conversational?.confidence || 0) >= 50
                        ? 'text-yellow-600'
                        : 'text-red-600'
                    } font-medium`}
                  >
                    {(profile?.profile?.data_sources?.conversational?.confidence ?? 0)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI 建議（顯著展示於概覽卡片下方） */}
      {analysis?.suggestions?.length > 0 && (
        <div className="bg-gradient-to-br from-black/85 to-gray-900/85 border border-yellow-500/30 rounded-lg shadow-sm p-5 mb-8">
          <div className="flex items-center mb-3">
            <LightBulbIcon className="h-5 w-5 text-yellow-400 mr-2" />
            <h3 className="text-base font-semibold text-gold-100">AI 建議</h3>
            {analysis.lastAnalyzed && (
              <span className="ml-auto text-xs text-gray-500">分析時間：{formatDate(analysis.lastAnalyzed)}</span>
            )}
          </div>
          <ul className="space-y-2">
            {analysis.suggestions.map((s, idx) => (
              <li key={idx} className="flex flex-col sm:flex-row sm:items-start gap-2">
                <span
                  className={`mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.priority === 'high' ? 'bg-red-500/10 text-red-300 border border-red-500/30' : s.priority === 'medium' ? 'bg-yellow-500/10 text-yellow-300 border border-yellow-500/30' : 'bg-green-500/10 text-green-300 border border-green-500/30'}`}
                >
                  {s.priority === 'high' ? '高' : s.priority === 'medium' ? '中' : '低'}
                </span>
                <p className="text-gray-800 flex-1">{s.message}</p>
                {/* 行動按鈕 */}
                <div className="mt-2 sm:mt-0 sm:ml-auto flex flex-col sm:flex-row gap-2">
                  {/* 依建議類型顯示對應行動 */}
                  {(() => {
                    switch (s.type) {
                      case 'profile_completion':
                        return (
                          <>
                            <a href="/profile" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 whitespace-nowrap">前往個人檔案</a>
                            <button onClick={handleUpdateProfile} className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium border border-primary-300 text-primary-700 hover:bg-primary-50 whitespace-nowrap">更新畫像</button>
                          </>
                        );
                      case 'skills_enhancement':
                        return (
                          <>
                            <a href="/events" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap">參與活動</a>
                            <a href="/referrals" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 whitespace-nowrap">啟動轉介</a>
                          </>
                        );
                      case 'engagement_improvement':
                        return (
                          <>
                            <a href="/events" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap">參與活動</a>
                            <a href="/referrals" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 whitespace-nowrap">啟動轉介</a>
                          </>
                        );
                      case 'collaboration_openness':
                        return (
                          <>
                            <a href="/meetings" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium text-white bg-green-600 hover:bg-green-700 whitespace-nowrap">安排會議</a>
                            <a href="/referrals" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium border border-green-300 text-green-700 hover:bg-green-50 whitespace-nowrap">轉介系統</a>
                          </>
                        );
                      default:
                        return (
                          <a href="/referrals" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 whitespace-nowrap">探索合作機會</a>
                        );
                    }
                  })()}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 相似會員推薦 */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">相似會員推薦</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span>最低分數</span>
              <input type="number" min={0} max={100} value={minScore} onChange={(e) => setMinScore(parseInt(e.target.value || '0'))} className="w-16 px-2 py-1 border rounded" />
            </div>
            <div className="flex items-center gap-1 text-sm text-gray-600">
              <span>數量</span>
              <input type="number" min={1} max={20} value={limit} onChange={(e) => setLimit(parseInt(e.target.value || '1'))} className="w-16 px-2 py-1 border rounded" />
            </div>
            <button onClick={fetchSimilarMembers} disabled={similarLoading} className="btn-gold px-3 py-1 disabled:opacity-50">
              {similarLoading ? '載入中...' : '刷新結果'}
            </button>
          </div>
        </div>
        {similarError && (
          <div className="text-red-600 text-sm mb-3">{similarError}</div>
        )}
        {similarLoading ? (
          <div className="flex justify-center items-center h-24"><LoadingSpinner /></div>
        ) : similarMembers.length === 0 ? (
          <div className="text-gray-500 text-sm">尚無推薦結果，請嘗試降低分數門檻或更新畫像。</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {similarMembers.map((m, idx) => {
              const mm = m?.member || m; // 後端可能返回 { member, score, reasons }
              const score = m?.score ?? m?.matchingScore ?? 0;
              const reasons = Array.isArray(m?.reasons) ? m.reasons : [];
              return (
                <div key={idx} className="border rounded-lg p-4 bg-black/40 border-yellow-500/30">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-yellow-300 font-semibold">{mm?.name || '未命名會員'}</div>
                      <div className="text-sm text-gray-300">{[mm?.company, mm?.title].filter(Boolean).join(' / ')}</div>
                    </div>
                    <div className={`text-sm font-bold ${score >= 80 ? 'text-green-400' : score >= 60 ? 'text-yellow-300' : 'text-orange-300'}`}>{Math.round(score)} 分</div>
                  </div>
                  {reasons.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-gray-200 list-disc pl-5">
                      {reasons.slice(0, 3).map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-4 flex items-center gap-2">
                    <a href={`/members/${mm?.id}`} className="px-3 py-1 rounded-md text-xs font-medium border border-yellow-500/40 text-yellow-300 hover:bg-yellow-500/10">查看詳情</a>
                    <button onClick={() => openReferralDialog(mm)} className="btn-gold px-3 py-1 text-xs">一鍵生成引薦稿</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 使用說明：如何提升完整度與使用 AI 智慧合作網絡 */}
      <div className="bg-white shadow rounded-lg p-6 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-3">如何提升畫像完整度</h3>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>
            完善個人資料（公司、職稱、產業、專長等）。
            <a href="/profile" className="ml-2 text-primary-600 hover:underline">前往個人檔案</a>
          </li>
          <li>在個人檔案頁填寫「面談表單」，讓 AI 更了解你的背景與目標。</li>
          <li>
            增加平台互動數據：
            <a href="/events" className="ml-1 text-primary-600 hover:underline">參與活動</a>、
            <a href="/wishes" className="ml-1 text-primary-600 hover:underline">發布許願</a> 等。
          </li>
          <li>完成會議並同意生成會議摘要，有助於豐富「對話資料」。</li>
          <li>點擊上方「更新畫像」，以最新資料重新進行 AI 分析。</li>
        </ul>

        <h3 className="text-lg font-medium text-gray-900 mt-6 mb-3">如何使用 AI 智慧合作網絡</h3>
        <ul className="list-disc pl-6 space-y-2 text-gray-700">
          <li>
            透過「轉介系統」接收個人化合作建議與媒合提示。
            <a href="/referrals" className="ml-2 text-primary-600 hover:underline">前往轉介</a>
          </li>
          <li>
            使用「轉介系統」與「會議排程」快速建立合作：
            <a href="/referrals" className="ml-2 text-primary-600 hover:underline">轉介系統</a>
            <span className="mx-1">/</span>
            <a href="/meetings" className="text-primary-600 hover:underline">會議排程</a>
          </li>
          <li>
            追蹤「活動列表」以不漏接最新交流與合作機會。
            <a href="/events" className="ml-2 text-primary-600 hover:underline">活動列表</a>
          </li>
        </ul>
      </div>

      {/* 標籤頁導航 */}
      <div className="border-b border-yellow-500/30 mb-6">
        <nav className="-mb-px flex overflow-x-auto space-x-4 sm:space-x-8 scrollbar-hide">
          {[
            { id: 'overview', name: '總覽', icon: ChartBarIcon },
            { id: 'personality', name: '個性分析', icon: UserIcon },
            { id: 'business', name: '商業相容性', icon: BriefcaseIcon },
            { id: 'collaboration', name: '合作潛力', icon: UsersIcon },
            { id: 'opportunities', name: '市場機會', icon: LightBulbIcon },
            { id: 'risks', name: '風險評估', icon: ExclamationTriangleIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-yellow-500/60 text-yellow-300'
                  : 'border-transparent text-gray-400 hover:text-yellow-300 hover:border-yellow-500/30'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center space-x-1 sm:space-x-2 flex-shrink-0`}
            >
              <tab.icon className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{tab.name}</span>
              <span className="sm:hidden">{tab.name.length > 4 ? tab.name.substring(0, 4) : tab.name}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 標籤頁內容 */}
      <div className="space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 基本資訊 */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">基本資訊</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">姓名:</span>
                  <span className="font-medium">{user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">公司:</span>
                  <span className="font-medium">{user?.company}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">產業:</span>
                  <span className="font-medium">{user?.industry}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">職位:</span>
                  <span className="font-medium">{user?.title}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">MBTI:</span>
                  <span className="font-medium">
                    {user?.mbtiPublic ? (user?.mbti || '未填寫') : '未公開'}
                  </span>
                </div>
              </div>
            </div>

            {/* 畫像狀態 */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">畫像狀態</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">靜態資料:</span>
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">行為資料:</span>
                  <CheckCircleIcon className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">對話資料:</span>
                  <ClockIcon className="h-5 w-5 text-yellow-500" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">AI 分析:</span>
                  {analysis ? (
                    <CheckCircleIcon className="h-5 w-5 text-green-500" />
                  ) : (
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'personality' && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">個性特質分析</h3>
            {/* MBTI 與摘要 */}
            <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-black/40 border border-yellow-500/30 rounded-lg p-4">
                <div className="text-sm text-gray-300 mb-1">MBTI</div>
                <div className="text-2xl font-extrabold text-yellow-300 tracking-wider">
                  {user?.mbtiPublic ? (user?.mbti || '未填寫') : '未公開'}
                </div>
              </div>
              <div className="lg:col-span-2 bg-black/40 border border-yellow-500/30 rounded-lg p-4">
                <div className="text-sm text-gray-300 mb-1">MBTI 商務互動摘要</div>
                <p className="text-yellow-100 whitespace-pre-wrap">{mbtiSummary || '尚無摘要，請於個人檔案填寫 MBTI 並點擊「更新畫像」生成分析。'}</p>
              </div>
            </div>

            {/* 溝通風格建議 */}
            {(commStyle && (commStyle.tone || commStyle.dos || commStyle.donts || commStyle.meeting || commStyle.negotiation || commStyle.email)) && (
              <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                {commStyle.tone && (
                  <div className="bg-black/40 border border-yellow-500/30 rounded-lg p-4">
                    <div className="font-semibold text-yellow-300 mb-1">溝通語氣</div>
                    <p className="text-yellow-100 text-sm whitespace-pre-wrap">{commStyle.tone}</p>
                  </div>
                )}
                {commStyle.email && (
                  <div className="bg-black/40 border border-yellow-500/30 rounded-lg p-4">
                    <div className="font-semibold text-yellow-300 mb-1">Email 建議</div>
                    <p className="text-yellow-100 text-sm whitespace-pre-wrap">{Array.isArray(commStyle.email) ? commStyle.email.join('；') : commStyle.email}</p>
                  </div>
                )}
                {commStyle.meeting && (
                  <div className="bg-black/40 border border-yellow-500/30 rounded-lg p-4">
                    <div className="font-semibold text-yellow-300 mb-1">會議互動</div>
                    <p className="text-yellow-100 text-sm whitespace-pre-wrap">{Array.isArray(commStyle.meeting) ? commStyle.meeting.join('；') : commStyle.meeting}</p>
                  </div>
                )}
                {commStyle.negotiation && (
                  <div className="bg-black/40 border border-yellow-500/30 rounded-lg p-4">
                    <div className="font-semibold text-yellow-300 mb-1">談判要點</div>
                    <p className="text-yellow-100 text-sm whitespace-pre-wrap">{Array.isArray(commStyle.negotiation) ? commStyle.negotiation.join('；') : commStyle.negotiation}</p>
                  </div>
                )}
                {commStyle.dos && (
                  <div className="bg-black/40 border border-green-500/30 rounded-lg p-4">
                    <div className="font-semibold text-green-300 mb-1">建議這樣做</div>
                    <ul className="list-disc pl-5 text-green-100 text-sm space-y-1">
                      {Array.isArray(commStyle.dos) ? commStyle.dos.map((d, i) => (<li key={i}>{d}</li>)) : <li>{commStyle.dos}</li>}
                    </ul>
                  </div>
                )}
                {commStyle.donts && (
                  <div className="bg-black/40 border border-red-500/30 rounded-lg p-4">
                    <div className="font-semibold text-red-300 mb-1">避免這樣做</div>
                    <ul className="list-disc pl-5 text-red-100 text-sm space-y-1">
                      {Array.isArray(commStyle.donts) ? commStyle.donts.map((d, i) => (<li key={i}>{d}</li>)) : <li>{commStyle.donts}</li>}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {(profile?.profile?.ai_insights?.personality_traits || []).map((trait, index) => (
                <div key={index} className="bg-black/40 border border-yellow-500/30 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrophyIcon className="h-5 w-5 text-yellow-400" />
                    <span className="font-medium text-yellow-300">{trait}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 無分析數據提示 */}
      {!analysis && !profile?.profile?.ai_insights && (
        <div className="bg-black/40 border border-yellow-500/30 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-yellow-300 mb-2">尚無AI分析數據</h3>
          <p className="text-yellow-200 mb-4">
            您的AI深度畫像尚未完成分析，請點擊上方「更新畫像」按鈕來生成分析報告。
          </p>
          <button
            onClick={handleUpdateProfile}
            disabled={updating}
            className="btn-gold inline-flex items-center px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updating ? (
              <>
                <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-4 w-4" />
                分析中...
              </>
            ) : (
              <>
                <CpuChipIcon className="-ml-1 mr-2 h-4 w-4" />
                開始AI分析
              </>
            )}
          </button>
        </div>
      )}

      {/* 引薦稿 Dialog */}
      {referralDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={closeReferralDialog} />
          <div className="relative z-10 w-full max-w-2xl mx-4 bg-white rounded-lg shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">建立引薦</h3>
              <button onClick={closeReferralDialog} className="text-gray-500 hover:text-gray-700">×</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-700">
                目標會員：
                <span className="font-medium text-gray-900 ml-1">{selectedMember?.name || '未知'}</span>
                {selectedMember && (
                  <span className="ml-2 text-gray-600">{[selectedMember.company, selectedMember.title].filter(Boolean).join(' / ')}</span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">引薦價值（可選，數字）</label>
                  <input
                    type="number"
                    min="0"
                    value={referralAmount}
                    onChange={(e) => setReferralAmount(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="例如 5000"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">主旨（可選）</label>
                  <input
                    type="text"
                    value={referralSubject}
                    onChange={(e) => setReferralSubject(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    placeholder="例如：合作引薦與自我介紹"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm text-gray-600">訊息內容（必要）</label>
                  <button
                    type="button"
                    onClick={() => generateReferralDraft(selectedMember)}
                    disabled={generatingDraft}
                    className="text-xs px-2 py-1 rounded border border-yellow-400 text-yellow-700 hover:bg-yellow-50 disabled:opacity-50"
                  >
                    {generatingDraft ? '生成中...' : '重新生成草稿'}
                  </button>
                </div>
                <textarea
                  rows={8}
                  value={referralMessage}
                  onChange={(e) => setReferralMessage(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-400"
                  placeholder="輸入或編輯引薦訊息內容..."
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
              <button onClick={closeReferralDialog} className="px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50">取消</button>
              <button
                onClick={submitReferral}
                disabled={creatingReferral}
                className="btn-gold px-4 py-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingReferral ? '送出中...' : '送出引薦'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AIProfilePage;