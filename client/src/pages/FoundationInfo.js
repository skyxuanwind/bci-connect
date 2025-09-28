import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DocumentTextIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import axios from '../config/axios';
import { useNavigate } from 'react-router-dom';

const FoundationInfo = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [viewChecked, setViewChecked] = useState(false);
  const [viewSaving, setViewSaving] = useState(false);
  const [cards, setCards] = useState([]);

  useEffect(() => {
    fetchContent();
    fetchViewStatus();
    fetchCards();
  }, []);

  const fetchContent = async () => {
    try {
      const response = await axios.get('/api/content/foundation');
      
      if (response.data.success) {
        setContent(response.data.content);
        setEditContent(response.data.content);
      }
    } catch (error) {
      console.error('Error fetching foundation content:', error);
      setError('載入內容失敗');
    } finally {
      setLoading(false);
    }
  };

  const fetchCards = async () => {
    try {
      const res = await axios.get('/api/content/foundation/cards');
      setCards(Array.isArray(res.data.cards) ? res.data.cards : []);
    } catch (err) {
      console.error('Error fetching foundation cards:', err);
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

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await axios.put('/api/content/foundation', {
        content: editContent
      });
      
      if (response.data.success) {
        setContent(editContent);
        setEditMode(false);
        setSuccess('內容更新成功');
      } else {
        setError(response.data.message || '更新失敗');
      }
    } catch (error) {
      console.error('Error updating foundation content:', error);
      setError('更新內容失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditContent(content);
    setEditMode(false);
    setError('');
    setSuccess('');
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
            {isAdmin() && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="bg-gold-600 hover:bg-gold-700 text-primary-900 font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
              >
                編輯內容
              </button>
            )}
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

        {/* 錯誤和成功訊息 */}
        {error && (
          <div className="mb-6 bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* 內容區域 */}
        <div className="bg-primary-800 border border-gold-600 rounded-lg shadow-xl">
          {editMode ? (
            // 編輯模式
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gold-300 mb-2">
                  商會地基內容
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={20}
                  className="w-full px-3 py-2 bg-primary-700 border border-gold-600 text-gold-100 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-400 placeholder-gold-400"
                  placeholder="請輸入商會地基內容..."
                />
                <p className="mt-2 text-sm text-gold-400">
                  支援基本的HTML標籤，如 &lt;p&gt;、&lt;br&gt;、&lt;strong&gt;、&lt;em&gt; 等
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancel}
                  className="bg-primary-700 hover:bg-primary-600 text-gold-300 border border-gold-600 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                  disabled={saving}
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="bg-gold-600 hover:bg-gold-700 text-primary-900 font-semibold py-2 px-4 rounded-lg transition-colors duration-200"
                  disabled={saving}
                >
                  {saving ? '儲存中...' : '儲存'}
                </button>
              </div>
            </div>
          ) : (
            // 顯示模式
            <div className="p-6">
              {cards.length > 0 ? (
                <div className="space-y-4">
                  {cards.map((c) => (
                    <div key={c.id} className="bg-primary-900 border border-gold-600 rounded p-4">
                      <h3 className="text-gold-100 font-semibold">{c.title}</h3>
                      <p className="text-gold-300 whitespace-pre-line mt-1">{c.description}</p>
                    </div>
                  ))}
                </div>
              ) : content ? (
                <div 
                  className="prose prose-invert max-w-none text-gold-100"
                  dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br>') }}
                />
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
          )}
        </div>

        {/* 權限說明 */}
        {!isAdmin() && (
          <div className="mt-6 bg-primary-800 border border-gold-600 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-5 w-5 text-gold-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-gold-200">
                  內容管理權限
                </h3>
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