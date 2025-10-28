import React, { useState } from 'react';
import { toast } from 'react-hot-toast';

/**
 * 衝突解決模態框
 * 當檢測到資料衝突時，提供使用者選擇解決方案的介面
 */
const ConflictResolutionModal = ({ 
  isOpen, 
  onClose, 
  localData, 
  remoteData, 
  onResolve,
  conflictPath = ''
}) => {
  const [selectedResolution, setSelectedResolution] = useState('remote');
  const [isResolving, setIsResolving] = useState(false);

  if (!isOpen) return null;

  const handleResolve = async () => {
    setIsResolving(true);
    try {
      let resolvedData;
      
      switch (selectedResolution) {
        case 'local':
          resolvedData = localData;
          break;
        case 'remote':
          resolvedData = remoteData;
          break;
        case 'merge':
          // 智能合併策略
          resolvedData = mergeData(localData, remoteData);
          break;
        default:
          resolvedData = remoteData;
      }

      await onResolve(resolvedData);
      toast.success('衝突已解決');
      onClose();
    } catch (error) {
      console.error('Conflict resolution failed:', error);
      toast.error('解決衝突失敗');
    } finally {
      setIsResolving(false);
    }
  };

  const mergeData = (local, remote) => {
    // 智能合併邏輯
    const merged = { ...remote };
    
    // 保留本地的非空值
    Object.keys(local).forEach(key => {
      if (key.startsWith('_')) return; // 跳過系統欄位
      
      if (local[key] && (!remote[key] || local[key] !== remote[key])) {
        // 如果本地有值而遠端沒有，或者值不同，則需要決策
        if (Array.isArray(local[key]) && Array.isArray(remote[key])) {
          // 陣列合併：保留更長的陣列
          merged[key] = local[key].length > remote[key].length ? local[key] : remote[key];
        } else if (typeof local[key] === 'object' && typeof remote[key] === 'object') {
          // 物件合併
          merged[key] = { ...remote[key], ...local[key] };
        } else {
          // 基本類型：使用最新的時間戳記決定
          const localTime = local._lastModified || 0;
          const remoteTime = remote._lastModified || 0;
          merged[key] = localTime > remoteTime ? local[key] : remote[key];
        }
      }
    });

    return merged;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '未知時間';
    return new Date(timestamp).toLocaleString('zh-TW');
  };

  const getDataPreview = (data) => {
    if (!data) return '無資料';
    
    const preview = {};
    Object.keys(data).forEach(key => {
      if (!key.startsWith('_')) {
        preview[key] = data[key];
      }
    });
    
    return JSON.stringify(preview, null, 2).substring(0, 200) + '...';
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            資料衝突解決
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            檢測到資料衝突，請選擇解決方案
          </p>
          {conflictPath && (
            <p className="text-xs text-gray-500 mt-1">
              路徑: {conflictPath}
            </p>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* 衝突選項 */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="remote"
                name="resolution"
                value="remote"
                checked={selectedResolution === 'remote'}
                onChange={(e) => setSelectedResolution(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <label htmlFor="remote" className="flex-1">
                <div className="font-medium text-gray-900">使用遠端版本（推薦）</div>
                <div className="text-sm text-gray-600">
                  最後修改: {formatTimestamp(remoteData?._lastModified)}
                </div>
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="local"
                name="resolution"
                value="local"
                checked={selectedResolution === 'local'}
                onChange={(e) => setSelectedResolution(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <label htmlFor="local" className="flex-1">
                <div className="font-medium text-gray-900">使用本地版本</div>
                <div className="text-sm text-gray-600">
                  您的修改將覆蓋遠端資料
                </div>
              </label>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="merge"
                name="resolution"
                value="merge"
                checked={selectedResolution === 'merge'}
                onChange={(e) => setSelectedResolution(e.target.value)}
                className="w-4 h-4 text-blue-600"
              />
              <label htmlFor="merge" className="flex-1">
                <div className="font-medium text-gray-900">智能合併</div>
                <div className="text-sm text-gray-600">
                  嘗試自動合併兩個版本的資料
                </div>
              </label>
            </div>
          </div>

          {/* 資料預覽 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-gray-200 rounded-lg p-3">
              <h4 className="font-medium text-gray-900 mb-2">本地版本</h4>
              <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                {getDataPreview(localData)}
              </pre>
            </div>
            
            <div className="border border-gray-200 rounded-lg p-3">
              <h4 className="font-medium text-gray-900 mb-2">遠端版本</h4>
              <pre className="text-xs text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
                {getDataPreview(remoteData)}
              </pre>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isResolving}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleResolve}
            disabled={isResolving}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center space-x-2"
          >
            {isResolving && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            )}
            <span>{isResolving ? '解決中...' : '解決衝突'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConflictResolutionModal;