import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';
import { useNavigate, Link } from 'react-router-dom';
import axios from '../config/axios';
import '../styles/premium-card.css';
import '../styles/premium-effects.css';
import CeremonyVideoManagement from '../components/admin/CeremonyVideoManagement';
import {
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftEllipsisIcon,
  ClipboardDocumentCheckIcon,
  UsersIcon,
  CurrencyDollarIcon,
  QrCodeIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';

// 添加橋樑設計的CSS樣式
const bridgeStyles = `
  @keyframes luxuryFloat {
    0%, 100% { 
      transform: translateY(0px) translateX(0px) scale(1); 
      opacity: 0.6; 
    }
    25% { 
      transform: translateY(-15px) translateX(5px) scale(1.1); 
      opacity: 0.8; 
    }
    50% { 
      transform: translateY(-25px) translateX(-3px) scale(1.2); 
      opacity: 1; 
    }
    75% { 
      transform: translateY(-10px) translateX(8px) scale(1.1); 
      opacity: 0.9; 
    }
  }
  
  @keyframes sparkle {
    0%, 100% { 
      transform: scale(0.8) rotate(0deg); 
      opacity: 0.5; 
    }
    50% { 
      transform: scale(1.3) rotate(180deg); 
      opacity: 1; 
    }
  }
  
  @keyframes twinkle {
    0%, 100% { 
      opacity: 0.3; 
      transform: scale(0.5); 
    }
    50% { 
      opacity: 1; 
      transform: scale(1.5); 
    }
  }
  
  @keyframes wave {
    0%, 100% { 
      transform: translateX(0px) scaleX(1); 
      opacity: 0.2; 
    }
    50% { 
      transform: translateX(10px) scaleX(1.1); 
      opacity: 0.4; 
    }
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
    25% { transform: translateY(-10px) rotate(90deg); opacity: 1; }
    50% { transform: translateY(-20px) rotate(180deg); opacity: 0.8; }
    75% { transform: translateY(-10px) rotate(270deg); opacity: 1; }
  }

  .slider-yellow::-webkit-slider-thumb {
    appearance: none;
    height: 22px;
    width: 22px;
    border-radius: 50%;
    background: linear-gradient(45deg, #fbbf24, #f59e0b, #d97706);
    cursor: pointer;
    border: 2px solid #fbbf24;
    box-shadow: 0 0 15px rgba(251, 191, 36, 0.7), 0 0 30px rgba(251, 191, 36, 0.3);
  }

  .slider-yellow::-moz-range-thumb {
    height: 22px;
    width: 22px;
    border-radius: 50%;
    background: linear-gradient(45deg, #fbbf24, #f59e0b, #d97706);
    cursor: pointer;
    border: 2px solid #fbbf24;
    box-shadow: 0 0 15px rgba(251, 191, 36, 0.7), 0 0 30px rgba(251, 191, 36, 0.3);
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
  const [folding, setFolding] = useState(false);
  const [activeCard, setActiveCard] = useState(null);
  const [transitionMode, setTransitionMode] = useState(null); // 'fade' | 'flip'

  const handleCardClick = (e, id) => {
    e.preventDefault();
    setActiveCard(id);
    setFolding(true);
    const cardEl = e.currentTarget;
    const rect = cardEl.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    cardEl.style.setProperty('--pulse-x', `${x}%`);
    cardEl.style.setProperty('--pulse-y', `${y}%`);
    cardEl.classList.add('is-clicked');
    setTimeout(() => { cardEl.classList.remove('is-clicked'); }, 520);
    // 當前卡片展開；不立即導向路由
  };

  const handleGoToRoute = (e, path, mode = 'fade') => {
    e.preventDefault();
    e.stopPropagation();
    setTransitionMode(mode);
    setTimeout(() => {
      navigate(path);
      setFolding(false);
      setActiveCard(null);
      setTransitionMode(null);
    }, 300);
  };
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
      const { data } = await axios.get('/api/auth/me');
      const membershipLevel = data?.user?.membershipLevel;
      const isAdminUser = data?.user?.isAdminUser === true;
      
      // 設定用戶角色：只有真正的管理員才設為 'admin'，其他設為 'core'
      if (isAdminUser) {
        setUserRole('admin');
      } else if (membershipLevel === 1) {
        setUserRole('core');
      } else {
        setUserRole('member');
      }

      // 允許真正的 Admin（幹部）和核心會員（Level 1）進入管理員面板
      // 核心會員需要訪問儀式相關功能
      if (!isAdminUser && membershipLevel !== 1) {
        toast.error('您沒有權限訪問管理員面板');
        navigate('/dashboard');
        return;
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
      <div className="bg-black rounded-lg shadow-2xl overflow-hidden relative" style={{ height: '700px' }}>
        {/* 深度背景層 */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-black to-gray-800"></div>
          <div className="absolute inset-0 bg-gradient-radial from-yellow-900/10 via-transparent to-black/50"></div>
        </div>
        
        {/* 環境光效 */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-400/5 rounded-full blur-3xl"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-yellow-300/5 rounded-full blur-3xl"></div>
        </div>

        {/* 高級金色粒子系統 */}
        <div className="absolute inset-0 overflow-hidden">
          {/* 大型光點 */}
          {[...Array(15)].map((_, i) => (
            <div
              key={`large-${i}`}
              className="absolute bg-yellow-300 rounded-full opacity-60"
              style={{
                width: `${2 + Math.random() * 3}px`,
                height: `${2 + Math.random() * 3}px`,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `luxuryFloat ${4 + Math.random() * 6}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 3}s`,
                boxShadow: '0 0 10px rgba(255, 215, 0, 0.8)'
              }}
            ></div>
          ))}
          
          {/* 中型粒子 */}
          {[...Array(30)].map((_, i) => (
            <div
              key={`medium-${i}`}
              className="absolute bg-yellow-400 rounded-full opacity-50"
              style={{
                width: '1.5px',
                height: '1.5px',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `sparkle ${3 + Math.random() * 4}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            ></div>
          ))}
          
          {/* 微型閃爍粒子 */}
          {[...Array(60)].map((_, i) => (
            <div
              key={`small-${i}`}
              className="absolute bg-yellow-200 rounded-full opacity-30"
              style={{
                width: '0.5px',
                height: '0.5px',
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 1.5}s`
              }}
            ></div>
          ))}
        </div>

        {/* 主橋樑結構 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-full max-w-5xl h-96" style={{ transform: `perspective(1000px) rotateY(${bridgeSettings.cameraAngle}deg)` }}>
            
            {/* 水面和環境 */}
            <div className="absolute bottom-0 left-0 right-0 h-40">
              {/* 水面基層 */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-gray-800 via-gray-700/50 to-transparent"></div>
              {/* 水面波紋 */}
              <div className="absolute bottom-0 left-0 right-0 h-32 opacity-30">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-yellow-400/20 to-transparent"
                    style={{
                      bottom: `${i * 4}px`,
                      animation: `wave ${3 + i * 0.5}s ease-in-out infinite`,
                      animationDelay: `${i * 0.2}s`
                    }}
                  ></div>
                ))}
              </div>
            </div>
            
            {/* 橋樑主體結構 */}
            <div className="absolute bottom-40 left-0 right-0">
              {/* 主橋面 */}
              <div className="relative h-4 bg-gradient-to-r from-yellow-700 via-yellow-500 to-yellow-700 shadow-2xl">
                {/* 金屬質感層 */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600 opacity-90"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-300/50 via-transparent to-yellow-800/30"></div>
                
                {/* 橋面細節 */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-300 via-yellow-200 to-yellow-300 opacity-80"></div>
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-yellow-800 via-yellow-700 to-yellow-800 opacity-60"></div>
                
                {/* 橋面光暈 */}
                <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400/30 via-yellow-300/50 to-yellow-400/30 blur-md"></div>
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400/20 via-yellow-300/30 to-yellow-400/20 blur-sm"></div>
              </div>

              {/* 橋墩支撐結構 */}
              <div className="absolute -bottom-8 left-1/4 w-2 h-8 bg-gradient-to-t from-yellow-700 to-yellow-500 shadow-lg"></div>
              <div className="absolute -bottom-8 right-1/4 w-2 h-8 bg-gradient-to-t from-yellow-700 to-yellow-500 shadow-lg"></div>
            </div>

            {/* 主塔結構 */}
            <div className="absolute bottom-40 left-1/2 transform -translate-x-1/2">
              {/* 主塔基座 */}
              <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 w-8 h-12 bg-gradient-to-t from-yellow-800 to-yellow-600 shadow-xl"></div>
              
              {/* 主塔身 */}
              <div className="relative w-4 h-56 bg-gradient-to-t from-yellow-700 via-yellow-500 to-yellow-400 shadow-2xl">
                {/* 塔身金屬質感 */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-600/80 via-yellow-400/90 to-yellow-600/80"></div>
                <div className="absolute inset-0 bg-gradient-to-b from-yellow-300/40 via-transparent to-yellow-800/20"></div>
                
                {/* 塔身細節線條 */}
                <div className="absolute top-1/4 left-0 right-0 h-px bg-yellow-300/60"></div>
                <div className="absolute top-1/2 left-0 right-0 h-px bg-yellow-300/60"></div>
                <div className="absolute top-3/4 left-0 right-0 h-px bg-yellow-300/60"></div>
                
                {/* 塔身光暈 */}
                <div className="absolute -inset-2 bg-yellow-400/20 blur-lg"></div>
              </div>

              {/* 塔頂結構 */}
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <div className="w-8 h-8 bg-gradient-radial from-yellow-300 to-yellow-500 rounded-full shadow-2xl">
                  <div className="absolute inset-1 bg-gradient-radial from-yellow-200 to-yellow-400 rounded-full"></div>
                  <div className="absolute inset-2 bg-yellow-100 rounded-full opacity-80"></div>
                </div>
                {/* 塔頂光暈 */}
                <div className="absolute -inset-4 bg-yellow-300/40 rounded-full blur-xl"></div>
              </div>
            </div>

            {/* 精緻斜拉索系統 */}
            {[...Array(16)].map((_, i) => {
              const isLeft = i < 8;
              const index = isLeft ? i : i - 8;
              const angle = isLeft ? -12 - index * 6 : 12 + index * 6;
              const length = 60 + index * 15;
              const thickness = Math.max(0.5, 2 - index * 0.2);
              
              return (
                <div key={i} className="absolute bottom-40 left-1/2 origin-bottom">
                  {/* 主拉索 */}
                  <div
                    className="absolute bg-gradient-to-t from-yellow-600 via-yellow-400 to-yellow-300 opacity-95"
                    style={{
                      width: `${thickness}px`,
                      height: `${length}px`,
                      transform: `translateX(-50%) rotate(${angle}deg)`,
                      boxShadow: `0 0 ${thickness * 2}px rgba(255, 215, 0, 0.8), 0 0 ${thickness * 4}px rgba(255, 215, 0, 0.4)`
                    }}
                  ></div>
                  
                  {/* 拉索光效 */}
                  <div
                    className="absolute bg-gradient-to-t from-yellow-400/60 to-yellow-200/80 opacity-70 blur-sm"
                    style={{
                      width: `${thickness + 1}px`,
                      height: `${length}px`,
                      transform: `translateX(-50%) rotate(${angle}deg)`
                    }}
                  ></div>
                </div>
              );
            })}

            {/* 橋樑完美倒影 */}
            <div className="absolute bottom-0 left-0 right-0 h-40 overflow-hidden">
              {/* 主橋面倒影 */}
              <div className="absolute bottom-32 left-0 right-0 h-4 bg-gradient-to-r from-yellow-700/30 via-yellow-500/40 to-yellow-700/30 transform scale-y-[-1] blur-sm opacity-70"></div>
              
              {/* 主塔倒影 */}
              <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 w-4 h-28 bg-gradient-to-b from-yellow-700/30 to-yellow-400/40 transform scale-y-[-1] blur-sm opacity-60"></div>
              
              {/* 拉索倒影 */}
              {[...Array(8)].map((_, i) => {
                const angle = i < 4 ? -12 - i * 6 : 12 + (i - 4) * 6;
                const length = 30 + i * 8;
                
                return (
                  <div
                    key={`reflection-${i}`}
                    className="absolute bottom-32 left-1/2 origin-top bg-gradient-to-b from-yellow-600/20 to-yellow-300/30 opacity-50 blur-sm"
                    style={{
                      width: '1px',
                      height: `${length}px`,
                      transform: `translateX(-50%) rotate(${-angle}deg)`
                    }}
                  ></div>
                );
              })}
              
              {/* 倒影波紋效果 */}
              <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/20 via-transparent to-transparent"></div>
            </div>
          </div>
        </div>

        {/* 標題覆蓋層 */}
        <div className="absolute top-6 left-6 right-6">
          <h2 className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-400 mb-2 drop-shadow-lg">
            奢華金色斜拉橋
          </h2>
          <p className="text-yellow-200/90 text-sm font-medium">
            A luxurious golden cable-stayed bridge with premium metallic texture and cinematic HDR lighting
          </p>
        </div>

        {/* 攝影機控制 */}
        <div className="absolute bottom-6 right-6 flex space-x-2">
          <button
            onClick={() => setBridgeSettings(prev => ({ ...prev, cameraAngle: prev.cameraAngle - 15 }))}
            className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white rounded-lg hover:from-yellow-500 hover:to-yellow-400 transition-all duration-300 text-sm font-medium shadow-lg"
          >
            ← 旋轉
          </button>
          <button
            onClick={() => setBridgeSettings(prev => ({ ...prev, cameraAngle: prev.cameraAngle + 15 }))}
            className="px-4 py-2 bg-gradient-to-r from-yellow-600 to-yellow-500 text-white rounded-lg hover:from-yellow-500 hover:to-yellow-400 transition-all duration-300 text-sm font-medium shadow-lg"
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
        {transitionMode && (
          <div className={`route-transition-overlay ${transitionMode === 'flip' ? 'flip' : 'fade'}`} />
        )}
        {/* 核心功能 - 與手機App版一致的質感卡片風格 */}
        {userRole !== 'member' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-yellow-400 mb-4">核心功能</h2>
            <div className="grid grid-cols-1 gap-4">
              {/* 商訪申請表 */}
              <Link
                to="/prospect-application"
                onClick={(e) => handleCardClick(e, 'prospect')}
                className={`group premium-card rounded-2xl border border-gold-600 p-4 bg-primary-800/50 hover:bg-primary-700/60 transition-all duration-300 ${activeCard === 'prospect' ? 'expanded' : ''} ${folding && activeCard !== 'prospect' ? 'folded' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <ClipboardDocumentListIcon className="h-7 w-7 text-yellow-300" />
                  <div>
                    <div className="text-yellow-200 font-medium card-title">商訪申請表</div>
                    <div className="text-gray-400 text-sm">填寫與提交商訪申請</div>
                  </div>
                </div>
                <div className="card-details ${activeCard === 'prospect' ? 'open' : ''}">
                  <p className="mt-3 text-sm text-gray-300">在此快速填寫商訪申請並提交。完成後可於商訪專區查看申請進度與結果。</p>
                  <div className="mt-4">
                    <Link
                      to="/prospect-application"
                      onClick={(e) => handleGoToRoute(e, '/prospect-application', 'fade')}
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-400 transition"
                    >
                      前往商訪申請
                    </Link>
                  </div>
                </div>
                <span className="absolute top-3 right-3 text-xs px-2 py-1 rounded-full bg-yellow-700/30 text-yellow-300">核心</span>
                <div className="light-scan" aria-hidden />
                <div className="pulse-glow" aria-hidden />
                <span className="particle" style={{left:'12%', top:'20%'}} />
                <span className="particle" style={{left:'78%', top:'42%'}} />
                <span className="particle" style={{left:'36%', top:'68%'}} />
              </Link>

              {/* 黑名單專區 */}
              <Link
                to="/blacklist"
                onClick={(e) => handleCardClick(e, 'blacklist')}
                className={`group premium-card rounded-2xl border border-gold-600 p-4 bg-primary-800/50 hover:bg-primary-700/60 transition-all duration-300 ${activeCard === 'blacklist' ? 'expanded' : ''} ${folding && activeCard !== 'blacklist' ? 'folded' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <ExclamationTriangleIcon className="h-7 w-7 text-yellow-300" />
                  <div>
                    <div className="text-yellow-200 font-medium card-title">黑名單專區</div>
                    <div className="text-gray-400 text-sm">維護與管理訪黑名單</div>
                  </div>
                </div>
                <div className={`card-details ${activeCard === 'blacklist' ? 'open' : ''}`}>
                  <p className="mt-3 text-sm text-gray-300">集中管理黑名單資料，支援新增、查詢、維護，並提供標準作業流程指南。</p>
                  <div className="mt-4">
                    <Link
                      to="/blacklist"
                      onClick={(e) => handleGoToRoute(e, '/blacklist', 'fade')}
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-400 transition"
                    >
                      前往黑名單專區
                    </Link>
                  </div>
                </div>
                <span className="absolute top-3 right-3 text-xs px-2 py-1 rounded-full bg-yellow-700/30 text-yellow-300">核心</span>
                <div className="light-scan" aria-hidden />
                <div className="pulse-glow" aria-hidden />
                <span className="particle" style={{left:'18%', top:'26%'}} />
                <span className="particle" style={{left:'70%', top:'38%'}} />
                <span className="particle" style={{left:'44%', top:'64%'}} />
              </Link>

              {/* 申訴信箱 */}
              <Link
                to="/complaints"
                onClick={(e) => handleCardClick(e, 'complaints')}
                className={`group premium-card rounded-2xl border border-gold-600 p-4 bg-primary-800/50 hover:bg-primary-700/60 transition-all duration-300 ${activeCard === 'complaints' ? 'expanded' : ''} ${folding && activeCard !== 'complaints' ? 'folded' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <ChatBubbleLeftEllipsisIcon className="h-7 w-7 text-yellow-300" />
                  <div>
                    <div className="text-yellow-200 font-medium card-title">申訴信箱</div>
                    <div className="text-gray-400 text-sm">處理成員申訴</div>
                  </div>
                </div>
                <div className={`card-details ${activeCard === 'complaints' ? 'open' : ''}`}>
                  <p className="mt-3 text-sm text-gray-300">統一接收與追蹤申訴案件，提供標準化處理流程與溝通紀錄。</p>
                  <div className="mt-4">
                    <Link
                      to="/complaints"
                      onClick={(e) => handleGoToRoute(e, '/complaints', 'fade')}
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-400 transition"
                    >
                      前往申訴信箱
                    </Link>
                  </div>
                </div>
                <span className="absolute top-3 right-3 text-xs px-2 py-1 rounded-full bg-yellow-700/30 text-yellow-300">核心</span>
                <div className="light-scan" aria-hidden />
                <div className="pulse-glow" aria-hidden />
                <span className="particle" style={{left:'22%', top:'30%'}} />
                <span className="particle" style={{left:'66%', top:'32%'}} />
                <span className="particle" style={{left:'50%', top:'70%'}} />
              </Link>

              {/* 出席管理 */}
              <Link
                to="/attendance-management"
                onClick={(e) => handleCardClick(e, 'attendance')}
                className={`group premium-card rounded-2xl border border-gold-600 p-4 bg-primary-800/50 hover:bg-primary-700/60 transition-all duration-300 ${activeCard === 'attendance' ? 'expanded' : ''} ${folding && activeCard !== 'attendance' ? 'folded' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <ClipboardDocumentCheckIcon className="h-7 w-7 text-yellow-300" />
                  <div>
                    <div className="text-yellow-200 font-medium card-title">出席管理</div>
                    <div className="text-gray-400 text-sm">管理與導出出席資料</div>
                  </div>
                </div>
                <div className={`card-details ${activeCard === 'attendance' ? 'open' : ''}`}>
                  <p className="mt-3 text-sm text-gray-300">管理活動出席紀錄，支援匯出報表與連動現場報到掃描系統。</p>
                  <div className="mt-4">
                    <Link
                      to="/attendance-management"
                      onClick={(e) => handleGoToRoute(e, '/attendance-management', 'fade')}
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-400 transition"
                    >
                      前往出席管理
                    </Link>
                  </div>
                </div>
                <span className="absolute top-3 right-3 text-xs px-2 py-1 rounded-full bg-yellow-700/30 text-yellow-300">核心</span>
                <div className="light-scan" aria-hidden />
                <div className="pulse-glow" aria-hidden />
                <span className="particle" style={{left:'16%', top:'28%'}} />
                <span className="particle" style={{left:'74%', top:'40%'}} />
                <span className="particle" style={{left:'42%', top:'66%'}} />
              </Link>

              {/* 教練功能 */}
              <Link
                to="/coach"
                onClick={(e) => handleCardClick(e, 'coach')}
                className={`group premium-card rounded-2xl border border-gold-600 p-4 bg-primary-800/50 hover:bg-primary-700/60 transition-all duration-300 ${activeCard === 'coach' ? 'expanded' : ''} ${folding && activeCard !== 'coach' ? 'folded' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <SparklesIcon className="h-7 w-7 text-yellow-300" />
                  <div>
                    <div className="text-yellow-200 font-medium card-title">教練功能</div>
                    <div className="text-gray-400 text-sm">教練儀表板與學員協作工具</div>
                  </div>
                </div>
                <div className={`card-details ${activeCard === 'coach' ? 'open' : ''}`}>
                  <p className="mt-3 text-sm text-gray-300">集中查看學員進度、任務分配與教練指標，快速進入教練儀表板。</p>
                  <div className="mt-4">
                    <Link
                      to="/coach"
                      onClick={(e) => handleGoToRoute(e, '/coach', 'flip')}
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-400 transition"
                    >
                      前往教練儀表板
                    </Link>
                  </div>
                </div>
                <span className="absolute top-3 right-3 text-xs px-2 py-1 rounded-full bg-yellow-700/30 text-yellow-300">核心</span>
                <div className="light-scan" aria-hidden />
                <div className="pulse-glow" aria-hidden />
                <span className="particle" style={{left:'20%', top:'22%'}} />
                <span className="particle" style={{left:'68%', top:'36%'}} />
                <span className="particle" style={{left:'48%', top:'62%'}} />
              </Link>

              {/* 財務收支表 */}
              <Link
                to="/financial"
                onClick={(e) => handleCardClick(e, 'financial')}
                className={`group premium-card rounded-2xl border border-gold-600 p-4 bg-primary-800/50 hover:bg-primary-700/60 transition-all duration-300 ${activeCard === 'financial' ? 'expanded' : ''} ${folding && activeCard !== 'financial' ? 'folded' : ''}`}
              >
                <div className="flex items-center gap-4">
                  <CurrencyDollarIcon className="h-7 w-7 text-yellow-300" />
                  <div>
                    <div className="text-yellow-200 font-medium card-title">財務收支表</div>
                    <div className="text-gray-400 text-sm">管理商會財務記錄與查詢</div>
                  </div>
                </div>
                <div className={`card-details ${activeCard === 'financial' ? 'open' : ''}`}>
                  <p className="mt-3 text-sm text-gray-300">查詢與管理財務收支紀錄，提供分類、篩選與明細匯出功能。</p>
                  <div className="mt-4">
                    <Link
                      to="/financial"
                      onClick={(e) => handleGoToRoute(e, '/financial', 'fade')}
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-yellow-500 text-black font-medium hover:bg-yellow-400 transition"
                    >
                      前往財務收支表
                    </Link>
                  </div>
                </div>
                <span className="absolute top-3 right-3 text-xs px-2 py-1 rounded-full bg-yellow-700/30 text-yellow-300">核心</span>
                <div className="light-scan" aria-hidden />
                <div className="pulse-glow" aria-hidden />
                <span className="particle" style={{left:'24%', top:'24%'}} />
                <span className="particle" style={{left:'72%', top:'44%'}} />
                <span className="particle" style={{left:'52%', top:'68%'}} />
              </Link>
            </div>
          </div>
        )}

        {/* 幹部功能 - 僅限管理員 */}
        {userRole === 'admin' && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-yellow-400 mb-4">幹部功能</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* 商訪專區 */}
              <Link
                to="/prospects"
                className="group rounded-2xl bg-gradient-to-br from-black/60 via-yellow-900/30 to-yellow-800/20 border border-yellow-600/40 shadow-xl p-4 flex items-center justify-between hover:border-yellow-400/80 transition"
              >
                <div className="flex items-center gap-4">
                  <UsersIcon className="h-7 w-7 text-yellow-300" />
                  <div>
                    <div className="text-yellow-200 font-medium">商訪專區</div>
                    <div className="text-gray-400 text-sm">查看與管理商訪</div>
                    <div className="mt-2 text-xs text-gray-400">
                      前往 <Link to="/prospect-application" className="text-yellow-400 hover:text-yellow-300">商訪申請表</Link>
                    </div>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-700/30 text-yellow-300">幹部</span>
              </Link>

              {/* 財務收支表 */}
              <Link
                to="/finance"
                className="group rounded-2xl bg-gradient-to-br from-black/60 via-yellow-900/30 to-yellow-800/20 border border-yellow-600/40 shadow-xl p-4 flex items-center justify-between hover:border-yellow-400/80 transition"
              >
                <div className="flex items-center gap-4">
                  <CurrencyDollarIcon className="h-7 w-7 text-yellow-300" />
                  <div>
                    <div className="text-yellow-200 font-medium">財務收支表</div>
                    <div className="text-gray-400 text-sm">管理財務記錄</div>
                    <div className="mt-2 text-xs text-gray-400">
                      前往 <Link to="/foundation" className="text-yellow-400 hover:text-yellow-300">維基指南</Link>
                    </div>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-700/30 text-yellow-300">幹部</span>
              </Link>

              {/* 報到系統 */}
              <Link
                to="/checkin-scanner"
                className="group rounded-2xl bg-gradient-to-br from-black/60 via-yellow-900/30 to-yellow-800/20 border border-yellow-600/40 shadow-xl p-4 flex items-center justify-between hover:border-yellow-400/80 transition"
              >
                <div className="flex items-center gap-4">
                  <QrCodeIcon className="h-7 w-7 text-yellow-300" />
                  <div>
                    <div className="text-yellow-200 font-medium">報到系統</div>
                    <div className="text-gray-400 text-sm">活動現場報到掃描</div>
                    <div className="mt-2 text-xs text-gray-400">
                      前往 <Link to="/attendance-management" className="text-yellow-400 hover:text-yellow-300">出席管理</Link>
                    </div>
                  </div>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-700/30 text-yellow-300">幹部</span>
              </Link>
            </div>
          </div>
        )}
        {/* 標籤導航 - 僅管理員可見 */}
        {userRole === 'admin' && (
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
              <button
                onClick={() => setActiveTab('videos')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'videos'
                    ? 'border-yellow-500 text-yellow-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                影片管理
              </button>
            </nav>
          </div>
        )}

        {/* 標籤內容 - 僅管理員可見 */}
        {userRole === 'admin' && (
          <div>
            {activeTab === 'oath' && renderOathEditor()}
            {activeTab === 'settings' && renderCeremonySettings()}
            {activeTab === 'statistics' && renderStatistics()}
            {activeTab === 'bridge' && renderBridgeDesign()}
            {activeTab === 'videos' && <CeremonyVideoManagement userRole={userRole} />}
          </div>
        )}

        {/* 移除底部核心會員提示文字，保持版面乾淨 */}
      </div>
    </div>
  );
};

export default AdminPanel;