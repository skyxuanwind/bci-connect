import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import axios from '../config/axios';
import { 
  MagnifyingGlassIcon, 
  SparklesIcon, 
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const ProspectApplication = () => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    // 申請會員基本資料
    memberName: '',
    referralChapter: '',
    referralPartner: '',
    primaryProfession: '',
    secondaryProfession: '',
    interviewer: '',
    interviewDate: '',
    
    // 公司基本資料
    companyName: '',
    companyTaxId: '',
    companyCapital: '',
    companyEstablished: '',
    professionalExperience: '',
    companyCertifications: '',
    
    // 會談內容
    mainBusiness: '',
    mainProducts: '',
    mainAdvantages: '',
    representativeClients: '',
    cooperationTargets: '',
    websiteInfo: '',
    bciExpectations: '',
    pastAchievements: '',
    futureGoals: '',
    revenueTarget: '',
    
    // 同意條款
    agreeRules: false,
    agreeTraining: false,
    noCriminalRecord: false,
    agreeTerms: false,
    
    // 其他
    otherComments: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [chapters, setChapters] = useState([]);
  const [coreMembers, setCoreMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // 公司查詢相關狀態
  const [companyLookupLoading, setCompanyLookupLoading] = useState(false);
  const [companyLookupResult, setCompanyLookupResult] = useState(null);
  const [companyLookupError, setCompanyLookupError] = useState('');
  
  // AI 分析相關狀態
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState(null);
  const [aiAnalysisError, setAiAnalysisError] = useState('');
  const [showAiAnalysis, setShowAiAnalysis] = useState(false);
  const [aiAnalysisProgress, setAiAnalysisProgress] = useState(0);
  const [aiAnalysisStage, setAiAnalysisStage] = useState('');

  // 獲取分會和一級核心人員數據
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 獲取分會列表
        const chaptersResponse = await axios.get('/api/chapters');
        setChapters(chaptersResponse.data.chapters || []);
        
        // 獲取一級核心人員列表
        const coreMembersResponse = await axios.get('/api/users/core-members');
        setCoreMembers(coreMembersResponse.data.coreMembers || []);
        
      } catch (error) {
        console.error('獲取數據失敗:', error);
        toast.error('載入數據失敗，請重新整理頁面');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // 日期格式轉換函數
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    
    // 處理各種可能的日期格式
    let date;
    
    // 如果已經是 YYYY-MM-DD 格式
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString;
    }
    
    // 處理 YYYY/MM/DD 格式
    if (/^\d{4}\/\d{2}\/\d{2}$/.test(dateString)) {
      return dateString.replace(/\//g, '-');
    }
    
    // 處理民國年格式 (如: 109/01/15)
    if (/^\d{2,3}\/\d{2}\/\d{2}$/.test(dateString)) {
      const parts = dateString.split('/');
      const rocYear = parseInt(parts[0]);
      const adYear = rocYear + 1911;
      return `${adYear}-${parts[1]}-${parts[2]}`;
    }
    
    // 處理政府 API 的民國年格式 (如: 0920129 = 92年01月29日, 1090115 = 109年01月15日)
    if (/^\d{7}$/.test(dateString)) {
      const rocYear = parseInt(dateString.substring(0, 3));
      const month = dateString.substring(3, 5);
      const day = dateString.substring(5, 7);
      const adYear = rocYear + 1911;
      return `${adYear}-${month}-${day}`;
    }
    
    // 嘗試解析其他格式
    try {
      date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch (error) {
      console.warn('無法解析日期格式:', dateString);
    }
    
    return '';
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // 清除相關的查詢結果
    if (name === 'companyTaxId' || name === 'companyName') {
      setCompanyLookupResult(null);
      setCompanyLookupError('');
      setAiAnalysisResult(null);
      setAiAnalysisError('');
    }
  };

  // 根據統編查詢公司
  const lookupCompanyByTaxId = async () => {
    if (!formData.companyTaxId.trim()) {
      toast.error('請輸入統一編號');
      return;
    }
    
    setCompanyLookupLoading(true);
    setCompanyLookupError('');
    setCompanyLookupResult(null);
    
    try {
      const response = await axios.get(`/api/company-lookup/by-number/${formData.companyTaxId.trim()}`);
      
      if (response.data.success && response.data.data) {
        const company = response.data.data;
        setCompanyLookupResult(company);
        
        // 自動填入公司名稱
        setFormData(prev => ({
          ...prev,
          companyName: company.companyName || company.Company_Name || '',
          companyCapital: company.capital || company.Capital || '',
          companyEstablished: formatDateForInput(company.setupDate || company.Company_Setup_Date || '')
        }));
        
        toast.success('找到公司資料！');
      } else {
        setCompanyLookupError('未找到該統編的公司資料');
        toast.error('未找到該統編的公司資料');
      }
    } catch (error) {
      console.error('公司查詢失敗:', error);
      const errorMessage = error.response?.data?.message || '查詢失敗，請稍後再試';
      setCompanyLookupError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setCompanyLookupLoading(false);
    }
  };

  // 根據公司名稱查詢統編
  const lookupCompanyByName = async () => {
    if (!formData.companyName.trim()) {
      toast.error('請輸入公司名稱');
      return;
    }
    
    setCompanyLookupLoading(true);
    setCompanyLookupError('');
    setCompanyLookupResult(null);
    
    try {
      const response = await axios.get(`/api/company-lookup/by-name/${encodeURIComponent(formData.companyName.trim())}`);
      
      if (response.data.success && response.data.data) {
        const company = response.data.data;
        setCompanyLookupResult(company);
        
        // 自動填入統編和其他資料
        setFormData(prev => ({
          ...prev,
          companyTaxId: company.unifiedBusinessNumber || company.Business_Accounting_NO || '',
          companyCapital: company.capital || company.Capital || '',
          companyEstablished: formatDateForInput(company.setupDate || company.Company_Setup_Date || '')
        }));
        
        toast.success('找到公司資料！');
      } else {
        setCompanyLookupError('未找到該公司名稱的資料');
        toast.error('未找到該公司名稱的資料');
      }
    } catch (error) {
      console.error('公司查詢失敗:', error);
      const errorMessage = error.response?.data?.message || '查詢失敗，請稍後再試';
      setCompanyLookupError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setCompanyLookupLoading(false);
    }
  };

  // 執行 AI 分析
  const performAiAnalysis = async () => {
    // 驗證必填欄位
    if (!formData.companyName.trim()) {
      toast.error('請先輸入公司名稱');
      return;
    }
    
    if (!formData.memberName.trim()) {
      toast.error('請先輸入申請人姓名');
      return;
    }
    
    if (!formData.primaryProfession.trim()) {
      toast.error('請先選擇主要專業別');
      return;
    }
    
    setAiAnalysisLoading(true);
    setAiAnalysisError('');
    setAiAnalysisResult(null);
    
    try {
      // 先創建臨時的潛在客戶資料
      const prospectData = {
        name: formData.memberName || '待分析申請人',
        company: formData.companyName,
        industry: formData.primaryProfession,
        unifiedBusinessNumber: formData.companyTaxId && /^\d{8}$/.test(formData.companyTaxId.trim()) ? formData.companyTaxId.trim() : null,
        contactInfo: JSON.stringify({
          companyTaxId: formData.companyTaxId,
          referralChapter: formData.referralChapter,
          interviewer: formData.interviewer,
          interviewDate: formData.interviewDate
        }),
        notes: JSON.stringify({
          companyInfo: {
            capital: formData.companyCapital,
            established: formData.companyEstablished,
            mainBusiness: formData.mainBusiness,
            professionalExperience: formData.professionalExperience
          },
          interview: {
            bciExpectations: formData.bciExpectations,
            pastAchievements: formData.pastAchievements,
            futureGoals: formData.futureGoals
          }
        }),
        status: 'vetting'
      };
      
      // 先保存臨時商訪資料以獲得 ID
      const saveResponse = await axios.post('/api/prospects', prospectData);
      
      if (saveResponse.data && saveResponse.data.prospect && saveResponse.data.prospect.id) {
        const prospectId = saveResponse.data.prospect.id;
        
        // 觸發 AI 分析
        const analysisResponse = await axios.post(`/api/ai-analysis/analyze-prospect/${prospectId}`);
        
        if (analysisResponse.data.success) {
          // 初始化進度
          setAiAnalysisProgress(10);
          setAiAnalysisStage('正在啟動 AI 分析...');
          
          // 輪詢檢查分析狀態
          let pollCount = 0;
          const maxPolls = 150; // 最多輪詢 5 分鐘（每2秒一次）
          
          const checkAnalysisStatus = async () => {
            try {
              pollCount++;
              const statusResponse = await axios.get(`/api/ai-analysis/status/${prospectId}`);
              
              // 根據輪詢次數更新進度
              const baseProgress = Math.min(10 + (pollCount * 0.5), 85);
              setAiAnalysisProgress(baseProgress);
              
              // 更新階段描述
              if (pollCount <= 10) {
                setAiAnalysisStage('正在分析公司基本資料...');
              } else if (pollCount <= 30) {
                setAiAnalysisStage('正在搜尋相關資訊...');
              } else if (pollCount <= 60) {
                setAiAnalysisStage('正在進行風險評估...');
              } else if (pollCount <= 100) {
                setAiAnalysisStage('正在生成分析報告...');
              } else {
                setAiAnalysisStage('正在完成最終處理...');
              }
              
              if (statusResponse.data.status === 'completed') {
                setAiAnalysisProgress(100);
                setAiAnalysisStage('分析完成！');
                setAiAnalysisResult(statusResponse.data.report);
                setShowAiAnalysis(true);
                setAiAnalysisLoading(false);
                toast.success('AI 分析完成！');
                
                // 刪除臨時資料
                try {
                  await axios.delete(`/api/prospects/${prospectId}`);
                } catch (deleteError) {
                  console.warn('刪除臨時資料失敗:', deleteError);
                }
              } else if (statusResponse.data.status === 'failed') {
                setAiAnalysisError(statusResponse.data.error || 'AI 分析失敗');
                setAiAnalysisProgress(0);
                setAiAnalysisStage('');
                setAiAnalysisLoading(false);
                toast.error('AI 分析失敗');
                
                // 刪除臨時資料
                try {
                  await axios.delete(`/api/prospects/${prospectId}`);
                } catch (deleteError) {
                  console.warn('刪除臨時資料失敗:', deleteError);
                }
              } else if (pollCount >= maxPolls) {
                // 超時處理
                setAiAnalysisError('AI 分析超時，請稍後再試');
                setAiAnalysisProgress(0);
                setAiAnalysisStage('');
                setAiAnalysisLoading(false);
                toast.error('AI 分析超時');
                
                // 刪除臨時資料
                try {
                  await axios.delete(`/api/prospects/${prospectId}`);
                } catch (deleteError) {
                  console.warn('刪除臨時資料失敗:', deleteError);
                }
              } else {
                // 繼續輪詢，根據輪詢次數調整間隔
                const interval = pollCount > 60 ? 3000 : 2000; // 1分鐘後增加間隔
                setTimeout(checkAnalysisStatus, interval);
              }
            } catch (error) {
              console.error('檢查分析狀態失敗:', error);
              setAiAnalysisError('檢查分析狀態失敗');
              setAiAnalysisProgress(0);
              setAiAnalysisStage('');
              setAiAnalysisLoading(false);
              toast.error('檢查分析狀態失敗');
            }
          };
          
          // 開始輪詢
          setTimeout(checkAnalysisStatus, 2000);
          toast.success('AI 分析已開始，請稍候...');
        } else {
          setAiAnalysisError(analysisResponse.data.message || 'AI 分析啟動失敗');
          setAiAnalysisLoading(false);
          toast.error('AI 分析啟動失敗');
          
          // 刪除臨時資料
          try {
            await axios.delete(`/api/prospects/${prospectId}`);
          } catch (deleteError) {
            console.warn('刪除臨時資料失敗:', deleteError);
          }
        }
      } else {
        setAiAnalysisError('無法創建臨時分析資料');
        setAiAnalysisLoading(false);
        toast.error('無法創建臨時分析資料');
      }
    } catch (error) {
      console.error('AI 分析失敗:', error);
      const errorMessage = error.response?.data?.message || 'AI 分析失敗，請稍後再試';
      setAiAnalysisError(errorMessage);
      setAiAnalysisProgress(0);
      setAiAnalysisStage('');
      setAiAnalysisLoading(false);
      toast.error(errorMessage);
    }
  };

  // 獲取風險等級徽章
  const getRiskBadge = (riskLevel) => {
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

  // 獲取分數徽章
  const getScoreBadge = (score) => {
    let badgeClass = 'bg-gray-100 text-gray-800';
    if (score >= 80) badgeClass = 'bg-green-100 text-green-800';
    else if (score >= 60) badgeClass = 'bg-yellow-100 text-yellow-800';
    else if (score >= 40) badgeClass = 'bg-orange-100 text-orange-800';
    else badgeClass = 'bg-red-100 text-red-800';
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badgeClass}`}>
        {score}/100
      </span>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // 檢查必填欄位
    const requiredFields = [
      'memberName', 'referralChapter', 'primaryProfession', 'interviewer', 'interviewDate',
      'companyName', 'companyTaxId', 'companyCapital', 'companyEstablished', 'professionalExperience',
      'mainBusiness', 'bciExpectations', 'pastAchievements', 'futureGoals'
    ];
    
    const missingFields = requiredFields.filter(field => !formData[field]);
    if (missingFields.length > 0) {
      toast.error('請填寫所有必填欄位');
      return;
    }
    
    // 檢查同意條款
    if (!formData.agreeRules || !formData.agreeTraining || !formData.noCriminalRecord || !formData.agreeTerms) {
      toast.error('請同意所有條款');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await axios.post('/api/prospects', {
        name: formData.memberName,
        industry: formData.primaryProfession,
        company: formData.companyName,
        contactInfo: JSON.stringify({
          referralChapter: formData.referralChapter,
          referralPartner: formData.referralPartner,
          companyTaxId: formData.companyTaxId,
          interviewer: formData.interviewer,
          interviewDate: formData.interviewDate
        }),
        notes: JSON.stringify({
          // 申請會員基本資料
          memberInfo: {
            secondaryProfession: formData.secondaryProfession
          },
          // 公司基本資料
          companyInfo: {
            capital: formData.companyCapital,
            established: formData.companyEstablished,
            professionalExperience: formData.professionalExperience,
            certifications: formData.companyCertifications
          },
          // 會談內容
          interview: {
            mainBusiness: formData.mainBusiness,
            mainProducts: formData.mainProducts,
            mainAdvantages: formData.mainAdvantages,
            representativeClients: formData.representativeClients,
            cooperationTargets: formData.cooperationTargets,
            websiteInfo: formData.websiteInfo,
            bciExpectations: formData.bciExpectations,
            pastAchievements: formData.pastAchievements,
            futureGoals: formData.futureGoals,
            revenueTarget: formData.revenueTarget,
            otherComments: formData.otherComments
          },
          // 同意條款記錄
          agreements: {
            agreeRules: formData.agreeRules,
            agreeTraining: formData.agreeTraining,
            noCriminalRecord: formData.noCriminalRecord,
            agreeTerms: formData.agreeTerms
          },
          // AI 分析結果
          aiAnalysis: aiAnalysisResult,
          // 公司查詢結果
          companyLookup: companyLookupResult
        }),
        status: 'pending_vote'
      });

      if (response.status === 200 || response.status === 201) {
        toast.success('申請表提交成功！');
        // 重置表單
        setFormData({
          memberName: '',
          referralChapter: '',
          referralPartner: '',
          primaryProfession: '',
          secondaryProfession: '',
          interviewer: '',
          interviewDate: '',
          companyName: '',
          companyTaxId: '',
          companyCapital: '',
          companyEstablished: '',
          professionalExperience: '',
          companyCertifications: '',
          mainBusiness: '',
          mainProducts: '',
          mainAdvantages: '',
          representativeClients: '',
          cooperationTargets: '',
          websiteInfo: '',
          bciExpectations: '',
          pastAchievements: '',
          futureGoals: '',
          revenueTarget: '',
          otherComments: '',
          agreeRules: false,
          agreeTraining: false,
          noCriminalRecord: false,
          agreeTerms: false
        });
        
        // 清除查詢結果
        setCompanyLookupResult(null);
        setAiAnalysisResult(null);
        setShowAiAnalysis(false);
      } else {
        toast.error(response.data?.message || '提交失敗，請稍後再試');
      }
    } catch (error) {
      console.error('提交申請表錯誤:', error);
      toast.error(error.response?.data?.message || '提交失敗，請稍後再試');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">商訪申請表</h1>
        <p className="text-gray-600">請詳細填寫以下資訊，系統將協助進行公司查詢和 AI 智能分析</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white shadow rounded-lg p-6">
          {/* 一、申請會員基本資料 */}
          <div className="border-b border-gray-200 pb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">一、申請會員基本資料</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">申請會員姓名 *</label>
                <input
                  type="text"
                  name="memberName"
                  value={formData.memberName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">引薦分會 *</label>
                <select
                  name="referralChapter"
                  value={formData.referralChapter}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">請選擇分會</option>
                  {chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.name}>
                      {chapter.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">引薦夥伴</label>
                <input
                  type="text"
                  name="referralPartner"
                  value={formData.referralPartner}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">主要專業 *</label>
                <input
                  type="text"
                  name="primaryProfession"
                  value={formData.primaryProfession}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">次要專業</label>
                <input
                  type="text"
                  name="secondaryProfession"
                  value={formData.secondaryProfession}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">面談人 *</label>
                <select
                  name="interviewer"
                  value={formData.interviewer}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">請選擇面談人</option>
                  {coreMembers.map((member) => (
                    <option key={member.id} value={member.name}>
                      {member.name} ({member.company})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">面談日期 *</label>
                <input
                  type="date"
                  name="interviewDate"
                  value={formData.interviewDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* 二、公司基本資料 */}
          <div className="border-b border-gray-200 pb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">二、公司基本資料</h2>
            
            {/* 公司查詢功能 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div className="flex items-center mb-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-medium text-blue-900">智能公司查詢</h3>
              </div>
              <p className="text-blue-700 text-sm mb-4">
                輸入統一編號可自動帶入公司名稱，或輸入公司名稱可自動帶入統一編號
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      name="companyTaxId"
                      value={formData.companyTaxId}
                      onChange={handleInputChange}
                      placeholder="請輸入統一編號"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={lookupCompanyByTaxId}
                      disabled={companyLookupLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
                    >
                      {companyLookupLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <MagnifyingGlassIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                
                <div>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      placeholder="請輸入公司名稱"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={lookupCompanyByName}
                      disabled={companyLookupLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
                    >
                      {companyLookupLoading ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <MagnifyingGlassIcon className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
              
              {/* 查詢結果顯示 */}
              {companyLookupResult && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center mb-2">
                    <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-green-800 font-medium">找到公司資料</span>
                  </div>
                  <div className="text-sm text-green-700">
                    <p><strong>公司名稱：</strong>{companyLookupResult.Company_Name || companyLookupResult.name}</p>
                    <p><strong>統一編號：</strong>{companyLookupResult.Business_Accounting_NO || companyLookupResult.taxId}</p>
                    {companyLookupResult.Company_Status && (
                      <p><strong>公司狀態：</strong>{companyLookupResult.Company_Status}</p>
                    )}
                  </div>
                </div>
              )}
              
              {companyLookupError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                    <span className="text-red-800">{companyLookupError}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">公司名稱 *</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">公司統編 *</label>
                <input
                  type="text"
                  name="companyTaxId"
                  value={formData.companyTaxId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">公司資本額 *</label>
                <input
                  type="text"
                  name="companyCapital"
                  value={formData.companyCapital}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：新台幣 1,000 萬元"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">公司成立時間 *</label>
                <input
                  type="date"
                  name="companyEstablished"
                  value={formData.companyEstablished}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">個人專業年資 *</label>
                <input
                  type="text"
                  name="professionalExperience"
                  value={formData.professionalExperience}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：10年"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">公司認證/作品</label>
                <textarea
                  name="companyCertifications"
                  value={formData.companyCertifications}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="請描述公司相關認證或代表性作品"
                />
              </div>
            </div>
          </div>

          {/* AI 智能分析 */}
          <div className="border-b border-gray-200 pb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <SparklesIcon className="h-6 w-6 text-purple-600 mr-2" />
                <h2 className="text-xl font-semibold text-gray-900">AI 智能分析</h2>
              </div>
              <button
                type="button"
                onClick={performAiAnalysis}
                disabled={aiAnalysisLoading || !formData.companyName}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-gray-400 flex items-center"
              >
                {aiAnalysisLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    分析中...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="h-4 w-4 mr-2" />
                    開始分析
                  </>
                )}
              </button>
            </div>
            
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
              <div className="flex items-center mb-2">
                <InformationCircleIcon className="h-5 w-5 text-purple-600 mr-2" />
                <span className="text-purple-800 font-medium">AI 分析功能說明</span>
              </div>
              <p className="text-purple-700 text-sm">
                系統將自動分析公司的市場聲譽、產業衝突、BCI 契合度，並透過司法院判決書查詢評估法律風險，為入會決策提供參考。
              </p>
            </div>
            
            {/* AI 分析進度條 */}
            {aiAnalysisLoading && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-center mb-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                  <span className="text-blue-800 font-medium">AI 分析進行中</span>
                  <span className="ml-auto text-blue-600 text-sm">{aiAnalysisProgress}%</span>
                </div>
                
                {/* 進度條 */}
                <div className="w-full bg-blue-200 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${aiAnalysisProgress}%` }}
                  ></div>
                </div>
                
                {/* 當前階段 */}
                {aiAnalysisStage && (
                  <p className="text-blue-700 text-sm">{aiAnalysisStage}</p>
                )}
              </div>
            )}
            
            {aiAnalysisError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-red-800">{aiAnalysisError}</span>
                </div>
              </div>
            )}
            
            {aiAnalysisResult && showAiAnalysis && (
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center mb-4">
                  <DocumentTextIcon className="h-6 w-6 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">AI 分析報告</h3>
                </div>
                
                {/* 整體建議 */}
                {aiAnalysisResult.overallRecommendation && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">整體建議</h4>
                    <p className="text-gray-700">{aiAnalysisResult.overallRecommendation}</p>
                  </div>
                )}
                
                {/* BCI 契合度評分 */}
                {aiAnalysisResult.bciFitScore && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">BCI 契合度評分</h4>
                      {getScoreBadge(aiAnalysisResult.bciFitScore.score)}
                    </div>
                    <p className="text-gray-700">{aiAnalysisResult.bciFitScore.analysis}</p>
                  </div>
                )}
                
                {/* 市場聲譽分析 */}
                {aiAnalysisResult.marketSentiment && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">市場聲譽分析</h4>
                    <p className="text-gray-700">{aiAnalysisResult.marketSentiment.analysis}</p>
                  </div>
                )}
                
                {/* 產業衝突檢測 */}
                {aiAnalysisResult.industryConflict && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">產業衝突檢測</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        aiAnalysisResult.industryConflict.conflictLevel === 'high' 
                          ? 'bg-red-100 text-red-800' 
                          : aiAnalysisResult.industryConflict.conflictLevel === 'medium'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {aiAnalysisResult.industryConflict.conflictLevel === 'high' ? '高衝突' : 
                         aiAnalysisResult.industryConflict.conflictLevel === 'medium' ? '中等衝突' : '低衝突'}
                      </span>
                    </div>
                    <p className="text-gray-700">{aiAnalysisResult.industryConflict.analysis}</p>
                  </div>
                )}
                
                {/* 法律風險評估 */}
                {aiAnalysisResult.legalRiskAssessment && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-gray-900">法律風險評估</h4>
                      <div className="flex items-center space-x-2">
                        {getRiskBadge(aiAnalysisResult.legalRiskAssessment.riskLevel)}
                        <span className="text-sm text-gray-500">
                          {aiAnalysisResult.legalRiskAssessment.riskScore}/100
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-700 mb-3">{aiAnalysisResult.legalRiskAssessment.analysis}</p>
                    
                    {aiAnalysisResult.legalRiskAssessment.judicialRecordsCount !== undefined && (
                      <div className="text-sm text-gray-600 mb-2">
                        <strong>司法院判決書數量：</strong>{aiAnalysisResult.legalRiskAssessment.judicialRecordsCount} 件
                      </div>
                    )}
                    
                    {aiAnalysisResult.legalRiskAssessment.riskDetails && aiAnalysisResult.legalRiskAssessment.riskDetails.length > 0 && (
                      <div>
                        <p className="font-medium text-gray-600 text-sm mb-2">風險細節：</p>
                        <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                          {aiAnalysisResult.legalRiskAssessment.riskDetails.map((detail, index) => (
                            <li key={index}>{detail}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                
                {/* 公開資訊掃描 */}
                {aiAnalysisResult.publicInformationScan && (
                  <div className="mb-6">
                    <h4 className="font-semibold text-gray-900 mb-2">公開資訊掃描</h4>
                    <p className="text-gray-700">{aiAnalysisResult.publicInformationScan.summary}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 三、會談內容 */}
          <div className="border-b border-gray-200 pb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">三、會談內容</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">1. 請說明您的主要專業跟事業服務、從事事業、服務內容、個人優勢、代表性客戶等：</h3>
                
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">主要業務及服務 *</label>
                    <textarea
                      name="mainBusiness"
                      value={formData.mainBusiness}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="請詳細說明您的主要業務及服務內容"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">主要產品</label>
                    <textarea
                      name="mainProducts"
                      value={formData.mainProducts}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="請說明您的主要產品或服務項目"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">主要優勢</label>
                    <textarea
                      name="mainAdvantages"
                      value={formData.mainAdvantages}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="請說明您的競爭優勢或特色"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">代表性客戶</label>
                    <textarea
                      name="representativeClients"
                      value={formData.representativeClients}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="請列舉一些代表性客戶（可不具名）"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">2. 其他相關資訊：</h3>
                
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">希望合作對象</label>
                    <textarea
                      name="cooperationTargets"
                      value={formData.cooperationTargets}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="請說明您希望在 BCI 中尋找的合作對象類型"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">網站資訊</label>
                    <input
                      type="url"
                      name="websiteInfo"
                      value={formData.websiteInfo}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://www.example.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">對 BCI 的期待 *</label>
                    <textarea
                      name="bciExpectations"
                      value={formData.bciExpectations}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="請說明您對加入 BCI 的期待和目標"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">過去成就 *</label>
                    <textarea
                      name="pastAchievements"
                      value={formData.pastAchievements}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="請分享您過去的重要成就或里程碑"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">未來目標 *</label>
                    <textarea
                      name="futureGoals"
                      value={formData.futureGoals}
                      onChange={handleInputChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="請說明您的未來發展目標和計劃"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">營收目標</label>
                    <input
                      type="text"
                      name="revenueTarget"
                      value={formData.revenueTarget}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例：年營收 5,000 萬元"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 四、同意條款 */}
          <div className="border-b border-gray-200 pb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">四、同意條款</h2>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="agreeRules"
                  checked={formData.agreeRules}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  required
                />
                <label className="ml-3 text-sm text-gray-700">
                  我同意遵守 BCI 商會的所有規章制度和行為準則
                </label>
              </div>
              
              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="agreeTraining"
                  checked={formData.agreeTraining}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  required
                />
                <label className="ml-3 text-sm text-gray-700">
                  我同意參加必要的培訓課程和會員活動
                </label>
              </div>
              
              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="noCriminalRecord"
                  checked={formData.noCriminalRecord}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  required
                />
                <label className="ml-3 text-sm text-gray-700">
                  我聲明本人無重大刑事犯罪記錄，且公司營運合法合規
                </label>
              </div>
              
              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleInputChange}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  required
                />
                <label className="ml-3 text-sm text-gray-700">
                  我同意提供的所有資訊真實有效，並接受 BCI 的審核和調查
                </label>
              </div>
            </div>
          </div>

          {/* 五、其他備註 */}
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-6">五、其他備註</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">其他說明或備註</label>
              <textarea
                name="otherComments"
                value={formData.otherComments}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="如有其他需要說明的事項，請在此填寫"
              />
            </div>
          </div>
        </div>

        {/* 提交按鈕 */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                提交中...
              </>
            ) : (
              '提交申請'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProspectApplication;