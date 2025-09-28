import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DocumentTextIcon, CheckCircleIcon, LightBulbIcon, BuildingOfficeIcon, StarIcon, HeartIcon, UsersIcon, BriefcaseIcon, ChartBarIcon, GlobeAltIcon, FlagIcon, SparklesIcon } from '@heroicons/react/24/outline';
import axios from '../config/axios';
import { useNavigate } from 'react-router-dom';

// Icon 對應表：後端存的 icon 字串會對應到這裡的元件
const iconMap = {
  DocumentTextIcon: DocumentTextIcon,
  LightBulbIcon: LightBulbIcon,
  BuildingOfficeIcon: BuildingOfficeIcon,
  StarIcon: StarIcon,
  HeartIcon: HeartIcon,
  UsersIcon: UsersIcon,
  BriefcaseIcon: BriefcaseIcon,
  ChartBarIcon: ChartBarIcon,
  GlobeAltIcon: GlobeAltIcon,
  FlagIcon: FlagIcon,
  SparklesIcon: SparklesIcon,
  // 常用別名（小寫）
  document: DocumentTextIcon,
  lightbulb: LightBulbIcon,
  buildingOffice: BuildingOfficeIcon,
  star: StarIcon,
  heart: HeartIcon,
  users: UsersIcon,
  briefcase: BriefcaseIcon,
  chartBar: ChartBarIcon,
  globeAlt: GlobeAltIcon,
  flag: FlagIcon,
  sparkles: SparklesIcon,
};

const FoundationInfo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewChecked, setViewChecked] = useState(false);
  const [viewSaving, setViewSaving] = useState(false);
  const [cards, setCards] = useState([]);

  // 初始化載入：取得檢視狀態與地基卡片
  useEffect(() => {
    fetchViewStatus();
    fetchCards();
  }, []);

  const fetchCards = async () => {
    try {
      const res = await axios.get('/api/content/foundation/cards');
      setCards(Array.isArray(res.data.cards) ? res.data.cards : []);
    } catch (err) {
      console.error('Error fetching foundation cards:', err);
      setError('載入卡片失敗');
    } finally {
      setLoading(false);
    }
  };

  const fetchViewStatus = async () => {
    try {
      const res = await axios.get('/api/content/foundation/view-status');
      setViewChecked(!!res.data?.viewed);
    } catch (err) {
      console.error('Error fetching foundation view status:', err);
    }
  };

  const handleMarkViewed = async (e) => {
    const checked = e.target.checked;
    setViewChecked(checked);
    if (!checked) return; // 目前僅支援勾選；取消不會刪除紀錄
    try {
      setViewSaving(true);
      await axios.post('/api/content/foundation/viewed');
    } catch (err) {
      console.error('Error marking foundation viewed:', err);
    } finally {
      setViewSaving(false);
    }
  };

  const isAdmin = () => {
    return user && user.membershipLevel === 1 && user.email.includes('admin');
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

  return (
    <div className="min-h-screen bg-primary-900 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-gold-400 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gold-100">商會地基</h1>
                <p className="mt-2 text-gold-300">商會基礎資訊與核心理念</p>
              </div>
            </div>
            {isAdmin() && (
              <button
                onClick={() => navigate('/admin/foundation-management')}
                className="bg-gold-600 hover:bg-gold-700 text-primary-900 font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
              >
                管理地基卡片
              </button>
            )}
          </div>
        </div>

        {/* 錯誤訊息 */}
        {error && (
          <div className="mb-6 bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* 內容區域：僅顯示卡片 */}
        <div className="bg-primary-800 border border-gold-600 rounded-lg shadow-xl">
          <div className="p-6">
            {cards.length > 0 ? (
              <div className="space-y-4">
                {cards.map((c) => {
                  const Icon = c?.icon && iconMap[c.icon] ? iconMap[c.icon] : DocumentTextIcon;
                  return (
                    <div key={c.id || `${c.title}-${Math.random()}`} className="bg-primary-900 border border-gold-600 rounded p-4">
                      <div className="flex items-center mb-1">
                        <Icon className="h-5 w-5 text-gold-400 mr-2" />
                        <h3 className="text-gold-100 font-semibold">{c.title}</h3>
                      </div>
                      <p className="text-gold-300 whitespace-pre-line mt-1">{c.description}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <DocumentTextIcon className="mx-auto h-12 w-12 text-gold-400" />
                <h3 className="mt-2 text-sm font-medium text-gold-100">暫無內容</h3>
                <p className="mt-1 text-sm text-gold-300">
                  {isAdmin() ? '點擊右上角「管理地基卡片」設定商會地基資訊' : '管理員尚未設定商會地基內容'}
                </p>
              </div>
            )}

            {/* 已看過勾選 */}
            <div className="mt-6 flex items-center bg-primary-900 border border-gold-600 rounded-md p-4">
              <input
                id="foundation-viewed"
                type="checkbox"
                className="h-4 w-4"
                checked={viewChecked}
                onChange={handleMarkViewed}
              />
              <label htmlFor="foundation-viewed" className="ml-3 text-sm text-gold-200 flex items-center">
                <CheckCircleIcon className="h-4 w-4 mr-1 text-gold-400" />
                我已完整閱讀「商會地基」內容（作為教練進度指標之一）
              </label>
              {viewSaving && (
                <span className="ml-3 text-xs text-gold-300">儲存中...</span>
              )}
            </div>
          </div>
        </div>

        {/* 權限說明 */}
        {!isAdmin() && (
          <div className="mt-6 bg-primary-800 border border-gold-600 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-5 w-5 text-gold-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gold-200">內容管理權限</h3>
                <div className="mt-2 text-sm text-gold-300">
                  <p>此頁面內容僅限管理員編輯，所有會員均可查看。</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoundationInfo;