/**
 * 同步狀態指示器組件
 * 顯示當前的同步狀態、網路狀態和最後同步時間
 */

import React from 'react';
import { useSyncStatus } from '../hooks/useRealtimeSync';

const SyncStatusIndicator = ({ className = '', showDetails = false }) => {
  const { status, isOnline, lastSyncTime, pendingChanges } = useSyncStatus();

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: '📴',
        text: '離線',
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        description: '目前離線，變更將在連線後同步'
      };
    }

    switch (status) {
      case 'syncing':
        return {
          icon: '🔄',
          text: '同步中',
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          description: '正在同步資料...'
        };
      case 'error':
        return {
          icon: '⚠️',
          text: '同步失敗',
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          description: '同步發生錯誤，請檢查網路連線'
        };
      case 'offline':
        return {
          icon: '📴',
          text: '離線模式',
          color: 'text-orange-600',
          bgColor: 'bg-orange-50',
          description: `有 ${pendingChanges} 個變更待同步`
        };
      default:
        return {
          icon: '✅',
          text: '已同步',
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          description: '所有變更已同步'
        };
    }
  };

  const formatLastSyncTime = (timestamp) => {
    if (!timestamp) return '從未同步';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) return '剛剛';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
    return new Date(timestamp).toLocaleDateString();
  };

  const statusInfo = getStatusInfo();

  if (!showDetails) {
    // 簡化版本 - 只顯示圖示和狀態
    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusInfo.color} ${statusInfo.bgColor} ${className}`}>
        <span className="text-sm">{statusInfo.icon}</span>
        <span>{statusInfo.text}</span>
      </div>
    );
  }

  // 詳細版本
  return (
    <div className={`p-3 rounded-lg border ${statusInfo.bgColor} border-gray-200 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{statusInfo.icon}</span>
          <div>
            <div className={`font-medium text-sm ${statusInfo.color}`}>
              {statusInfo.text}
            </div>
            <div className="text-xs text-gray-500">
              {statusInfo.description}
            </div>
          </div>
        </div>
        
        {lastSyncTime && (
          <div className="text-xs text-gray-400">
            {formatLastSyncTime(lastSyncTime)}
          </div>
        )}
      </div>
      
      {pendingChanges > 0 && (
        <div className="mt-2 text-xs text-orange-600">
          {pendingChanges} 個變更待同步
        </div>
      )}
    </div>
  );
};

/**
 * 浮動同步狀態指示器
 * 固定在畫面角落的小型狀態指示器
 */
export const FloatingSyncIndicator = ({ position = 'bottom-right' }) => {
  const { status, isOnline } = useSyncStatus();

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'bottom-4 right-4';
    }
  };

  const getStatusColor = () => {
    if (!isOnline) return 'bg-gray-400';
    
    switch (status) {
      case 'syncing':
        return 'bg-blue-500 animate-pulse';
      case 'error':
        return 'bg-red-500';
      case 'offline':
        return 'bg-orange-500';
      default:
        return 'bg-green-500';
    }
  };

  return (
    <div className={`fixed ${getPositionClasses()} z-50`}>
      <div className={`w-3 h-3 rounded-full ${getStatusColor()} shadow-lg`} />
    </div>
  );
};

/**
 * 同步狀態工具列
 * 適合放在編輯器頂部的工具列
 */
export const SyncStatusToolbar = ({ onManualSync, onReload, onReset, resetDisabled = false, className = '' }) => {
  const { status, isOnline, lastSyncTime, pendingChanges } = useSyncStatus();

  const handleManualSync = () => {
    if (onManualSync && isOnline) {
      onManualSync();
    }
  };

  return (
    <div className={`flex items-center justify-between p-2 bg-gray-50 border-b ${className}`}>
      <SyncStatusIndicator />
      
      <div className="flex items-center gap-2">
        {lastSyncTime && (
          <span className="text-xs text-gray-500">
            最後同步: {new Date(lastSyncTime).toLocaleTimeString()}
          </span>
        )}
        {onReload && (
          <button
            onClick={onReload}
            className="px-3 py-1 text-xs bg-gray-700 text-white rounded hover:bg-gray-800"
          >
            重新載入
          </button>
        )}
        {onReset && (
          <button
            onClick={onReset}
            disabled={resetDisabled || status === 'syncing'}
            className="px-3 py-1 text-xs bg-rose-600 text-white rounded hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="重置名片"
          >
            重置名片
          </button>
        )}
        
        {isOnline && onManualSync && (
          <button
            onClick={handleManualSync}
            disabled={status === 'syncing'}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'syncing' ? '同步中...' : '手動同步'}
          </button>
        )}
      </div>
    </div>
  );
};

export default SyncStatusIndicator;