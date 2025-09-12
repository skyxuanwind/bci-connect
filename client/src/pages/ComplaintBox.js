import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/axios';

const ComplaintBox = () => {
  const { user, isAdmin } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [statistics, setStatistics] = useState({
    totalComplaints: 0,
    unreadCount: 0,
    readCount: 0,
    anonymousCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [formData, setFormData] = useState({
    content: '',
    is_anonymous: false
  });

  // 檢查是否為核心或管理員（查看申訴）
  const canViewComplaints = user && (user.membershipLevel === 1 || isAdmin());

  const fetchComplaints = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') {
        params.append('status', filter);
      }

      const response = await fetch(`/api/complaints?${params}`, {
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setComplaints(data.complaints);
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const fetchStatistics = useCallback(async () => {
    try {
      const response = await axios.get('/api/complaints/statistics');
      const data = response.data;
      if (data.success) {
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  }, []);

  useEffect(() => {
    if (canViewComplaints) {
      fetchComplaints();
      fetchStatistics();
    } else {
      setLoading(false);
    }
  }, [filter, canViewComplaints, fetchComplaints, fetchStatistics]);

  const handleSubmitComplaint = async (e) => {
    e.preventDefault();
    
    if (!formData.content.trim()) {
      alert('請輸入申訴內容');
      return;
    }

    try {
      const response = await axios.post('/api/complaints', formData);
      
      const data = response.data;
      if (data.success) {
        alert('申訴已成功提交');
        setShowSubmitModal(false);
        setFormData({
          content: ''
        });
        // 如果是核心，重新載入申訴列表
        if (canViewComplaints) {
          fetchComplaints();
          fetchStatistics();
        }
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error submitting complaint:', error);
      alert('提交失敗');
    }
  };

  const handleMarkAsRead = async (id, currentStatus) => {
    const newStatus = currentStatus === 'unread' ? 'read' : 'unread';
    
    try {
      const response = await fetch(`/api/complaints/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });
      
      const data = await response.json();
      if (data.success) {
        fetchComplaints();
        fetchStatistics();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error updating complaint status:', error);
      alert('更新狀態失敗');
    }
  };

  const handleDeleteComplaint = async (id) => {
    if (!window.confirm('確定要刪除這個申訴嗎？此操作無法復原。')) {
      return;
    }

    try {
      const response = await fetch(`/api/complaints/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      const data = await response.json();
      if (data.success) {
        alert('申訴已刪除');
        fetchComplaints();
        fetchStatistics();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error deleting complaint:', error);
      alert('刪除失敗');
    }
  };

  const resetModal = () => {
    setShowSubmitModal(false);
    setFormData({
      content: ''
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">載入中...</p>
        </div>
      </div>
    );
  }

  // 一般會員只能提交申訴
  if (!canViewComplaints) {
    return (
      <div className="min-h-screen bg-primary-900 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 頁面標題 */}
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gold-100">申訴信箱</h1>
            <p className="mt-2 text-gold-300">如有任何問題或建議，歡迎向我們反映</p>
          </div>

          {/* 提交申訴表單 */}
          <div className="bg-primary-800 border border-gold-600 rounded-lg shadow-lg p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gold-100 mb-2">提交申訴</h2>
              <p className="text-gold-300">請詳細描述您遇到的問題或想要反映的情況</p>
            </div>

            <form onSubmit={handleSubmitComplaint}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gold-200 mb-2">申訴內容 *</label>
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  required
                  rows={8}
                  className="w-full px-3 py-2 bg-primary-900 text-gold-100 border border-gold-600 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 placeholder:text-gold-300/60"
                  placeholder="請詳細描述您的問題或建議..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-6 py-2 bg-black border border-yellow-500 text-yellow-400 rounded-md hover:bg-yellow-500 hover:text-black transition-colors font-medium"
                >
                  提交申訴
                </button>
              </div>
            </form>
          </div>

          {/* 提交須知 */}
          <div className="mt-8 bg-primary-800 border border-gold-600 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gold-100 mb-3">提交須知</h3>
            <ul className="text-sm text-gold-200 space-y-2">
              <li>• 請確保填寫申訴內容，以便我們更好地了解和處理您的疑問</li>
              <li>• 申訴內容將由核心成員審核和處理</li>
              <li>• 請避免提交重複或無意義的申訴內容</li>
              <li>• 我們將會盡快處理您的申訴，感謝您的耐心等待</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // 核心查看申訴页面
  return (
    <div className="min-h-screen bg-primary-900 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gold-100">申訴信箱管理</h1>
          <p className="mt-2 text-gold-300">查看和管理會員申訴</p>
        </div>

        {/* 操作按钮 */}
        <div className="mb-6 flex justify-between items-center">
          <div className="flex space-x-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 bg-black border border-yellow-500 text-yellow-400 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 hover:bg-gray-900 transition-colors"
            >
              <option value="all" className="bg-black text-yellow-400">全部申訴</option>
              <option value="unread" className="bg-black text-yellow-400">未讀</option>
              <option value="read" className="bg-black text-yellow-400">已讀</option>
            </select>
          </div>
          
          <button
            onClick={() => setShowSubmitModal(true)}
            className="px-4 py-2 bg-black border border-yellow-500 text-yellow-400 rounded-md hover:bg-yellow-500 hover:text-black transition-colors font-medium"
          >
            提交申訴
          </button>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-primary-800 border border-gold-600 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <svg className="w-6 h-6 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gold-300">總申訴數</p>
                <p className="text-2xl font-bold text-yellow-400">{statistics.totalComplaints}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-primary-800 border border-gold-600 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gold-300">未讀申訴</p>
                <p className="text-2xl font-bold text-red-400">{statistics.unreadCount}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-primary-800 border border-gold-600 rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gold-300">已讀申訴</p>
                <p className="text-2xl font-bold text-green-400">{statistics.readCount}</p>
              </div>
            </div>
          </div>
          

        </div>

        {/* 申訴列表 */}
        <div className="bg-primary-800 border border-gold-600 rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gold-600">
            <h2 className="text-lg font-semibold text-gold-100">申訴列表</h2>
          </div>
          
          {complaints.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 text-gold-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-gold-300">目前沒有申訴記錄</p>
            </div>
          ) : (
            <div className="divide-y divide-gold-700/40">
              {complaints.map((complaint) => (
                <div key={complaint.id} className={`p-6 border-b border-gold-700 hover:bg-primary-600/30 ${
                  complaint.status === 'unread' ? 'bg-yellow-900/20' : 'bg-transparent'
                }`}>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          complaint.status === 'unread' 
                            ? 'bg-yellow-500/20 text-yellow-300' 
                            : 'bg-green-500/20 text-green-300'
                        }`}>
                          {complaint.status === 'unread' ? '未讀' : '已讀'}
                        </span>
                        
                        <span className="text-sm text-gold-300">
                          提交者: {complaint.submitter_name || '未知用戶'}
                        </span>
                        
                        <span className="text-sm text-gold-400">
                          {new Date(complaint.created_at).toLocaleString('zh-TW')}
                        </span>
                      </div>
                      
                      <div className="text-gold-100 whitespace-pre-wrap">
                        {complaint.content}
                      </div>
                    </div>
                    
                    <div className="ml-4 flex space-x-2">
                      <button
                        onClick={() => handleMarkAsRead(complaint.id, complaint.status)}
                        className="px-3 py-1 text-xs rounded-md transition-colors bg-black border border-yellow-500 text-yellow-400 hover:bg-yellow-500 hover:text-black"
                      >
                        {complaint.status === 'unread' ? '標為已讀' : '標為未讀'}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteComplaint(complaint.id)}
                        className="px-3 py-1 text-xs bg-red-600 border border-red-400 text-white rounded-md hover:bg-red-500 transition-colors"
                      >
                        刪除
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 提交申訴模態框 */}
      {showSubmitModal && (
        <div className="fixed inset-0 bg-black/60 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-primary-800 border-gold-600">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gold-100 mb-4">提交申訴</h3>
              
              <form onSubmit={handleSubmitComplaint}>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gold-200 mb-2">申訴內容 *</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({...formData, content: e.target.value})}
                    required
                    rows={6}
                    className="w-full px-3 py-2 bg-primary-900 text-gold-100 border border-gold-600 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 placeholder:text-gold-300/60"
                    placeholder="請詳細描述您的問題或建議..."
                  />
                </div>
                
                
                
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={resetModal}
                    className="px-4 py-2 text-gold-300 border border-gold-600 rounded-md hover:bg-primary-700 transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-black border border-yellow-500 text-yellow-400 rounded-md hover:bg-yellow-500 hover:text-black transition-colors font-medium"
                  >
                    提交
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComplaintBox;