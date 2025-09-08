import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const ProspectVoting = () => {
  const { token, user } = useAuth();
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [showVoteModal, setShowVoteModal] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  // 字段名稱映射
  const fieldNameMap = {
    memberName: '會員姓名',
    secondaryProfession: '第二專業',
    primaryProfession: '主要專業',
    capital: '資本額',
    established: '成立時間',
    professionalExperience: '專業經驗',
    certifications: '證照',
    websiteInfo: '網站資訊',
    mainBusiness: '主要業務',
    mainProducts: '主要產品',
    mainAdvantages: '主要優勢',
    representativeClients: '代表客戶',
    cooperationTargets: '合作目標',
    bciExpectations: 'GBC期望',
    pastAchievements: '過往成就',
    futureGoals: '未來目標',
    revenueTarget: '營收目標',
    otherComments: '其他備註',
    companyTaxId: '公司統編',
    referralChapter: '推薦分會',
    referralPartner: '推薦夥伴',
    interviewer: '面談者',
    interviewDate: '面談日期',
    companyInfo: '公司資料',
    interview: '面談內容',
    agreements: '同意條款',
    agreeRules: '同意章程規定',
    agreeTraining: '同意參加培訓',
    noCriminalRecord: '無犯罪紀錄聲明',
    agreeTerms: '同意相關條款'
  };



  // 處理商訪數據，解析 JSON 字段
  const processedProspects = useMemo(() => {
    return prospects.map(prospect => {
      let parsedData = {};
      
      // 解析 notes 字段中的 JSON 數據
      if (prospect.notes) {
        try {
          // 檢查是否為 JSON 格式
          if (prospect.notes.startsWith('{') || prospect.notes.startsWith('[')) {
            const notesData = JSON.parse(prospect.notes);
            parsedData = {
              ...parsedData,
              ...notesData.memberInfo,
              ...notesData.companyInfo,
              ...notesData.interview,
              ...notesData.agreements
            };
          } else {
            // 如果是純文字，將其作為備註
            parsedData.otherComments = prospect.notes;
          }
        } catch (error) {
          // 如果解析失敗，將其作為純文字備註
          parsedData.otherComments = prospect.notes;
        }
      }
      
      // 解析 contactInfo 字段中的 JSON 數據
      let parsedContactInfo = null;
      if (prospect.contactInfo) {
        try {
          // 檢查是否為 JSON 格式
          if (prospect.contactInfo.startsWith('{') || prospect.contactInfo.startsWith('[')) {
            const contactData = JSON.parse(prospect.contactInfo);
            parsedContactInfo = contactData;
            parsedData = {
              ...parsedData,
              ...contactData
            };
          } else {
            // 如果是純文字，將其作為聯絡資訊
            parsedData.contactInfo = prospect.contactInfo;
          }
        } catch (error) {
          // 如果解析失敗，將其作為純文字聯絡資訊
          parsedData.contactInfo = prospect.contactInfo;
          parsedContactInfo = null;
        }
      }
      
      return {
        ...prospect,
        memberName: prospect.name,
        companyName: prospect.company,
        primaryProfession: prospect.industry,
        parsedContactInfo, // 將解析後的聯絡資訊一併回傳，供後續 UI 使用
        ...parsedData
      };
    });
  }, [prospects]);

  const filteredProspects = useMemo(() => {
    if (activeTab === 'pending') {
      return processedProspects.filter(prospect => !prospect.userVoted);
    }
    return processedProspects;
  }, [activeTab, processedProspects]);

  const fetchProspects = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/prospects/pending-votes');
      
      if (response.data.prospects) {
        setProspects(response.data.prospects);
      } else {
        setProspects(response.data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchProspects();
    }
  }, [fetchProspects, token]);

  const handleVote = async (vote) => {
    try {
      const response = await fetch(`/api/prospects/${selectedProspect.id}/vote`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ vote })
      });
      
      if (!response.ok) {
        throw new Error('投票失敗');
      }
      
      // 重新獲取數據
      await fetchProspects();
      setShowVoteModal(false);
      setSelectedProspect(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const openVoteModal = (prospect) => {
    setSelectedProspect(prospect);
    setShowVoteModal(true);
  };

  if (user?.membershipLevel !== 1) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          權限不足：僅限核心成員使用此功能
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-300">載入中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-yellow-100 mb-2">商訪專區</h1>
        <p className="text-gray-300">審核待投票的申請人資料</p>
      </div>

      {/* 標籤切換 */}
      <div className="mb-6">
        <div className="border-b border-yellow-500/30">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-yellow-500 text-yellow-300'
                  : 'border-transparent text-gray-400 hover:text-yellow-300 hover:border-yellow-500/30'
              }`}
            >
              待投票 ({filteredProspects.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-yellow-500 text-yellow-300'
                  : 'border-transparent text-gray-400 hover:text-yellow-300 hover:border-yellow-500/30'
              }`}
            >
              全部申請 ({processedProspects.length})
            </button>
          </nav>
        </div>
      </div>

      {filteredProspects.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 text-lg">目前沒有待投票的申請</div>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredProspects.map((prospect) => (
            <div key={prospect.id} className="bg-gradient-to-br from-black/85 to-gray-900/85 rounded-lg shadow-sm border border-yellow-500/30 overflow-hidden">
              {/* 申請人基本資訊 */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-yellow-100 mb-2">{prospect.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {prospect.company && (
                        <div>
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">公司</span>
                          <div className="text-sm font-semibold text-gray-100 mt-1">{prospect.company}</div>
                        </div>
                      )}
                      {prospect.industry && (
                        <div>
                          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">行業</span>
                          <div className="text-sm font-semibold text-gray-100 mt-1">{prospect.industry}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 詳細內容 */}
              <div className="p-6">
                {/* 統計資訊 */}
                <div className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-200">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">創建者</div>
                      <div className="text-sm font-semibold text-gray-100 mt-1">{prospect.createdBy}</div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-200">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">創建時間</div>
                      <div className="text-sm font-semibold text-gray-100 mt-1">{new Date(prospect.createdAt).toLocaleDateString('zh-TW')}</div>
                    </div>
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-200">
                      <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">投票統計</div>
                      <div className="flex justify-between text-sm">
                        <span className="text-green-400 font-semibold">✓ {prospect.approveVotes}</span>
                        <span className="text-gray-400">總計 {prospect.totalVotes}</span>
                      </div>
                      {prospect.totalVotes > 0 && (
                        <div className="mt-2 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full transition-all duration-300"
                            style={{width: `${(prospect.approveVotes / prospect.totalVotes) * 100}%`}}
                          ></div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* 詳細資料區塊 */}
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">詳細資料</h4>
                  <div className="space-y-3">
                    {(!prospect.memberName && !prospect.companyName && !prospect.otherComments && !prospect.contactInfo) ? (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-sm text-blue-800">暫無詳細資料</div>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {/* 基本會員資料 */}
                        <div>
                          <h5 className="text-md font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">基本會員資料</h5>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {prospect.memberName && (
                              <div className="bg-white p-3 rounded border">
                                <div className="text-xs text-gray-400 font-medium">會員姓名</div>
                                <div className="text-sm font-semibold text-gray-100">{prospect.memberName}</div>
                              </div>
                            )}
                            {prospect.referralChapter && (
                              <div className="bg-white p-3 rounded border">
                                <div className="text-xs text-gray-400 font-medium">引薦分會</div>
                                <div className="text-sm font-semibold text-gray-100">{prospect.referralChapter}</div>
                              </div>
                            )}
                            {prospect.referralPartner && (
                              <div className="bg-white p-3 rounded border">
                                <div className="text-xs text-gray-400 font-medium">引薦夥伴</div>
                                <div className="text-sm font-semibold text-gray-100">{prospect.referralPartner}</div>
                              </div>
                            )}
                            {prospect.primaryProfession && (
                              <div className="bg-white p-3 rounded border">
                                <div className="text-xs text-gray-400 font-medium">主要專業</div>
                                <div className="text-sm font-semibold text-gray-100">{prospect.primaryProfession}</div>
                              </div>
                            )}
                            {prospect.secondaryProfession && (
                              <div className="bg-white p-3 rounded border">
                                <div className="text-xs text-gray-400 font-medium">第二專業</div>
                                <div className="text-sm font-semibold text-gray-100">{prospect.secondaryProfession}</div>
                              </div>
                            )}
                            {prospect.interviewer && (
                              <div className="bg-white p-3 rounded border">
                                <div className="text-xs text-gray-400 font-medium">面談人員</div>
                                <div className="text-sm font-semibold text-gray-100">{prospect.interviewer}</div>
                              </div>
                            )}
                            {prospect.interviewDate && (
                              <div className="bg-white p-3 rounded border">
                                <div className="text-xs text-gray-400 font-medium">面談日期</div>
                                <div className="text-sm font-semibold text-gray-100">{prospect.interviewDate}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 公司資料 */}
                        {(prospect.capital || prospect.established || prospect.professionalExperience || prospect.certifications || prospect.websiteInfo) && (
                          <div>
                            <h5 className="text-md font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">公司資料</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {prospect.capital && (
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-400 font-medium">資本額</div>
                                  <div className="text-sm text-gray-100">{prospect.capital}</div>
                                </div>
                              )}
                              {prospect.established && (
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-400 font-medium">成立時間</div>
                                  <div className="text-sm text-gray-100">{prospect.established}</div>
                                </div>
                              )}
                              {prospect.professionalExperience && (
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-400 font-medium">專業經驗</div>
                                  <div className="text-sm text-gray-100">{prospect.professionalExperience}</div>
                                </div>
                              )}
                              {prospect.certifications && (
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-400 font-medium">證照</div>
                                  <div className="text-sm text-gray-100">{prospect.certifications}</div>
                                </div>
                              )}
                              {prospect.websiteInfo && (
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-400 font-medium">網站資訊</div>
                                  <div className="text-sm text-gray-100">{prospect.websiteInfo}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 面談內容 */}
                        {(prospect.mainBusiness || prospect.mainProducts || prospect.mainAdvantages || prospect.representativeClients || prospect.cooperationTargets || prospect.bciExpectations || prospect.pastAchievements || prospect.futureGoals || prospect.revenueTarget || prospect.otherComments) && (
                          <div>
                            <h5 className="text-md font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">面談內容</h5>
                            <div className="grid grid-cols-1 gap-4">
                              {prospect.mainBusiness && (
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-400 font-medium">主要業務</div>
                                  <div className="text-sm text-gray-100">{prospect.mainBusiness}</div>
                                </div>
                              )}
                              {prospect.mainProducts && (
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-400 font-medium">主要產品</div>
                                  <div className="text-sm text-gray-100">{prospect.mainProducts}</div>
                                </div>
                              )}
                              {prospect.mainAdvantages && (
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-400 font-medium">主要優勢</div>
                                  <div className="text-sm text-gray-100">{prospect.mainAdvantages}</div>
                                </div>
                              )}
                              {prospect.representativeClients && (
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-400 font-medium">代表客戶</div>
                                  <div className="text-sm text-gray-100">{prospect.representativeClients}</div>
                                </div>
                              )}
                              {prospect.cooperationTargets && (
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-400 font-medium">合作目標</div>
                                  <div className="text-sm text-gray-100">{prospect.cooperationTargets}</div>
                                </div>
                              )}
                              {prospect.bciExpectations && (
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-400 font-medium">GBC期望</div>
                    <div className="text-sm text-gray-100">{prospect.bciExpectations}</div>
                                </div>
                              )}
                              {prospect.pastAchievements && (
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-400 font-medium">過往成就</div>
                                  <div className="text-sm text-gray-100">{prospect.pastAchievements}</div>
                                </div>
                              )}
                              {prospect.futureGoals && (
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-400 font-medium">未來目標</div>
                                  <div className="text-sm text-gray-100">{prospect.futureGoals}</div>
                                </div>
                              )}
                              {prospect.revenueTarget && (
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-400 font-medium">營收目標</div>
                                  <div className="text-sm text-gray-100">{prospect.revenueTarget}</div>
                                </div>
                              )}
                              {prospect.otherComments && (
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-400 font-medium">其他備註</div>
                                  <div className="text-sm text-gray-100">{prospect.otherComments}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* 同意條款 */}
                        {(prospect.agreeRules || prospect.agreeTraining || prospect.noCriminalRecord || prospect.agreeTerms) && (
                          <div>
                            <h5 className="text-md font-semibold text-gray-800 mb-3 border-b border-gray-200 pb-2">同意條款</h5>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {prospect.agreeRules && (
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-400 font-medium">同意章程規定</div>
                                  <div className="text-sm text-gray-100">{prospect.agreeRules}</div>
                                </div>
                              )}
                              {prospect.agreeTraining && (
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-400 font-medium">同意參加培訓</div>
                                  <div className="text-sm text-gray-100">{prospect.agreeTraining}</div>
                                </div>
                              )}
                              {prospect.noCriminalRecord && (
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-400 font-medium">無犯罪紀錄聲明</div>
                                  <div className="text-sm text-gray-100">{prospect.noCriminalRecord}</div>
                                </div>
                              )}
                              {prospect.agreeTerms && (
                                <div className="bg-white p-3 rounded border">
                                  <div className="text-xs text-gray-400 font-medium">同意相關條款</div>
                                  <div className="text-sm text-gray-100">{prospect.agreeTerms}</div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* 投票按鈕 */}
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                      {prospect.userVoted ? (
                        <span className="text-green-600 font-medium">✓ 您已投票</span>
                      ) : (
                        <span>尚未投票</span>
                      )}
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => openVoteModal(prospect)}
                        disabled={prospect.userVoted}
                        className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                          prospect.userVoted
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            : 'bg-yellow-500 text-black hover:bg-yellow-400'
                        }`}
                      >
                        {prospect.userVoted ? '已投票' : '進行投票'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 投票模態框 */}
      {showVoteModal && selectedProspect && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-gradient-to-br from-black/90 to-gray-900/90 rounded-lg border border-yellow-500/30 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-yellow-100">投票確認</h2>
                <button
                  onClick={() => setShowVoteModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-yellow-100 mb-4">{selectedProspect.name}</h3>
                
                {/* 申請人資料摘要 */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h4 className="text-md font-semibold text-gray-900 mb-3">申請人資料</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {!selectedProspect.parsedContactInfo ? (
                      <div className="col-span-full bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <div className="text-sm text-blue-800">暫無詳細資料</div>
                      </div>
                    ) : (
                      <>
                        {selectedProspect.parsedContactInfo.memberName && (
                          <div className="bg-white p-3 rounded border">
                            <div className="text-xs text-gray-400 font-medium">會員姓名</div>
                            <div className="text-gray-100 font-semibold">{selectedProspect.parsedContactInfo.memberName}</div>
                          </div>
                        )}
                        {selectedProspect.parsedContactInfo.referralChapter && (
                          <div className="bg-white p-3 rounded border">
                            <div className="text-xs text-gray-400 font-medium">引薦分會</div>
                            <div className="text-gray-100 font-semibold">{selectedProspect.parsedContactInfo.referralChapter}</div>
                          </div>
                        )}
                        {selectedProspect.parsedContactInfo.referralPartner && (
                          <div className="bg-white p-3 rounded border">
                            <div className="text-xs text-gray-400 font-medium">引薦夥伴</div>
                            <div className="text-gray-100 font-semibold">{selectedProspect.parsedContactInfo.referralPartner}</div>
                          </div>
                        )}
                        {selectedProspect.parsedContactInfo.primaryProfession && (
                          <div className="bg-white p-3 rounded border">
                            <div className="text-xs text-gray-400 font-medium">主要專業</div>
                            <div className="text-gray-100 font-semibold">{selectedProspect.parsedContactInfo.primaryProfession}</div>
                          </div>
                        )}
                        {selectedProspect.parsedContactInfo.interviewer && (
                          <div className="bg-white p-3 rounded border">
                            <div className="text-xs text-gray-400 font-medium">面談人員</div>
                            <div className="text-gray-100 font-semibold">{selectedProspect.parsedContactInfo.interviewer}</div>
                          </div>
                        )}
                        {selectedProspect.parsedContactInfo.interviewDate && (
                          <div className="bg-white p-3 rounded border">
                            <div className="text-xs text-gray-400 font-medium">面談日期</div>
                            <div className="text-gray-100 font-semibold">{selectedProspect.parsedContactInfo.interviewDate}</div>
                          </div>
                        )}
                        {selectedProspect.parsedContactInfo.companyInfo?.capital && (
                          <div className="bg-white p-3 rounded border">
                            <div className="text-xs text-gray-400 font-medium">資本額</div>
                            <div className="text-gray-100 font-semibold">{selectedProspect.parsedContactInfo.companyInfo.capital}</div>
                          </div>
                        )}
                        {selectedProspect.parsedContactInfo.companyInfo?.established && (
                          <div className="bg-white p-3 rounded border">
                            <div className="text-xs text-gray-400 font-medium">成立時間</div>
                            <div className="text-gray-100 font-semibold">{selectedProspect.parsedContactInfo.companyInfo.established}</div>
                          </div>
                        )}
                        {selectedProspect.parsedContactInfo.interview?.mainBusiness && (
                          <div className="bg-white p-3 rounded border col-span-full">
                            <div className="text-xs text-gray-400 font-medium">主要業務</div>
                            <div className="text-gray-100">{selectedProspect.parsedContactInfo.interview.mainBusiness}</div>
                          </div>
                        )}
                        {selectedProspect.parsedContactInfo.interview?.bciExpectations && (
                          <div className="bg-white p-3 rounded border col-span-full">
                            <div className="text-xs text-gray-400 font-medium">GBC期望</div>
                    <div className="text-gray-100">{selectedProspect.parsedContactInfo.interview.bciExpectations}</div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowVoteModal(false)}
                  className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={() => handleVote('reject')}
                  className="px-6 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  不同意
                </button>
                <button
                  onClick={() => handleVote('approve')}
                  className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  同意
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProspectVoting;