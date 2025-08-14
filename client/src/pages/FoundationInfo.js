import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DocumentTextIcon } from '@heroicons/react/24/outline';
import axios from 'axios';

const FoundationInfo = () => {
  const { user } = useAuth();
  const [content, setContent] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchContent();
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DocumentTextIcon className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-3xl font-bold text-gray-900">商會地基</h1>
                <p className="mt-2 text-gray-600">商會基礎資訊與核心理念</p>
              </div>
            </div>
            {isAdmin() && !editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="btn-primary"
              >
                編輯內容
              </button>
            )}
          </div>
        </div>

        {/* 錯誤和成功訊息 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {/* 內容區域 */}
        <div className="bg-white rounded-lg shadow">
          {editMode ? (
            // 編輯模式
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  商會地基內容
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="請輸入商會地基內容..."
                />
                <p className="mt-2 text-sm text-gray-500">
                  支援基本的HTML標籤，如 &lt;p&gt;、&lt;br&gt;、&lt;strong&gt;、&lt;em&gt; 等
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCancel}
                  className="btn-secondary"
                  disabled={saving}
                >
                  取消
                </button>
                <button
                  onClick={handleSave}
                  className="btn-primary"
                  disabled={saving}
                >
                  {saving ? '儲存中...' : '儲存'}
                </button>
              </div>
            </div>
          ) : (
            // 顯示模式
            <div className="p-6">
              {content ? (
                <div 
                  className="prose max-w-none"
                  dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br>') }}
                />
              ) : (
                <div className="text-center py-12">
                  <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">暫無內容</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {isAdmin() ? '點擊「編輯內容」開始添加商會地基資訊' : '管理員尚未設定商會地基內容'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 權限說明 */}
        {!isAdmin() && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <DocumentTextIcon className="h-5 w-5 text-blue-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  內容管理權限
                </h3>
                <div className="mt-2 text-sm text-blue-700">
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