import React, { useEffect, useState } from 'react';
import axios from '../../config/axios';

const emptyForm = {
  title: '',
  speakerId: '',
  contentType: 'video_long',
  externalUrl: '',
  embedCode: '',
  summary: '',
  pinned: false,
  sortOrder: 0,
  coverImageUrl: '',
};

const BusinessMediaAdmin = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchItems();
    fetchMembers();
  }, []);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/business-media', { params: { page: 1, limit: 100 } });
      setItems(res.data.items || []);
    } catch (e) {
      setError('載入商媒體清單失敗');
    } finally {
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await axios.get('/api/users/members', { params: { limit: 200 } });
      setMembers(res.data.members || res.data.items || []);
    } catch (e) {
      // ignore
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (item) => {
    setEditingId(item.id);
    setForm({
      title: item.title || '',
      speakerId: item.speaker_id || '',
      contentType: item.content_type || 'video_long',
      externalUrl: item.external_url || '',
      embedCode: item.embed_code || '',
      summary: item.summary || '',
      pinned: !!item.pinned,
      sortOrder: item.sort_order || 0,
      coverImageUrl: item.cover_image_url || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('確定要刪除此內容嗎？')) return;
    try {
      await axios.delete(`/api/business-media/${id}`);
      await fetchItems();
    } catch (e) {
      alert('刪除失敗');
    }
  };

  const handlePublishToggle = async (item) => {
    const action = item.status === 'published' ? 'draft' : 'publish';
    try {
      await axios.post(`/api/business-media/${item.id}/publish`, { action });
      await fetchItems();
    } catch (e) {
      alert('更新發布狀態失敗');
    }
  };

  const handlePinToggle = async (item) => {
    try {
      await axios.put(`/api/business-media/${item.id}`, { pinned: !item.pinned });
      await fetchItems();
    } catch (e) {
      alert('更新置頂失敗');
    }
  };

  const handleSortChange = async (item, value) => {
    try {
      const v = Number(value) || 0;
      await axios.put(`/api/business-media/${item.id}`, { sortOrder: v });
      await fetchItems();
    } catch (e) {
      alert('更新排序失敗');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        title: form.title,
        speakerId: Number(form.speakerId),
        contentType: form.contentType,
        externalUrl: form.externalUrl || null,
        embedCode: form.embedCode || null,
        summary: form.summary || null,
        ctas: [],
        pinned: !!form.pinned,
        sortOrder: Number(form.sortOrder) || 0,
        coverImageUrl: form.coverImageUrl || null,
      };
      if (editingId) {
        await axios.put(`/api/business-media/${editingId}`, payload);
      } else {
        await axios.post('/api/business-media', payload);
      }
      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      await fetchItems();
    } catch (e) {
      setError('儲存失敗，請檢查欄位');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">商媒體管理</h1>
          <p className="text-sm text-gray-600">建立、編輯、發布與排序商媒體內容</p>
        </div>
        <button onClick={openCreate} className="btn-primary">新增內容</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-4">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">標題</label>
              <input className="input" value={form.title} onChange={e=>setForm({...form, title:e.target.value})} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">講者（會員）</label>
              <select className="input" value={form.speakerId} onChange={e=>setForm({...form, speakerId:e.target.value})} required>
                <option value="">請選擇</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}（{m.company||'—'}）</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">內容類型</label>
              <select className="input" value={form.contentType} onChange={e=>setForm({...form, contentType:e.target.value})}>
                <option value="video_long">長影片</option>
                <option value="video_short">短影片</option>
                <option value="article">文章</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">外部連結（YouTube/TikTok/文章等）</label>
              <input className="input" value={form.externalUrl} onChange={e=>setForm({...form, externalUrl:e.target.value})} placeholder="https://..." />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">內嵌代碼（iframe 或其他嵌入代碼）</label>
              <textarea className="input" rows={4} value={form.embedCode} onChange={e=>setForm({...form, embedCode:e.target.value})} placeholder="<iframe src='...' width='560' height='315'></iframe>" />
              <p className="text-xs text-gray-500 mt-1">可貼入 iframe 或其他平台提供的嵌入代碼，優先於外部連結使用</p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">封面圖片</label>
              <input 
                className="input" 
                type="url" 
                value={form.coverImageUrl} 
                onChange={e=>setForm({...form, coverImageUrl:e.target.value})} 
                placeholder="https://example.com/image.jpg" 
              />
              <p className="text-xs text-gray-500 mt-1">請輸入封面圖片的網址，建議尺寸 16:9，支援 JPG、PNG 格式</p>
              {form.coverImageUrl && (
                <div className="mt-2">
                  <img 
                    src={form.coverImageUrl} 
                    alt="封面預覽" 
                    className="w-32 h-18 object-cover rounded border"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">摘要</label>
              <textarea className="input" rows={3} value={form.summary} onChange={e=>setForm({...form, summary:e.target.value})} />
            </div>
            <div className="flex items-center space-x-4">
              <label className="inline-flex items-center space-x-2">
                <input type="checkbox" checked={form.pinned} onChange={e=>setForm({...form, pinned:e.target.checked})} />
                <span>置頂</span>
              </label>
              <div className="flex items-center space-x-2">
                <span className="text-sm">排序值</span>
                <input type="number" className="input w-24" value={form.sortOrder} onChange={e=>setForm({...form, sortOrder:e.target.value})} />
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end space-x-2">
              <button type="button" className="btn-secondary" onClick={()=>{setShowForm(false); setEditingId(null);}}>取消</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving?'儲存中...':'儲存'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-6">載入中...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">封面</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">標題</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">講者</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">類型</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">狀態</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">置頂</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700">排序</th>
                  <th className="px-4 py-2 text-right text-sm font-semibold text-gray-700">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2">
                      {item.cover_image_url ? (
                        <img 
                          src={item.cover_image_url} 
                          alt={item.title}
                          className="w-16 h-10 object-cover rounded"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-16 h-10 bg-gray-100 rounded flex items-center justify-center text-xs text-gray-500">
                          無封面
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">{item.title}</td>
                    <td className="px-4 py-2">{item.speaker_name || item.speaker_id}</td>
                    <td className="px-4 py-2">{item.content_type}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-0.5 rounded text-xs ${item.status==='published'?'bg-green-100 text-green-700':'bg-gray-100 text-gray-700'}`}>
                        {item.status==='published'?'已發布':'草稿'}</span>
                    </td>
                    <td className="px-4 py-2">
                      <button className={`text-sm ${item.pinned?'text-yellow-600':'text-gray-500'}`} onClick={()=>handlePinToggle(item)}>
                        {item.pinned?'已置頂':'未置頂'}
                      </button>
                    </td>
                    <td className="px-4 py-2">
                      <input type="number" className="input w-20" defaultValue={item.sort_order||0} onBlur={(e)=>handleSortChange(item, e.target.value)} />
                    </td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button className="btn-secondary" onClick={()=>openEdit(item)}>編輯</button>
                      <button className="btn-secondary" onClick={()=>handlePublishToggle(item)}>{item.status==='published'?'取消發布':'發布'}</button>
                      <button className="btn-danger" onClick={()=>handleDelete(item.id)}>刪除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default BusinessMediaAdmin;