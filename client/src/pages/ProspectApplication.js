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
    // 排除系統管理員 (membership_level = 0) 並去重
    const members = response.data.members || [];
    const uniqueMembers = [];
    const seenCompanies = new Set();
    
    members.forEach(member => {
      // 排除系統管理員
      if (member.membership_level === 0) return;
      
      // 避免重複會員（以公司名稱為準）
      const companyKey = member.company?.toLowerCase().trim();
      if (companyKey && !seenCompanies.has(companyKey)) {
        seenCompanies.add(companyKey);
        uniqueMembers.push(member);
      } else if (!companyKey && member.name) {
        // 如果沒有公司名稱，以姓名為準
        const nameKey = member.name.toLowerCase().trim();
        if (!seenCompanies.has(nameKey)) {
          seenCompanies.add(nameKey);
          uniqueMembers.push(member);
        }
      }
    });
    
    return uniqueMembers;
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

// 根據需求類型匹配合作夥伴
const getPartnersByNeed = (members, needType, prospectIndustry = '') => {
  const partnerCategories = {
    marketing: ['行銷', '廣告', '媒體', '設計', '影音', '公關', '傳播', '數位', '網路'],
    photography: ['攝影', '影像', '視覺', '拍攝', '商業攝影', '婚攝', '活動攝影'],
    event: ['活動', '企劃', '會展', '展覽', '策展', '活動企劃', '會議', '論壇'],
    design: ['設計', '視覺', '平面', '網頁', 'UI', 'UX', '品牌', '包裝'],
    tech: ['科技', '軟體', '系統', '資訊', 'IT', '程式', '開發', '技術'],
    consulting: ['顧問', '管理', '策略', '諮詢', '顧問公司', '管理顧問'],
    legal: ['法務', '律師', '智財', '合規', '法律', '專利', '商標'],
    finance: ['財務', '會計', '稅務', '金融', '投資', '理財', '保險'],
    manufacturing: ['製造', '生產', '工廠', '加工', '代工', 'OEM', 'ODM'],
    food: ['餐飲', '食品', '烘焙', '料理', '餐廳', '咖啡', '茶飲'],
    education: ['教育', '培訓', '訓練', '學習', '課程', '講師', '教學'],
    healthcare: ['醫療', '健康', '保健', '醫美', '診所', '藥局', '復健']
  };
  
  const keywords = partnerCategories[needType] || [];
  return members.filter(member => {
    if (member.industry === prospectIndustry) return false; // 排除同業
    return keywords.some(keyword => 
      member.industry?.toLowerCase().includes(keyword.toLowerCase()) ||
      member.company?.toLowerCase().includes(keyword.toLowerCase()) ||
      member.title?.toLowerCase().includes(keyword.toLowerCase())
    );
  }).slice(0, 5); // 最多5個推薦
};

// 生成具體的合作場景建議
const generateCollaborationScenarios = (partner, needType, prospectIndustry) => {
  const scenarios = {
    photography: {
      reason: `${partner.company || partner.name} 專精於 ${partner.industry}，可為您的業務提供專業影像服務`,
      scenarios: [
        '活動紀錄攝影：重要會議、產品發表會、企業活動的專業拍攝',
        '商品攝影：產品型錄、網站商品圖、電商平台使用',
        '企業形象照：團隊照片、個人專業照、公司環境拍攝',
        '行銷素材製作：廣告用途、社群媒體內容、宣傳品素材'
      ]
    },
    marketing: {
      reason: `${partner.company || partner.name} 在 ${partner.industry} 領域經驗豐富，可協助提升品牌曝光度`,
      scenarios: [
        '數位行銷策略：社群媒體經營、內容行銷、SEO優化',
        '廣告投放：Google Ads、Facebook廣告、LINE廣告投放',
        '品牌建立：Logo設計、CI設計、品牌定位策略',
        '活動行銷：記者會策劃、產品發表會、展覽參與'
      ]
    },
    event: {
      reason: `${partner.company || partner.name} 具備豐富的活動策劃經驗，可協助舉辦各類型活動`,
      scenarios: [
        '企業活動：尾牙春酒、員工旅遊、團建活動策劃',
        '產品發表：新品上市發表會、媒體記者會',
        '展覽會議：參展規劃、研討會、論壇活動',
        '客戶活動：VIP客戶聚會、產品體驗會、感謝餐會'
      ]
    },
    design: {
      reason: `${partner.company || partner.name} 的設計專業可提升您的視覺形象與品牌價值`,
      scenarios: [
        '品牌設計：Logo、名片、信紙、企業識別系統',
        '網站設計：官網建置、電商平台、RWD響應式設計',
        '印刷設計：型錄、DM、海報、包裝設計',
        '數位設計：社群圖片、廣告素材、簡報模板'
      ]
    },
    consulting: {
      reason: `${partner.company || partner.name} 的專業顧問服務可協助優化營運效率`,
      scenarios: [
        '營運優化：流程改善、成本控制、效率提升',
        '策略規劃：市場分析、競爭策略、發展規劃',
        '組織發展：人力資源、組織架構、績效管理',
        '數位轉型：系統導入、流程數位化、資料分析'
      ]
    }
  };
  
  return scenarios[needType] || {
    reason: `${partner.company || partner.name} 在 ${partner.industry} 領域的專業能力`,
    scenarios: ['業務合作機會', '資源互補', '客戶轉介', '聯合行銷']
  };
};

// Helpers: compute collaboration suggestions with existing partners
const computePartnerSuggestions = async (result, primaryProfession = '', secondaryProfession = '') => {
  const suggestions = [];
  if (!result) return suggestions;

  // 獲取現有會員資料（已在函式內排除系統管理員並去重）
  const members = await fetchMembersForSuggestions();
  if (members.length === 0) return suggestions;

  // 以主要/次要專業作為申請人產業，避免同業互推
  const prospectIndustryPrimary = (primaryProfession || '').trim();
  const prospectIndustrySecondary = (secondaryProfession || '').trim();

  // 依據申請人的主要/次要專業，設定合作需求優先順序
  const baseNeeds = [
    { type: 'photography', title: '影像紀錄服務', priority: 3 },
    { type: 'marketing', title: '行銷推廣合作', priority: 2 },
    { type: 'event', title: '活動策劃支援', priority: 4 },
    { type: 'design', title: '設計服務合作', priority: 3 },
    { type: 'consulting', title: '專業顧問諮詢', priority: 5 },
    { type: 'legal', title: '法務/智財支援', priority: 6 },
    { type: 'finance', title: '財務/會計/保險', priority: 6 },
    { type: 'tech', title: '系統/數位轉型', priority: 4 }
  ];

  // 簡單規則：若申請人的專業屬於其中一類，則略微提升互補需求的優先級
  const boostNeed = (needs, type, boost = -1) => {
    return needs.map(n => n.type === type ? { ...n, priority: Math.max(1, n.priority + boost) } : n);
  };

  let collaborationNeeds = [...baseNeeds];
  const lower = (s) => (s || '').toLowerCase();
  const p1 = lower(primaryProfession);
  const p2 = lower(secondaryProfession);

  // 依據專業調整需求：
  // - 若本業是行銷，優先找影像/設計/法務（合約/智財）
  if (/行銷|marketing|媒體|廣告/.test(p1) || /行銷|marketing|媒體|廣告/.test(p2)) {
    collaborationNeeds = boostNeed(collaborationNeeds, 'photography');
    collaborationNeeds = boostNeed(collaborationNeeds, 'design');
    collaborationNeeds = boostNeed(collaborationNeeds, 'legal');
  }
  // - 若本業是攝影，優先找行銷/設計/活動
  if (/攝影|影像|拍攝/.test(p1) || /攝影|影像|拍攝/.test(p2)) {
    collaborationNeeds = boostNeed(collaborationNeeds, 'marketing');
    collaborationNeeds = boostNeed(collaborationNeeds, 'design');
    collaborationNeeds = boostNeed(collaborationNeeds, 'event');
  }
  // - 若本業是法務/律師，優先找行銷/活動/金融
  if (/法務|律師|法律|智財|專利|商標/.test(p1) || /法務|律師|法律|智財|專利|商標/.test(p2)) {
    collaborationNeeds = boostNeed(collaborationNeeds, 'marketing');
    collaborationNeeds = boostNeed(collaborationNeeds, 'event');
    collaborationNeeds = boostNeed(collaborationNeeds, 'finance');
  }
  // - 若本業是顧問/管理，優先找行銷/活動/系統
  if (/顧問|管理|諮詢|策略/.test(p1) || /顧問|管理|諮詢|策略/.test(p2)) {
    collaborationNeeds = boostNeed(collaborationNeeds, 'marketing');
    collaborationNeeds = boostNeed(collaborationNeeds, 'event');
    collaborationNeeds = boostNeed(collaborationNeeds, 'tech');
  }

  // 為每種需求類型尋找合適的夥伴（避開同業）
  collaborationNeeds.forEach(need => {
    const partners = getPartnersByNeed(members, need.type, prospectIndustryPrimary);

    // 若次要專業與主要相同，仍然排除；否則可以再過一輪過濾避免同業
    const filtered = partners.filter(p => {
      const ind = (p.industry || '').trim();
      if (prospectIndustryPrimary && ind.includes(prospectIndustryPrimary)) return false;
      if (prospectIndustrySecondary && ind.includes(prospectIndustrySecondary)) return false;
      return true;
    });

    if (filtered.length > 0) {
      const topPartners = filtered.slice(0, 2); // 每類最多推薦2個
      topPartners.forEach((partner, index) => {
        const collaboration = generateCollaborationScenarios(partner, need.type, prospectIndustryPrimary);
        suggestions.push({
          partner: `${partner.name}${partner.company ? ` (${partner.company})` : ''} - ${partner.industry}`,
          category: need.title,
          reason: collaboration.reason,
          scenarios: collaboration.scenarios,
          contactInfo: {
            name: partner.name,
            company: partner.company,
            industry: partner.industry,
            title: partner.title
          },
          priority: need.priority + (index * 0.1)
        });
      });
    }
  });

  return suggestions
    .sort((a, b) => a.priority - b.priority)
    .slice(0, 8);
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

  // 獲取分會和核心人員數據
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // 獲取分會列表
        const chaptersResponse = await axios.get('/api/chapters');
        setChapters(chaptersResponse.data.chapters || []);
        
        // 獲取核心人員列表
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
          
          // 自動填入公司名稱、統編和其他資料
          setFormData(prev => ({
            ...prev,
            companyName: company.companyName,
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
                  const suggestions = await computePartnerSuggestions(statusResponse.data.report, formData.primaryProfession, formData.secondaryProfession);
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
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-yellow-400 mb-2">商訪申請表</h1>
          <p className="text-gray-300">請詳細填寫以下資訊，系統將協助進行公司查詢和 AI 智能分析</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="bg-gray-800 border border-yellow-500 shadow-lg rounded-lg p-6">
          {/* 一、申請會員基本資料 */}
          <div className="border-b border-yellow-500 pb-8">
            <h2 className="text-xl font-semibold text-yellow-400 mb-6">一、申請會員基本資料</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">申請會員姓名 *</label>
                <input
                  type="text"
                  name="memberName"
                  value={formData.memberName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">引薦分會 *</label>
                <select
                  name="referralChapter"
                  value={formData.referralChapter}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
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
                <label className="block text-sm font-medium text-gray-300 mb-2">引薦夥伴</label>
                <input
                  type="text"
                  name="referralPartner"
                  value={formData.referralPartner}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">主要專業 *</label>
                <input
                  type="text"
                  name="primaryProfession"
                  value={formData.primaryProfession}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">次要專業</label>
                <input
                  type="text"
                  name="secondaryProfession"
                  value={formData.secondaryProfession}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">面談人 *</label>
                <select
                  name="interviewer"
                  value={formData.interviewer}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
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
                <label className="block text-sm font-medium text-gray-300 mb-2">面談日期 *</label>
                <input
                  type="date"
                  name="interviewDate"
                  value={formData.interviewDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  required
                />
              </div>
            </div>
          </div>

          {/* 二、公司基本資料 */}
          <div className="border-b border-yellow-500 pb-8">
            <h2 className="text-xl font-semibold text-yellow-400 mb-6">二、公司基本資料</h2>
            
            {/* 公司查詢功能 */}
            <div className="bg-gray-800 border border-yellow-500 rounded-lg p-4 mb-6">
              <div className="flex items-center mb-3">
                <MagnifyingGlassIcon className="h-5 w-5 text-yellow-400 mr-2" />
                <h3 className="text-lg font-medium text-yellow-400">智能公司查詢</h3>
              </div>
              <p className="text-gray-300 text-sm mb-4">
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
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookupCompanyByTaxId(); } }}
                      onBlur={() => { if (formData.companyTaxId && /^\d{8}$/.test(formData.companyTaxId.trim())) lookupCompanyByTaxId(); }}
                      placeholder="請輸入統一編號"
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    <button
                      type="button"
                      onClick={lookupCompanyByTaxId}
                      disabled={companyLookupLoading}
                      className="px-4 py-2 bg-yellow-600 text-black rounded-md hover:bg-yellow-500 disabled:bg-gray-600 flex items-center"
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
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); lookupCompanyByName(); } }}
                      onBlur={() => { if (formData.companyName && formData.companyName.trim().length >= 2) lookupCompanyByName(); }}
                      placeholder="請輸入公司名稱"
                      className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    <button
                      type="button"
                      onClick={lookupCompanyByName}
                      disabled={companyLookupLoading}
                      className="px-4 py-2 bg-yellow-600 text-black rounded-md hover:bg-yellow-500 disabled:bg-gray-600 flex items-center"
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
                <div className="mt-4 p-3 bg-green-900 border border-green-500 rounded-md">
                  <div className="flex items-center mb-2">
                    <CheckCircleIcon className="h-5 w-5 text-green-400 mr-2" />
                    <span className="text-green-300 font-medium">找到公司資料</span>
                  </div>
                  <div className="text-sm text-green-200">
                    <p><strong>公司名稱：</strong>{companyLookupResult.companyName || companyLookupResult.Company_Name || companyLookupResult.name}</p>
                    <p><strong>統一編號：</strong>{companyLookupResult.unifiedBusinessNumber || companyLookupResult.Business_Accounting_NO || companyLookupResult.taxId}</p>
                    {(companyLookupResult.status || companyLookupResult.Company_Status) && (
                      <p><strong>公司狀態：</strong>{companyLookupResult.status || companyLookupResult.Company_Status}</p>
                    )}
                  </div>
                </div>
              )}
              
              {companyLookupError && (
                <div className="mt-4 p-3 bg-red-900 border border-red-500 rounded-md">
                  <div className="flex items-center">
                    <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                    <span className="text-red-300">{companyLookupError}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">公司名稱 *</label>
                <input
                  type="text"
                  name="companyName"
                  value={formData.companyName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">公司統編 *</label>
                <input
                  type="text"
                  name="companyTaxId"
                  value={formData.companyTaxId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">公司資本額 *</label>
                <input
                  type="text"
                  name="companyCapital"
                  value={formData.companyCapital}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="例：新台幣 1,000 萬元"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">公司成立時間 *</label>
                <input
                  type="date"
                  name="companyEstablished"
                  value={formData.companyEstablished}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">個人專業年資 *</label>
                <input
                  type="text"
                  name="professionalExperience"
                  value={formData.professionalExperience}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="例：10年"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">公司認證/作品</label>
                <textarea
                  name="companyCertifications"
                  value={formData.companyCertifications}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white placeholder-gray-400 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                  placeholder="請描述公司相關認證或代表性作品"
                />
              </div>
            </div>
          </div>

          {/* AI 智能分析 */}
          <div className="border-b border-yellow-500 pb-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <SparklesIcon className="h-6 w-6 text-yellow-400 mr-2" />
                <h2 className="text-xl font-semibold text-yellow-400">AI 智能分析</h2>
              </div>
              <button
                type="button"
                onClick={performAiAnalysis}
                disabled={aiAnalysisLoading || !formData.companyName}
                className="px-4 py-2 bg-yellow-600 text-black rounded-md hover:bg-yellow-500 disabled:bg-gray-600 flex items-center"
              >
                {aiAnalysisLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
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
            
            <div className="bg-gray-800 border border-yellow-500 rounded-lg p-4 mb-4">
              <div className="flex items-center mb-2">
                <InformationCircleIcon className="h-5 w-5 text-yellow-400 mr-2" />
                <span className="text-yellow-400 font-medium">AI 分析功能說明</span>
              </div>
              <p className="text-gray-300 text-sm">
                系統將自動分析公司的市場聲譽、產業衝突、GBC 契合度，並透過司法院判決書查詢評估法律風險，為入會決策提供參考。
              </p>
            </div>
            
            {/* AI 分析進度條 */}
            {aiAnalysisLoading && (
              <div className="bg-gray-800 border border-yellow-500 rounded-lg p-4 mb-4">
                <div className="flex items-center mb-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-400 mr-2"></div>
                  <span className="text-yellow-400 font-medium">快速分析進行中</span>
                  <span className="ml-auto text-yellow-400 text-sm">{aiAnalysisProgress}%</span>
                </div>
                
                {/* 進度條 */}
                <div className="w-full bg-gray-600 rounded-full h-2 mb-3">
                  <div 
                    className="bg-yellow-400 h-2 rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${aiAnalysisProgress}%` }}
                  ></div>
                </div>
                
                {/* 當前階段 */}
                {aiAnalysisStage && (
                  <div className="mb-2">
                    <p className="text-yellow-400 font-medium text-sm">{aiAnalysisStage}</p>
                  </div>
                )}
                
                {/* 詳細描述 */}
                {aiAnalysisDetails && (
                  <div className="bg-gray-700 bg-opacity-60 rounded-md p-3 border border-gray-600">
                    <p className="text-gray-300 text-sm leading-relaxed">{aiAnalysisDetails}</p>
                  </div>
                )}
              </div>
            )}
            
            {aiAnalysisError && (
              <div className="bg-red-900 border border-red-500 rounded-lg p-4 mb-4">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                  <span className="text-red-300">{aiAnalysisError}</span>
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
                
                {/* GBC 契合度評分 - 卡片式 */}
                {aiAnalysisResult.gbcFitScore && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-purple-900 text-lg">GBC 契合度評分</h4>
                      <div className="text-right">
                        {getScoreBadge(aiAnalysisResult.gbcFitScore.score)}
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
                    {aiAnalysisResult.gbcFitScore?.recommendation && (
                      <div className="bg-white bg-opacity-80 rounded-lg p-3 mb-3">
                        <div className="text-sm font-medium text-purple-800 mb-1">入會建議：</div>
                        <div className={`font-semibold ${
                          aiAnalysisResult.gbcFitScore.recommendation === 'strongly_recommend' ? 'text-green-600' : 
                          aiAnalysisResult.gbcFitScore.recommendation === 'recommend' ? 'text-blue-600' : 'text-yellow-600'
                        }`}>
                          {aiAnalysisResult.gbcFitScore.recommendation === 'strongly_recommend' ? '🌟 強烈推薦' : 
                           aiAnalysisResult.gbcFitScore.recommendation === 'recommend' ? '✅ 建議通過' : '⚠️ 謹慎評估'}
                        </div>
                      </div>
                    )}
                    
                    {/* 分析要點 */}
                    {aiAnalysisResult.gbcFitScore.analysis && (
                      <div>
                        <div className="text-sm font-medium text-purple-800 mb-2">分析要點：</div>
                        {parseToBullets(aiAnalysisResult.gbcFitScore.analysis, 4).length > 0 ? (
                          <ul className="list-disc list-inside space-y-1 text-purple-700 text-sm">
                            {parseToBullets(aiAnalysisResult.gbcFitScore.analysis, 4).map((bullet, idx) => (
                              <li key={idx} className="leading-relaxed">{bullet}</li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-purple-700 text-sm leading-relaxed">{aiAnalysisResult.gbcFitScore.analysis}</p>
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

                {/* 法律風險評估已移除 */}

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
                          <div key={idx} className="bg-white bg-opacity-90 rounded-lg p-5 border border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start mb-4">
                              <span className="bg-indigo-100 text-indigo-600 rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold mr-3 mt-0.5 flex-shrink-0">
                                {idx + 1}
                              </span>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                                    {suggestion.category}
                                  </span>
                                </div>
                                <h5 className="font-semibold text-indigo-900 mb-2 text-sm">{suggestion.partner}</h5>
                              </div>
                            </div>
                            <div className="ml-10 space-y-3">
                              <div>
                                <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-1 rounded">合作優勢</span>
                                <p className="text-indigo-800 text-sm mt-1 leading-relaxed">{suggestion.reason}</p>
                              </div>
                              <div>
                                <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded">具體合作場景</span>
                                <div className="mt-2 space-y-1">
                                  {suggestion.scenarios.map((scenario, scenarioIdx) => (
                                    <div key={scenarioIdx} className="flex items-start text-sm text-green-800">
                                      <span className="text-green-600 mr-2 mt-1">•</span>
                                      <span className="leading-relaxed">{scenario}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              {suggestion.contactInfo && (
                                <div className="pt-2 border-t border-indigo-100">
                                  <div className="flex items-center justify-between text-xs text-gray-600">
                                    <span>聯絡資訊：{suggestion.contactInfo.name}</span>
                                    <span className="text-indigo-600 font-medium">{suggestion.contactInfo.title}</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* 行動提醒 */}
                      <div className="mt-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4 border border-indigo-200">
                        <div className="flex items-center mb-2">
                          <span className="text-lg mr-2">💡</span>
                          <div className="text-sm font-medium text-indigo-900">合作建議使用指南</div>
                        </div>
                        <div className="space-y-2 text-sm text-indigo-800">
                          <p>• <strong>優先順序：</strong>建議優先考慮「影像紀錄服務」和「行銷推廣合作」，這些是大多數企業的基本需求</p>
                          <p>• <strong>聯絡方式：</strong>可透過 GBC Connect 會員目錄或活動場合主動接觸推薦的夥伴</p>
                          <p>• <strong>合作模式：</strong>建議先從小型專案開始合作，驗證合作效果後再擴大規模</p>
                          <p>• <strong>時間規劃：</strong>建議在加入 GBC 後 30 天內，至少與 2-3 位推薦夥伴進行初步接觸</p>
                        </div>
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
                  placeholder="希望在 GBC 商會內的合作方向/標的"
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
                <label className="block text-sm font-medium text-gray-700 mb-2">加入 GBC 的期待 *</label>
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
                  我同意遵守 GBC 商會的所有規章制度和行為準則
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
                  我同意提供的所有資訊真實有效，並接受 GBC 的審核和調查
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
            className="px-6 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-700"
          >
            取消
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-yellow-600 text-black rounded-md hover:bg-yellow-500 disabled:bg-gray-600 flex items-center"
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2"></div>
                提交中...
              </>
            ) : (
              '提交申請'
            )}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

export default ProspectApplication;
