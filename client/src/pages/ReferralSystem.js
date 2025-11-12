import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import ReferralGraph from '../components/ReferralGraph';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

const ReferralSystem = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('network');
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

  // 人脈引薦表單狀態（敏感資料會在後端加密）
  const [networkReferral, setNetworkReferral] = useState({
    referred_to_id: '',
    prospect: { name: '', email: '', company: '', phone: '' },
    provider: { name: '', email: '', company: '' },
    reason: ''
  });

  // 成交引薦表單狀態
  const [dealReferral, setDealReferral] = useState({
    referred_to_id: '',
    amount: '',
    currency: 'TWD',
    transactionId: '',
    reason: ''
  });

  // 關係圖譜篩選
  const [graphType, setGraphType] = useState('all');

  // 成效分析篩選與資料
  const [perfRange, setPerfRange] = useState('monthly');
  const [perfType, setPerfType] = useState('all');
  const [performance, setPerformance] = useState({ summary: [], deals: [], bonusRate: 0 });

  // 敏感資料快取（id -> data）
  const [sensitiveMap, setSensitiveMap] = useState({});

  useEffect(() => {
    fetchStats();
    fetchReceivedReferrals();
    fetchSentReferrals();
    fetchMembers();
    fetchPerformance();
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

  const handleCreateNetworkReferral = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const payload = { ...networkReferral };
      await axios.post('/api/referrals/network/create', payload);
      setSuccess('人脈引薦已提交！');
      setNetworkReferral({ referred_to_id: '', prospect: { name: '', email: '', company: '', phone: '' }, provider: { name: '', email: '', company: '' }, reason: '' });
      fetchSentReferrals();
    } catch (error) {
      setError(error.response?.data?.error || '提交人脈引薦失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDealReferral = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const payload = { ...dealReferral, amount: Number(dealReferral.amount || 0) };
      await axios.post('/api/referrals/deal/create', payload);
      setSuccess('成交引薦已建立！');
      setDealReferral({ referred_to_id: '', amount: '', currency: 'TWD', transactionId: '', reason: '' });
      fetchSentReferrals();
      fetchPerformance();
    } catch (error) {
      setError(error.response?.data?.error || '建立成交引薦失敗');
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
      minute: '2-digit',
      timeZone: 'Asia/Taipei'
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

  const fetchPerformance = async () => {
    try {
      const res = await axios.get('/api/referrals/performance', { params: { range: perfRange, type: perfType } });
      setPerformance(res.data || { summary: [], deals: [], bonusRate: 0 });
    } catch (err) {
      console.error('獲取成效分析失敗:', err);
    }
  };

  const handleViewSensitive = async (id) => {
    try {
      const res = await axios.get(`/api/referrals/${id}/sensitive`);
      setSensitiveMap(prev => ({ ...prev, [id]: res.data?.data || {} }));
    } catch (err) {
      setError(err.response?.data?.error || '讀取敏感資料失敗');
    }
  };

  // 檢查用戶權限
  // 移除會員等級限制，所有會員都可使用引薦功能
  // 原先：if (!user || user.membershipLevel > 3) { return navigate('/'); }
  if (!user) {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-primary-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gold-100">會員引薦系統</h1>
          <p className="mt-2 text-gold-300">管理您的引薦記錄和統計</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* 統計卡片 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-primary-800 border border-gold-600 overflow-hidden shadow-xl rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gold-600 rounded-md flex items-center justify-center">
                    <span className="text-primary-900 text-sm font-medium">收</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gold-300 truncate">確認引薦總額</dt>
                    <dd className="text-lg font-medium text-gold-100">{formatCurrency(stats.total_received)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary-800 border border-gold-600 overflow-hidden shadow-xl rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gold-500 rounded-md flex items-center justify-center">
                    <span className="text-primary-900 text-sm font-medium">發</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gold-300 truncate">發出引薦總額</dt>
                    <dd className="text-lg font-medium text-gold-100">{formatCurrency(stats.total_sent)}</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary-800 border border-gold-600 overflow-hidden shadow-xl rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gold-400 rounded-md flex items-center justify-center">
                    <span className="text-primary-900 text-sm font-medium">{stats.pending_received}</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gold-300 truncate">待處理引薦</dt>
                    <dd className="text-lg font-medium text-gold-100">收到 {stats.pending_received} 筆</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-primary-800 border border-gold-600 overflow-hidden shadow-xl rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-gold-300 rounded-md flex items-center justify-center">
                    <span className="text-primary-900 text-sm font-medium">{stats.pending_sent}</span>
                  </div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gold-300 truncate">等待回覆</dt>
                    <dd className="text-lg font-medium text-gold-100">發出 {stats.pending_sent} 筆</dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 標籤頁 */}
        <div className="bg-primary-800 shadow-lg rounded-lg border border-gold-600">
          <div className="border-b border-gold-600">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('network')}
                className={`py-3 px-4 border-b-2 font-semibold text-base rounded-t-lg transition-all duration-200 ${
                  activeTab === 'network'
                    ? 'border-gold-500 text-gold-100 bg-gold-600 shadow-sm'
                    : 'border-transparent text-gold-300 hover:text-gold-100 hover:border-gold-400 hover:bg-primary-700'
                }`}
              >
                人脈引薦
              </button>
              <button
                onClick={() => setActiveTab('deal')}
                className={`py-3 px-4 border-b-2 font-semibold text-base rounded-t-lg transition-all duration-200 ${
                  activeTab === 'deal'
                    ? 'border-gold-500 text-gold-100 bg-gold-600 shadow-sm'
                    : 'border-transparent text-gold-300 hover:text-gold-100 hover:border-gold-400 hover:bg-primary-700'
                }`}
              >
                成交引薦
              </button>
              <button
                onClick={() => setActiveTab('received')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'received'
                    ? 'border-gold-500 text-gold-100'
                    : 'border-transparent text-gold-300 hover:text-gold-100 hover:border-gold-400'
                }`}
              >
                收到的引薦 ({stats.pending_received})
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'sent'
                    ? 'border-gold-500 text-gold-100'
                    : 'border-transparent text-gold-300 hover:text-gold-100 hover:border-gold-400'
                }`}
              >
                發出的引薦
              </button>
              <button
                onClick={() => setActiveTab('graph')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'graph'
                    ? 'border-gold-500 text-gold-100'
                    : 'border-transparent text-gold-300 hover:text-gold-100 hover:border-gold-400'
                }`}
              >
                關係圖譜
              </button>
              <button
                onClick={() => setActiveTab('analytics')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analytics'
                    ? 'border-gold-500 text-gold-100'
                    : 'border-transparent text-gold-300 hover:text-gold-100 hover:border-gold-400'
                }`}
              >
                成效分析
              </button>
            </nav>
          </div>

          <div className="p-6">
            {/* 人脈引薦標籤 */}
            {activeTab === 'network' && (
              <div>
                <h3 className="text-lg font-medium text-gold-100 mb-4">人脈引薦（資源對接）</h3>
                <form onSubmit={handleCreateNetworkReferral} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gold-300 mb-2">選擇被引薦會員</label>
                    <select
                      value={networkReferral.referred_to_id}
                      onChange={(e) => setNetworkReferral({ ...networkReferral, referred_to_id: e.target.value })}
                      className="w-full px-3 py-2 bg-primary-700 border border-gold-600 rounded-md text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-primary-700 border border-gold-600 rounded-md p-4">
                      <h4 className="text-gold-100 font-medium mb-2">被引薦方基本資料</h4>
                      <div className="space-y-2">
                        <input type="text" value={networkReferral.prospect.name} onChange={(e)=>setNetworkReferral(prev=>({ ...prev, prospect: { ...prev.prospect, name: e.target.value } }))} placeholder="姓名" className="w-full px-3 py-2 bg-primary-800 border border-gold-600 rounded-md text-gold-100"/>
                        <input type="email" value={networkReferral.prospect.email} onChange={(e)=>setNetworkReferral(prev=>({ ...prev, prospect: { ...prev.prospect, email: e.target.value } }))} placeholder="Email" className="w-full px-3 py-2 bg-primary-800 border border-gold-600 rounded-md text-gold-100"/>
                        <input type="text" value={networkReferral.prospect.company} onChange={(e)=>setNetworkReferral(prev=>({ ...prev, prospect: { ...prev.prospect, company: e.target.value } }))} placeholder="公司" className="w-full px-3 py-2 bg-primary-800 border border-gold-600 rounded-md text-gold-100"/>
                        <input type="text" value={networkReferral.prospect.phone} onChange={(e)=>setNetworkReferral(prev=>({ ...prev, prospect: { ...prev.prospect, phone: e.target.value } }))} placeholder="電話" className="w-full px-3 py-2 bg-primary-800 border border-gold-600 rounded-md text-gold-100"/>
                      </div>
                    </div>
                    <div className="bg-primary-700 border border-gold-600 rounded-md p-4">
                      <h4 className="text-gold-100 font-medium mb-2">服務提供者（選填）</h4>
                      <div className="space-y-2">
                        <input type="text" value={networkReferral.provider.name} onChange={(e)=>setNetworkReferral(prev=>({ ...prev, provider: { ...prev.provider, name: e.target.value } }))} placeholder="姓名" className="w-full px-3 py-2 bg-primary-800 border border-gold-600 rounded-md text-gold-100"/>
                        <input type="email" value={networkReferral.provider.email} onChange={(e)=>setNetworkReferral(prev=>({ ...prev, provider: { ...prev.provider, email: e.target.value } }))} placeholder="Email" className="w-full px-3 py-2 bg-primary-800 border border-gold-600 rounded-md text-gold-100"/>
                        <input type="text" value={networkReferral.provider.company} onChange={(e)=>setNetworkReferral(prev=>({ ...prev, provider: { ...prev.provider, company: e.target.value } }))} placeholder="公司" className="w-full px-3 py-2 bg-primary-800 border border-gold-600 rounded-md text-gold-100"/>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gold-300 mb-2">推薦理由</label>
                    <textarea value={networkReferral.reason} onChange={(e)=>setNetworkReferral({ ...networkReferral, reason: e.target.value })} rows={3} className="w-full px-3 py-2 bg-primary-700 border border-gold-600 rounded-md text-gold-100" placeholder="請描述推薦的背景與理由" />
                  </div>

                  <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-gold-600 to-gold-700 text-primary-900 py-4 px-6 rounded-lg text-lg font-semibold shadow-lg hover:from-gold-700 hover:to-gold-800 focus:outline-none focus:ring-4 focus:ring-gold-300 disabled:opacity-50 transform hover:scale-105 transition-all duration-200">
                    {loading ? '提交中...' : '提交人脈引薦'}
                  </button>
                </form>
              </div>
            )}

            {/* 成交引薦標籤 */}
            {activeTab === 'deal' && (
              <div>
                <h3 className="text-lg font-medium text-gold-100 mb-4">成交引薦（金流驗證）</h3>
                <form onSubmit={handleCreateDealReferral} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gold-300 mb-2">選擇被引薦會員</label>
                    <select
                      value={dealReferral.referred_to_id}
                      onChange={(e) => setDealReferral({ ...dealReferral, referred_to_id: e.target.value })}
                      className="w-full px-3 py-2 bg-primary-700 border border-gold-600 rounded-md text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-500"
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

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gold-300 mb-2">成交金額</label>
                      <input type="number" min="0" step="0.01" value={dealReferral.amount} onChange={(e)=>setDealReferral({ ...dealReferral, amount: e.target.value })} className="w-full px-3 py-2 bg-primary-700 border border-gold-600 rounded-md text-gold-100" placeholder="請輸入成交金額" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gold-300 mb-2">幣別</label>
                      <select value={dealReferral.currency} onChange={(e)=>setDealReferral({ ...dealReferral, currency: e.target.value })} className="w-full px-3 py-2 bg-primary-700 border border-gold-600 rounded-md text-gold-100">
                        <option value="TWD">TWD</option>
                        <option value="USD">USD</option>
                        <option value="JPY">JPY</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gold-300 mb-2">交易編號（選填）</label>
                      <input type="text" value={dealReferral.transactionId} onChange={(e)=>setDealReferral({ ...dealReferral, transactionId: e.target.value })} className="w-full px-3 py-2 bg-primary-700 border border-gold-600 rounded-md text-gold-100" placeholder="若已產生交易可填入以即時驗證" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gold-300 mb-2">說明（選填）</label>
                    <textarea value={dealReferral.reason} onChange={(e)=>setDealReferral({ ...dealReferral, reason: e.target.value })} rows={3} className="w-full px-3 py-2 bg-primary-700 border border-gold-600 rounded-md text-gold-100" placeholder="補充成交背景或備註" />
                  </div>

                  <button type="submit" disabled={loading} className="w-full bg-gradient-to-r from-gold-600 to-gold-700 text-primary-900 py-4 px-6 rounded-lg text-lg font-semibold shadow-lg hover:from-gold-700 hover:to-gold-800 focus:outline-none focus:ring-4 focus:ring-gold-300 disabled:opacity-50 transform hover:scale-105 transition-all duration-200">
                    {loading ? '建立中...' : '建立成交引薦'}
                  </button>
                </form>
              </div>
            )}

            {/* 收到的引薦標籤 */}
            {activeTab === 'received' && (
              <div>
                <h3 className="text-lg font-medium text-gold-100 mb-4">收到的引薦</h3>
                {receivedReferrals.length === 0 ? (
                  <p className="text-gold-300 text-center py-8">暫無收到的引薦</p>
                ) : (
                  <div className="space-y-4">
                    {receivedReferrals.map(referral => (
                      <div key={referral.id} className="border border-gold-600 bg-primary-700 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gold-100">
                              來自：{referral.referrer_name} ({referral.referrer_company})
                            </h4>
                            <p className="text-sm text-gold-300">金額：{formatCurrency(referral.referral_amount)}</p>
                            <p className="text-sm text-gold-300">時間：{formatDate(referral.created_at)}</p>
                            {referral.type === 'network' && (
                              <p className="text-sm text-gold-300">審核：{referral.audit_status || 'pending'}</p>
                            )}
                            {referral.type === 'deal' && (
                              <p className="text-sm text-gold-300">交易狀態：{referral.deal_status || 'verification_pending'}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(referral.status)}
                          </div>
                        </div>
                        {referral.description && (
                          <p className="text-sm text-gold-200 mb-3">{referral.description}</p>
                        )}
                        {referral.status === 'pending' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleRespondToReferral(referral.id, 'confirmed')}
                              className="bg-gold-600 text-primary-900 px-3 py-1 rounded text-sm hover:bg-gold-700 font-medium"
                            >
                              確認
                            </button>
                            <button
                              onClick={() => handleRespondToReferral(referral.id, 'rejected')}
                              className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 font-medium"
                            >
                              拒絕
                            </button>
                          </div>
                        )}
                        {referral.type === 'network' && (
                          <div className="mt-3">
                            <button onClick={()=>handleViewSensitive(referral.id)} className="text-sm bg-primary-800 border border-gold-600 text-gold-100 px-3 py-1 rounded hover:bg-primary-600">查看敏感資料</button>
                            {sensitiveMap[referral.id] && (
                              <div className="mt-2 text-sm text-gold-200">
                                <pre className="whitespace-pre-wrap break-words">{JSON.stringify(sensitiveMap[referral.id], null, 2)}</pre>
                              </div>
                            )}
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
                <h3 className="text-lg font-medium text-gold-100 mb-4">發出的引薦</h3>
                {sentReferrals.length === 0 ? (
                  <p className="text-gold-300 text-center py-8">暫無發出的引薦</p>
                ) : (
                  <div className="space-y-4">
                    {sentReferrals.map(referral => (
                      <div key={referral.id} className="border border-gold-600 bg-primary-700 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gold-100">
                              發給：{referral.referred_name} ({referral.referred_company})
                            </h4>
                            <p className="text-sm text-gold-300">金額：{formatCurrency(referral.referral_amount)}</p>
                            <p className="text-sm text-gold-300">時間：{formatDate(referral.created_at)}</p>
                            {referral.type === 'network' && (
                              <p className="text-sm text-gold-300">審核：{referral.audit_status || 'pending'}</p>
                            )}
                            {referral.type === 'deal' && (
                              <p className="text-sm text-gold-300">交易狀態：{referral.deal_status || 'verification_pending'}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(referral.status)}
                          </div>
                        </div>
                        {referral.description && (
                          <p className="text-sm text-gold-200">{referral.description}</p>
                        )}
                        {referral.type === 'network' && (
                          <div className="mt-3">
                            <button onClick={()=>handleViewSensitive(referral.id)} className="text-sm bg-primary-800 border border-gold-600 text-gold-100 px-3 py-1 rounded hover:bg-primary-600">查看敏感資料</button>
                            {sensitiveMap[referral.id] && (
                              <div className="mt-2 text-sm text-gold-200">
                                <pre className="whitespace-pre-wrap break-words">{JSON.stringify(sensitiveMap[referral.id], null, 2)}</pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 關係圖譜標籤 */}
            {activeTab === 'graph' && (
              <div>
                <div className="flex items-center mb-4 space-x-3">
                  <label className="text-sm text-gold-300">類型</label>
                  <select value={graphType} onChange={(e)=>setGraphType(e.target.value)} className="px-3 py-2 bg-primary-700 border border-gold-600 rounded-md text-gold-100">
                    <option value="all">全部</option>
                    <option value="network">人脈引薦</option>
                    <option value="deal">成交引薦</option>
                  </select>
                </div>
                <ReferralGraph type={graphType} />
              </div>
            )}

            {/* 成效分析標籤 */}
            {activeTab === 'analytics' && (
              <div>
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gold-300">時間範圍</label>
                    <select value={perfRange} onChange={(e)=>{setPerfRange(e.target.value);}} onBlur={fetchPerformance} className="px-3 py-2 bg-primary-700 border border-gold-600 rounded-md text-gold-100">
                      <option value="monthly">本月</option>
                      <option value="quarterly">本季</option>
                      <option value="semiannual">半年</option>
                      <option value="annual">年度</option>
                    </select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="text-sm text-gold-300">類型</label>
                    <select value={perfType} onChange={(e)=>{setPerfType(e.target.value);}} onBlur={fetchPerformance} className="px-3 py-2 bg-primary-700 border border-gold-600 rounded-md text-gold-100">
                      <option value="all">全部</option>
                      <option value="network">人脈引薦</option>
                      <option value="deal">成交引薦</option>
                    </select>
                  </div>
                  <button onClick={fetchPerformance} className="bg-gold-600 text-primary-900 px-3 py-2 rounded text-sm hover:bg-gold-700">更新</button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-primary-800 border border-gold-600 rounded-lg p-4">
                    <h4 className="text-gold-100 font-medium mb-2">各類型成交金額</h4>
                    <div style={{ width: '100%', height: 240 }}>
                      <ResponsiveContainer>
                        <BarChart data={performance.summary.map(s=>({ type: s.type || '未知', amount: Number(s.confirmed_amount || 0) }))}>
                          <XAxis dataKey="type" stroke="#f7e6b7"/>
                          <YAxis stroke="#f7e6b7"/>
                          <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #b45309', color: '#f7e6b7' }} formatter={(v)=>formatCurrency(v)} />
                          <Bar dataKey="amount" fill="#f59e0b" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-primary-800 border border-gold-600 rounded-lg p-4">
                    <h4 className="text-gold-100 font-medium mb-2">成交佔比（已確認 vs 總數）</h4>
                    <div style={{ width: '100%', height: 240 }}>
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={performance.summary.map(s=>({ name: s.type || '未知', value: Number(s.confirmed || 0) }))} dataKey="value" nameKey="name" outerRadius={80}>
                            {performance.summary.map((_, idx)=>(<Cell key={idx} fill={["#f59e0b", "#b45309", "#fbd46d", "#c2410c"][idx % 4]} />))}
                          </Pie>
                          <Tooltip contentStyle={{ background: '#1f2937', border: '1px solid #b45309', color: '#f7e6b7' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="mt-6 bg-primary-800 border border-gold-600 rounded-lg p-4">
                  <h4 className="text-gold-100 font-medium mb-2">成交明細與獎金</h4>
                  {performance.deals.length === 0 ? (
                    <p className="text-gold-300">所選範圍無成交記錄</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gold-700">
                        <thead className="bg-primary-700">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gold-300">交易編號</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gold-300">金額</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gold-300">幣別</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gold-300">驗證</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gold-300">驗證時間</th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gold-300">獎金</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gold-700">
                          {performance.deals.map(d => (
                            <tr key={d.referral_id}>
                              <td className="px-3 py-2 text-gold-100">{d.transaction_id || '-'}</td>
                              <td className="px-3 py-2 text-gold-100">{formatCurrency(d.amount)}</td>
                              <td className="px-3 py-2 text-gold-100">{d.currency}</td>
                              <td className="px-3 py-2 text-gold-100">{d.verified ? '已驗證' : '未驗證'}</td>
                              <td className="px-3 py-2 text-gold-100">{d.verified_at ? formatDate(d.verified_at) : '-'}</td>
                              <td className="px-3 py-2 text-gold-100">{formatCurrency(d.bonus_amount || (Number(d.amount || 0) * (performance.bonusRate || 0)))}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralSystem;