import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import LoadingSpinner from '../components/LoadingSpinner';
import Avatar from '../components/Avatar';
import GoldAvatarIcon from '../components/GoldAvatarIcon';
import InfoButton from '../components/InfoButton';
import {
  UserIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BuildingOfficeIcon,
  TagIcon,
  PhoneIcon,
  EyeIcon,
  ChatBubbleLeftRightIcon,
  EnvelopeIcon,
  CreditCardIcon
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

  const canViewMember = () => true;

  const getVisibleMembershipLevels = () => [1, 2, 3];

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
      <div className="flex items-center justify-between border-t border-gold-600 bg-primary-800 px-4 py-3 sm:px-6">
        <div className="flex flex-1 justify-between sm:hidden">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="relative inline-flex items-center rounded-md border border-gold-600 bg-primary-700 px-4 py-2 text-sm font-medium text-gold-100 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            上一頁
          </button>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="relative ml-3 inline-flex items-center rounded-md border border-gold-600 bg-primary-700 px-4 py-2 text-sm font-medium text-gold-100 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一頁
          </button>
        </div>
        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-gold-100">
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
                className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gold-300 ring-1 ring-inset ring-gold-600 hover:bg-primary-600 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-5 w-5" />
              </button>
              {pages.map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                    page === currentPage
                      ? 'z-10 bg-gold-600 text-primary-900 focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600'
                      : 'text-gold-100 ring-1 ring-inset ring-gold-600 hover:bg-primary-600 focus:z-20 focus:outline-offset-0'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gold-300 ring-1 ring-inset ring-gold-600 hover:bg-primary-600 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-gold-100">會員目錄</h1>
            <InfoButton tooltip="會員目錄顯示所有會員資料。為了促進交流，所有會員均可查看所有等級的會員。" />
          </div>
          <p className="mt-1 text-sm text-gold-300">
            您可以查看 核心會員、幹部會員、一般會員 的會員資料
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="secondary"
            className="flex items-center"
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            篩選
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gold-100">篩選條件</h3>
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
                  placeholder="搜尋姓名、公司或產業別..."
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
                className="text-sm text-gold-300 hover:text-gold-100"
              >
                清除篩選
              </button>
              <div className="space-x-3">
                <Button type="submit" variant="primary">
                  搜尋
                </Button>
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
          <UserIcon className="mx-auto h-12 w-12 text-gold-400" />
          <h3 className="mt-2 text-sm font-medium text-gold-100">沒有找到會員</h3>
          <p className="mt-1 text-sm text-gold-300">
            {searchTerm || selectedChapter || selectedMembershipLevel ? '請嘗試調整搜尋條件' : '目前沒有可顯示的會員'}
          </p>
        </div>
      ) : (
        <>
          {/* 會員網格 - 手機端兩列、保持間距與對齊 */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 md:gap-5 lg:gap-6 items-stretch">
            {members.map((member) => (
              <div
                key={member.id}
                onClick={() => navigate(`/members/${member.id}`)}
                className="bg-gradient-to-br from-primary-800 via-primary-800 to-primary-900 border border-gold-600/40 rounded-2xl overflow-hidden hover:border-gold-500/60 hover:shadow-2xl hover:shadow-gold-500/20 transition-all duration-500 hover:-translate-y-2 flex flex-col cursor-pointer group backdrop-blur-sm relative h-full"
              >
                {/* 高級光澤效果 */}
                <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 via-transparent to-gold-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                
                {/* 會員資訊區域 - 自適應高度 */}
                <div className="flex-shrink-0 p-4 sm:p-5 lg:p-6 space-y-3 relative z-10">
                  {/* 專業別（產業別） - 最上方 */}
                  <div className="text-gold-200 text-lg sm:text-xl lg:text-2xl text-center font-medium">
                    <span className="break-words hyphens-auto leading-relaxed drop-shadow-sm">
                      {member.industry || '未設定'}
                    </span>
                  </div>

                  {/* 姓名 */}
                  <div className="mt-2">
                    <h3 className="text-gold-100 font-bold text-base sm:text-lg lg:text-xl break-words hyphens-auto leading-relaxed text-center drop-shadow-md">
                      {member.name}
                    </h3>
                  </div>

                  {/* 分會資訊 */}
                  <div className="flex items-center justify-center mt-2">
                    <div className="bg-gradient-to-r from-gold-600 via-gold-500 to-gold-400 text-primary-900 px-4 py-2 rounded-full text-xs font-bold shadow-xl border border-gold-400/30 backdrop-blur-sm">
                      <BuildingOfficeIcon className="h-3 w-3 inline mr-1.5" />
                      {member.chapterName || '未設定分會'}
                    </div>
                  </div>

                  {/* 會員等級（權限） */}
                  <div className="flex items-center justify-center mt-3">
                    <div className="relative">
                      <span className={`px-4 py-2 rounded-full text-sm font-bold shadow-xl border-2 ${getMembershipLevelBadge(member.membership_level)} transform hover:scale-110 transition-all duration-300 backdrop-blur-sm`}>
                        <UserIcon className="h-4 w-4 inline mr-1.5" />
                        {getMembershipLevelText(member.membership_level)}
                      </span>
                      {/* 光暈效果 */}
                      <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gold-400/20 to-gold-600/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
                    </div>
                  </div>
                </div>
                
                {/* 會員頭像區域 - 自適應高度 */}
                <div className="flex-1 flex items-center justify-center p-4 sm:p-5 lg:p-6 pt-2 relative z-10">
                  <div className="w-full max-w-[130px] sm:max-w-[150px] lg:max-w-[170px] aspect-square relative">
                    {/* 頭像光暈背景 */}
                    <div className="absolute inset-0 bg-gradient-to-br from-gold-500/20 via-gold-400/10 to-gold-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <Avatar
                      src={member.profilePictureUrl}
                      alt={member.name}
                      size="xl"
                      fallbackIcon={GoldAvatarIcon}
                      fallbackIconClass="text-gold-400"
                      className="w-full h-full object-contain object-center rounded-2xl border-3 border-gold-600/30 hover:border-gold-500/50 transition-all duration-500 shadow-2xl backdrop-blur-sm relative z-10 group-hover:shadow-gold-500/30 bg-gradient-to-br from-black/85 via-gray-900/80 to-yellow-600/30"
                    />
                  </div>
                </div>
                
                {/* 操作按鈕區域 */}
                <div className="flex-shrink-0 p-4 sm:p-5 lg:p-6 pt-2 space-y-3 relative z-10">
                  <div className="grid grid-cols-2 gap-3">
                    {/* 聯絡按鈕 */}
                    {member.phone && (
                      <a
                        href={`tel:${member.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center px-3 sm:px-4 py-2.5 bg-gradient-to-r from-primary-700 to-primary-600 hover:from-primary-600 hover:to-primary-500 text-gold-100 border border-gold-600/40 hover:border-gold-500/60 rounded-xl transition-all duration-300 text-xs sm:text-sm font-semibold shadow-lg hover:shadow-xl backdrop-blur-sm transform hover:scale-105"
                      >
                        <PhoneIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                        <span className="hidden sm:inline">電話</span>
                      </a>
                    )}
                  </div>
                  
                  {/* 額外操作按鈕 */}
                 <div className="grid grid-cols-2 gap-3">
                   {member.email && (
                     <a
                       href={`mailto:${member.email}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center px-3 sm:px-4 py-2.5 bg-gradient-to-r from-primary-700 to-primary-600 hover:from-primary-600 hover:to-primary-500 text-gold-100 border border-gold-600/40 hover:border-gold-500/60 rounded-xl transition-all duration-300 text-xs sm:text-sm font-semibold shadow-lg hover:shadow-xl backdrop-blur-sm transform hover:scale-105"
                      >
                        <EnvelopeIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                        <span className="hidden sm:inline">郵件</span>
                      </a>
                    )}
                    
                    {member.nfc_card_id && (
                      <Link
                        to={`/nfc/${member.nfc_card_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center justify-center px-3 sm:px-4 py-2.5 bg-gradient-to-r from-accent-600 to-accent-500 hover:from-accent-500 hover:to-accent-400 text-primary-900 rounded-xl transition-all duration-300 text-xs sm:text-sm font-bold shadow-lg hover:shadow-xl backdrop-blur-sm transform hover:scale-105"
                      >
                        <CreditCardIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5" />
                        <span className="hidden sm:inline">名片</span>
                      </Link>
                    )}
                 </div>
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