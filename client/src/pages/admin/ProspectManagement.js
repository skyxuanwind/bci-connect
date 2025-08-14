import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import axios from '../../config/axios';

const ProspectManagement = () => {
  const { token, user } = useAuth();
  const [prospects, setProspects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProspect, setSelectedProspect] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    industry: '',
    company: '',
    contactInfo: '',
    notes: ''
  });

  useEffect(() => {
    fetchProspects();
  }, []);

  const fetchProspects = async () => {
    try {
      const response = await axios.get('/api/prospects');

      const data = response.data;
      if (data.prospects) {
        setProspects(data.prospects);
      } else {
        setError(data.message || '獲取商訪準會員列表失敗');
      }
    } catch (error) {
      console.error('Error fetching prospects:', error);
      setError('網路錯誤，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCreateProspect = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/prospects', formData);

      const data = response.data;
      if (data.success) {
        setShowCreateModal(false);
        setFormData({ name: '', industry: '', company: '', contactInfo: '', notes: '' });
        fetchProspects();
        alert('商訪準會員資料創建成功');
      } else {
        alert(data.message || '創建失敗');
      }
    } catch (error) {
      console.error('Error creating prospect:', error);
      alert('網路錯誤，請稍後再試');
    }
  };

  const handleEditProspect = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/prospects/${selectedProspect.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (response.ok) {
        setShowEditModal(false);
        setSelectedProspect(null);
        setFormData({ name: '', industry: '', company: '', contactInfo: '', notes: '' });
        fetchProspects();
        alert('商訪準會員資料更新成功');
      } else {
        alert(data.message || '更新失敗');
      }
    } catch (error) {
      console.error('Error updating prospect:', error);
      alert('網路錯誤，請稍後再試');
    }
  };

  const handleStatusChange = async (prospectId, newStatus) => {
    try {
      const response = await fetch(`/api/prospects/${prospectId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();
      if (response.ok) {
        fetchProspects();
        alert(data.message);
      } else {
        alert(data.message || '狀態更新失敗');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert('網路錯誤，請稍後再試');
    }
  };

  const handleDeleteProspect = async (prospectId) => {
    if (!window.confirm('確定要刪除這個商訪準會員資料嗎？')) {
      return;
    }

    try {
      const response = await fetch(`/api/prospects/${prospectId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (response.ok) {
        fetchProspects();
        alert('商訪準會員資料刪除成功');
      } else {
        alert(data.message || '刪除失敗');
      }
    } catch (error) {
      console.error('Error deleting prospect:', error);
      alert('網路錯誤，請稍後再試');
    }
  };

  const openEditModal = (prospect) => {
    setSelectedProspect(prospect);
    setFormData({
      name: prospect.name,
      industry: prospect.industry || '',
      company: prospect.company || '',
      contactInfo: prospect.contactInfo || '',
      notes: prospect.notes || ''
    });
    setShowEditModal(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      'vetting': { text: '評估中', color: 'bg-yellow-100 text-yellow-800' },
      'pending_vote': { text: '待投票', color: 'bg-blue-100 text-blue-800' },
      'approved': { text: '已通過', color: 'bg-green-100 text-green-800' },
      'rejected': { text: '已拒絕', color: 'bg-red-100 text-red-800' }
    };
    const config = statusConfig[status] || { text: status, color: 'bg-gray-100 text-gray-800' };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">商訪準會員管理</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
        >
          新增商訪準會員
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                姓名
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                公司
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                行業
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                狀態
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                創建者
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                創建時間
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {prospects.map((prospect) => (
              <tr key={prospect.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {prospect.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {prospect.company || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {prospect.industry || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {getStatusBadge(prospect.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {prospect.createdBy}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(prospect.createdAt).toLocaleDateString('zh-TW')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => openEditModal(prospect)}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      編輯
                    </button>
                    {prospect.status === 'vetting' && (
                      <button
                        onClick={() => handleStatusChange(prospect.id, 'pending_vote')}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        啟動投票
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteProspect(prospect.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      刪除
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {prospects.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            暫無商訪準會員資料
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">新增商訪準會員</h3>
              <form onSubmit={handleCreateProspect}>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    姓名 *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    公司
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    行業
                  </label>
                  <input
                    type="text"
                    name="industry"
                    value={formData.industry}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    聯絡資訊
                  </label>
                  <textarea
                    name="contactInfo"
                    value={formData.contactInfo}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    rows="3"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    商訪紀錄
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    rows="4"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setFormData({ name: '', industry: '', company: '', contactInfo: '', notes: '' });
                    }}
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    創建
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">編輯商訪準會員</h3>
              <form onSubmit={handleEditProspect}>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    姓名 *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    公司
                  </label>
                  <input
                    type="text"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    行業
                  </label>
                  <input
                    type="text"
                    name="industry"
                    value={formData.industry}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    聯絡資訊
                  </label>
                  <textarea
                    name="contactInfo"
                    value={formData.contactInfo}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    rows="3"
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2">
                    商訪紀錄
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    rows="4"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedProspect(null);
                      setFormData({ name: '', industry: '', company: '', contactInfo: '', notes: '' });
                    }}
                    className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  >
                    更新
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProspectManagement;