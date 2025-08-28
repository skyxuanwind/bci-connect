import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const ReferralSystem = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('stats');
  const [stats, setStats] = useState({
    total_received: 0,
    total_sent: 0,
    pending_received: 0,
    pending_sent: 0
  });
  const [receivedReferrals, setReceivedReferrals] = useState([]);
  const [sentReferrals, setSentReferrals] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 新增引薦表單狀態
  const [newReferral, setNewReferral] = useState({
    referred_to_id: '',
    referral_amount: '',
    description: ''
  });

  useEffect(() => {
    fetchStats();
    fetchReceivedReferrals();
    fetchSentReferrals();
    fetchMembers();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get('/api/users/referral-stats');
      setStats(response.data);
    } catch (error) {
      console.error('獲取統計數據失敗:', error);
    }
  };

  const fetchReceivedReferrals = async () => {
    try {
      const response = await axios.get('/api/referrals/received');
      setReceivedReferrals(response.data);
    } catch (error) {
      console.error('獲取收到的引薦失敗:', error);
    }
  };

  const fetchSentReferrals = async () => {
    try {
      const response = await axios.get('/api/referrals/sent');
      setSentReferrals(response.data);
    } catch (error) {
      console.error('獲取發出的引薦失敗:', error);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await axios.get('/api/users/members', { params: { limit: 100 } });
      setMembers(response.data.members.filter(member => member.id !== user.id));
    } catch (error) {
      console.error('獲取會員列表失敗:', error);
    }
  };

  const handleCreateReferral = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post('/api/referrals/create', newReferral);
      setSuccess('引薦已成功發送！');
      setNewReferral({ referred_to_id: '', referral_amount: '', description: '' });
      fetchStats();
      fetchSentReferrals();
    } catch (error) {
      setError(error.response?.data?.error || '發送引薦失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleRespondToReferral = async (referralId, status) => {
    try {
      await axios.put(`/api/referrals/${referralId}/respond`, { status });
      setSuccess(`引薦已${status === 'confirmed' ? '確認' : '拒絕'}`);
      fetchStats();
      fetchReceivedReferrals();
    } catch (error) {
      setError(error.response?.data?.error || '操作失敗');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('zh-TW', {
      style: 'currency',
      currency: 'TWD'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { text: '待處理', class: 'bg-yellow-100 text-yellow-800' },
      confirmed: { text: '已確認', class: 'bg-green-100 text-green-800' },
      rejected: { text: '已拒絕', class: 'bg-red-100 text-red-800' }
    };
    const statusInfo = statusMap[status] || { text: status, class: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusInfo.class}`}>
        {statusInfo.text}
      </span>
    );
  };

  // 檢查用戶權限
  if (!user || user.membershipLevel > 3) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">權限不足</h2>
          <p className="text-gray-600">只有會員以上才能使用引薦系統</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">會員引薦系統</h1>
          <p className="mt-2 text-gray-600">管理您的引薦記錄和統計</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">收</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">確認引薦總額</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.total_received)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">發</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">發出引薦總額</dt>
                    <dd className="text-lg font-medium text-gray-900">{formatCurrency(stats.total_sent)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{stats.pending_received}</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">待處理引薦</dt>
                    <dd className="text-lg font-medium text-gray-900">收到 {stats.pending_received} 筆</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{stats.pending_sent}</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">等待回覆</dt>
                    <dd className="text-lg font-medium text-gray-900">發出 {stats.pending_sent} 筆</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 標籤頁 */}
        <div className="bg-white shadow rounded-lg">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('create')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'create'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                發起引薦
              </button>
              <button
                onClick={() => setActiveTab('received')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'received'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                收到的引薦 ({stats.pending_received})
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sent'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                發出的引薦
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* 發起引薦標籤 */}
            {activeTab === 'create' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">發起新引薦</h3>
                <form onSubmit={handleCreateReferral} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      選擇被引薦會員
                    </label>
                    <select
                      value={newReferral.referred_to_id}
                      onChange={(e) => setNewReferral({ ...newReferral, referred_to_id: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">請選擇會員</option>
                      {members.map(member => (
                        <option key={member.id} value={member.id}>
                          {member.name} - {member.company}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      引薦金額
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newReferral.referral_amount}
                      onChange={(e) => setNewReferral({ ...newReferral, referral_amount: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="請輸入引薦金額"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      引薦說明
                    </label>
                    <textarea
                      value={newReferral.description}
                      onChange={(e) => setNewReferral({ ...newReferral, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="請描述引薦的詳細內容..."
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    {loading ? '發送中...' : '發送引薦'}
                  </button>
                </form>
              </div>
            )}

            {/* 收到的引薦標籤 */}
            {activeTab === 'received' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">收到的引薦</h3>
                {receivedReferrals.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">暫無收到的引薦</p>
                ) : (
                  <div className="space-y-4">
                    {receivedReferrals.map(referral => (
                      <div key={referral.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              來自：{referral.referrer_name} ({referral.referrer_company})
                            </h4>
                            <p className="text-sm text-gray-600">金額：{formatCurrency(referral.referral_amount)}</p>
                            <p className="text-sm text-gray-600">時間：{formatDate(referral.created_at)}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(referral.status)}
                          </div>
                        </div>
                        {referral.description && (
                          <p className="text-sm text-gray-700 mb-3">{referral.description}</p>
                        )}
                        {referral.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleRespondToReferral(referral.id, 'confirmed')}
                              className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                            >
                              確認
                            </button>
                            <button
                              onClick={() => handleRespondToReferral(referral.id, 'rejected')}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                            >
                              拒絕
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 發出的引薦標籤 */}
            {activeTab === 'sent' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">發出的引薦</h3>
                {sentReferrals.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">暫無發出的引薦</p>
                ) : (
                  <div className="space-y-4">
                    {sentReferrals.map(referral => (
                      <div key={referral.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              發給：{referral.referred_name} ({referral.referred_company})
                            </h4>
                            <p className="text-sm text-gray-600">金額：{formatCurrency(referral.referral_amount)}</p>
                            <p className="text-sm text-gray-600">時間：{formatDate(referral.created_at)}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(referral.status)}
                          </div>
                        </div>
                        {referral.description && (
                          <p className="text-sm text-gray-700">{referral.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralSystem;