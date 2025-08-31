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

  useEffect(() => {
    fetchProfile();
    fetchAnalysis();
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
    return new Date(dateString).toLocaleString('zh-TW');
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
            <CpuChipIcon className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">AI 深度畫像</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">智能分析您的商業特質與合作潛力</p>
            </div>
          </div>
          <button
            onClick={handleUpdateProfile}
            disabled={updating}
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
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
            <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
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
              <ChartBarIcon className="h-8 w-8 text-blue-500 mx-auto" />
            </div>
            <p className="text-lg font-semibold text-gray-900">
              {(Object.values(profile?.profile?.data_sources || {}).filter(src => src && src.last_update).length) || 0} 個
            </p>
            <p className="text-sm text-gray-600">數據來源</p>
          </div>

          {/* 分析維度 */}
          <div className="text-center">
            <div className="mb-2">
              <BriefcaseIcon className="h-8 w-8 text-purple-500 mx-auto" />
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
            className="w-full flex items-center justify-between text-left text-sm font-medium text-primary-700 hover:text-primary-900"
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
        <div className="bg-primary-50 border border-primary-200 rounded-lg p-5 mb-8">
          <div className="flex items-center mb-3">
            <LightBulbIcon className="h-5 w-5 text-primary-600 mr-2" />
            <h3 className="text-base font-semibold text-primary-900">AI 建議</h3>
            {analysis.lastAnalyzed && (
              <span className="ml-auto text-xs text-gray-500">分析時間：{formatDate(analysis.lastAnalyzed)}</span>
            )}
          </div>
          <ul className="space-y-2">
            {analysis.suggestions.map((s, idx) => (
              <li key={idx} className="flex flex-col sm:flex-row sm:items-start gap-2">
                <span
                  className={`mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s.priority === 'high' ? 'bg-red-100 text-red-700' : s.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}
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
                            <a href="/wishes" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 whitespace-nowrap">發布許願</a>
                          </>
                        );
                      case 'engagement_improvement':
                        return (
                          <>
                            <a href="/events" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 whitespace-nowrap">參與活動</a>
                            <a href="/wishes" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium border border-blue-300 text-blue-700 hover:bg-blue-50 whitespace-nowrap">發布許願</a>
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
                          <a href="/smart-collaboration" className="inline-flex items-center justify-center px-2.5 py-1 rounded-md text-xs font-medium text-white bg-primary-600 hover:bg-primary-700 whitespace-nowrap">智慧合作儀表板</a>
                        );
                    }
                  })()}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

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
            在「智慧合作儀表板」查看個人化洞察與動態建議。
            <a href="/smart-collaboration" className="ml-2 text-primary-600 hover:underline">前往儀表板</a>
          </li>
          <li>
            使用「轉介系統」與「會議排程」快速建立合作：
            <a href="/referrals" className="ml-2 text-primary-600 hover:underline">轉介系統</a>
            <span className="mx-1">/</span>
            <a href="/meetings" className="text-primary-600 hover:underline">會議排程</a>
          </li>
          <li>
            追蹤「通知中心」以不漏接媒合建議與重要提醒。
            <a href="/notifications" className="ml-2 text-primary-600 hover:underline">通知中心</a>
          </li>
        </ul>
      </div>

      {/* 標籤頁導航 */}
      <div className="border-b border-gray-200 mb-6">
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
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
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

        {activeTab === 'personality' && profile?.profile?.ai_insights?.personality_traits && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">個性特質分析</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.profile.ai_insights.personality_traits.map((trait, index) => (
                <div key={index} className="bg-blue-50 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrophyIcon className="h-5 w-5 text-blue-500" />
                    <span className="font-medium text-blue-900">{trait}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'business' && profile?.profile?.ai_insights?.business_compatibility && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">商業相容性評估</h3>
            <div className="space-y-4">
              {Object.entries(profile.profile.ai_insights.business_compatibility).map(([industry, score]) => (
                <div key={industry} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-0 sm:justify-between">
                  <span className="text-gray-700 font-medium">{industry}</span>
                  <div className="flex items-center space-x-3">
                    <div className="flex-1 sm:w-32 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${score}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">{score}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'collaboration' && profile?.profile?.ai_insights?.collaboration_potential && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">合作潛力分析</h3>
            <div className="space-y-4">
              {Object.entries(profile.profile.ai_insights.collaboration_potential).map(([type, potential]) => (
                <div key={type} className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-green-900">{type}</span>
                    <span className="text-sm font-bold text-green-700">{potential}%</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${potential}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'opportunities' && profile?.profile?.ai_insights?.market_opportunities && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">市場機會識別</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profile.profile.ai_insights.market_opportunities.map((opportunity, index) => (
                <div key={index} className="bg-yellow-50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <LightBulbIcon className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="text-yellow-900 font-medium">{opportunity}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'risks' && profile?.profile?.ai_insights?.risk_factors && (
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">風險因素評估</h3>
            <div className="space-y-4">
              {profile.profile.ai_insights.risk_factors.map((risk, index) => (
                <div key={index} className="bg-red-50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5" />
                    <div>
                      <p className="text-red-900">{risk}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 無分析數據提示 */}
      {!analysis && !profile?.profile?.ai_insights && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-yellow-900 mb-2">尚無AI分析數據</h3>
          <p className="text-yellow-700 mb-4">
            您的AI深度畫像尚未完成分析，請點擊上方「更新畫像」按鈕來生成分析報告。
          </p>
          <button
            onClick={handleUpdateProfile}
            disabled={updating}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
    </div>
  );
};

export default AIProfilePage;