import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

// 添加橋樑設計的CSS樣式
const bridgeStyles = `
  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
    25% { transform: translateY(-10px) rotate(90deg); opacity: 1; }
    50% { transform: translateY(-20px) rotate(180deg); opacity: 0.8; }
    75% { transform: translateY(-10px) rotate(270deg); opacity: 1; }
  }

  .slider-yellow::-webkit-slider-thumb {
    appearance: none;
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: linear-gradient(45deg, #fbbf24, #f59e0b);
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 6px rgba(251, 191, 36, 0.4);
  }

  .slider-yellow::-moz-range-thumb {
    height: 20px;
    width: 20px;
    border-radius: 50%;
    background: linear-gradient(45deg, #fbbf24, #f59e0b);
    cursor: pointer;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 6px rgba(251, 191, 36, 0.4);
  }

  .bg-gradient-radial {
    background: radial-gradient(circle, var(--tw-gradient-stops));
  }
`;

// 注入樣式到頁面
if (typeof document !== 'undefined') {
  const styleElement = document.createElement('style');
  styleElement.textContent = bridgeStyles;
  document.head.appendChild(styleElement);
}

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

  // 橋樑設計相關狀態
  const [bridgeSettings, setBridgeSettings] = useState({
    particleIntensity: 100,
    lightingIntensity: 80,
    reflectionOpacity: 70,
    animationSpeed: 50,
    cameraAngle: 0
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

  // 渲染奢華金色橋樑設計
  const renderBridgeDesign = () => (
    <div className="space-y-6">
      {/* 橋樑預覽區域 */}
      <div className="bg-black rounded-lg shadow-2xl overflow-hidden relative" style={{ height: '600px' }}>
        {/* 背景裝飾 */}
        <div className="absolute inset-0 bg-gradient-radial from-yellow-900/20 via-black to-black"></div>
        
        {/* 金色粒子動畫 */}
        <div className="absolute inset-0 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-yellow-400 rounded-full opacity-70"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            ></div>
          ))}
        </div>

        {/* 主橋樑結構 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full max-w-4xl h-80">
            {/* 水面 */}
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-900 to-transparent opacity-60"></div>
            
            {/* 橋樑主體 */}
            <div className="absolute bottom-32 left-0 right-0 h-2 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 shadow-lg shadow-yellow-400/50">
              {/* 橋樑光暈 */}
              <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 blur-sm opacity-80"></div>
            </div>

            {/* 主塔 */}
            <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 w-3 h-48 bg-gradient-to-t from-yellow-600 to-yellow-400 shadow-lg shadow-yellow-400/50">
              {/* 塔頂裝飾 */}
              <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-yellow-300 rounded-full shadow-lg shadow-yellow-300/70"></div>
            </div>

            {/* 斜拉索 */}
            {[...Array(12)].map((_, i) => {
              const isLeft = i < 6;
              const index = isLeft ? i : i - 6;
              const angle = isLeft ? -15 - index * 8 : 15 + index * 8;
              const length = 80 + index * 20;
              
              return (
                <div
                  key={i}
                  className="absolute bottom-32 left-1/2 origin-bottom bg-gradient-to-t from-yellow-500 to-yellow-300 opacity-90"
                  style={{
                    width: '1px',
                    height: `${length}px`,
                    transform: `translateX(-50%) rotate(${angle}deg)`,
                    boxShadow: '0 0 4px rgba(255, 215, 0, 0.6)'
                  }}
                ></div>
              );
            })}

            {/* 橋樑倒影 */}
            <div className="absolute bottom-0 left-0 right-0 h-32 overflow-hidden">
              <div className="absolute bottom-0 left-0 right-0 h-2 bg-gradient-to-r from-yellow-600/40 via-yellow-400/40 to-yellow-600/40 transform scale-y-[-1] blur-sm"></div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3 h-24 bg-gradient-to-b from-yellow-600/40 to-yellow-400/40 transform scale-y-[-1] blur-sm"></div>
            </div>
          </div>
        </div>

        {/* 標題覆蓋層 */}
        <div className="absolute top-6 left-6 right-6">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 mb-2">
            奢華金色斜拉橋
          </h2>
          <p className="text-yellow-200/80 text-sm">
            A luxurious golden cable-stayed bridge with premium metallic texture and cinematic HDR lighting
          </p>
        </div>

        {/* 攝影機控制 */}
        <div className="absolute bottom-6 right-6 flex space-x-2">
          <button
            onClick={() => setBridgeSettings(prev => ({ ...prev, cameraAngle: prev.cameraAngle - 15 }))}
            className="px-3 py-2 bg-yellow-600/80 text-white rounded-lg hover:bg-yellow-500/80 transition-colors text-sm"
          >
            ← 旋轉
          </button>
          <button
            onClick={() => setBridgeSettings(prev => ({ ...prev, cameraAngle: prev.cameraAngle + 15 }))}
            className="px-3 py-2 bg-yellow-600/80 text-white rounded-lg hover:bg-yellow-500/80 transition-colors text-sm"
          >
            旋轉 →
          </button>
        </div>
      </div>

      {/* 控制面板 */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold text-gray-800">橋樑設計控制</h3>
          {userRole !== 'admin' && (
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              僅限查看
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* 粒子強度 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              粒子強度: {bridgeSettings.particleIntensity}%
            </label>
            <input
              type="range"
              min="0"
              max="200"
              value={bridgeSettings.particleIntensity}
              onChange={(e) => setBridgeSettings(prev => ({ ...prev, particleIntensity: parseInt(e.target.value) }))}
              disabled={userRole !== 'admin'}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-yellow disabled:opacity-50"
            />
          </div>

          {/* 照明強度 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              HDR 照明: {bridgeSettings.lightingIntensity}%
            </label>
            <input
              type="range"
              min="0"
              max="150"
              value={bridgeSettings.lightingIntensity}
              onChange={(e) => setBridgeSettings(prev => ({ ...prev, lightingIntensity: parseInt(e.target.value) }))}
              disabled={userRole !== 'admin'}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-yellow disabled:opacity-50"
            />
          </div>

          {/* 倒影透明度 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              水面倒影: {bridgeSettings.reflectionOpacity}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={bridgeSettings.reflectionOpacity}
              onChange={(e) => setBridgeSettings(prev => ({ ...prev, reflectionOpacity: parseInt(e.target.value) }))}
              disabled={userRole !== 'admin'}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-yellow disabled:opacity-50"
            />
          </div>

          {/* 動畫速度 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              動畫速度: {bridgeSettings.animationSpeed}%
            </label>
            <input
              type="range"
              min="10"
              max="200"
              value={bridgeSettings.animationSpeed}
              onChange={(e) => setBridgeSettings(prev => ({ ...prev, animationSpeed: parseInt(e.target.value) }))}
              disabled={userRole !== 'admin'}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-yellow disabled:opacity-50"
            />
          </div>

          {/* 攝影機角度 */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">
              攝影機角度: {bridgeSettings.cameraAngle}°
            </label>
            <input
              type="range"
              min="-180"
              max="180"
              value={bridgeSettings.cameraAngle}
              onChange={(e) => setBridgeSettings(prev => ({ ...prev, cameraAngle: parseInt(e.target.value) }))}
              disabled={userRole !== 'admin'}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-yellow disabled:opacity-50"
            />
          </div>

          {/* 重置按鈕 */}
          <div className="flex items-end">
            <button
              onClick={() => setBridgeSettings({
                particleIntensity: 100,
                lightingIntensity: 80,
                reflectionOpacity: 70,
                animationSpeed: 50,
                cameraAngle: 0
              })}
              disabled={userRole !== 'admin'}
              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              重置設定
            </button>
          </div>
        </div>

        {/* 設計說明 */}
        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
          <h4 className="font-semibold text-yellow-800 mb-2">設計特色</h4>
          <ul className="text-sm text-yellow-700 space-y-1">
            <li>• 完美對稱的斜拉橋設計，展現建築美學</li>
            <li>• 高級金屬質感，營造奢華氛圍</li>
            <li>• 精細金色粒子效果，增添動態美感</li>
            <li>• 平靜水面倒影，創造視覺深度</li>
            <li>• 電影級 HDR 照明，突出細節層次</li>
            <li>• 黑色背景襯托，彰顯威望與精緻</li>
          </ul>
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
            <button
              onClick={() => setActiveTab('bridge')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'bridge'
                  ? 'border-yellow-500 text-yellow-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              橋樑設計
            </button>
          </nav>
        </div>

        {/* 標籤內容 */}
        <div>
          {activeTab === 'oath' && renderOathEditor()}
          {activeTab === 'settings' && renderCeremonySettings()}
          {activeTab === 'statistics' && renderStatistics()}
          {activeTab === 'bridge' && renderBridgeDesign()}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;