import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaSearch,
  FaFilter,
  FaSort,
  FaTrash,
  FaEdit,
  FaEye,
  FaDownload,
  FaShare,
  FaHeart,
  FaHeartBroken,
  FaUser,
  FaBuilding,
  FaBriefcase,
  FaCalendarAlt,
  FaStickyNote,
  FaExternalLinkAlt,
  FaPlus
} from 'react-icons/fa';
import axios from 'axios';
import './DigitalCardWallet.css';

const DigitalCardWallet = () => {
  const [bookmarks, setBookmarks] = useState([]);
  const [filteredBookmarks, setFilteredBookmarks] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('bookmarkedAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterBy, setFilterBy] = useState('all');
  const [selectedBookmarks, setSelectedBookmarks] = useState([]);
  const [showBatchActions, setShowBatchActions] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [showStats, setShowStats] = useState(true);

  useEffect(() => {
    loadBookmarks();
  }, []);

  useEffect(() => {
    filterAndSortBookmarks();
  }, [bookmarks, searchTerm, sortBy, sortOrder, filterBy]);

  const loadBookmarks = () => {
    const savedBookmarks = JSON.parse(localStorage.getItem('nfc_bookmarks') || '[]');
    setBookmarks(savedBookmarks);
  };

  const saveBookmarks = (updatedBookmarks) => {
    localStorage.setItem('nfc_bookmarks', JSON.stringify(updatedBookmarks));
    setBookmarks(updatedBookmarks);
  };

  const filterAndSortBookmarks = () => {
    let filtered = [...bookmarks];

    // 搜尋過濾
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(bookmark => 
        bookmark.userName?.toLowerCase().includes(term) ||
        bookmark.userCompany?.toLowerCase().includes(term) ||
        bookmark.userPosition?.toLowerCase().includes(term) ||
        bookmark.cardTitle?.toLowerCase().includes(term) ||
        bookmark.notes?.toLowerCase().includes(term)
      );
    }

    // 分類過濾
    if (filterBy !== 'all') {
      const now = new Date();
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      const oneMonth = 30 * 24 * 60 * 60 * 1000;
      
      filtered = filtered.filter(bookmark => {
        const bookmarkedDate = new Date(bookmark.bookmarkedAt);
        const timeDiff = now - bookmarkedDate;
        
        switch (filterBy) {
          case 'recent':
            return timeDiff <= oneWeek;
          case 'month':
            return timeDiff <= oneMonth;
          case 'hasNotes':
            return bookmark.notes && bookmark.notes.trim() !== '';
          case 'noNotes':
            return !bookmark.notes || bookmark.notes.trim() === '';
          default:
            return true;
        }
      });
    }

    // 排序
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.userName || '';
          bValue = b.userName || '';
          break;
        case 'company':
          aValue = a.userCompany || '';
          bValue = b.userCompany || '';
          break;
        case 'position':
          aValue = a.userPosition || '';
          bValue = b.userPosition || '';
          break;
        case 'bookmarkedAt':
        default:
          aValue = new Date(a.bookmarkedAt);
          bValue = new Date(b.bookmarkedAt);
          break;
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredBookmarks(filtered);
  };

  const removeBookmark = (userId) => {
    if (window.confirm('確定要移除這張名片嗎？')) {
      const updatedBookmarks = bookmarks.filter(bookmark => bookmark.userId !== userId);
      saveBookmarks(updatedBookmarks);
    }
  };

  const updateNote = (userId, note) => {
    const updatedBookmarks = bookmarks.map(bookmark => 
      bookmark.userId === userId 
        ? { ...bookmark, notes: note }
        : bookmark
    );
    saveBookmarks(updatedBookmarks);
    setEditingNote(null);
    setNoteText('');
  };

  const handleBatchDelete = () => {
    if (selectedBookmarks.length === 0) return;
    
    if (window.confirm(`確定要移除選中的 ${selectedBookmarks.length} 張名片嗎？`)) {
      const updatedBookmarks = bookmarks.filter(
        bookmark => !selectedBookmarks.includes(bookmark.userId)
      );
      saveBookmarks(updatedBookmarks);
      setSelectedBookmarks([]);
      setShowBatchActions(false);
    }
  };

  const handleSelectBookmark = (userId) => {
    if (selectedBookmarks.includes(userId)) {
      setSelectedBookmarks(selectedBookmarks.filter(id => id !== userId));
    } else {
      setSelectedBookmarks([...selectedBookmarks, userId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedBookmarks.length === filteredBookmarks.length) {
      setSelectedBookmarks([]);
    } else {
      setSelectedBookmarks(filteredBookmarks.map(bookmark => bookmark.userId));
    }
  };

  const downloadVCard = async (bookmark) => {
    try {
      const response = await axios.get(`/api/nfc-cards/member/${bookmark.userId}/vcard`, {
        responseType: 'blob'
      });
      
      const blob = new Blob([response.data], { type: 'text/vcard' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${bookmark.userName || 'contact'}.vcf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('下載 vCard 失敗:', error);
      alert('下載失敗，請稍後再試');
    }
  };

  const shareCard = async (bookmark) => {
    const cardUrl = `${window.location.origin}/member/${bookmark.userId}`;
    const shareData = {
      title: `${bookmark.userName}的電子名片`,
      text: `查看 ${bookmark.userName} 的電子名片`,
      url: cardUrl
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('分享失敗:', error);
        copyToClipboard(cardUrl);
      }
    } else {
      copyToClipboard(cardUrl);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('名片網址已複製到剪貼板！');
    }).catch(() => {
      alert('複製失敗');
    });
  };

  const exportBookmarks = () => {
    const dataStr = JSON.stringify(bookmarks, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `digital-card-wallet-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importBookmarks = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedBookmarks = JSON.parse(e.target.result);
        if (Array.isArray(importedBookmarks)) {
          // 合併現有書籤，避免重複
          const existingUserIds = bookmarks.map(b => b.userId);
          const newBookmarks = importedBookmarks.filter(b => !existingUserIds.includes(b.userId));
          const mergedBookmarks = [...bookmarks, ...newBookmarks];
          saveBookmarks(mergedBookmarks);
          alert(`成功匯入 ${newBookmarks.length} 張新名片！`);
        } else {
          alert('檔案格式不正確');
        }
      } catch (error) {
        console.error('匯入失敗:', error);
        alert('匯入失敗，請檢查檔案格式');
      }
    };
    reader.readAsText(file);
  };

  const getStats = () => {
    const now = new Date();
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const oneMonth = 30 * 24 * 60 * 60 * 1000;
    
    return {
      total: bookmarks.length,
      thisWeek: bookmarks.filter(b => (now - new Date(b.bookmarkedAt)) <= oneWeek).length,
      thisMonth: bookmarks.filter(b => (now - new Date(b.bookmarkedAt)) <= oneMonth).length,
      withNotes: bookmarks.filter(b => b.notes && b.notes.trim() !== '').length
    };
  };

  const stats = getStats();

  return (
    <div className="digital-card-wallet">
      {/* 頭部 */}
      <div className="wallet-header">
        <div className="header-content">
          <div className="header-left">
            <h1>
              <FaHeart className="wallet-icon" />
              數位名片夾
            </h1>
            <p>管理您收藏的電子名片</p>
          </div>
          <div className="header-actions">
            <input
              type="file"
              accept=".json"
              onChange={importBookmarks}
              style={{ display: 'none' }}
              id="import-file"
            />
            <button
              onClick={() => document.getElementById('import-file').click()}
              className="action-btn import-btn"
              title="匯入名片夾"
            >
              <FaPlus /> 匯入
            </button>
            <button
              onClick={exportBookmarks}
              className="action-btn export-btn"
              title="匯出名片夾"
              disabled={bookmarks.length === 0}
            >
              <FaDownload /> 匯出
            </button>
          </div>
        </div>
      </div>

      {/* 統計資訊 */}
      {showStats && (
        <motion.div 
          className="stats-section"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-number">{stats.total}</div>
              <div className="stat-label">總計名片</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.thisWeek}</div>
              <div className="stat-label">本週新增</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.thisMonth}</div>
              <div className="stat-label">本月新增</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.withNotes}</div>
              <div className="stat-label">有備註</div>
            </div>
          </div>
          <button 
            onClick={() => setShowStats(false)}
            className="hide-stats-btn"
            title="隱藏統計"
          >
            ×
          </button>
        </motion.div>
      )}

      {/* 搜尋和篩選 */}
      <div className="search-filter-section">
        <div className="search-bar">
          <FaSearch className="search-icon" />
          <input
            type="text"
            placeholder="搜尋姓名、公司、職位或備註..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-controls">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="filter-select"
          >
            <option value="all">全部名片</option>
            <option value="recent">最近一週</option>
            <option value="month">最近一月</option>
            <option value="hasNotes">有備註</option>
            <option value="noNotes">無備註</option>
          </select>
          
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="bookmarkedAt">收藏時間</option>
            <option value="name">姓名</option>
            <option value="company">公司</option>
            <option value="position">職位</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="sort-order-btn"
            title={sortOrder === 'asc' ? '升序' : '降序'}
          >
            <FaSort />
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
          
          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
            className="view-mode-btn"
            title={viewMode === 'grid' ? '列表檢視' : '網格檢視'}
          >
            {viewMode === 'grid' ? '☰' : '⊞'}
          </button>
        </div>
      </div>

      {/* 批次操作 */}
      {filteredBookmarks.length > 0 && (
        <div className="batch-actions">
          <label className="select-all-checkbox">
            <input
              type="checkbox"
              checked={selectedBookmarks.length === filteredBookmarks.length}
              onChange={handleSelectAll}
            />
            全選 ({selectedBookmarks.length}/{filteredBookmarks.length})
          </label>
          
          {selectedBookmarks.length > 0 && (
            <motion.div 
              className="batch-buttons"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <button
                onClick={handleBatchDelete}
                className="batch-btn delete-btn"
              >
                <FaTrash /> 刪除選中 ({selectedBookmarks.length})
              </button>
            </motion.div>
          )}
        </div>
      )}

      {/* 名片列表 */}
      <div className={`cards-container ${viewMode}`}>
        <AnimatePresence>
          {filteredBookmarks.length === 0 ? (
            <motion.div 
              className="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {bookmarks.length === 0 ? (
                <>
                  <FaHeartBroken className="empty-icon" />
                  <h3>名片夾是空的</h3>
                  <p>當您瀏覽他人的電子名片時，點擊收藏按鈕即可將名片加入此處</p>
                </>
              ) : (
                <>
                  <FaSearch className="empty-icon" />
                  <h3>沒有找到符合條件的名片</h3>
                  <p>請嘗試調整搜尋條件或篩選設定</p>
                </>
              )}
            </motion.div>
          ) : (
            filteredBookmarks.map((bookmark, index) => (
              <motion.div
                key={bookmark.userId}
                className="bookmark-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: index * 0.05 }}
                layout
              >
                <div className="card-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedBookmarks.includes(bookmark.userId)}
                    onChange={() => handleSelectBookmark(bookmark.userId)}
                  />
                </div>
                
                <div className="card-content">
                  <div className="card-header">
                    <div className="user-info">
                      {bookmark.userAvatar ? (
                        <img 
                          src={bookmark.userAvatar} 
                          alt={bookmark.userName}
                          className="user-avatar"
                        />
                      ) : (
                        <div className="avatar-placeholder">
                          <FaUser />
                        </div>
                      )}
                      <div className="user-details">
                        <h3 className="user-name">{bookmark.userName || '未知用戶'}</h3>
                        {bookmark.userPosition && (
                          <p className="user-position">
                            <FaBriefcase className="detail-icon" />
                            {bookmark.userPosition}
                          </p>
                        )}
                        {bookmark.userCompany && (
                          <p className="user-company">
                            <FaBuilding className="detail-icon" />
                            {bookmark.userCompany}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="card-actions">
                      <button
                        onClick={() => window.open(`/member/${bookmark.userId}`, '_blank')}
                        className="card-action-btn view-btn"
                        title="查看名片"
                      >
                        <FaEye />
                      </button>
                      <button
                        onClick={() => shareCard(bookmark)}
                        className="card-action-btn share-btn"
                        title="分享名片"
                      >
                        <FaShare />
                      </button>
                      <button
                        onClick={() => downloadVCard(bookmark)}
                        className="card-action-btn download-btn"
                        title="下載聯絡人"
                      >
                        <FaDownload />
                      </button>
                      <button
                        onClick={() => removeBookmark(bookmark.userId)}
                        className="card-action-btn remove-btn"
                        title="移除收藏"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                  
                  {bookmark.cardTitle && (
                    <div className="card-title">
                      {bookmark.cardTitle}
                    </div>
                  )}
                  
                  <div className="card-meta">
                    <span className="bookmark-date">
                      <FaCalendarAlt className="meta-icon" />
                      收藏於 {new Date(bookmark.bookmarkedAt).toLocaleDateString('zh-TW')}
                    </span>
                  </div>
                  
                  <div className="card-notes">
                    {editingNote === bookmark.userId ? (
                      <div className="note-editor">
                        <textarea
                          value={noteText}
                          onChange={(e) => setNoteText(e.target.value)}
                          placeholder="添加備註..."
                          className="note-textarea"
                          autoFocus
                        />
                        <div className="note-actions">
                          <button
                            onClick={() => updateNote(bookmark.userId, noteText)}
                            className="note-save-btn"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => {
                              setEditingNote(null);
                              setNoteText('');
                            }}
                            className="note-cancel-btn"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="note-display">
                        {bookmark.notes ? (
                          <div className="note-content">
                            <FaStickyNote className="note-icon" />
                            <span>{bookmark.notes}</span>
                          </div>
                        ) : (
                          <div className="no-note">
                            <FaStickyNote className="note-icon" />
                            <span>點擊添加備註</span>
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setEditingNote(bookmark.userId);
                            setNoteText(bookmark.notes || '');
                          }}
                          className="edit-note-btn"
                        >
                          <FaEdit />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
      
      {/* 底部統計 */}
      {!showStats && filteredBookmarks.length > 0 && (
        <div className="bottom-stats">
          <span>顯示 {filteredBookmarks.length} / {bookmarks.length} 張名片</span>
          <button 
            onClick={() => setShowStats(true)}
            className="show-stats-btn"
          >
            顯示統計
          </button>
        </div>
      )}
    </div>
  );
};

export default DigitalCardWallet;