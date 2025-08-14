import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import axios from 'axios';

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

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
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
          }
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-elegant p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">BCI 商訪申請表</h1>
        
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* 一、申請會員基本資料 */}
          <div className="border-b border-gray-200 pb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">一、申請會員基本資料</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">會員姓名 *</label>
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
                  <option value="">請選擇引薦分會</option>
                  {!loading && Array.isArray(chapters) && chapters.map((chapter) => (
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
                <label className="block text-sm font-medium text-gray-700 mb-2">專業別代表 *</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-2">第二專業</label>
                <input
                  type="text"
                  name="secondaryProfession"
                  value={formData.secondaryProfession}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">面談人員 *</label>
                <select
                  name="interviewer"
                  value={formData.interviewer}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">請選擇面談人員</option>
                  {!loading && Array.isArray(coreMembers) && coreMembers.map((member) => (
                    <option key={member.id} value={member.name}>
                      {member.name} - {member.company}
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
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">可以合作對象及產業為</label>
                    <textarea
                      name="cooperationTargets"
                      value={formData.cooperationTargets}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">網址或其他佐證資訊</label>
                    <input
                      type="url"
                      name="websiteInfo"
                      value={formData.websiteInfo}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://"
                    />
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">2. 參加 BCI希望獲得什麼或是希望獲得怎樣協助 *</label>
                <textarea
                  name="bciExpectations"
                  value={formData.bciExpectations}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">3. 過去您是如何達成公司的目標，未來希望可以達成怎樣的成就以及多少營業額？(具體數字) *</label>
                <div className="space-y-4">
                  <textarea
                    name="pastAchievements"
                    value={formData.pastAchievements}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="過去成就"
                    required
                  />
                  <textarea
                    name="futureGoals"
                    value={formData.futureGoals}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="未來目標"
                    required
                  />
                  <input
                    type="text"
                    name="revenueTarget"
                    value={formData.revenueTarget}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="營業額目標（具體數字）"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 同意條款 */}
          <div className="border-b border-gray-200 pb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">同意條款</h2>
            <div className="space-y-4">
              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="agreeRules"
                  checked={formData.agreeRules}
                  onChange={handleInputChange}
                  className="mt-1 mr-3"
                  required
                />
                <label className="text-sm text-gray-700">
                  4. 本人是否可遵守，BCI的地基管理辦法、紀律、誠信以及商業規範，並依法行事？
                </label>
              </div>
              
              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="agreeTraining"
                  checked={formData.agreeTraining}
                  onChange={handleInputChange}
                  className="mt-1 mr-3"
                  required
                />
                <label className="text-sm text-gray-700">
                  5. 是否可完成 BCI要求之培訓課程，讓彼此認知更有共識？
                </label>
              </div>
              
              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="noCriminalRecord"
                  checked={formData.noCriminalRecord}
                  onChange={handleInputChange}
                  className="mt-1 mr-3"
                  required
                />
                <label className="text-sm text-gray-700">
                  6. 過往是否有任何犯罪行為以及司法爭議？（勾選表示無犯罪記錄）
                </label>
              </div>
              
              <div className="flex items-start">
                <input
                  type="checkbox"
                  name="agreeTerms"
                  checked={formData.agreeTerms}
                  onChange={handleInputChange}
                  className="mt-1 mr-3"
                  required
                />
                <label className="text-sm text-gray-700">
                  7. 本人同意並保證，所有個人資訊正確無誤。如有虛偽情事，一經發現立即請離組織處分無異。
                </label>
              </div>
            </div>
          </div>

          {/* 其他 */}
          <div className="pb-8">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">8. 其他：(相關想了解事項、建議事項及補充內容)</label>
              <textarea
                name="otherComments"
                value={formData.otherComments}
                onChange={handleInputChange}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* BCI 成員商業規範 */}
          <div className="bg-gray-50 p-6 rounded-lg mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">BCI 成員商業規範：</h3>
            <div className="text-sm text-gray-700 space-y-2">
              <p>1. 本人同意在 BCI網站上顯示公司基本資料。</p>
              <p>2. 本人同意遵守保密原則。保密相關機密資料係指任何一方對獲悉、取得或對方交付管理或合作，以任何形式存在之有形或無形信息、資料或材料，包含但不限於本商會及成員之所有條款、協議書、附件、營業秘密、專有技術、發明、成本、人事資料、研發資料、客戶訊息及財務訊息等資料，雙方均負有保密義務，未經書面同意不得直接或間接洩漏、提供予任何第三人。</p>
              <p>3. 本人同意遵守本會為發展所有中小企業主並結合各領域之專長，讓所有企業在此發展有所依循，並達到促使全體會員協同合作及誠信原則等目的，特訂定本地基之管理辦法。</p>
              <p>4. 本人同意以互為合作業務的基礎下，努力積極支持 BCI 會員，並建立優質的業務素養及商譽。</p>
            </div>
          </div>

          {/* 提交按鈕 */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '提交中...' : '提交申請表'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProspectApplication;