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

// Helpers: parse long text to concise bullet points for better readability
const parseToBullets = (text = '', maxItems = 5) => {
  try {
    if (!text) return [];
    const normalized = String(text)
      .replace(/\r/g, '')
      .replace(/\*\*/g, '')
      .replace(/\u200b/g, '')
      .trim();
    const parts = normalized
      .split(/\n|•|\-|—|－|‧|。/)
      .map(s => s.trim())
      .filter(s => s && s.length > 1 && !/^\d+\s*[\.|、]/.test(s));
    const seen = new Set();
    const unique = parts.filter(p => {
      const key = p.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return unique.slice(0, maxItems);
  } catch (e) {
    console.warn('parseToBullets error:', e);
    return [];
  }
};

// 獲取現有會員資料的輔助函數
const fetchMembersForSuggestions = async () => {
  try {
    const response = await axios.get('/api/users/members', { 
      params: { limit: 100, page: 1 } 
    });
    return response.data.members || [];
  } catch (error) {
    console.error('獲取會員資料失敗:', error);
    return [];
  }
};

// 根據行業和專長匹配合作夥伴
const findMatchingPartners = (members, targetIndustries, excludeIndustry = null) => {
  return members.filter(member => {
    if (excludeIndustry && member.industry === excludeIndustry) return false;
    return targetIndustries.some(industry => 
      member.industry?.toLowerCase().includes(industry.toLowerCase()) ||
      member.company?.toLowerCase().includes(industry.toLowerCase()) ||
      member.title?.toLowerCase().includes(industry.toLowerCase())
    );
  }).slice(0, 3); // 限制最多3個推薦
};

// Helpers: compute collaboration suggestions with existing partners
const computePartnerSuggestions = async (result, prospectIndustry = '') => {
  const suggestions = [];
  if (!result) return suggestions;
  
  const score = result?.bciFitScore?.score || 0;
  const sentiment = result?.marketSentiment?.sentiment || 'neutral';
  const conflict = result?.industryConflict?.conflictLevel || 'low';
  const legal = result?.legalRiskAssessment?.riskLevel || 'low';
  const publicReal = !!result?.publicInformationScan?.realData;
  const existingMembersText = result?.industryConflict?.analysis || '';
  const match = existingMembersText.match(/同業\s*:\s*(\d+)位/);
  const sameIndustryCount = match ? parseInt(match[1], 10) : 0;

  // 獲取現有會員資料
  const members = await fetchMembersForSuggestions();
  
  // 根據不同情況推薦具體的現有夥伴合作
  
  // 1. 數位行銷與客戶管理合作
  const marketingPartners = findMatchingPartners(members, ['行銷', '廣告', '媒體', '設計', '影音'], prospectIndustry);
  if (marketingPartners.length > 0) {
    const partner = marketingPartners[0];
    suggestions.push({
      partner: `${partner.name}（${partner.company}）- ${partner.industry}`,
      reason: `${partner.name} 在 ${partner.industry} 領域的專業能力，可協助建立完整的數位轉換漏斗`,
      action: `與 ${partner.name} 合作導入「活動 NFC 簽到 → 名單 → EDM → 回流」閉環，共同建立 30 天轉化追蹤系統`
    });
  } else {
    suggestions.push({
      partner: '數位行銷夥伴（如：網路行銷公司、社群媒體代理商）',
      reason: '建立完整的數位轉換漏斗，從活動 NFC 簽到到 EDM 再行銷',
      action: '導入「活動 NFC 簽到 → 名單 → EDM → 回流」閉環，共同建立 30 天轉化追蹤系統'
    });
  }

  // 2. 根據產業衝突程度推薦不同合作夥伴
  if (conflict === 'low') {
    const contentPartners = findMatchingPartners(members, ['影音', '製作', '公關', '媒體', '創作'], prospectIndustry);
    if (contentPartners.length > 0) {
      const partner = contentPartners[0];
      suggestions.push({
        partner: `${partner.name}（${partner.company}）- ${partner.industry}`,
        reason: `產業衝突低，可與 ${partner.name} 的 ${partner.industry} 專業合作提升品牌權威性`,
        action: `與 ${partner.name} 合作製作 2-3 則案例短影音或新聞稿，建立可擴散的權威背書與成功案例`
      });
    } else {
      suggestions.push({
        partner: '內容創作夥伴（如：影音製作公司、公關顧問、媒體代理商）',
        reason: '產業衝突低，適合共同製作內容提升品牌權威性',
        action: '合作製作 2-3 則案例短影音或新聞稿，建立可擴散的權威背書與成功案例'
      });
    }
  } else if (conflict === 'medium') {
    const consultingPartners = findMatchingPartners(members, ['顧問', '管理', '策略', '諮詢'], prospectIndustry);
    if (consultingPartners.length > 0) {
      const partner = consultingPartners[0];
      suggestions.push({
        partner: `${partner.name}（${partner.company}）- ${partner.industry}`,
        reason: `需要 ${partner.name} 等專業第三方協助釐清市場定位，避免業務重疊`,
        action: `與 ${partner.name} 安排三方定位澄清會議，對齊目標客群與服務邊界，建立合作分工機制`
      });
    } else {
      suggestions.push({
        partner: '策略顧問夥伴（如：管理顧問公司、商業策略顧問）',
        reason: '需要專業第三方協助釐清市場定位，避免業務重疊',
        action: '安排三方定位澄清會議，對齊目標客群與服務邊界，建立合作分工機制'
      });
    }
  } else {
    const legalPartners = findMatchingPartners(members, ['法務', '律師', '合規', '法律'], prospectIndustry);
    if (legalPartners.length > 0) {
      const partner = legalPartners[0];
      suggestions.push({
        partner: `${partner.name}（${partner.company}）- ${partner.industry}`,
        reason: `高衝突需要 ${partner.name} 等法務專業協助建立明確的業務邊界與轉介規則`,
        action: `與 ${partner.name} 制定服務範圍限制與客戶轉介標準作業程序，降低競爭風險`
      });
    } else {
      suggestions.push({
        partner: '法務與合規夥伴（如：律師事務所、合規顧問）',
        reason: '高衝突需要建立明確的業務邊界與轉介規則',
        action: '制定服務範圍限制與客戶轉介標準作業程序，降低競爭風險'
      });
    }
  }

  // 3. 根據市場聲譽推薦公關與媒體夥伴
  if (publicReal && (sentiment === 'neutral' || sentiment === 'negative')) {
    const prPartners = findMatchingPartners(members, ['公關', '媒體', '傳播', 'PR'], prospectIndustry);
    if (prPartners.length > 0) {
      const partner = prPartners[0];
      suggestions.push({
        partner: `${partner.name}（${partner.company}）- ${partner.industry}`,
        reason: `市場聲譽需要改善，需要 ${partner.name} 等專業公關操作提升正面形象`,
        action: `與 ${partner.name} 執行 30 天「正面內容建置 + 媒體曝光」專案，提升搜尋可見度與品牌聲量`
      });
    } else {
      suggestions.push({
        partner: '公關與媒體夥伴（如：公關公司、媒體代理商、KOL 經紀公司）',
        reason: '市場聲譽需要改善，需要專業公關操作提升正面形象',
        action: '執行 30 天「正面內容建置 + 媒體曝光」專案，提升搜尋可見度與品牌聲量'
      });
    }
  }

  // 4. 根據法律風險推薦法務合作
  if (legal === 'medium' || legal === 'high') {
    const legalPartners = findMatchingPartners(members, ['法務', '律師', '智財', '合規'], prospectIndustry);
    if (legalPartners.length > 0) {
      const partner = legalPartners[0];
      suggestions.push({
        partner: `${partner.name}（${partner.company}）- ${partner.industry}`,
        reason: `法律風險較高，需要 ${partner.name} 等專業法務支援建立合規機制`,
        action: `與 ${partner.name} 進行「合約/個資/著作權」全面健檢，建立標案投標與客戶委託標準作業流程`
      });
    } else {
      suggestions.push({
        partner: '專業法務夥伴（如：商務律師事務所、智財權顧問）',
        reason: '法律風險較高，需要專業法務支援建立合規機制',
        action: '進行「合約/個資/著作權」全面健檢，建立標案投標與客戶委託標準作業流程'
      });
    }
  }

  // 5. 同業或互補產業合作
  if (sameIndustryCount > 0 && conflict !== 'high') {
    const sameIndustryPartners = findMatchingPartners(members, [prospectIndustry]);
    if (sameIndustryPartners.length > 0) {
      const partner = sameIndustryPartners[0];
      suggestions.push({
        partner: `${partner.name}（${partner.company}）等同業夥伴`,
        reason: `與 ${partner.name} 等同業經驗豐富且衝突可控，適合建立策略聯盟`,
        action: `與 ${partner.name} 等同業夥伴發起交叉引薦與聯合提案機制，擴大服務範圍與客戶基礎`
      });
    } else {
      suggestions.push({
        partner: `同產業現有會員（約 ${sameIndustryCount} 位）或互補產業夥伴`,
        reason: '同業經驗豐富且衝突可控，適合建立策略聯盟',
        action: '發起交叉引薦與聯合提案機制，擴大服務範圍與客戶基礎'
      });
    }
  }

  // 6. 根據契合度分數推薦不同層級的合作
  if (score >= 80) {
    const strategicPartners = findMatchingPartners(members, ['顧問', '策略', '品牌', '整合', '活動'], prospectIndustry);
    if (strategicPartners.length > 0) {
      const partner = strategicPartners[0];
      suggestions.push({
        partner: `${partner.name}（${partner.company}）等策略級夥伴`,
        reason: `高契合度適合與 ${partner.name} 等進行深度戰略合作，共同開發大型專案`,
        action: `與 ${partner.name} 安排深度面談與小型試案，規劃季度級聯合專案（品牌重塑/大型活動/整合行銷）`
      });
    } else {
      suggestions.push({
        partner: '策略級合作夥伴（如：品牌顧問、整合行銷公司、活動策劃公司）',
        reason: '高契合度適合深度戰略合作，共同開發大型專案',
        action: '安排深度面談與小型試案，規劃季度級聯合專案（品牌重塑/大型活動/整合行銷）'
      });
    }
  } else if (score >= 60) {
    const projectPartners = findMatchingPartners(members, ['專案', '管理', '技術', '服務'], prospectIndustry);
    if (projectPartners.length > 0) {
      const partner = projectPartners[0];
      suggestions.push({
        partner: `${partner.name}（${partner.company}）等專案型夥伴`,
        reason: `中等契合度適合與 ${partner.name} 等進行階段性合作，先驗證合作模式`,
        action: `與 ${partner.name} 以 2-4 週 POC 專案驗證合作流程與轉化效果，達標後再擴大投入規模`
      });
    } else {
      suggestions.push({
        partner: '專案型合作夥伴（如：專案管理顧問、技術服務商）',
        reason: '中等契合度適合階段性合作，先驗證合作模式',
        action: '以 2-4 週 POC 專案驗證合作流程與轉化效果，達標後再擴大投入規模'
      });
    }
  }

  // 去重並限制數量
  const seen = new Set();
  return suggestions.filter(s => {
    const key = s.partner + s.action;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 6);
};

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
  const [aiAnalysisDetails, setAiAnalysisDetails] = useState(''); // 新增詳細描述狀態
  
  // 合作建議相關狀態
  const [partnerSuggestions, setPartnerSuggestions] = useState([]);
  const [partnerSuggestionsLoading, setPartnerSuggestionsLoading] = useState(false);

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
        const normalizeCompany = (raw) => ({
          companyName: raw.companyName || raw.Company_Name || raw.name || '',
          unifiedBusinessNumber: raw.unifiedBusinessNumber || raw.Business_Accounting_NO || raw.taxId || '',
          status: raw.status || raw.Company_Status_Desc || raw.Company_Status || '',
          setupDate: raw.setupDate || raw.Company_Setup_Date || '',
          capital: raw.capital || raw.Paid_In_Capital_Stock_Amount || raw.Capital_Stock_Amount || raw.Capital || '',
          location: raw.location || raw.Company_Location || '',
          address: raw.address || raw.Business_Address || raw.Company_Location || '',
          responsiblePerson: raw.responsiblePerson || raw.Responsible_Name || ''
        });

        const company = normalizeCompany(response.data.data);
        setCompanyLookupResult(company);
        
        // 自動填入公司名稱
        setFormData(prev => ({
          ...prev,
          companyName: company.companyName,
          companyCapital: company.capital,
          companyEstablished: formatDateForInput(company.setupDate)
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
        const normalizeCompany = (raw) => ({
          companyName: raw.companyName || raw.Company_Name || raw.name || '',
          unifiedBusinessNumber: raw.unifiedBusinessNumber || raw.Business_Accounting_NO || raw.taxId || '',
          status: raw.status || raw.Company_Status_Desc || raw.Company_Status || '',
          setupDate: raw.setupDate || raw.Company_Setup_Date || '',
          capital: raw.capital || raw.Paid_In_Capital_Stock_Amount || raw.Capital_Stock_Amount || raw.Capital || '',
          location: raw.location || raw.Company_Location || '',
          address: raw.address || raw.Business_Address || raw.Company_Location || '',
          responsiblePerson: raw.responsiblePerson || raw.Responsible_Name || ''
        });

        const data = response.data.data;
        const picked = Array.isArray(data) ? (data[0] || null) : (data || null);

        if (picked) {
          const company = normalizeCompany(picked);
          setCompanyLookupResult(company);
          
          // 自動填入統編和其他資料
          setFormData(prev => ({
            ...prev,
            companyTaxId: company.unifiedBusinessNumber,
            companyCapital: company.capital,
            companyEstablished: formatDateForInput(company.setupDate)
          }));
          
          if (Array.isArray(data)) {
            toast.success(`找到 ${data.length} 筆相關公司，已選擇第一筆`);
          } else {
            toast.success('找到公司資料！');
          }
        } else {
          setCompanyLookupError('未找到該公司名稱的資料');
          toast.error('未找到該公司名稱的資料');
        }
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
          const maxPolls = 60; // 減少到 2 分鐘（每2秒一次）
          
          const checkAnalysisStatus = async () => {
            try {
              pollCount++;
              const statusResponse = await axios.get(`/api/ai-analysis/status/${prospectId}`);
              
              // 檢查是否正在分析中
              if (statusResponse.data.isAnalyzing && statusResponse.data.progress) {
                const progressData = statusResponse.data.progress;
                setAiAnalysisProgress(progressData.progress);
                setAiAnalysisStage(progressData.currentStep);
                setAiAnalysisDetails(progressData.details); // 新增詳細描述狀態
                
                // 繼續輪詢
                setTimeout(checkAnalysisStatus, 1500);
              } else if (statusResponse.data.hasReport) {
                // 分析完成
                setAiAnalysisProgress(100);
                setAiAnalysisStage('分析完成！');
                setAiAnalysisDetails('所有分析項目已完成，報告已生成。');
                setAiAnalysisResult(statusResponse.data.report);
                setShowAiAnalysis(true);
                setAiAnalysisLoading(false);
                toast.success('快速分析完成！');
                
                // 計算合作建議
                setPartnerSuggestionsLoading(true);
                try {
                  const suggestions = await computePartnerSuggestions(statusResponse.data.report, formData.primaryProfession);
                  setPartnerSuggestions(suggestions);
                } catch (error) {
                  console.error('計算合作建議失敗:', error);
                } finally {
                  setPartnerSuggestionsLoading(false);
                }
                
                // 刪除臨時資料
                try {
                  await axios.delete(`/api/prospects/${prospectId}`);
                } catch (deleteError) {
                  console.warn('刪除臨時資料失敗:', deleteError);
                }
              } else if (statusResponse.data.progress && statusResponse.data.progress.stage === 'error') {
                // 分析錯誤
                const errorData = statusResponse.data.progress;
                setAiAnalysisError(errorData.details || '分析過程中發生錯誤');
                setAiAnalysisProgress(0);
                setAiAnalysisStage('');
                setAiAnalysisDetails('');
                setAiAnalysisLoading(false);
                toast.error('快速分析失敗');
                
                // 刪除臨時資料
                try {
                  await axios.delete(`/api/prospects/${prospectId}`);
                } catch (deleteError) {
                  console.warn('刪除臨時資料失敗:', deleteError);
                }
              } else if (pollCount >= maxPolls) {
                // 超時處理
                setAiAnalysisError('分析超時，請稍後再試');
                setAiAnalysisProgress(0);
                setAiAnalysisStage('');
                setAiAnalysisDetails('');
                setAiAnalysisLoading(false);
                toast.error('分析超時');
                
                // 刪除臨時資料
                try {
                  await axios.delete(`/api/prospects/${prospectId}`);
                } catch (deleteError) {
                  console.warn('刪除臨時資料失敗:', deleteError);
                }
              } else {
                // 繼續輪詢
                setTimeout(checkAnalysisStatus, 1500);
              }
            } catch (error) {
              console.error('檢查分析狀態失敗:', error);
              setAiAnalysisError('檢查分析狀態失敗');
              setAiAnalysisProgress(0);
              setAiAnalysisStage('');
              setAiAnalysisDetails('');
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
                    <p><strong>公司名稱：</strong>{companyLookupResult.companyName || companyLookupResult.Company_Name || companyLookupResult.name}</p>
                    <p><strong>統一編號：</strong>{companyLookupResult.unifiedBusinessNumber || companyLookupResult.Business_Accounting_NO || companyLookupResult.taxId}</p>
                    {(companyLookupResult.status || companyLookupResult.Company_Status) && (
                      <p><strong>公司狀態：</strong>{companyLookupResult.status || companyLookupResult.Company_Status}</p>
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
                  <span className="text-blue-800 font-medium">快速分析進行中</span>
                  <span className="ml-auto text-blue-600 text-sm">{aiAnalysisProgress}%</span>
                </div>
                
                {/* 進度條 */}
                <div className="w-full bg-blue-200 rounded-full h-2 mb-3">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${aiAnalysisProgress}%` }}
                  ></div>
                </div>
                
                {/* 當前階段 */}
                {aiAnalysisStage && (
                  <div className="mb-2">
                    <p className="text-blue-800 font-medium text-sm">{aiAnalysisStage}</p>
                  </div>
                )}
                
                {/* 詳細描述 */}
                {aiAnalysisDetails && (
                  <div className="bg-white bg-opacity-60 rounded-md p-3 border border-blue-100">
                    <p className="text-blue-700 text-sm leading-relaxed">{aiAnalysisDetails}</p>
                  </div>
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
                <div className="flex items-center mb-6">
                  <DocumentTextIcon className="h-6 w-6 text-green-600 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">AI 分析報告</h3>
                </div>
                
                {/* 整體建議 - 重點摘要 */}
                {aiAnalysisResult.overallRecommendation && (
                  <div className="mb-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
                    <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
                      <CheckCircleIcon className="h-5 w-5 mr-2" />
                      整體建議
                    </h4>
                    <div className="space-y-2">
                      {parseToBullets(aiAnalysisResult.overallRecommendation, 4).length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 text-blue-800">
                          {parseToBullets(aiAnalysisResult.overallRecommendation, 4).map((bullet, idx) => (
                            <li key={idx} className="leading-relaxed">{bullet}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-blue-800 leading-relaxed">{aiAnalysisResult.overallRecommendation}</p>
                      )}
                    </div>
                  </div>
                )}
                
                {/* BCI 契合度評分 - 卡片式 */}
                {aiAnalysisResult.bciFitScore && (
                  <div className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-purple-900 text-lg">BCI 契合度評分</h4>
                      <div className="text-right">
                        {getScoreBadge(aiAnalysisResult.bciFitScore.score)}
                        <div className="text-xs text-purple-600 mt-1">綜合評估</div>
                      </div>
                    </div>
                    
                    {/* 快照指標 */}
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="text-center bg-white bg-opacity-60 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">市場聲譽</div>
                        <div className={`font-semibold ${
                          aiAnalysisResult.marketSentiment?.sentiment === 'positive' ? 'text-green-600' : 
                          aiAnalysisResult.marketSentiment?.sentiment === 'negative' ? 'text-red-600' : 'text-yellow-600'
                        }`}>
                          {aiAnalysisResult.marketSentiment?.sentiment === 'positive' ? '正面' : 
                           aiAnalysisResult.marketSentiment?.sentiment === 'negative' ? '負面' : '中立'}
                        </div>
                      </div>
                      <div className="text-center bg-white bg-opacity-60 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">產業衝突</div>
                        <div className={`font-semibold ${
                          aiAnalysisResult.industryConflict?.conflictLevel === 'high' ? 'text-red-600' : 
                          aiAnalysisResult.industryConflict?.conflictLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {aiAnalysisResult.industryConflict?.conflictLevel === 'high' ? '高' : 
                           aiAnalysisResult.industryConflict?.conflictLevel === 'medium' ? '中' : '低'}
                        </div>
                      </div>
                      <div className="text-center bg-white bg-opacity-60 rounded-lg p-3">
                        <div className="text-xs text-gray-600 mb-1">法律風險</div>
                        <div className={`font-semibold ${
                          aiAnalysisResult.legalRiskAssessment?.riskLevel === 'high' ? 'text-red-600' : 
                          aiAnalysisResult.legalRiskAssessment?.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
                        }`}>
                          {aiAnalysisResult.legalRiskAssessment?.riskLevel === 'high' ? '高' : 
                           aiAnalysisResult.legalRiskAssessment?.riskLevel === 'medium' ? '中' : '低'}
                        </div>
                      </div>
                    </div>
                    
                    {/* 建議結論 */}
                    {aiAnalysisResult.bciFitScore?.recommendation && (
                      <div className="bg-white bg-opacity-80 rounded-lg p-3 mb-3">
                        <div className="text-sm font-medium text-purple-800 mb-1">入會建議：</div>
                        <div className={`font-semibold ${
                          aiAnalysisResult.bciFitScore.recommendation === 'strongly_recommend' ? 'text-green-600' : 
                          aiAnalysisResult.bciFitScore.recommendation === 'recommend' ? 'text-blue-600' : 'text-yellow-600'
                        }`}>
                          {aiAnalysisResult.bciFitScore.recommendation === 'strongly_recommend' ? '🌟 強烈推薦' : 
                           aiAnalysisResult.bciFitScore.recommendation === 'recommend' ? '✅ 建議通過' : '⚠️ 謹慎評估'}
                        </div>
                      </div>
                    )}
                    
                    {/* 分析要點 */}
                    {aiAnalysisResult.bciFitScore.analysis && (
                      <div>
                        <div className="text-sm font-medium text-purple-800 mb-2">分析要點：</div>
                        {parseToBullets(aiAnalysisResult.bciFitScore.analysis, 4).length > 0 ? (
                          <ul className="list-disc list-inside space-y-1 text-purple-700 text-sm">
                            {parseToBullets(aiAnalysisResult.bciFitScore.analysis, 4).map((bullet, idx) => (
                              <li key={idx} className="leading-relaxed">{bullet}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-purple-700 text-sm leading-relaxed">{aiAnalysisResult.bciFitScore.analysis}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* 詳細分析區塊 */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* 市場聲譽分析 */}
                  {aiAnalysisResult.marketSentiment && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <h4 className="font-semibold text-green-900 mb-3 flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        市場聲譽分析
                      </h4>
                      {parseToBullets(aiAnalysisResult.marketSentiment.analysis, 4).length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 text-green-800 text-sm">
                          {parseToBullets(aiAnalysisResult.marketSentiment.analysis, 4).map((bullet, idx) => (
                            <li key={idx} className="leading-relaxed">{bullet}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-green-800 text-sm leading-relaxed">{aiAnalysisResult.marketSentiment.analysis}</p>
                      )}
                    </div>
                  )}

                  {/* 產業衝突檢測 */}
                  {aiAnalysisResult.industryConflict && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-yellow-900 flex items-center">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                          產業衝突檢測
                        </h4>
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
                      {parseToBullets(aiAnalysisResult.industryConflict.analysis, 4).length > 0 ? (
                        <ul className="list-disc list-inside space-y-1 text-yellow-800 text-sm">
                          {parseToBullets(aiAnalysisResult.industryConflict.analysis, 4).map((bullet, idx) => (
                            <li key={idx} className="leading-relaxed">{bullet}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-yellow-800 text-sm leading-relaxed">{aiAnalysisResult.industryConflict.analysis}</p>
                      )}
                    </div>
                  )}
                </div>

                {/* 法律風險評估 - 全寬 */}
                {aiAnalysisResult.legalRiskAssessment && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold text-red-900 flex items-center">
                        <ExclamationTriangleIcon className="h-5 w-5 mr-2" />
                        法律風險評估
                      </h4>
                      <div className="flex items-center space-x-2">
                        {getRiskBadge(aiAnalysisResult.legalRiskAssessment.riskLevel)}
                        <span className="text-sm text-red-600 font-medium">
                          {aiAnalysisResult.legalRiskAssessment.riskScore}/100
                        </span>
                      </div>
                    </div>
                    
                    {/* 司法院判決書數量 */}
                    {aiAnalysisResult.legalRiskAssessment.judicialRecordsCount !== undefined && (
                      <div className="bg-white bg-opacity-60 rounded-lg p-3 mb-3">
                        <div className="text-sm font-medium text-red-800 mb-1">司法院判決書查詢結果：</div>
                        <div className="text-red-700 font-semibold">
                          {aiAnalysisResult.legalRiskAssessment.judicialRecordsCount} 件相關記錄
                        </div>
                      </div>
                    )}
                    
                    {/* 風險分析 */}
                    {aiAnalysisResult.legalRiskAssessment.analysis && (
                      <div className="mb-3">
                        <div className="text-sm font-medium text-red-800 mb-2">風險分析：</div>
                        {parseToBullets(aiAnalysisResult.legalRiskAssessment.analysis, 4).length > 0 ? (
                          <ul className="list-disc list-inside space-y-1 text-red-700 text-sm">
                            {parseToBullets(aiAnalysisResult.legalRiskAssessment.analysis, 4).map((bullet, idx) => (
                              <li key={idx} className="leading-relaxed">{bullet}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-red-700 text-sm leading-relaxed">{aiAnalysisResult.legalRiskAssessment.analysis}</p>
                        )}
                      </div>
                    )}
                    
                    {/* 風險細節 */}
                    {aiAnalysisResult.legalRiskAssessment.riskDetails && aiAnalysisResult.legalRiskAssessment.riskDetails.length > 0 && (
                      <div className="bg-white bg-opacity-60 rounded-lg p-3">
                        <div className="text-sm font-medium text-red-800 mb-2">具體風險項目：</div>
                        <ul className="list-disc list-inside space-y-1 text-red-700 text-sm">
                          {aiAnalysisResult.legalRiskAssessment.riskDetails.slice(0, 5).map((detail, index) => (
                            <li key={index} className="leading-relaxed">{detail}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* 公開資訊掃描 */}
                {aiAnalysisResult.publicInformationScan && (
                  <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <InformationCircleIcon className="h-5 w-5 mr-2" />
                      公開資訊掃描
                    </h4>
                    {parseToBullets(aiAnalysisResult.publicInformationScan.summary, 5).length > 0 ? (
                      <ul className="list-disc list-inside space-y-1 text-gray-700 text-sm mb-3">
                        {parseToBullets(aiAnalysisResult.publicInformationScan.summary, 5).map((bullet, idx) => (
                          <li key={idx} className="leading-relaxed">{bullet}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-700 text-sm leading-relaxed mb-3">{aiAnalysisResult.publicInformationScan.summary}</p>
                    )}
                    
                    {/* 資料來源 */}
                    {aiAnalysisResult.publicInformationScan.sources && aiAnalysisResult.publicInformationScan.realData && (
                      <div className="bg-white bg-opacity-60 rounded-lg p-3">
                        <div className="text-sm font-medium text-gray-800 mb-2">主要資料來源：</div>
                        <div className="space-y-2">
                          {(() => {
                            // 優先使用 rawSources 資料（包含完整的 URL 資訊）
                            if (Array.isArray(aiAnalysisResult.publicInformationScan.rawSources) && aiAnalysisResult.publicInformationScan.rawSources.length > 0) {
                              return aiAnalysisResult.publicInformationScan.rawSources.slice(0, 4).map((source, i) => (
                                <div key={i} className="flex items-start space-x-2 text-sm">
                                  <span className="text-gray-500 font-medium min-w-[20px]">{i + 1}.</span>
                                  <div className="flex-1">
                                    <div className="text-gray-900 font-medium mb-1">{source.title}</div>
                                    {source.url && (
                                      <a 
                                        href={source.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 underline text-xs break-all hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
                                      >
                                        {source.url}
                                      </a>
                                    )}
                                    {source.source && (
                                      <div className="text-gray-500 text-xs mt-1">來源：{source.source}</div>
                                    )}
                                    {source.snippet && (
                                      <div className="text-gray-600 text-xs mt-1 italic">{source.snippet.substring(0, 100)}...</div>
                                    )}
                                  </div>
                                </div>
                              ));
                            }
                            
                            // 備用顯示：解析字串格式的 sources
                            return String(aiAnalysisResult.publicInformationScan.sources)
                              .split(' | ')
                              .slice(0, 4)
                              .map((source, i) => {
                                // 嘗試從字串中提取 URL
                                const urlMatch = source.match(/(https?:\/\/[^\s]+)/g);
                                if (urlMatch && urlMatch.length > 0) {
                                  const url = urlMatch[0];
                                  const title = source.replace(url, '').replace(/[()（）]/g, '').trim();
                                  return (
                                    <div key={i} className="flex items-start space-x-2 text-sm">
                                      <span className="text-gray-500 font-medium min-w-[20px]">{i + 1}.</span>
                                      <div className="flex-1">
                                        <div className="text-gray-900 font-medium mb-1">{title}</div>
                                        <a 
                                          href={url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="text-blue-600 hover:text-blue-800 underline text-xs break-all hover:bg-blue-50 px-1 py-0.5 rounded transition-colors"
                                        >
                                          {url}
                                        </a>
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div key={i} className="flex items-start space-x-2 text-sm">
                                      <span className="text-gray-500 font-medium min-w-[20px]">{i + 1}.</span>
                                      <div className="text-gray-700 leading-relaxed">{source}</div>
                                    </div>
                                  );
                                }
                              });
                          })()
                          }
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 合作建議 - 重點區塊 */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-lg p-5">
                  <h4 className="font-semibold text-indigo-900 mb-4 flex items-center text-lg">
                    <span className="bg-indigo-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm mr-3">🤝</span>
                    現有夥伴合作建議
                    {partnerSuggestionsLoading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600 ml-2"></div>
                    )}
                  </h4>
                  
                  {partnerSuggestionsLoading ? (
                    <div className="bg-white bg-opacity-60 rounded-lg p-4 text-center">
                      <div className="text-indigo-700">正在分析現有會員資料，生成個人化合作建議...</div>
                    </div>
                  ) : partnerSuggestions.length > 0 ? (
                    <>
                      <div className="space-y-4">
                        {partnerSuggestions.map((suggestion, idx) => (
                          <div key={idx} className="bg-white bg-opacity-90 rounded-lg p-4 border border-indigo-100 shadow-sm">
                            <div className="flex items-start mb-3">
                              <span className="bg-indigo-100 text-indigo-600 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">
                                {idx + 1}
                              </span>
                              <div className="flex-1">
                                <h5 className="font-semibold text-indigo-900 mb-2 text-sm">{suggestion.partner}</h5>
                              </div>
                            </div>
                            <div className="ml-9 space-y-2">
                              <div>
                                <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded">合作原因</span>
                                <p className="text-indigo-800 text-sm mt-1 leading-relaxed">{suggestion.reason}</p>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded">建議行動</span>
                                <p className="text-purple-800 text-sm mt-1 leading-relaxed">{suggestion.action}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* 行動提醒 */}
                      <div className="mt-4 bg-indigo-100 bg-opacity-50 rounded-lg p-3 border border-indigo-200">
                        <div className="text-sm font-medium text-indigo-900 mb-1">💡 下一步行動：</div>
                        <p className="text-indigo-800 text-sm">
                          建議優先執行前 2-3 項合作方案，並在 30 天內安排具體的合作會議與試行計畫。
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="bg-white bg-opacity-60 rounded-lg p-4 text-center">
                      <div className="text-indigo-700">暫無合作建議，請先完成 AI 分析</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 三、會談內容與合作需求 */}
          <div className="border-b border-gray-200 pb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">三、會談內容與合作需求</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">主要業務內容 *</label>
                <textarea
                  name="mainBusiness"
                  value={formData.mainBusiness}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="請描述公司的主要業務與服務內容"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">主要產品/服務</label>
                <textarea
                  name="mainProducts"
                  value={formData.mainProducts}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="請列出主要產品或服務"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">核心優勢</label>
                <textarea
                  name="mainAdvantages"
                  value={formData.mainAdvantages}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="簡述與同業相比的核心競爭力"
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
                  placeholder="請列出 3-5 個代表性客戶或合作案例"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">合作目標</label>
                <textarea
                  name="cooperationTargets"
                  value={formData.cooperationTargets}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="希望在 BCI 商會內的合作方向/標的"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">網站/社群資訊</label>
                <input
                  type="text"
                  name="websiteInfo"
                  value={formData.websiteInfo}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="例：https://your-site 或社群連結"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">加入 BCI 的期待 *</label>
                <textarea
                  name="bciExpectations"
                  value={formData.bciExpectations}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="希望透過商會獲得的資源與目標"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">過往成就 *</label>
                <textarea
                  name="pastAchievements"
                  value={formData.pastAchievements}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="請描述 1-3 項具代表性的成果"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">未來發展目標 *</label>
                <textarea
                  name="futureGoals"
                  value={formData.futureGoals}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="請說明您的未來發展目標與計畫"
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
