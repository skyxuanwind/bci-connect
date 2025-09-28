import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../config/axios';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { arrayMove, SortableContext, verticalListSortingStrategy } from '@hello-pangea/dnd';
import { DocumentTextIcon, PlusIcon, TrashIcon, PencilIcon, ClipboardDocumentIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const emptyCard = () => ({ id: `${Date.now()}`, title: '', description: '', icon: null });

const CardItem = ({ card, index, onEdit, onDelete, onCopy }) => {
  return (
    <div className="bg-primary-800 border border-gold-600 rounded-lg p-4 mb-3">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-lg font-semibold text-gold-100">{card.title || '未命名地基'}</h4>
          <p className="mt-1 text-gold-300 whitespace-pre-line">{card.description || '（尚未填寫描述）'}</p>
        </div>
        <div className="flex space-x-2">
          <button className="btn-icon" title="編輯" onClick={() => onEdit(card)}>
            <PencilIcon className="h-5 w-5 text-gold-400" />
          </button>
          <button className="btn-icon" title="複製" onClick={() => onCopy(card)}>
            <ClipboardDocumentIcon className="h-5 w-5 text-gold-400" />
          </button>
          <button className="btn-icon" title="刪除" onClick={() => onDelete(card)}>
            <TrashIcon className="h-5 w-5 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
};

const FoundationManagement = () => {
  const { user } = useAuth();
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', description: '' });
  const [formErrors, setFormErrors] = useState({});

  const isAdmin = () => user && user.membershipLevel === 1 && user.email.includes('admin');

  useEffect(() => {
    const load = async () => {
      try {
        const res = await axios.get('/api/content/foundation/cards');
        setCards(Array.isArray(res.data.cards) ? res.data.cards : []);
      } catch (e) {
        setError('載入地基卡片失敗');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const openNew = () => {
    setEditing({ id: null });
    setForm({ title: '', description: '' });
    setFormErrors({});
  };

  const openEdit = (card) => {
    setEditing(card);
    setForm({ title: card.title || '', description: card.description || '' });
    setFormErrors({});
  };

  const handleCopy = (card) => {
    const copy = { ...card, id: `${Date.now()}` };
    setCards((prev) => [...prev, copy]);
    setSuccess('已複製地基卡片');
  };

  const handleDelete = (card) => {
    setCards((prev) => prev.filter((c) => c.id !== card.id));
  };

  const validate = () => {
    const errs = {};
    if (!form.title.trim()) errs.title = '請輸入地基名稱';
    if (!form.description.trim()) errs.description = '請輸入地基描述';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSaveCard = () => {
    if (!validate()) return;
    if (editing?.id) {
      // 更新既有
      setCards((prev) => prev.map((c) => (c.id === editing.id ? { ...c, title: form.title.trim(), description: form.description.trim() } : c)));
    } else {
      // 新增
      const newCard = { id: `${Date.now()}`, title: form.title.trim(), description: form.description.trim() };
      setCards((prev) => [...prev, newCard]);
    }
    setEditing(null);
    setSuccess('已更新卡片');
  };

  const handleCancelEdit = () => {
    setEditing(null);
    setFormErrors({});
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(cards);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setCards(items);
  };

  const saveAll = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = cards.map((c) => ({ id: c.id, title: c.title, description: c.description }));
      const res = await axios.put('/api/content/foundation/cards', { cards: payload });
      if (res.data.success) {
        setSuccess('地基卡片已儲存');
      } else {
        setError(res.data.message || '儲存失敗');
      }
    } catch (e) {
      setError('儲存地基卡片失敗');
    } finally {
      setSaving(false);
    }
  };

  if (!isAdmin()) {
    return (
      <div className="min-h-screen bg-primary-900 py-8">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-primary-800 border border-gold-600 rounded-lg p-6">
            <p className="text-gold-200">此頁面僅限管理員使用。</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-900 py-8">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center">
            <DocumentTextIcon className="h-8 w-8 text-gold-400 mr-3" />
            <div>
              <h1 className="text-3xl font-bold text-gold-100">地基管理</h1>
              <p className="mt-2 text-gold-300">以卡片式介面管理商會地基內容，支援拖放排序與即時預覽。</p>
            </div>
          </div>
          <div className="space-x-2">
            <button className="bg-gold-600 hover:bg-gold-700 text-primary-900 font-semibold py-2 px-4 rounded-lg" onClick={openNew}>
              <PlusIcon className="h-5 w-5 inline mr-1" /> 新增地基
            </button>
            <button className="bg-primary-700 hover:bg-primary-600 text-gold-200 border border-gold-600 font-medium py-2 px-4 rounded-lg" onClick={saveAll} disabled={saving}>
              {saving ? '儲存中...' : '儲存全部'}
            </button>
          </div>
        </div>

        {error && <div className="mb-4 bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded">{error}</div>}
        {success && <div className="mb-4 bg-green-900 border border-green-700 text-green-300 px-4 py-3 rounded">{success}</div>}

        {/* 卡片列表（可拖放） */}
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="foundationCards">
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps}>
                {cards.length === 0 ? (
                  <div className="bg-primary-800 border border-gold-600 rounded-lg p-6 text-center text-gold-300">
                    尚未建立任何地基卡片，點擊右上角「新增地基」開始。
                  </div>
                ) : (
                  cards.map((card, idx) => (
                    <Draggable key={card.id} draggableId={String(card.id)} index={idx}>
                      {(dragProvided) => (
                        <div
                          ref={dragProvided.innerRef}
                          {...dragProvided.draggableProps}
                          {...dragProvided.dragHandleProps}
                        >
                          <CardItem card={card} index={idx} onEdit={openEdit} onDelete={handleDelete} onCopy={handleCopy} />
                        </div>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* 右側預覽（此頁以同欄顯示簡易預覽） */}
        <div className="mt-6 bg-primary-800 border border-gold-600 rounded-lg p-6">
          <h3 className="text-xl font-semibold text-gold-100 mb-4">即時預覽</h3>
          {cards.length === 0 ? (
            <p className="text-gold-300">尚未有內容。</p>
          ) : (
            <div className="space-y-3">
              {cards.map((c) => (
                <div key={`preview-${c.id}`} className="bg-primary-900 border border-gold-600 rounded p-4">
                  <h4 className="text-gold-100 font-medium">{c.title}</h4>
                  <p className="text-gold-300 whitespace-pre-line mt-1">{c.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 編輯表單 Modal（簡易內嵌） */}
        {editing && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-primary-800 border border-gold-600 rounded-lg w-full max-w-lg p-6">
              <h3 className="text-xl font-semibold text-gold-100 mb-4">{editing.id ? '編輯地基' : '新增地基'}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gold-300 mb-2">地基名稱</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full px-3 py-2 bg-primary-700 border border-gold-600 text-gold-100 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="例如：願景、使命、核心價值"
                  />
                  {formErrors.title && <p className="text-red-400 text-sm mt-1">{formErrors.title}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gold-300 mb-2">地基描述</label>
                  <textarea
                    rows={6}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 bg-primary-700 border border-gold-600 text-gold-100 rounded-md focus:outline-none focus:ring-2 focus:ring-gold-500"
                    placeholder="請輸入詳細描述，支援換行。"
                  />
                  {formErrors.description && <p className="text-red-400 text-sm mt-1">{formErrors.description}</p>}
                </div>
              </div>
              <div className="mt-6 flex justify-end space-x-2">
                <button className="bg-primary-700 hover:bg-primary-600 text-gold-200 border border-gold-600 font-medium py-2 px-4 rounded-lg" onClick={handleCancelEdit}>取消</button>
                <button className="bg-gold-600 hover:bg-gold-700 text-primary-900 font-semibold py-2 px-4 rounded-lg" onClick={handleSaveCard}>
                  儲存
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FoundationManagement;