import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import LoadingSpinner from '../../components/LoadingSpinner';
import { toast } from 'react-hot-toast';
import {
  UserIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PencilIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon
} from '@heroicons/react/24/outline';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const [updatingUser, setUpdatingUser] = useState(null);
  
  const usersPerPage = 20;

  useEffect(() => {
    loadChapters();
  }, []);

  useEffect(() => {
    loadUsers();
  }, [currentPage, searchTerm, selectedStatus, selectedLevel, selectedChapter]);

  const loadChapters = async () => {
    try {
      const response = await axios.get('/api/chapters');
      setChapters(response.data);
    } catch (error) {
      console.error('Failed to load chapters:', error);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: usersPerPage
      };
      
      if (searchTerm) params.search = searchTerm;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedLevel) params.membershipLevel = selectedLevel;
      if (selectedChapter) params.chapterId = selectedChapter;
      
      const response = await axios.get('/api/admin/users', { params });
      setUsers(response.data.users);
      setTotalPages(response.data.totalPages);
      setTotalUsers(response.data.total);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error('載入用戶列表失敗');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadUsers();
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('');
    setSelectedLevel('');
    setSelectedChapter('');
    setCurrentPage(1);
  };

  const updateUserStatus = async (userId, newStatus) => {
    setUpdatingUser(userId);
    try {
      await axios.put(`/api/admin/users/${userId}/status`, { status: newStatus });
      toast.success('用戶狀態更新成功');
      loadUsers();
    } catch (error) {
      console.error('Failed to update user status:', error);
      toast.error(error.response?.data?.message || '更新用戶狀態失敗');
    } finally {
      setUpdatingUser(null);
    }
  };

  const getMembershipLevelText = (level) => {
    const levels = {
      1: '一級核心',
      2: '二級幹部',
      3: '三級會員'
    };
    return levels[level] || '未設定';
  };

  const getMembershipLevelBadge = (level) => {
    const badges = {
      1: 'level-1',
      2: 'level-2',
      3: 'level-3'
    };
    
    return (
      <span className={`badge ${badges[level] || 'bg-gray-500'} text-xs px-2 py-1 rounded-full font-medium text-white`}>
        {getMembershipLevelText(level)}
      </span>
    );
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { text: '正常', class: 'badge-success', icon: CheckCircleIcon },
      pending_approval: { text: '待審核', class: 'badge-warning', icon: ClockIcon },
      suspended: { text: '暫停', class: 'badge-danger', icon: ExclamationTriangleIcon },
      blacklisted: { text: '黑名單', class: 'badge-danger', icon: XCircleIcon }
    };
    
    const config = statusConfig[status] || { text: '未知', class: 'badge-info', icon: UserIcon };
    const Icon = config.icon;
    
    return (
      <span className={`badge ${config.class} text-xs px-2 py-1 rounded-full font-medium flex items-center`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const getStatusActions = (user) => {
    const actions = [];
    
    if (user.status === 'active') {
      actions.push(
        <button
          key="suspend"
          onClick={() => updateUserStatus(user.id, 'suspended')}
          disabled={updatingUser === user.id}
          className="text-xs text-yellow-600 hover:text-yellow-900 font-medium"
        >
          暫停
        </button>
      );
      actions.push(
        <button
          key="blacklist"
          onClick={() => updateUserStatus(user.id, 'blacklisted')}
          disabled={updatingUser === user.id}
          className="text-xs text-red-600 hover:text-red-900 font-medium"
        >
          加入黑名單
        </button>
      );
    } else if (user.status === 'suspended') {
      actions.push(
        <button
          key="activate"
          onClick={() => updateUserStatus(user.id, 'active')}
          disabled={updatingUser === user.id}
          className="text-xs text-green-600 hover:text-green-900 font-medium"
        >
          恢復正常
        </button>
      );
      actions.push(
        <button
          key="blacklist"
          onClick={() => updateUserStatus(user.id, 'blacklisted')}
          disabled={updatingUser === user.id}
          className="text-xs text-red-600 hover:text-red-900 font-medium"
        >
          加入黑名單
        </button>
      );
    } else if (user.status === 'blacklisted') {
      actions.push(
        <button
          key="activate"
          onClick={() => updateUserStatus(user.id, 'active')}
          disabled={updatingUser === user.id}
          className="text-xs text-green-600 hover:text-green-900 font-medium"
        >
          恢復正常
        </button>
      );
    }
    
    return actions;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-TW');
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一頁
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一頁
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gray-700">
              顯示第 <span className="font-medium">{(currentPage - 1) * usersPerPage + 1}</span> 到{' '}
              <span className="font-medium">
                {Math.min(currentPage * usersPerPage, totalUsers)}
              </span>{' '}
              項，共 <span className="font-medium">{totalUsers}</span> 位用戶
            </p>
          </div>
          <div>
            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              {pages.map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    page === currentPage
                      ? 'z-10 bg-primary-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600'
                      : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="h-5 w-5" />
              </button>
            </nav>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">用戶管理</h1>
          <p className="mt-1 text-sm text-gray-600">管理所有用戶帳號和狀態</p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            篩選
          </button>
          <Link to="/admin/pending" className="btn-primary">
            待審核用戶
          </Link>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">篩選條件</h3>
          </div>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="label">
                  <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                  搜尋用戶
                </label>
                <input
                  type="text"
                  placeholder="搜尋姓名、郵件或公司..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input"
                />
              </div>

              {/* Status Filter */}
              <div>
                <label className="label">狀態</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="input"
                >
                  <option value="">所有狀態</option>
                  <option value="active">正常</option>
                  <option value="pending_approval">待審核</option>
                  <option value="suspended">暫停</option>
                  <option value="blacklisted">黑名單</option>
                </select>
              </div>

              {/* Level Filter */}
              <div>
                <label className="label">會員等級</label>
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="input"
                >
                  <option value="">所有等級</option>
                  <option value="1">一級核心</option>
                  <option value="2">二級幹部</option>
                  <option value="3">三級會員</option>
                </select>
              </div>

              {/* Chapter Filter */}
              <div>
                <label className="label">分會</label>
                <select
                  value={selectedChapter}
                  onChange={(e) => setSelectedChapter(e.target.value)}
                  className="input"
                >
                  <option value="">所有分會</option>
                  {chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-900"
              >
                清除篩選
              </button>
              <div className="space-x-3">
                <button type="submit" className="btn-primary">
                  搜尋
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="large" />
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12">
            <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">沒有找到用戶</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedStatus || selectedLevel || selectedChapter
                ? '請嘗試調整搜尋條件'
                : '目前沒有用戶'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      用戶
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      公司/職稱
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      分會
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      等級
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      狀態
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      註冊時間
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      操作
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <UserIcon className="h-5 w-5 text-primary-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.company}</div>
                        <div className="text-sm text-gray-500">{user.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.chapterName || '未設定'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {user.membershipLevel ? getMembershipLevelBadge(user.membershipLevel) : (
                          <span className="text-sm text-gray-500">未設定</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {updatingUser === user.id ? (
                            <LoadingSpinner size="small" />
                          ) : (
                            <>
                              <Link
                                to={`/members/${user.id}`}
                                className="text-primary-600 hover:text-primary-900"
                              >
                                <EyeIcon className="h-4 w-4" />
                              </Link>
                              <div className="flex space-x-1">
                                {getStatusActions(user)}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </>
        )}
      </div>
    </div>
  );
};

export default UserManagement;