import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PencilIcon,
  EyeIcon,
  EyeSlashIcon,
  Bars3Icon,
  XMarkIcon,
  CheckIcon,
  PlusIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const BlockCustomizer = ({ 
  blocks = [], 
  onBlocksChange, 
  isOpen, 
  onClose,
  onSave 
}) => {
  const [localBlocks, setLocalBlocks] = useState([]);
  const [editingBlock, setEditingBlock] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    if (blocks) {
      // 為每個板塊添加 visible 屬性（如果沒有的話）
      const blocksWithVisibility = blocks.map((block, index) => ({
        ...block,
        id: block.id || `block-${index}`,
        visible: block.visible !== undefined ? block.visible : true,
        order: block.order !== undefined ? block.order : index
      }));
      setLocalBlocks(blocksWithVisibility);
    }
  }, [blocks]);

  // 拖拽結束處理
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(localBlocks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // 更新順序
    const updatedItems = items.map((item, index) => ({
      ...item,
      order: index
    }));

    setLocalBlocks(updatedItems);
  };

  // 切換板塊可見性
  const toggleBlockVisibility = (blockId) => {
    setLocalBlocks(prev => 
      prev.map(block => 
        block.id === blockId 
          ? { ...block, visible: !block.visible }
          : block
      )
    );
  };

  // 開始編輯板塊
  const startEditBlock = (block) => {
    setEditingBlock(block.id);
    setEditForm({
      title: block.title || '',
      content: block.content_data?.text || block.content_data?.title || '',
      url: block.content_data?.url || ''
    });
  };

  // 保存編輯
  const saveEdit = () => {
    setLocalBlocks(prev =>
      prev.map(block => {
        if (block.id === editingBlock) {
          const updatedBlock = { ...block };
          
          // 更新標題
          if (editForm.title !== undefined) {
            updatedBlock.title = editForm.title;
          }

          // 根據內容類型更新數據
          if (block.content_type === 'text') {
            updatedBlock.content_data = {
              ...updatedBlock.content_data,
              text: editForm.content,
              title: editForm.title
            };
          } else if (block.content_type === 'link' || block.content_type === 'website') {
            updatedBlock.content_data = {
              ...updatedBlock.content_data,
              title: editForm.title,
              url: editForm.url
            };
          }

          return updatedBlock;
        }
        return block;
      })
    );
    
    setEditingBlock(null);
    setEditForm({});
  };

  // 取消編輯
  const cancelEdit = () => {
    setEditingBlock(null);
    setEditForm({});
  };

  // 刪除板塊
  const deleteBlock = (blockId) => {
    setLocalBlocks(prev => prev.filter(block => block.id !== blockId));
  };

  // 保存所有更改
  const handleSave = () => {
    if (onSave) {
      onSave(localBlocks);
    }
    if (onBlocksChange) {
      onBlocksChange(localBlocks);
    }
    onClose();
  };

  // 獲取板塊類型的中文名稱
  const getBlockTypeName = (contentType) => {
    const typeMap = {
      'text': '文字',
      'link': '連結',
      'website': '網站',
      'image': '圖片',
      'video': '影片',
      'social': '社群媒體',
      'file': '檔案',
      'news': '新聞',
      'map': '地圖',
      'carousel': '輪播圖',
      'icon': '圖標'
    };
    return typeMap[contentType] || contentType;
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 標題欄 */}
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">自定義板塊</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* 說明文字 */}
          <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <p className="text-blue-300 text-sm">
              您可以拖拽調整板塊順序、編輯內容、控制顯示狀態。隱藏的板塊不會在名片上顯示。
            </p>
          </div>

          {/* 板塊列表 */}
          <div className="flex-1 overflow-y-auto">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="blocks">
                {(provided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {localBlocks.map((block, index) => (
                      <Draggable
                        key={block.id}
                        draggableId={block.id}
                        index={index}
                      >
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`bg-slate-700 rounded-lg p-4 border ${
                              snapshot.isDragging 
                                ? 'border-blue-500 shadow-lg' 
                                : 'border-slate-600'
                            } ${!block.visible ? 'opacity-50' : ''}`}
                          >
                            <div className="flex items-center justify-between">
                              {/* 拖拽手柄和基本信息 */}
                              <div className="flex items-center space-x-3 flex-1">
                                <div
                                  {...provided.dragHandleProps}
                                  className="text-gray-400 hover:text-white cursor-grab"
                                >
                                  <Bars3Icon className="w-5 h-5" />
                                </div>
                                
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-white font-medium">
                                      {block.title || `${getBlockTypeName(block.content_type)}板塊`}
                                    </span>
                                    <span className="text-xs px-2 py-1 bg-slate-600 text-gray-300 rounded">
                                      {getBlockTypeName(block.content_type)}
                                    </span>
                                  </div>
                                  
                                  {editingBlock === block.id ? (
                                    <div className="mt-2 space-y-2">
                                      <input
                                        type="text"
                                        placeholder="標題"
                                        value={editForm.title || ''}
                                        onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-600 text-white rounded border border-slate-500 focus:border-blue-500 focus:outline-none"
                                      />
                                      
                                      {(block.content_type === 'text') && (
                                        <textarea
                                          placeholder="內容"
                                          value={editForm.content || ''}
                                          onChange={(e) => setEditForm(prev => ({ ...prev, content: e.target.value }))}
                                          className="w-full px-3 py-2 bg-slate-600 text-white rounded border border-slate-500 focus:border-blue-500 focus:outline-none resize-none"
                                          rows="2"
                                        />
                                      )}
                                      
                                      {(block.content_type === 'link' || block.content_type === 'website') && (
                                        <input
                                          type="url"
                                          placeholder="網址"
                                          value={editForm.url || ''}
                                          onChange={(e) => setEditForm(prev => ({ ...prev, url: e.target.value }))}
                                          className="w-full px-3 py-2 bg-slate-600 text-white rounded border border-slate-500 focus:border-blue-500 focus:outline-none"
                                        />
                                      )}
                                      
                                      <div className="flex space-x-2">
                                        <button
                                          onClick={saveEdit}
                                          className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded text-sm transition-colors"
                                        >
                                          <CheckIcon className="w-4 h-4" />
                                        </button>
                                        <button
                                          onClick={cancelEdit}
                                          className="px-3 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded text-sm transition-colors"
                                        >
                                          <XMarkIcon className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-400 mt-1">
                                      {block.content_data?.text || block.content_data?.title || block.content_data?.url || '無內容'}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* 操作按鈕 */}
                              {editingBlock !== block.id && (
                                <div className="flex items-center space-x-2">
                                  <button
                                    onClick={() => toggleBlockVisibility(block.id)}
                                    className={`p-2 rounded transition-colors ${
                                      block.visible 
                                        ? 'text-green-400 hover:bg-green-500/20' 
                                        : 'text-gray-400 hover:bg-gray-500/20'
                                    }`}
                                    title={block.visible ? '隱藏板塊' : '顯示板塊'}
                                  >
                                    {block.visible ? (
                                      <EyeIcon className="w-5 h-5" />
                                    ) : (
                                      <EyeSlashIcon className="w-5 h-5" />
                                    )}
                                  </button>
                                  
                                  <button
                                    onClick={() => startEditBlock(block)}
                                    className="p-2 text-blue-400 hover:bg-blue-500/20 rounded transition-colors"
                                    title="編輯板塊"
                                  >
                                    <PencilIcon className="w-5 h-5" />
                                  </button>
                                  
                                  <button
                                    onClick={() => deleteBlock(block.id)}
                                    className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-colors"
                                    title="刪除板塊"
                                  >
                                    <TrashIcon className="w-5 h-5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>

          {/* 底部按鈕 */}
          <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-slate-600">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
            >
              保存更改
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default BlockCustomizer;