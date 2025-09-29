import React, { useState, useEffect } from 'react';
import axios from 'axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import {
  BuildingOfficeIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  UserGroupIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

const ChapterManagement = () => {
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [processingChapter, setProcessingChapter] = useState(null);

  const {
    register: registerCreate,
    handleSubmit: handleSubmitCreate,
    formState: { errors: createErrors },
    reset: resetCreate
  } = useForm();

  const {
    register: registerEdit,
    handleSubmit: handleSubmitEdit,
    formState: { errors: editErrors },
    reset: resetEdit,
    setValue: setEditValue
  } = useForm();

  useEffect(() => {
    loadChapters();
  }, []);

  const loadChapters = async () => {
    try {
      const response = await axios.get('/api/chapters');
      setChapters(response.data.chapters || []);
    } catch (error) {
      console.error('Failed to load chapters:', error);
      toast.error('載入分會列表失敗');
      setChapters([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (chapters.length > 0) {
      (async () => {
        try {
          // Load chapters with member counts
          const response = await axios.get('/api/admin/dashboard');
          if (response.data.chapterStats) {
            const chaptersWithStats = chapters.map(chapter => {
              const stat = response.data.chapterStats.find(s => s.id === chapter.id);
              return {
                ...chapter,
                memberCount: stat ? stat.memberCount : 0
              };
            });
            setChapters(chaptersWithStats);
          }
        } catch (error) {
          console.error('Failed to load chapter details:', error);
        }
      })();
    }
  }, [chapters]);

  const handleCreateChapter = async (data) => {
    setProcessingChapter('create');
    try {
      const response = await axios.post('/api/chapters', data);
      toast.success('分會創建成功');
      setChapters([...chapters, response.data]);
      setShowCreateModal(false);
      resetCreate();
    } catch (error) {
      console.error('Failed to create chapter:', error);
      toast.error(error.response?.data?.message || '創建分會失敗');
    } finally {
      setProcessingChapter(null);
    }
  };

  const handleEditChapter = (chapter) => {
    setSelectedChapter(chapter);
    setEditValue('name', chapter.name);
    setShowEditModal(true);
  };

  const handleUpdateChapter = async (data) => {
    if (!selectedChapter) return;
    
    setProcessingChapter(selectedChapter.id);
    try {
      const response = await axios.put(`/api/chapters/${selectedChapter.id}`, data);
      toast.success('分會更新成功');
      setChapters(chapters.map(chapter => 
        chapter.id === selectedChapter.id ? response.data : chapter
      ));
      setShowEditModal(false);
      setSelectedChapter(null);
      resetEdit();
    } catch (error) {
      console.error('Failed to update chapter:', error);
      toast.error(error.response?.data?.message || '更新分會失敗');
    } finally {
      setProcessingChapter(null);
    }
  };

  const handleDeleteChapter = async (chapter) => {
    if (!window.confirm(`確定要刪除分會「${chapter.name}」嗎？\n\n注意：只有沒有會員的分會才能被刪除。`)) {
      return;
    }
    
    setProcessingChapter(chapter.id);
    try {
      await axios.delete(`/api/chapters/${chapter.id}`);
      toast.success('分會刪除成功');
      setChapters(chapters.filter(c => c.id !== chapter.id));
    } catch (error) {
      console.error('Failed to delete chapter:', error);
      toast.error(error.response?.data?.message || '刪除分會失敗');
    } finally {
      setProcessingChapter(null);
    }
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    resetCreate();
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedChapter(null);
    resetEdit();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">分會管理</h1>
          <p className="mt-1 text-sm text-gray-600">
            管理所有分會設定，共有 {chapters.length} 個分會
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            新增分會
          </button>
        </div>
      </div>

      {/* Chapters Grid */}
      {chapters.length === 0 ? (
        <div className="text-center py-12">
          <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">沒有分會</h3>
          <p className="mt-1 text-sm text-gray-500">
            開始創建第一個分會
          </p>
          <div className="mt-6">
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary"
            >
              新增分會
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {chapters.map((chapter) => (
            <div key={chapter.id} className="card">
              <div className="p-6">
                {/* Chapter Header */}
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <BuildingOfficeIcon className="h-6 w-6 text-primary-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900 truncate">
                      {chapter.name}
                    </h3>
                    <p className="text-sm text-gray-500">分會 ID: {chapter.id}</p>
                  </div>
                </div>

                {/* Member Count */}
                <div className="mb-6">
                  <div className="flex items-center text-sm text-gray-600">
                    <UserGroupIcon className="h-4 w-4 mr-2" />
                    <span>
                      {chapter.memberCount !== undefined ? `${chapter.memberCount} 位會員` : '載入中...'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditChapter(chapter)}
                    disabled={processingChapter === chapter.id}
                    className="flex-1 btn-secondary flex items-center justify-center text-sm"
                  >
                    {processingChapter === chapter.id ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      <>
                        <PencilIcon className="h-4 w-4 mr-1" />
                        編輯
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleDeleteChapter(chapter)}
                    disabled={processingChapter === chapter.id || (chapter.memberCount && chapter.memberCount > 0)}
                    className="flex-1 btn-danger flex items-center justify-center text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    title={chapter.memberCount && chapter.memberCount > 0 ? '有會員的分會無法刪除' : '刪除分會'}
                  >
                    {processingChapter === chapter.id ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      <>
                        <TrashIcon className="h-4 w-4 mr-1" />
                        刪除
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Chapter Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">新增分會</h3>
              <button
                onClick={closeCreateModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitCreate(handleCreateChapter)} className="space-y-4">
              <div>
                <label className="label">
                  <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                  分會名稱
                </label>
                <input
                  type="text"
                  className={`input ${createErrors.name ? 'input-error' : ''}`}
                  placeholder="請輸入分會名稱"
                  {...registerCreate('name', {
                    required: '請輸入分會名稱',
                    minLength: { value: 2, message: '分會名稱至少需要2個字符' },
                    maxLength: { value: 50, message: '分會名稱不能超過50個字符' }
                  })}
                />
                {createErrors.name && (
                  <p className="error-message">{createErrors.name.message}</p>
                )}
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">注意事項</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc list-inside space-y-1">
                        <li>分會名稱必須唯一</li>
                        <li>創建後可以修改分會名稱</li>
                        <li>只有沒有會員的分會才能被刪除</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeCreateModal}
                  className="flex-1 btn-secondary"
                  disabled={processingChapter === 'create'}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={processingChapter === 'create'}
                >
                  {processingChapter === 'create' ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span className="ml-2">創建中...</span>
                    </>
                  ) : (
                    '創建分會'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Chapter Modal */}
      {showEditModal && selectedChapter && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">編輯分會</h3>
              <button
                onClick={closeEditModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleSubmitEdit(handleUpdateChapter)} className="space-y-4">
              <div>
                <label className="label">
                  <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                  分會名稱
                </label>
                <input
                  type="text"
                  className={`input ${editErrors.name ? 'input-error' : ''}`}
                  placeholder="請輸入分會名稱"
                  {...registerEdit('name', {
                    required: '請輸入分會名稱',
                    minLength: { value: 2, message: '分會名稱至少需要2個字符' },
                    maxLength: { value: 50, message: '分會名稱不能超過50個字符' }
                  })}
                />
                {editErrors.name && (
                  <p className="error-message">{editErrors.name.message}</p>
                )}
              </div>
              
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <div className="flex items-center text-sm text-gray-600">
                  <UserGroupIcon className="h-4 w-4 mr-2" />
                  <span>
                    目前有 {selectedChapter.memberCount || 0} 位會員
                  </span>
                </div>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={closeEditModal}
                  className="flex-1 btn-secondary"
                  disabled={processingChapter === selectedChapter.id}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 btn-primary"
                  disabled={processingChapter === selectedChapter.id}
                >
                  {processingChapter === selectedChapter.id ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span className="ml-2">更新中...</span>
                    </>
                  ) : (
                    '更新分會'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChapterManagement;