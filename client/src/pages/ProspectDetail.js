import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/axios';

const ProspectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [prospect, setProspect] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [analysisReport, setAnalysisReport] = useState(null);

  useEffect(() => {
    fetchProspectDetail();
  }, [id]);

  const fetchProspectDetail = async () => {
    try {
      const response = await axios.get('/api/prospects');
      const prospectData = response.data.prospects.find(p => p.id === parseInt(id));
      
      if (prospectData) {
        setProspect(prospectData);
        setAnalysisReport(prospectData.aiAnalysisReport);
      } else {
        setError('找不到指定的商訪準會員資料');
      }
    } catch (error) {
      console.error('Error fetching prospect detail:', error);
      setError('獲取商訪準會員詳情時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  const handleStartAIAnalysis = async () => {
    try {
      setAiAnalysisLoading(true);
      const response = await axios.post(`/api/ai-analysis/analyze-prospect/${id}`);
      
      if (response.data.success) {
        alert('AI 分析已啟動，請稍候刷新頁面查看結果');
        // 開始輪詢檢查分析狀態
        pollAnalysisStatus();
      } else {
        alert(response.data.message || 'AI 分析啟動失敗');
      }
    } catch (error) {
      console.error('Error starting AI analysis:', error);
      alert('啟動 AI 分析時發生錯誤');
    } finally {
      setAiAnalysisLoading(false);
    }
  };

  const pollAnalysisStatus = async () => {
    const maxAttempts = 30; // 最多檢查30次（約5分鐘）
    let attempts = 0;
    
    const checkStatus = async () => {
      try {
        const response = await axios.get(`/api/ai-analysis/status/${id}`);
        
        if (response.data.success && response.data.hasReport) {
          setAnalysisReport(response.data.report);
          fetchProspectDetail(); // 重新獲取完整資料
          return;
        }
        
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000); // 每10秒檢查一次
        }
      } catch (error) {
        console.error('Error checking analysis status:', error);
      }
    };
    
    setTimeout(checkStatus, 10000); // 10秒後開始第一次檢查
  };

  const handleClearAnalysis = async () => {
    if (!window.confirm('確定要清除 AI 分析報告嗎？')) {
      return;
    }
    
    try {
      const response = await axios.delete(`/api/ai-analysis/clear/${id}`);
      
      if (response.data.success) {
        setAnalysisReport(null);
        fetchProspectDetail();
        alert('AI 分析報告已清除');
      } else {
        alert(response.data.message || '清除分析報告失敗');
      }
    } catch (error) {
      console.error('Error clearing analysis:', error);
      alert('清除分析報告時發生錯誤');
    }
  };

  const getSentimentBadge = (sentiment) => {
    const badges = {
      positive: 'bg-green-100 text-green-800',
      negative: 'bg-red-100 text-red-800',
      neutral: 'bg-gray-100 text-gray-800'
    };
    
    const labels = {
      positive: '正面',
      negative: '負面', 
      neutral: '中立'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[sentiment] || badges.neutral}`}>
        {labels[sentiment] || '未知'}
      </span>
    );
  };

  const getConflictBadge = (level) => {
    const badges = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    
    const labels = {
      high: '高風險',
      medium: '中風險',
      low: '低風險'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[level] || badges.low}`}>
        {labels[level] || '未評估'}
      </span>
    );
  };

  const getScoreBadge = (score) => {
    let badgeClass = 'bg-gray-100 text-gray-800';
    
    if (score >= 80) {
      badgeClass = 'bg-green-100 text-green-800';
    } else if (score >= 60) {
      badgeClass = 'bg-blue-100 text-blue-800';
    } else if (score >= 40) {
      badgeClass = 'bg-yellow-100 text-yellow-800';
    } else if (score > 0) {
      badgeClass = 'bg-red-100 text-red-800';
    }
    
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${badgeClass}`}>
        {score ? `${score} 分` : '未評分'}
      </span>
    );
  };

  const getLegalRiskBadge = (riskLevel) => {
    const badges = {
      HIGH: 'bg-red-100 text-red-800',
      MEDIUM: 'bg-yellow-100 text-yellow-800',
      LOW: 'bg-green-100 text-green-800'
    };
    
    const labels = {
      HIGH: '高風險',
      MEDIUM: '中風險',
      LOW: '低風險'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badges[riskLevel] || badges.LOW}`}>
        {labels[riskLevel] || '未評估'}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !prospect) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">{error || '找不到商訪準會員資料'}</div>
        <button
          onClick={() => navigate('/admin/prospects')}
          className="mt-2 text-red-600 hover:text-red-800 underline"
        >
          返回列表
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{prospect.name}</h1>
            <p className="text-gray-600 mt-1">{prospect.company} • {prospect.industry}</p>
          </div>
          <button
            onClick={() => navigate('/admin/prospects')}
            className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
          >
            返回列表
          </button>
        </div>
      </div>

      {/* Basic Information */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">基本資料</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">聯絡人姓名</label>
            <p className="mt-1 text-sm text-gray-900">{prospect.name}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">公司名稱</label>
            <p className="mt-1 text-sm text-gray-900">{prospect.company || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">統一編號</label>
            <p className="mt-1 text-sm text-gray-900">{prospect.unifiedBusinessNumber || '-'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">產業別</label>
            <p className="mt-1 text-sm text-gray-900">{prospect.industry || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">聯絡資訊</label>
            <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{prospect.contactInfo || '-'}</p>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">商訪紀錄</label>
            <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">{prospect.notes || '-'}</p>
          </div>
        </div>
      </div>

      {/* AI Analysis Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">AI 智能分析報告</h2>
          <div className="flex space-x-2">
            {!analysisReport && (
              <button
                onClick={handleStartAIAnalysis}
                disabled={aiAnalysisLoading}
                className={`px-4 py-2 rounded font-medium ${
                  aiAnalysisLoading
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {aiAnalysisLoading ? '分析中...' : '啟動 AI 智能分析'}
              </button>
            )}
            {analysisReport && (
              <button
                onClick={handleClearAnalysis}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-medium"
              >
                清除分析報告
              </button>
            )}
          </div>
        </div>

        {!analysisReport && !aiAnalysisLoading && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-lg mb-2">尚未進行 AI 分析</div>
            <p className="text-sm">點擊上方按鈕啟動 AI 智能分析，獲得專業的投票參考建議</p>
          </div>
        )}

        {aiAnalysisLoading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <div className="text-lg text-blue-600 mb-2">AI 分析進行中...</div>
            <p className="text-sm text-gray-500">這可能需要幾分鐘時間，請耐心等候</p>
          </div>
        )}

        {analysisReport && !analysisReport.error && (
          <div className="space-y-8">
            {/* Analysis Header */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-blue-900 mb-1">🤖 AI 智能分析報告</h2>
                  <p className="text-sm text-blue-600">分析時間: {new Date(analysisReport.analysisDate).toLocaleString('zh-TW')}</p>
                </div>
                <div className="text-right">
                  <div className="text-xs text-blue-500 mb-1">處理時間</div>
                  <div className="text-sm font-medium text-blue-700">{analysisReport.processingTime || '< 15秒'}</div>
                </div>
              </div>
            </div>

            {/* Overall Recommendation */}
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400 rounded-lg p-6 shadow-sm">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-3">💡</span>
                <h3 className="text-lg font-bold text-green-900">整體建議</h3>
              </div>
              <div className="bg-white rounded-lg p-4 border border-green-200">
                <p className="text-green-800 leading-relaxed">{analysisReport.overallRecommendation}</p>
              </div>
            </div>

            <hr className="border-gray-300" />

            {/* GBC Fit Score */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">🎯</span>
                  <h3 className="text-lg font-bold text-gray-900">GBC 契合度評分</h3>
                </div>
                <div className="flex items-center space-x-2">
                  {getScoreBadge(analysisReport.gbcFitScore?.score)}
                  {analysisReport.gbcFitScore?.recommendation && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      analysisReport.gbcFitScore.recommendation === 'strongly_recommend' 
                        ? 'bg-green-100 text-green-700' 
                        : analysisReport.gbcFitScore.recommendation === 'recommend'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {analysisReport.gbcFitScore.recommendation === 'strongly_recommend' 
                        ? '強烈推薦' 
                        : analysisReport.gbcFitScore.recommendation === 'recommend'
                        ? '建議通過'
                        : '謹慎評估'}
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="text-gray-700 leading-relaxed text-sm"
                     dangerouslySetInnerHTML={{
                       __html: analysisReport.gbcFitScore.analysis
                         .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                         .replace(/\n/g, '<br>')
                     }}
                />
              </div>
            </div>

            {/* Market Sentiment */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">📊</span>
                  <h3 className="text-lg font-bold text-gray-900">市場聲譽分析</h3>
                </div>
                <div className="flex items-center space-x-2">
                  {getSentimentBadge(analysisReport.marketSentiment?.sentiment)}
                  {analysisReport.marketSentiment?.confidence && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      analysisReport.marketSentiment.confidence === 'high' 
                        ? 'bg-blue-100 text-blue-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {analysisReport.marketSentiment.confidence === 'high' ? '高信心度' : '中信心度'}
                    </span>
                  )}
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <div className="text-gray-700 leading-relaxed text-sm"
                     dangerouslySetInnerHTML={{
                       __html: analysisReport.marketSentiment.analysis
                         .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                         .replace(/\n/g, '<br>')
                     }}
                />
              </div>
            </div>

            {/* Industry Conflict */}
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">⚖️</span>
                  <h3 className="text-lg font-bold text-gray-900">產業衝突檢測</h3>
                </div>
                {getConflictBadge(analysisReport.industryConflict?.conflictLevel)}
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-gray-700 leading-relaxed text-sm mb-3">{analysisReport.industryConflict?.analysis}</p>
                {analysisReport.industryConflict?.existingMembers && (
                   <div className="mt-3 pt-3 border-t border-gray-200">
                     <p className="text-sm font-medium text-gray-600 mb-1">同產業現有會員:</p>
                     <p className="text-sm text-gray-500">{analysisReport.industryConflict.existingMembers}</p>
                   </div>
                 )}
               </div>
              </div>

            {/* Legal Risk Assessment */}
            {analysisReport.legalRiskAssessment && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">⚖️</span>
                    <h3 className="text-lg font-bold text-gray-900">法律風險評估</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getLegalRiskBadge(analysisReport.legalRiskAssessment.riskLevel)}
                    <span className="text-sm text-gray-500">
                      {analysisReport.legalRiskAssessment.riskScore}/100
                    </span>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <div className="text-gray-700 leading-relaxed text-sm mb-3" 
                       dangerouslySetInnerHTML={{
                         __html: analysisReport.legalRiskAssessment.analysis
                           .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                           .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline">$1</a>')
                           .replace(/\n/g, '<br>')
                       }}
                  />
                </div>
                
                {/* 司法院 API 搜尋結果詳情 */}
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-600">司法院記錄: <span className="font-medium text-gray-900">{analysisReport.legalRiskAssessment.judicialRecordsCount} 筆</span></span>
                      <span className="text-gray-600">風險分數: <span className="font-medium text-gray-900">{analysisReport.legalRiskAssessment.riskScore}/100</span></span>
                    </div>
                  </div>
                  

                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>資料來源: {analysisReport.legalRiskAssessment.dataSource}</span>
                  <span className={`px-2 py-1 rounded ${
                    analysisReport.legalRiskAssessment.searchSuccess 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {analysisReport.legalRiskAssessment.searchSuccess ? '整體查詢成功' : '查詢異常'}
                  </span>
                </div>
              </div>
            )}

            {/* Public Information Scan */}
            {analysisReport.publicInformationScan && (
              <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <span className="text-2xl mr-3">🔍</span>
                    <h3 className="text-lg font-bold text-gray-900">公開資訊掃描</h3>
                  </div>
                  {analysisReport.publicInformationScan.realData && (
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                      ✅ 真實資料
                    </span>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border">
                  <div className="text-gray-700 leading-relaxed text-sm mb-3"
                       dangerouslySetInnerHTML={{
                         __html: analysisReport.publicInformationScan.summary
                           .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                           .replace(/\n/g, '<br>')
                       }}
                  />
                </div>
                <div className="mt-3">
                  <p className="text-xs text-gray-500">資料來源: {analysisReport.publicInformationScan?.sources}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {analysisReport && analysisReport.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="font-semibold text-red-900 mb-2">分析錯誤</h3>
            <p className="text-red-800">{analysisReport.errorMessage}</p>
            <p className="text-sm text-red-600 mt-2">{analysisReport.status}</p>
          </div>
        )}
      </div>

      {/* Voting Section */}
      {prospect.status === 'pending_vote' && user?.membership_level === 1 && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">投票區域</h2>
          <div className="flex space-x-4">
            <button className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 rounded">
              贊成
            </button>
            <button className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-6 rounded">
              反對
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProspectDetail;