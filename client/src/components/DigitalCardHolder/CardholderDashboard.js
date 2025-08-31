import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CardholderDashboard.css';

const CardholderDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [collections, setCollections] = useState([]);
  const [folders, setFolders] = useState([]);
  const [stats, setStats] = useState({
    totalCollections: 0,
    favoriteCount: 0,
    folderCount: 0,
    recentCollections: []
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [editingCollection, setEditingCollection] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({
    notes: '',
    tags: '',
    folder_name: '',
    is_favorite: false
  });

  useEffect(() => {
    checkAuth();
    fetchUserProfile();
    fetchStats();
    fetchFolders();
    fetchCollections();
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [currentPage, searchTerm, selectedFolder, selectedTags, showFavoritesOnly]);

  const checkAuth = () => {
    const token = localStorage.getItem('cardholderToken');
    if (!token) {
      navigate('/digital-cardholder/login');
      return;
    }
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp < Date.now() / 1000) {
        localStorage.removeItem('cardholderToken');
        navigate('/digital-cardholder/login');
        return;
      }
    } catch (error) {
      localStorage.removeItem('cardholderToken');
      navigate('/digital-cardholder/login');
    }
  };

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('cardholderToken');
      const response = await axios.get('/api/digital-cardholder/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.user);
    } catch (error) {
      console.error('獲取用戶資料失敗:', error);
      if (error.response?.status === 401) {
        handleLogout();
      }
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('cardholderToken');
      const response = await axios.get('/api/digital-cardholder/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      console.error('獲取統計數據失敗:', error);
    }
  };

  const fetchFolders = async () => {
    try {
      const token = localStorage.getItem('cardholderToken');
      const response = await axios.get('/api/digital-cardholder/folders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFolders(response.data.folders);
    } catch (error) {
      console.error('獲取資料夾列表失敗:', error);
    }
  };

  const fetchCollections = async () => {
    try {
      const token = localStorage.getItem('cardholderToken');
      const params = {
        page: currentPage,
        limit: 12,
        search: searchTerm,
        folder: selectedFolder,
        tags: selectedTags.join(','),
        is_favorite: showFavoritesOnly ? 'true' : undefined
      };
      
      // 移除空值參數
      Object.keys(params).forEach(key => {
        if (!params[key]) delete params[key];
      });
      
      const response = await axios.get('/api/digital-cardholder/collections', {
        headers: { Authorization: `Bearer ${token}` },
        params
      });
      
      setCollections(response.data.collections);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('獲取收藏列表失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('cardholderToken');
    navigate('/digital-cardholder/login');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchCollections();
  };

  const handleTagToggle = (tag) => {
    setSelectedTags(prev => {
      const newTags = prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag];
      setCurrentPage(1);
      return newTags;
    });
  };

  const handleEditCollection = (collection) => {
    setEditingCollection(collection);
    setEditFormData({
      notes: collection.notes || '',
      tags: collection.tags ? collection.tags.join(', ') : '',
      folder_name: collection.folder_name || '',
      is_favorite: collection.is_favorite || false
    });
    setShowEditModal(true);
  };

  const handleUpdateCollection = async () => {
    try {
      const token = localStorage.getItem('cardholderToken');
      const tags = editFormData.tags
        .split(',')
        .map(tag => tag.trim())
        .filter(tag => tag);
      
      await axios.put(`/api/digital-cardholder/collections/${editingCollection.id}`, {
        notes: editFormData.notes,
        tags: tags,
        folder_name: editFormData.folder_name || null,
        is_favorite: editFormData.is_favorite
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setShowEditModal(false);
      setEditingCollection(null);
      fetchCollections();
      fetchStats();
      fetchFolders();
      alert('收藏資料更新成功！');
    } catch (error) {
      console.error('更新收藏失敗:', error);
      alert('更新失敗，請稍後再試');
    }
  };

  const handleDeleteCollection = async (collectionId) => {
    if (!window.confirm('確定要刪除此收藏嗎？')) return;
    
    try {
      const token = localStorage.getItem('cardholderToken');
      await axios.delete(`/api/digital-cardholder/collections/${collectionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchCollections();
      fetchStats();
      fetchFolders();
      alert('收藏刪除成功！');
    } catch (error) {
      console.error('刪除收藏失敗:', error);
      alert('刪除失敗，請稍後再試');
    }
  };

  const handleToggleFavorite = async (collection) => {
    try {
      const token = localStorage.getItem('cardholderToken');
      await axios.put(`/api/digital-cardholder/collections/${collection.id}`, {
        ...collection,
        is_favorite: !collection.is_favorite
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      fetchCollections();
      fetchStats();
    } catch (error) {
      console.error('更新我的最愛失敗:', error);
    }
  };

  const handleViewCard = (collection) => {
    const url = `/nfc-card/${collection.custom_url_slug}`;
    window.open(url, '_blank');
  };

  const getAllTags = () => {
    const allTags = new Set();
    collections.forEach(collection => {
      if (collection.tags) {
        collection.tags.forEach(tag => allTags.add(tag));
      }
    });
    return Array.from(allTags);
  };

  if (loading) {
    return (
      <div className="cardholder-dashboard loading">
        <div className="loading-spinner"></div>
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <div className="cardholder-dashboard">
      {/* 頭部導航 */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="header-left">
            <h1>數位名片夾</h1>
            {user && <p>歡迎回來，{user.name}！</p>}
          </div>
          <div className="header-right">
            <button onClick={handleLogout} className="logout-btn">
              <i className="fas fa-sign-out-alt"></i>
              登出
            </button>
          </div>
        </div>
      </header>

      {/* 統計卡片 */}
      <div className="stats-section">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <i className="fas fa-address-card"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.totalCollections}</h3>
              <p>收藏名片</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon favorite">
              <i className="fas fa-heart"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.favoriteCount}</h3>
              <p>我的最愛</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon folder">
              <i className="fas fa-folder"></i>
            </div>
            <div className="stat-content">
              <h3>{stats.folderCount}</h3>
              <p>資料夾</p>
            </div>
          </div>
        </div>
      </div>

      {/* 搜尋和篩選 */}
      <div className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-group">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋名片、公司或備註..."
              className="search-input"
            />
            <button type="submit" className="search-btn">
              <i className="fas fa-search"></i>
            </button>
          </div>
        </form>

        <div className="filters">
          <div className="filter-group">
            <label>資料夾:</label>
            <select
              value={selectedFolder}
              onChange={(e) => {
                setSelectedFolder(e.target.value);
                setCurrentPage(1);
              }}
            >
              <option value="">全部資料夾</option>
              {folders.map(folder => (
                <option key={folder.folder_name} value={folder.folder_name}>
                  {folder.folder_name} ({folder.card_count})
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>
              <input
                type="checkbox"
                checked={showFavoritesOnly}
                onChange={(e) => {
                  setShowFavoritesOnly(e.target.checked);
                  setCurrentPage(1);
                }}
              />
              只顯示我的最愛
            </label>
          </div>
        </div>

        {/* 標籤篩選 */}
        {getAllTags().length > 0 && (
          <div className="tags-filter">
            <label>標籤:</label>
            <div className="tags-list">
              {getAllTags().map(tag => (
                <button
                  key={tag}
                  className={`tag-btn ${selectedTags.includes(tag) ? 'active' : ''}`}
                  onClick={() => handleTagToggle(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 收藏列表 */}
      <div className="collections-section">
        {collections.length === 0 ? (
          <div className="empty-state">
            <i className="fas fa-heart-broken"></i>
            <h3>尚未收藏任何名片</h3>
            <p>開始瀏覽電子名片並收藏您感興趣的聯絡人吧！</p>
          </div>
        ) : (
          <>
            <div className="collections-grid">
              {collections.map(collection => (
                <div key={collection.id} className="collection-card">
                  <div className="card-header">
                    <div className="member-info">
                      {collection.profile_picture_url && (
                        <img
                          src={collection.profile_picture_url}
                          alt={collection.member_name}
                          className="member-avatar"
                        />
                      )}
                      <div className="member-details">
                        <h3>{collection.member_name}</h3>
                        {collection.member_title && (
                          <p className="member-title">{collection.member_title}</p>
                        )}
                        {collection.member_company && (
                          <p className="member-company">{collection.member_company}</p>
                        )}
                      </div>
                    </div>
                    <button
                      className={`favorite-btn ${collection.is_favorite ? 'active' : ''}`}
                      onClick={() => handleToggleFavorite(collection)}
                      title={collection.is_favorite ? '移除我的最愛' : '加入我的最愛'}
                    >
                      <i className={`fas fa-heart ${collection.is_favorite ? '' : 'far'}`}></i>
                    </button>
                  </div>

                  <div className="card-content">
                    {collection.notes && (
                      <div className="notes">
                        <i className="fas fa-sticky-note"></i>
                        <span>{collection.notes}</span>
                      </div>
                    )}

                    {collection.tags && collection.tags.length > 0 && (
                      <div className="tags">
                        {collection.tags.map(tag => (
                          <span key={tag} className="tag">{tag}</span>
                        ))}
                      </div>
                    )}

                    {collection.folder_name && (
                      <div className="folder">
                        <i className="fas fa-folder"></i>
                        <span>{collection.folder_name}</span>
                      </div>
                    )}

                    <div className="collection-meta">
                      <span className="collected-date">
                        收藏於 {new Date(collection.collected_at).toLocaleDateString('zh-TW')}
                      </span>
                      <span className="template-info">
                        {collection.template_name}
                      </span>
                    </div>
                  </div>

                  <div className="card-actions">
                    <button
                      onClick={() => handleViewCard(collection)}
                      className="view-btn"
                      title="查看名片"
                    >
                      <i className="fas fa-eye"></i>
                      查看
                    </button>
                    <button
                      onClick={() => handleEditCollection(collection)}
                      className="edit-btn"
                      title="編輯收藏"
                    >
                      <i className="fas fa-edit"></i>
                      編輯
                    </button>
                    <button
                      onClick={() => handleDeleteCollection(collection.id)}
                      className="delete-btn"
                      title="刪除收藏"
                    >
                      <i className="fas fa-trash"></i>
                      刪除
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 分頁 */}
            {pagination.totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={!pagination.hasPrevPage}
                  className="page-btn"
                >
                  <i className="fas fa-chevron-left"></i>
                  上一頁
                </button>
                
                <span className="page-info">
                  第 {pagination.currentPage} 頁，共 {pagination.totalPages} 頁
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(pagination.totalPages, prev + 1))}
                  disabled={!pagination.hasNextPage}
                  className="page-btn"
                >
                  下一頁
                  <i className="fas fa-chevron-right"></i>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 編輯收藏模態框 */}
      {showEditModal && editingCollection && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="edit-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>編輯收藏</h3>
              <button
                className="close-btn"
                onClick={() => setShowEditModal(false)}
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="member-preview">
                <h4>{editingCollection.member_name}</h4>
                {editingCollection.member_company && (
                  <p>{editingCollection.member_company}</p>
                )}
              </div>
              
              <div className="form-group">
                <label>備註</label>
                <textarea
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="為這張名片添加備註..."
                  rows={3}
                />
              </div>
              
              <div className="form-group">
                <label>標籤</label>
                <input
                  type="text"
                  value={editFormData.tags}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="用逗號分隔多個標籤"
                />
              </div>
              
              <div className="form-group">
                <label>資料夾</label>
                <input
                  type="text"
                  value={editFormData.folder_name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, folder_name: e.target.value }))}
                  placeholder="選擇或創建資料夾"
                />
              </div>
              
              <div className="form-group">
                <label>
                  <input
                    type="checkbox"
                    checked={editFormData.is_favorite}
                    onChange={(e) => setEditFormData(prev => ({ ...prev, is_favorite: e.target.checked }))}
                  />
                  加入我的最愛
                </label>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="cancel-btn"
                onClick={() => setShowEditModal(false)}
              >
                取消
              </button>
              <button
                className="confirm-btn"
                onClick={handleUpdateCollection}
              >
                更新
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CardholderDashboard;