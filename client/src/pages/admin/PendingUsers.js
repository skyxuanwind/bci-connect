import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import {
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  EnvelopeIcon,
  PhoneIcon,
  CalendarIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

const PendingUsers = () => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingUser, setProcessingUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState('3');

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    try {
      const response = await axios.get('/api/admin/pending-users');
      setPendingUsers(response.data.pendingUsers || []);
    } catch (error) {
      console.error('Failed to load pending users:', error);
      toast.error('載入待審核用戶失敗');
      setPendingUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (user) => {
    setSelectedUser(user);
    setShowApprovalModal(true);
  };

  const confirmApproval = async () => {
    if (!selectedUser) return;
    
    setProcessingUser(selectedUser.id);
    try {
      await axios.put(`/api/admin/approve-user/${selectedUser.id}`, {
        membershipLevel: parseInt(selectedLevel)
      });
      toast.success(`${selectedUser.name} 已成功通過審核`);
      setPendingUsers(pendingUsers.filter(user => user.id !== selectedUser.id));
      setShowApprovalModal(false);
      setSelectedUser(null);
    } catch (error) {
      console.error('Failed to approve user:', error);
      toast.error(error.response?.data?.message || '審核失敗');
    } finally {
      setProcessingUser(null);
    }
  };

  const handleReject = async (userId, userName) => {
    if (!window.confirm(`確定要拒絕 ${userName} 的申請嗎？此操作將刪除該用戶記錄。`)) {
      return;
    }
    
    setProcessingUser(userId);
    try {
      await axios.put(`/api/admin/reject-user/${userId}`);
      toast.success(`已拒絕 ${userName} 的申請`);
      setPendingUsers(pendingUsers.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Failed to reject user:', error);
      toast.error(error.response?.data?.message || '拒絕申請失敗');
    } finally {
      setProcessingUser(null);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMembershipLevelText = (level) => {
    const levels = {
      1: '一級核心',
      2: '二級幹部',
      3: '三級會員'
    };
    return levels[level] || '未設定';
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
          <h1 className="text-2xl font-bold text-gray-900">待審核用戶</h1>
          <p className="mt-1 text-sm text-gray-600">
            共有 {pendingUsers.length} 位用戶等待審核
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link to="/admin/users" className="btn-secondary">
            返回用戶管理
          </Link>
        </div>
      </div>

      {/* Alert */}
      {pendingUsers.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                請及時處理待審核用戶
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  這些用戶已完成註冊，正在等待管理員審核。審核通過後，用戶將收到通知並可以正常使用系統。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pending Users List */}
      {pendingUsers.length === 0 ? (
        <div className="text-center py-12">
          <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">沒有待審核用戶</h3>
          <p className="mt-1 text-sm text-gray-500">
            目前所有用戶申請都已處理完成
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pendingUsers.map((user) => (
            <div key={user.id} className="card">
              <div className="p-6">
                {/* User Header */}
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                    <ClockIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-500">申請時間：{formatDate(user.createdAt)}</p>
                  </div>
                </div>

                {/* User Details */}
                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm">
                    <EnvelopeIcon className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-gray-600">{user.email}</span>
                  </div>
                  
                  {user.contactNumber && (
                    <div className="flex items-center text-sm">
                      <PhoneIcon className="h-4 w-4 text-gray-400 mr-3" />
                      <span className="text-gray-600">{user.contactNumber}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-sm">
                    <BuildingOfficeIcon className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-gray-600">{user.company}</span>
                  </div>
                  
                  <div className="flex items-center text-sm">
                    <BriefcaseIcon className="h-4 w-4 text-gray-400 mr-3" />
                    <span className="text-gray-600">{user.title}</span>
                  </div>
                  
                  {user.industry && (
                    <div className="flex items-center text-sm">
                      <span className="w-4 h-4 mr-3 flex items-center justify-center">
                        <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                      </span>
                      <span className="text-gray-600">{user.industry}</span>
                    </div>
                  )}
                  
                  {user.chapterName && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-gray-900">申請分會</p>
                      <p className="text-sm text-gray-600">{user.chapterName}</p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleApprove(user)}
                    disabled={processingUser === user.id}
                    className="flex-1 btn-primary flex items-center justify-center"
                  >
                    {processingUser === user.id ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      <>
                        <CheckCircleIcon className="h-4 w-4 mr-2" />
                        通過審核
                      </>
                    )}
                  </button>
                  
                  <button
                    onClick={() => handleReject(user.id, user.name)}
                    disabled={processingUser === user.id}
                    className="flex-1 btn-danger flex items-center justify-center"
                  >
                    {processingUser === user.id ? (
                      <LoadingSpinner size="small" />
                    ) : (
                      <>
                        <XCircleIcon className="h-4 w-4 mr-2" />
                        拒絕申請
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">審核用戶</h3>
                  <p className="text-sm text-gray-500">{selectedUser.name}</p>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="label">會員等級</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="input"
                >
                  <option value="3">三級會員</option>
                  <option value="2">二級幹部</option>
                  <option value="1">一級核心</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  選擇的會員等級將決定用戶的系統權限
                </p>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
                <h4 className="text-sm font-medium text-blue-800 mb-2">
                  {getMembershipLevelText(parseInt(selectedLevel))} 權限說明
                </h4>
                <div className="text-xs text-blue-700">
                  {selectedLevel === '1' && (
                    <p>可查看所有會員資料（一級、二級、三級）</p>
                  )}
                  {selectedLevel === '2' && (
                    <p>可查看二級和三級會員資料</p>
                  )}
                  {selectedLevel === '3' && (
                    <p>僅可查看三級會員資料</p>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedUser(null);
                  }}
                  className="flex-1 btn-secondary"
                  disabled={processingUser === selectedUser.id}
                >
                  取消
                </button>
                <button
                  onClick={confirmApproval}
                  className="flex-1 btn-primary"
                  disabled={processingUser === selectedUser.id}
                >
                  {processingUser === selectedUser.id ? (
                    <>
                      <LoadingSpinner size="small" />
                      <span className="ml-2">處理中...</span>
                    </>
                  ) : (
                    '確認通過'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingUsers;