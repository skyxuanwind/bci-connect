import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { DocumentTextIcon, LinkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import axios from '../../config/axios';

const ContentManagement = () => {
  const { user } = useAuth();
  const [presentationUrl, setPresentationUrl] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchPresentationUrl();
  }, []);

  const fetchPresentationUrl = async () => {
    try {
      const response = await axios.get('/api/content/presentation-url');
      const data = response.data;
      
      if (data.success) {
        setPresentationUrl(data.url);
        setEditUrl(data.url);
      }
    } catch (error) {
      console.error('Error fetching presentation URL:', error);
      setError('載入簡報URL失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUrl = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    
    try {
      const response = await axios.put('/api/content/presentation-url', { url: editUrl });
      
      const data = response.data;
      
      if (data.success) {
        setPresentationUrl(editUrl);
        setSuccess('商會簡報URL更新成功');
      } else {
        setError(data.message || '更新失敗');
      }
    } catch (error) {
      console.error('Error updating presentation URL:', error);
      setError('更新簡報URL失敗');
    } finally {
      setSaving(false);
    }
  };

  const handleTestUrl = () => {
    if (editUrl) {
      window.open(editUrl, '_blank');
    }
  };

  // 檢查權限 - 僅限管理員
  if (!user || !(user.membershipLevel === 1 && user.email.includes('admin'))) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">權限不足</h2>
          <p className="text-gray-600">此功能僅限管理員使用</p>
        </div>
      </div>
    );
  }

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
    <div className="space-y-6">
      {/* 頁面標題 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">靜態內容管理</h1>
        <p className="mt-1 text-sm text-gray-600">管理商會地基和簡報連結等靜態內容</p>
      </div>

      {/* 錯誤和成功訊息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* 商會地基管理 */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">商會地基</h2>
          </div>
        </div>
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            商會地基頁面包含商會的基礎資訊與核心理念，所有會員都可以查看此內容。
          </p>
          <a
            href="/foundation"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary inline-flex items-center"
          >
            <DocumentTextIcon className="h-4 w-4 mr-2" />
            前往編輯商會地基
          </a>
        </div>
      </div>

      {/* 商會簡報URL管理 */}
      <div className="card">
        <div className="card-header">
          <div className="flex items-center">
            <LinkIcon className="h-5 w-5 text-gray-400 mr-2" />
            <h2 className="text-lg font-medium text-gray-900">商會簡報連結</h2>
          </div>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Google 簡報 URL
              </label>
              <div className="flex space-x-3">
                <input
                  type="url"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  placeholder="https://docs.google.com/presentation/d/..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <button
                  onClick={handleTestUrl}
                  disabled={!editUrl}
                  className="btn-secondary"
                >
                  測試連結
                </button>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                請輸入完整的Google簡報分享連結，會員點擊導覽列的「商會簡報」時將開啟此連結。
              </p>
            </div>

            {presentationUrl && (
              <div className="bg-gray-50 rounded-md p-4">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm font-medium text-gray-900">目前設定的URL：</span>
                </div>
                <p className="mt-1 text-sm text-gray-600 break-all">{presentationUrl}</p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleSaveUrl}
                disabled={saving || !editUrl}
                className="btn-primary"
              >
                {saving ? '儲存中...' : '儲存設定'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 使用說明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <DocumentTextIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              使用說明
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ul className="list-disc list-inside space-y-1">
                <li>商會地基：點擊上方連結可直接編輯商會地基頁面內容</li>
                <li>商會簡報：設定Google簡報的分享連結，會員可從導覽列直接開啟</li>
                <li>所有會員都可以查看商會地基內容和開啟商會簡報</li>
                <li>只有管理員可以編輯這些內容</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContentManagement;