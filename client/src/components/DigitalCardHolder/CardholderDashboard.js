import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import CardholderNavigation from './CardholderNavigation';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  HeartIcon,
  TrashIcon,
  PencilIcon,
  EyeIcon,
  TagIcon,
  UserIcon,
  BuildingOfficeIcon,
  PhoneIcon,
  EnvelopeIcon,
  ArrowRightOnRectangleIcon,
  Squares2X2Icon,
  ListBulletIcon,
  PlusIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolidIcon } from '@heroicons/react/24/solid';

const CardholderDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [editingCollection, setEditingCollection] = useState(null);
  const [editForm, setEditForm] = useState({ notes: '', tags: '', is_favorite: false });
  const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, total_count: 0 });

  // 獲取用戶資料
  useEffect(() => {
    const userData = localStorage.getItem('cardholder_user');
    if (userData) {
      setUser(JSON.parse(userData));
    } else {
      navigate('/digital-cardholder/auth');
    }
  }, [navigate]);

  // 設置 axios 預設 headers
  useEffect(() => {
    const token = localStorage.getItem('cardholder_token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      navigate('/digital-cardholder/auth');
    }
  }, [navigate]);

  // 載入收藏列表
  const loadCollections = async (page = 1) => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 12,
        ...(searchTerm && { search: searchTerm }),
        ...(selectedTags.length > 0 && { tags: selectedTags.join(',') })
      };
      
      const response = await axios.get('/api/digital-cardholder/collections', { params });
      setCollections(response.data.collections);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('載入收藏列表失敗:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('cardholder_token');
        localStorage.removeItem('cardholder_user');
        navigate('/digital-cardholder/auth');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadCollections();
    }
  }, [user, searchTerm, selectedTags]);

  // 登出
  const handleLogout = () => {
    localStorage.removeItem('cardholder_token');
    localStorage.removeItem('cardholder_user');
    delete axios.defaults.headers.common['Authorization'];
    navigate('/digital-cardholder/auth');
  };

  // 刪除收藏
  const handleDeleteCollection = async (collectionId) => {
    if (!window.confirm('確定要刪除這個收藏嗎？')) {
      return;
    }

    try {
      await axios.delete(`/api/digital-cardholder/collections/${collectionId}`);
      loadCollections(pagination.current_page);
    } catch (error) {
      console.error('刪除收藏失敗:', error);
      alert('刪除失敗，請稍後再試');
    }
  };

  // 開始編輯收藏
  const startEditCollection = (collection) => {
    setEditingCollection(collection.id);
    setEditForm({
      notes: collection.notes || '',
      tags: collection.tags ? collection.tags.join(', ') : '',
      is_favorite: collection.is_favorite || false
    });
  };

  // 儲存編輯
  const handleSaveEdit = async () => {
    try {
      const tags = editForm.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0);

      await axios.put(`/api/digital-cardholder/collections/${editingCollection}`, {
        notes: editForm.notes,
        tags,
        is_favorite: editForm.is_favorite
      });

      setEditingCollection(null);
      loadCollections(pagination.current_page);
    } catch (error) {
      console.error('更新收藏失敗:', error);
      alert('更新失敗，請稍後再試');
    }
  };

  // 查看名片
  const viewCard = (memberCardId) => {
    window.open(`/member-card/${memberCardId}`, '_blank');
  };

  // 獲取所有標籤
  const getAllTags = () => {
    const tags = new Set();
    collections.forEach(collection => {
      if (collection.tags) {
        collection.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags);
  };

  if (loading && collections.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CardholderNavigation />
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold text-gray-900">數位名片夾</h1>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <UserIcon className="h-4 w-4" />
                <span>{user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4" />
                <span className="text-sm">登出</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 搜尋和篩選 */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex-1 max-w-lg">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜尋名片..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg border transition-colors ${
                  showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <FunnelIcon className="h-4 w-4" />
                <span className="text-sm">篩選</span>
              </button>
              
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${
                    viewMode === 'grid' ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Squares2X2Icon className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 border-l border-gray-300 ${
                    viewMode === 'list' ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <ListBulletIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 篩選面板 */}
          {showFilters && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">標籤篩選</h3>
              <div className="flex flex-wrap gap-2">
                {getAllTags().map(tag => (
                  <button
                    key={tag}
                    onClick={() => {
                      setSelectedTags(prev => 
                        prev.includes(tag) 
                          ? prev.filter(t => t !== tag)
                          : [...prev, tag]
                      );
                    }}
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      selectedTags.includes(tag)
                        ? 'bg-blue-100 text-blue-800 border border-blue-200'
                        : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                    }`}
                  >
                    <TagIcon className="h-3 w-3 mr-1" />
                    {tag}
                  </button>
                ))}
              </div>
              {selectedTags.length > 0 && (
                <button
                  onClick={() => setSelectedTags([])}
                  className="mt-2 text-xs text-blue-600 hover:text-blue-800"
                >
                  清除所有篩選
                </button>
              )}
            </div>
          )}
        </div>

        {/* 統計資訊 */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            共收藏了 <span className="font-medium text-gray-900">{pagination.total_count}</span> 張名片
          </p>
        </div>

        {/* 收藏列表 */}
        {collections.length === 0 ? (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <HeartIcon className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">還沒有收藏任何名片</h3>
            <p className="text-gray-500 mb-4">開始瀏覽並收藏您感興趣的電子名片吧！</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {collections.map(collection => (
              <div
                key={collection.id}
                className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow ${
                  viewMode === 'list' ? 'p-4' : 'p-6'
                }`}
              >
                {editingCollection === collection.id ? (
                  // 編輯模式
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">備註</label>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="添加備註..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">標籤</label>
                      <input
                        type="text"
                        value={editForm.tags}
                        onChange={(e) => setEditForm(prev => ({ ...prev, tags: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="用逗號分隔多個標籤"
                      />
                    </div>
                    
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id={`favorite-${collection.id}`}
                        checked={editForm.is_favorite}
                        onChange={(e) => setEditForm(prev => ({ ...prev, is_favorite: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor={`favorite-${collection.id}`} className="ml-2 text-sm text-gray-700">
                        設為最愛
                      </label>
                    </div>
                    
                    <div className="flex space-x-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        儲存
                      </button>
                      <button
                        onClick={() => setEditingCollection(null)}
                        className="flex-1 bg-gray-200 text-gray-800 px-3 py-2 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                ) : (
                  // 顯示模式
                  <>
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {collection.card_name || collection.member_name}
                        </h3>
                        {collection.card_title && (
                          <p className="text-sm text-gray-600 mb-1">{collection.card_title}</p>
                        )}
                        {collection.card_company && (
                          <p className="text-sm text-gray-500 flex items-center">
                            <BuildingOfficeIcon className="h-4 w-4 mr-1" />
                            {collection.card_company}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        {collection.is_favorite && (
                          <HeartSolidIcon className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                    </div>

                    {/* 聯絡資訊 */}
                    <div className="space-y-2 mb-4">
                      {collection.card_email && (
                        <div className="flex items-center text-sm text-gray-600">
                          <EnvelopeIcon className="h-4 w-4 mr-2" />
                          {collection.card_email}
                        </div>
                      )}
                      {collection.card_phone && (
                        <div className="flex items-center text-sm text-gray-600">
                          <PhoneIcon className="h-4 w-4 mr-2" />
                          {collection.card_phone}
                        </div>
                      )}
                    </div>

                    {/* 標籤 */}
                    {collection.tags && collection.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-4">
                        {collection.tags.map(tag => (
                          <span
                            key={tag}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          >
                            <TagIcon className="h-3 w-3 mr-1" />
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* 備註 */}
                    {collection.notes && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                          {collection.notes}
                        </p>
                      </div>
                    )}

                    {/* 操作按鈕 */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => viewCard(collection.member_card_id)}
                        className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        <EyeIcon className="h-4 w-4 mr-1" />
                        查看名片
                      </button>
                      <button
                        onClick={() => startEditCollection(collection)}
                        className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCollection(collection.id)}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-md text-sm font-medium hover:bg-red-200 transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>

                    {/* 收藏時間 */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        收藏於 {new Date(collection.collected_at).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 分頁 */}
        {pagination.total_pages > 1 && (
          <div className="mt-8 flex justify-center">
            <nav className="flex space-x-2">
              {Array.from({ length: pagination.total_pages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => loadCollections(page)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    page === pagination.current_page
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default CardholderDashboard;