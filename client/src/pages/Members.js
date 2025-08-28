import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';
import {
  UserIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BuildingOfficeIcon,
  BriefcaseIcon,
  PhoneIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const Members = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState([]);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedMembershipLevel, setSelectedMembershipLevel] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalMembers, setTotalMembers] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  
  const membersPerPage = 12;

  useEffect(() => {
    loadChapters();
  }, []);

  useEffect(() => {
    loadMembers();
  }, [currentPage, searchTerm, selectedChapter, selectedMembershipLevel]);

  const loadChapters = async () => {
    try {
      const response = await axios.get('/api/chapters');
      setChapters(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load chapters:', error);
      setChapters([]);
    }
  };

  const loadMembers = async () => {
    setLoading(true);
    try {
      const params = {
        page: currentPage,
        limit: membersPerPage
      };
      
      if (searchTerm) params.search = searchTerm;
      if (selectedChapter) params.chapterId = selectedChapter;
      if (selectedMembershipLevel) params.membershipLevel = selectedMembershipLevel;
      
      const response = await axios.get('/api/users/members', { params });
      setMembers(Array.isArray(response.data.members) ? response.data.members : []);
      setTotalPages(response.data.pagination?.totalPages || 1);
      setTotalMembers(response.data.pagination?.totalMembers || 0);
    } catch (error) {
      console.error('Failed to load members:', error);
      setMembers([]);
      setTotalPages(1);
      setTotalMembers(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadMembers();
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedChapter('');
    setSelectedMembershipLevel('');
    setCurrentPage(1);
  };

  const getMembershipLevelText = (level) => {
    const levels = {
      1: '核心',
      2: '幹部',
      3: '會員'
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

  const canViewMember = (memberLevel) => {
    if (!user?.membershipLevel) return false;
    return user.membershipLevel <= memberLevel;
  };

  const getVisibleMembershipLevels = () => {
    if (!user?.membershipLevel) return [];
    
    const levels = [];
    for (let i = user.membershipLevel; i <= 3; i++) {
      levels.push(i);
    }
    return levels;
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
              顯示第 <span className="font-medium">{(currentPage - 1) * membersPerPage + 1}</span> 到{' '}
              <span className="font-medium">
                {Math.min(currentPage * membersPerPage, totalMembers)}
              </span>{' '}
              項，共 <span className="font-medium">{totalMembers}</span> 位會員
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
          <h1 className="text-2xl font-bold text-gray-900">會員目錄</h1>
          <p className="mt-1 text-sm text-gray-600">
            根據您的會員等級，您可以查看 {getVisibleMembershipLevels().map(level => getMembershipLevelText(level)).join('、')} 的會員資料
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="btn-secondary flex items-center"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            篩選
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900">篩選條件</h3>
          </div>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Search */}
              <div>
                <label className="label">
                  <MagnifyingGlassIcon className="h-4 w-4 mr-2" />
                  搜尋會員
                </label>
                <input
                  type="text"
                  placeholder="搜尋姓名、公司或職稱..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input"
                />
              </div>

              {/* Chapter Filter */}
              <div>
                <label className="label">
                  <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                  分會
                </label>
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

              {/* Membership Level Filter */}
              <div>
                <label className="label">
                  <UserIcon className="h-4 w-4 mr-2" />
                  會員等級
                </label>
                <select
                  value={selectedMembershipLevel}
                  onChange={(e) => setSelectedMembershipLevel(e.target.value)}
                  className="input"
                >
                  <option value="">所有等級</option>
                  {getVisibleMembershipLevels().map((level) => (
                    <option key={level} value={level}>
                      {getMembershipLevelText(level)}
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

      {/* Members Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-12">
          <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">沒有找到會員</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedChapter || selectedMembershipLevel ? '請嘗試調整搜尋條件' : '目前沒有可顯示的會員'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {members.map((member) => (
              <div key={member.id} className="card hover:shadow-lg transition-shadow duration-200">
                <div className="p-6">
                  {/* Avatar and Basic Info */}
                  <div className="flex items-center mb-4">
                    <Avatar 
                      src={member.profilePictureUrl} 
                      alt={member.name}
                      size="large"
                    />
                    <div className="ml-3 flex-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {member.name}
                      </h3>
                      <div className="mt-1">
                        {getMembershipLevelBadge(member.membershipLevel)}
                      </div>
                    </div>
                  </div>

                  {/* Company and Title */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <BuildingOfficeIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{member.company}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <BriefcaseIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{member.title}</span>
                    </div>
                  </div>

                  {/* Chapter */}
                  {member.chapterName && (
                    <div className="mb-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {member.chapterName}
                      </span>
                    </div>
                  )}

                  {/* Contact Info (if available) */}
                  {member.contactNumber && canViewMember(member.membershipLevel) && (
                    <div className="mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <PhoneIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{member.contactNumber}</span>
                      </div>
                    </div>
                  )}

                  {/* View Details Button */}
                  {canViewMember(member.membershipLevel) && (
                    <div className="mt-4">
                      <Link
                        to={`/members/${member.id}`}
                        className="w-full btn-secondary flex items-center justify-center text-sm"
                      >
                        <EyeIcon className="h-4 w-4 mr-2" />
                        查看詳情
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {renderPagination()}
        </>
      )}
    </div>
  );
};

export default Members;