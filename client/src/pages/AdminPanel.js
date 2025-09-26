import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

const AdminPanel = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('oath');
  const [isLoading, setIsLoading] = useState(false);
  const [userRole, setUserRole] = useState(null);
  
  // 誓詞編輯相關狀態
  const [oathText, setOathText] = useState('');
  const [originalOathText, setOriginalOathText] = useState('');
  const [isOathModified, setIsOathModified] = useState(false);
  
  // 儀式設置相關狀態
  const [ceremonySettings, setCeremonySettings] = useState({
    enableSound: true,
    enableParticles: true,
    enableGuide: true,
    autoProgress: false,
    transitionDuration: 500
  });

  // 檢查用戶權限
  useEffect(() => {
    checkUserPermissions();
    if (activeTab === 'oath') {
      fetchOathText();
    } else if (activeTab === 'settings') {
      fetchCeremonySettings();
    }
  }, [activeTab]);

  // 檢查用戶權限
  const checkUserPermissions = async () => {
    try {
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUserRole(userData.membershipLevel);
        
        if (userData.membershipLevel !== 'admin' && userData.membershipLevel !== 'core') {
          toast.error('您沒有權限訪問管理員面板');
          navigate('/dashboard');
          return;
        }
      } else {
        toast.error('無法驗證用戶權限');
        navigate('/login');
      }
    } catch (error) {
      console.error('權限檢查失敗:', error);
      toast.error('權限檢查失敗');
      navigate('/login');
    }
  };

  // 獲取誓詞內容
  const fetchOathText = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/ceremony/oath', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setOathText(data.oath);
        setOriginalOathText(data.oath);
        setIsOathModified(false);
      } else {
        toast.error('獲取誓詞失敗');
      }
    } catch (error) {
      console.error('獲取誓詞失敗:', error);
      toast.error('獲取誓詞失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 保存誓詞
  const saveOathText = async () => {
    if (userRole !== 'admin') {
      toast.error('只有管理員可以編輯誓詞');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/ceremony/oath', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ oath: oathText })
      });

      if (response.ok) {
        setOriginalOathText(oathText);
        setIsOathModified(false);
        toast.success('誓詞更新成功');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || '更新誓詞失敗');
      }
    } catch (error) {
      console.error('更新誓詞失敗:', error);
      toast.error('更新誓詞失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 重置誓詞
  const resetOathText = () => {
    setOathText(originalOathText);
    setIsOathModified(false);
  };

  // 處理誓詞文本變化
  const handleOathTextChange = (e) => {
    const newText = e.target.value;
    setOathText(newText);
    setIsOathModified(newText !== originalOathText);
  };

  // 獲取儀式設置
  const fetchCeremonySettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/ceremony/settings', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCeremonySettings(data.settings);
      } else {
        toast.error('獲取儀式設置失敗');
      }
    } catch (error) {
      console.error('獲取儀式設置失敗:', error);
      toast.error('獲取儀式設置失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 保存儀式設置
  const saveCeremonySettings = async () => {
    if (userRole !== 'admin') {
      toast.error('只有管理員可以修改儀式設置');
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/ceremony/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ settings: ceremonySettings })
      });

      if (response.ok) {
        toast.success('儀式設置更新成功');
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || '更新儀式設置失敗');
      }
    } catch (error) {
      console.error('更新儀式設置失敗:', error);
      toast.error('更新儀式設置失敗');
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染誓詞編輯器
  const renderOathEditor = () => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">誓詞編輯</h2>
        {userRole !== 'admin' && (
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            僅限查看
          </span>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            會員誓詞內容
          </label>
          <textarea
            value={oathText}
            onChange={handleOathTextChange}
            disabled={userRole !== 'admin' || isLoading}
            className="w-full h-64 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent resize-none disabled:bg-gray-50 disabled:text-gray-500"
            placeholder="請輸入會員誓詞內容..."
          />
          <p className="text-sm text-gray-500 mt-2">
            字數: {oathText.length} | 建議保持在 200-500 字之間
          </p>
        </div>

        {userRole === 'admin' && (
          <div className="flex space-x-4">
            <button
              onClick={saveOathText}
              disabled={!isOathModified || isLoading}
              className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '保存中...' : '保存誓詞'}
            </button>
            <button
              onClick={resetOathText}
              disabled={!isOathModified || isLoading}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              重置
            </button>
          </div>
        )}

        {isOathModified && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              ⚠️ 您有未保存的更改。請記得保存您的修改。
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // 渲染儀式設置
  const renderCeremonySettings = () => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">儀式設置</h2>
        {userRole !== 'admin' && (
          <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
            僅限查看
          </span>
        )}
      </div>
      
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">視覺效果</h3>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                啟用音效
              </label>
              <input
                type="checkbox"
                checked={ceremonySettings.enableSound}
                onChange={(e) => setCeremonySettings(prev => ({
                  ...prev,
                  enableSound: e.target.checked
                }))}
                disabled={userRole !== 'admin'}
                className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500 disabled:opacity-50"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                啟用粒子效果
              </label>
              <input
                type="checkbox"
                checked={ceremonySettings.enableParticles}
                onChange={(e) => setCeremonySettings(prev => ({
                  ...prev,
                  enableParticles: e.target.checked
                }))}
                disabled={userRole !== 'admin'}
                className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500 disabled:opacity-50"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                顯示用戶引導
              </label>
              <input
                type="checkbox"
                checked={ceremonySettings.enableGuide}
                onChange={(e) => setCeremonySettings(prev => ({
                  ...prev,
                  enableGuide: e.target.checked
                }))}
                disabled={userRole !== 'admin'}
                className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500 disabled:opacity-50"
              />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-700">流程控制</h3>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-600">
                自動進度推進
              </label>
              <input
                type="checkbox"
                checked={ceremonySettings.autoProgress}
                onChange={(e) => setCeremonySettings(prev => ({
                  ...prev,
                  autoProgress: e.target.checked
                }))}
                disabled={userRole !== 'admin'}
                className="w-4 h-4 text-yellow-600 bg-gray-100 border-gray-300 rounded focus:ring-yellow-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                過渡動畫時長 (毫秒)
              </label>
              <input
                type="number"
                min="100"
                max="2000"
                step="100"
                value={ceremonySettings.transitionDuration}
                onChange={(e) => setCeremonySettings(prev => ({
                  ...prev,
                  transitionDuration: parseInt(e.target.value)
                }))}
                disabled={userRole !== 'admin'}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
              />
            </div>
          </div>
        </div>

        {userRole === 'admin' && (
          <div className="pt-4 border-t border-gray-200">
            <button
              onClick={saveCeremonySettings}
              disabled={isLoading}
              className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? '保存中...' : '保存設置'}
            </button>
          </div>
        )}

        {userRole !== 'admin' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-yellow-800 text-sm">
              ⚠️ 只有管理員可以修改儀式設置。
            </p>
          </div>
        )}
      </div>
    </div>
  );

  // 渲染統計信息
  const renderStatistics = () => (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">儀式統計</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">總儀式次數</h3>
          <p className="text-3xl font-bold">--</p>
          <p className="text-sm opacity-80">本月新增: --</p>
        </div>

        <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">新會員數量</h3>
          <p className="text-3xl font-bold">--</p>
          <p className="text-sm opacity-80">本週新增: --</p>
        </div>

        <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-2">平均儀式時長</h3>
          <p className="text-3xl font-bold">-- 分鐘</p>
          <p className="text-sm opacity-80">較上月: --</p>
        </div>
      </div>
    </div>
  );

  if (!userRole) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-yellow-400 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">正在驗證權限...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導航 */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-gray-600 hover:text-gray-800 transition-colors"
              >
                ← 返回儀表板
              </button>
              <h1 className="text-2xl font-bold text-gray-800">管理員控制面板</h1>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">權限:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                userRole === 'admin' 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {userRole === 'admin' ? '管理員' : '核心會員'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 主要內容 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 標籤導航 */}
        <div className="mb-8">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('oath')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'oath'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              誓詞編輯
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'settings'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              儀式設置
            </button>
            <button
              onClick={() => setActiveTab('statistics')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'statistics'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              統計信息
            </button>
          </nav>
        </div>

        {/* 標籤內容 */}
        <div>
          {activeTab === 'oath' && renderOathEditor()}
          {activeTab === 'settings' && renderCeremonySettings()}
          {activeTab === 'statistics' && renderStatistics()}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;