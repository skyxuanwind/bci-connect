import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';

const BlacklistManagement = () => {
  const { user, isAdmin } = useAuth();
  const [blacklistEntries, setBlacklistEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    company: '',
    contact_info: '',
    reason: '',
    notes: ''
  });



  useEffect(() => {
    if (user && (user.membershipLevel === 1 || isAdmin())) {
      fetchBlacklistEntries();
    }
  }, [user, isAdmin]);

  // 檢查權限 - 僅限核心和管理員
  if (!user || (user.membershipLevel !== 1 && !isAdmin())) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black/85 to-gray-900/85 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-yellow-100 mb-4">權限不足</h2>
          <p className="text-gray-400">此功能僅限核心和管理員使用</p>
        </div>
      </div>
    );
  }

  const fetchBlacklistEntries = async () => {
    try {
      const response = await axios.get('/api/blacklist');
      if (response.data.success) {
        setBlacklistEntries(response.data.blacklistEntries || []);
      } else {
        setBlacklistEntries([]);
      }
    } catch (error) {
      console.error('Error fetching blacklist entries:', error);
      setBlacklistEntries([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      industry: '',
      company: '',
      contact_info: '',
      reason: '',
      notes: ''
    });
  };

  const handleAddEntry = async () => {
    if (!formData.name.trim()) {
      alert('請輸入姓名');
      return;
    }

    try {
      const response = await axios.post('/api/blacklist/add', formData);
      
      if (response.data.success) {
        alert(response.data.message);
        setShowAddModal(false);
        resetForm();
        fetchBlacklistEntries();
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error('Error adding blacklist entry:', error);
      alert('加入黑名單失敗');
    }
  };

  const handleEditEntry = async () => {
    if (!formData.name.trim()) {
      alert('請輸入姓名');
      return;
    }

    try {
      const response = await fetch(`/api/blacklist/edit/${editingEntry.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(formData)
      });
      
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        setShowEditModal(false);
        setEditingEntry(null);
        resetForm();
        fetchBlacklistEntries();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error updating blacklist entry:', error);
      alert('更新黑名單失敗');
    }
  };

  const handleDeleteEntry = async (entryId, entryName) => {
    if (!window.confirm(`確定要將 ${entryName} 從黑名單移除嗎？`)) {
      return;
    }

    try {
      const response = await fetch(`/api/blacklist/remove/${entryId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        fetchBlacklistEntries();
      } else {
        alert(data.message);
      }
    } catch (error) {
      console.error('Error removing blacklist entry:', error);
      alert('從黑名單移除失敗');
    }
  };

  const openEditModal = (entry) => {
    setEditingEntry(entry);
    setFormData({
      name: entry.name || '',
      industry: entry.industry || '',
      company: entry.company || '',
      contact_info: entry.contact_info || '',
      reason: entry.reason || '',
      notes: entry.notes || ''
    });
    setShowEditModal(true);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setEditingEntry(null);
    resetForm();
  };

  const filteredEntries = blacklistEntries.filter(entry =>
    (entry.name && entry.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (entry.company && entry.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (entry.industry && entry.industry.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black/85 to-gray-900/85 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-500 mx-auto mb-4"></div>
          <p className="text-gray-400">載入中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black/85 to-gray-900/85 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 頁面標題 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-yellow-100">黑名單專區</h1>
          <p className="mt-2 text-gray-400">記錄需要小心注意的人員資訊，防止其入會</p>
        </div>

        {/* 操作區域 */}
        <div className="bg-gradient-to-br from-black/60 to-gray-900/60 border border-yellow-500/30 rounded-lg shadow-sm mb-6 p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="搜尋姓名、公司或行業別..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-yellow-500/30 bg-black/40 text-yellow-100 placeholder-gray-400 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-black text-yellow-300 px-6 py-2 rounded-lg hover:bg-gray-900 transition-colors border border-yellow-500/30"
            >
              新增黑名單
            </button>
          </div>
        </div>

        {/* 統計資訊 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gradient-to-br from-black/60 to-gray-900/60 border border-yellow-500/30 rounded-lg shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636m12.728 12.728L18.364 5.636" />
                 </svg>
               </div>
               <div className="ml-4">
                <p className="text-sm font-medium text-gray-400">黑名單總數</p>
                <p className="text-2xl font-bold text-yellow-100">{blacklistEntries.length}</p>
               </div>
            </div>
          </div>
        </div>

        {/* 黑名單列表 */}
        <div className="bg-gradient-to-br from-black/60 to-gray-900/60 border border-yellow-500/30 rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-yellow-500/30">
            <h2 className="text-lg font-semibold text-yellow-100">黑名單人員列表</h2>
           </div>
          
          {filteredEntries.length === 0 ? (
            <div className="p-8 text-center">
              <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
               </svg>
              <p className="text-gray-400">目前沒有黑名單人員</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-yellow-500/20">
                <thead className="bg-black/40">
                   <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">姓名</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">行業別</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">公司</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">聯繫方式</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">原因</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">操作</th>
                   </tr>
                 </thead>
                <tbody className="divide-y divide-yellow-500/20">
                   {filteredEntries.map((entry) => (
                    <tr key={entry.id} className="hover:bg-yellow-500/5">
                       <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex items-center">
                           <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-300">
                                 {entry.name ? entry.name.charAt(0) : '?'}
                               </span>
                             </div>
                           </div>
                           <div className="ml-4">
                            <div className="text-sm font-medium text-yellow-100">{entry.name || '未知'}</div>
                           </div>
                         </div>
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                         {entry.industry || '未提供'}
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                         {entry.company || '未提供'}
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                         {entry.contact_info || '未提供'}
                       </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                         {entry.reason || '未提供原因'}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                         <button
                           onClick={() => openEditModal(entry)}
                          className="text-yellow-300 hover:text-yellow-200 mr-4 transition-colors"
                         >
                           編輯
                         </button>
                         <button
                           onClick={() => handleDeleteEntry(entry.id, entry.name)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                         >
                           刪除
                         </button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           )}
        </div>
      </div>

      {/* 新增黑名單模態框 */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-gradient-to-br from-black/85 to-gray-900/85 border-yellow-500/30">
             <div className="mt-3">
              <h3 className="text-lg font-medium text-yellow-100 mb-4">新增黑名單</h3>
               
               <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">姓名 *</label>
                 <input
                   type="text"
                   value={formData.name}
                   onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-yellow-500/30 bg-black/40 text-yellow-100 placeholder-gray-400 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                   placeholder="請輸入姓名"
                 />
               </div>
               
               <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">行業別</label>
                 <input
                   type="text"
                   value={formData.industry}
                   onChange={(e) => setFormData({...formData, industry: e.target.value})}
                  className="w-full px-3 py-2 border border-yellow-500/30 bg-black/40 text-yellow-100 placeholder-gray-400 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                   placeholder="請輸入行業別"
                 />
               </div>
               
               <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">公司</label>
                 <input
                   type="text"
                   value={formData.company}
                   onChange={(e) => setFormData({...formData, company: e.target.value})}
                  className="w-full px-3 py-2 border border-yellow-500/30 bg-black/40 text-yellow-100 placeholder-gray-400 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                   placeholder="請輸入公司名稱"
                 />
               </div>
               
               <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">聯繫方式</label>
                 <input
                   type="text"
                   value={formData.contact_info}
                   onChange={(e) => setFormData({...formData, contact_info: e.target.value})}
                  className="w-full px-3 py-2 border border-yellow-500/30 bg-black/40 text-yellow-100 placeholder-gray-400 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                   placeholder="請輸入聯繫方式"
                 />
               </div>
               
               <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">原因</label>
                 <textarea
                   value={formData.reason}
                   onChange={(e) => setFormData({...formData, reason: e.target.value})}
                   rows={3}
                  className="w-full px-3 py-2 border border-yellow-500/30 bg-black/40 text-yellow-100 placeholder-gray-400 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                   placeholder="請輸入加入黑名單的原因..."
                 />
               </div>
               
               <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">備註</label>
                 <textarea
                   value={formData.notes}
                   onChange={(e) => setFormData({...formData, notes: e.target.value})}
                   rows={2}
                  className="w-full px-3 py-2 border border-yellow-500/30 bg-black/40 text-yellow-100 placeholder-gray-400 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                   placeholder="請輸入備註..."
                 />
               </div>
               
               <div className="flex justify-end space-x-3">
                 <button
                   onClick={closeModals}
                  className="px-4 py-2 text-gray-300 border border-yellow-500/30 rounded-md hover:bg-yellow-500/10 transition-colors"
                 >
                   取消
                 </button>
                 <button
                   onClick={handleAddEntry}
                  className="px-4 py-2 bg-black text-yellow-300 rounded-md hover:bg-gray-900 transition-colors border border-yellow-500/30"
                 >
                   確認新增
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}

      {/* 編輯黑名單模態框 */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/70 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-gradient-to-br from-black/85 to-gray-900/85 border-yellow-500/30">
             <div className="mt-3">
              <h3 className="text-lg font-medium text-yellow-100 mb-4">編輯黑名單</h3>
               
               <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">姓名 *</label>
                 <input
                   type="text"
                   value={formData.name}
                   onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-yellow-500/30 bg-black/40 text-yellow-100 placeholder-gray-400 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                   placeholder="請輸入姓名"
                 />
               </div>
               
               <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">行業別</label>
                 <input
                   type="text"
                   value={formData.industry}
                   onChange={(e) => setFormData({...formData, industry: e.target.value})}
                  className="w-full px-3 py-2 border border-yellow-500/30 bg-black/40 text-yellow-100 placeholder-gray-400 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                   placeholder="請輸入行業別"
                 />
               </div>
               
               <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">公司</label>
                 <input
                   type="text"
                   value={formData.company}
                   onChange={(e) => setFormData({...formData, company: e.target.value})}
                  className="w-full px-3 py-2 border border-yellow-500/30 bg-black/40 text-yellow-100 placeholder-gray-400 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                   placeholder="請輸入公司名稱"
                 />
               </div>
               
               <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">聯繫方式</label>
                 <input
                   type="text"
                   value={formData.contact_info}
                   onChange={(e) => setFormData({...formData, contact_info: e.target.value})}
                  className="w-full px-3 py-2 border border-yellow-500/30 bg-black/40 text-yellow-100 placeholder-gray-400 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                   placeholder="請輸入聯繫方式"
                 />
               </div>
               
               <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">原因</label>
                 <textarea
                   value={formData.reason}
                   onChange={(e) => setFormData({...formData, reason: e.target.value})}
                   rows={3}
                  className="w-full px-3 py-2 border border-yellow-500/30 bg-black/40 text-yellow-100 placeholder-gray-400 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                   placeholder="請輸入加入黑名單的原因..."
                 />
               </div>
               
               <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-2">備註</label>
                 <textarea
                   value={formData.notes}
                   onChange={(e) => setFormData({...formData, notes: e.target.value})}
                   rows={2}
                  className="w-full px-3 py-2 border border-yellow-500/30 bg-black/40 text-yellow-100 placeholder-gray-400 rounded-md focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                   placeholder="請輸入備註..."
                 />
               </div>
               
               <div className="flex justify-end space-x-3">
                 <button
                   onClick={closeModals}
                  className="px-4 py-2 text-gray-300 border border-yellow-500/30 rounded-md hover:bg-yellow-500/10 transition-colors"
                 >
                   取消
                 </button>
                 <button
                   onClick={handleEditEntry}
                  className="px-4 py-2 bg-black text-yellow-300 rounded-md hover:bg-gray-900 transition-colors border border-yellow-500/30"
                 >
                   確認更新
                 </button>
               </div>
             </div>
           </div>
         </div>
       )}
    </div>
  );
};

export default BlacklistManagement;