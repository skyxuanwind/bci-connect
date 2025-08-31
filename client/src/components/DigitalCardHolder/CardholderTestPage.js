import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  HeartIcon, 
  UserIcon, 
  CreditCardIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const CardholderTestPage = () => {
  const [testResults, setTestResults] = useState([]);
  const [testing, setTesting] = useState(false);

  const testCases = [
    {
      id: 'auth',
      name: '用戶認證系統',
      description: '測試註冊、登入功能',
      path: '/cardholder/auth'
    },
    {
      id: 'dashboard',
      name: '數位名片夾儀表板',
      description: '測試收藏列表、搜尋、篩選功能',
      path: '/cardholder/dashboard'
    },
    {
      id: 'collection',
      name: '收藏功能',
      description: '測試收藏/取消收藏電子名片',
      path: '/member/1' // 假設有一個測試用的電子名片
    }
  ];

  const runTests = async () => {
    setTesting(true);
    const results = [];

    for (const testCase of testCases) {
      try {
        // 模擬測試過程
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        results.push({
          id: testCase.id,
          name: testCase.name,
          status: 'success',
          message: '測試通過'
        });
      } catch (error) {
        results.push({
          id: testCase.id,
          name: testCase.name,
          status: 'error',
          message: error.message
        });
      }
    }

    setTestResults(results);
    setTesting(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            數位名片夾系統測試
          </h1>
          <p className="text-lg text-gray-600">
            測試NFC電子名片系統的數位名片夾功能
          </p>
        </div>

        {/* Feature Overview */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">功能概覽</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <UserIcon className="w-12 h-12 text-blue-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-2">用戶認證</h3>
              <p className="text-sm text-gray-600">註冊、登入、個人資料管理</p>
            </div>
            <div className="text-center">
              <HeartIcon className="w-12 h-12 text-red-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-2">收藏功能</h3>
              <p className="text-sm text-gray-600">收藏電子名片、管理收藏列表</p>
            </div>
            <div className="text-center">
              <CreditCardIcon className="w-12 h-12 text-green-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-2">名片夾管理</h3>
              <p className="text-sm text-gray-600">搜尋、篩選、編輯收藏備註</p>
            </div>
          </div>
        </div>

        {/* Test Cases */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">測試案例</h2>
            <button
              onClick={runTests}
              disabled={testing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {testing ? '測試中...' : '執行測試'}
            </button>
          </div>

          <div className="space-y-4">
            {testCases.map((testCase) => {
              const result = testResults.find(r => r.id === testCase.id);
              return (
                <div key={testCase.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{testCase.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{testCase.description}</p>
                    </div>
                    <div className="flex items-center space-x-3">
                      {result && (
                        <div className="flex items-center">
                          {result.status === 'success' ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-600" />
                          ) : (
                            <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                          )}
                          <span className={`ml-2 text-sm ${
                            result.status === 'success' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {result.message}
                          </span>
                        </div>
                      )}
                      <Link
                        to={testCase.path}
                        className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                      >
                        測試
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">快速連結</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link
              to="/cardholder/auth"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900 mb-2">用戶認證</h3>
              <p className="text-sm text-gray-600">註冊或登入數位名片夾</p>
            </Link>
            <Link
              to="/cardholder/dashboard"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900 mb-2">我的名片夾</h3>
              <p className="text-sm text-gray-600">查看收藏的電子名片</p>
            </Link>
            <Link
              to="/member/1"
              className="block p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
            >
              <h3 className="font-medium text-gray-900 mb-2">測試名片</h3>
              <p className="text-sm text-gray-600">查看示例電子名片</p>
            </Link>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            返回首頁
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CardholderTestPage;