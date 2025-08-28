import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from '../config/axios';

const JudicialTest = () => {
  const { user } = useAuth();
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus(null);
    try {
      const response = await axios.get('/api/judicial-lookup/test-connection');
      setConnectionStatus({
        success: true,
        message: response.data.message,
        categoriesCount: response.data.categoriesCount
      });
    } catch (error) {
      console.error('Connection test failed:', error);
      setConnectionStatus({
        success: false,
        message: error.response?.data?.message || '連線測試失敗',
        error: error.response?.data?.error || error.message
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const searchJudgments = async () => {
    if (!companyName.trim()) {
      setError('請輸入公司名稱');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await axios.post('/api/judicial-lookup/search-judgments', {
        companyName: companyName.trim(),
        options: { top: 10 }
      });

      setResult(response.data);
    } catch (error) {
      console.error('Search failed:', error);
      setError(error.response?.data?.message || '搜尋失敗');
    } finally {
      setLoading(false);
    }
  };

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

  if (!user || user.membership_level !== 1) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">權限不足：僅限管理員或核心成員使用此功能</div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">司法院判決書查詢測試</h1>
        <p className="text-gray-600">測試司法院開放資料平台 API 整合功能</p>
      </div>

      {/* Connection Test */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">API 連線測試</h2>
          <button
            onClick={testConnection}
            disabled={testingConnection}
            className={`px-4 py-2 rounded font-medium ${
              testingConnection
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {testingConnection ? '測試中...' : '測試連線'}
          </button>
        </div>

        {connectionStatus && (
          <div className={`p-4 rounded-lg ${
            connectionStatus.success 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-red-50 border border-red-200'
          }`}>
            <div className={`font-medium ${
              connectionStatus.success ? 'text-green-800' : 'text-red-800'
            }`}>
              {connectionStatus.message}
            </div>
            {connectionStatus.success && (
              <div className="text-green-700 text-sm mt-1">
                找到 {connectionStatus.categoriesCount} 個資料分類
              </div>
            )}
            {!connectionStatus.success && connectionStatus.error && (
              <div className="text-red-700 text-sm mt-1">
                錯誤詳情: {connectionStatus.error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search Form */}
      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">判決書搜尋</h2>
        
        <div className="flex space-x-4 mb-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              公司名稱
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="請輸入要查詢的公司名稱"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === 'Enter' && searchJudgments()}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={searchJudgments}
              disabled={loading}
              className={`px-6 py-2 rounded font-medium ${
                loading
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {loading ? '搜尋中...' : '搜尋判決書'}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <div className="text-red-800">{error}</div>
          </div>
        )}
      </div>

      {/* Search Results */}
      {result && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">搜尋結果</h2>
          
          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-600">公司名稱</p>
                <p className="text-lg font-semibold text-gray-900">{result.companyName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">判決書數量</p>
                <p className="text-lg font-semibold text-gray-900">{result.total} 件</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">搜尋狀態</p>
                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                  result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {result.success ? '成功' : '失敗'}
                </span>
              </div>
            </div>
          </div>

          {/* Risk Analysis */}
          {result.riskAnalysis && (
            <div className="border border-gray-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">風險分析</h3>
                <div className="flex items-center space-x-2">
                  {getRiskBadge(result.riskAnalysis.riskLevel)}
                  <span className="text-sm text-gray-500">
                    {result.riskAnalysis.riskScore}/100
                  </span>
                </div>
              </div>
              
              <p className="text-gray-700 mb-3">{result.riskAnalysis.summary}</p>
              
              {result.riskAnalysis.details && result.riskAnalysis.details.length > 0 && (
                <div>
                  <p className="font-medium text-gray-600 text-sm mb-2">風險細節:</p>
                  <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                    {result.riskAnalysis.details.map((detail, index) => (
                      <li key={index}>{detail}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {result.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="font-semibold text-red-900 mb-2">搜尋錯誤</h3>
              <p className="text-red-800">{result.error}</p>
            </div>
          )}

          {/* Raw Data (for debugging) */}
          <details className="mt-6">
            <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
              顯示原始資料 (除錯用)
            </summary>
            <pre className="mt-2 p-4 bg-gray-100 rounded text-xs overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default JudicialTest;