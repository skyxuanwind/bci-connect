import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Avatar from './Avatar';
import axios from 'axios';
import {
  HomeIcon,
  UserGroupIcon,
  UserIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  XMarkIcon,
  ChartBarIcon,
  UsersIcon,
  ClockIcon,
  BuildingOfficeIcon,
  HandRaisedIcon,
  CalendarDaysIcon,
  CalendarIcon,

  CheckBadgeIcon,
  ClipboardDocumentListIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  ChatBubbleLeftEllipsisIcon,
  InformationCircleIcon,
  PresentationChartLineIcon,
  QrCodeIcon,
  ClipboardDocumentCheckIcon,
  DocumentMagnifyingGlassIcon,
  ArrowPathIcon,
  WifiIcon,
  IdentificationIcon,
  SparklesIcon,
  BellIcon,
  StarIcon,
  WalletIcon,
  RectangleStackIcon
} from '@heroicons/react/24/outline';

const Layout = ({ children }) => {
  const { user, logout, isAdmin, isCoach } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [presentationUrl, setPresentationUrl] = useState('');

  // 獲取商會簡報URL
  React.useEffect(() => {
    const fetchPresentationUrl = async () => {
      try {
        const response = await axios.get('/api/content/presentation-url');
        const data = response.data;
        if (data.success && data.url) {
          setPresentationUrl(data.url);
        }
      } catch (error) {
        console.error('Error fetching presentation URL:', error);
      }
    };
    
    fetchPresentationUrl();
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navigation = [
    { name: '儀表板', href: '/dashboard', icon: HomeIcon },
    { name: '會員目錄', href: '/members', icon: UserGroupIcon },
    { name: '活動報名', href: '/events', icon: CalendarIcon },
    { name: '商會地基', href: '/foundation', icon: InformationCircleIcon },
    { name: '商媒體', href: '/business-media', icon: DocumentMagnifyingGlassIcon },
    { name: '個人資料', href: '/profile', icon: UserIcon },
  ];

  // AI 智慧合作網絡功能
  const aiFeatures = [
    { name: 'AI 個人檔案', href: '/ai-profile', icon: UserIcon },
    { name: '會員許願版', href: '/wishes', icon: StarIcon },
    { name: 'AI 智慧通知', href: '/notifications', icon: BellIcon },
  ];

  // 教練功能
  const coachFeatures = [
    { name: '教練儀表板', href: '/coach', icon: SparklesIcon },
    // 已移除：{ name: '教練入職', href: '/coach/onboarding', icon: InformationCircleIcon },
    { name: '任務進度', href: '/coach', icon: RectangleStackIcon },
  ];

  // 會員以上功能
  const memberFeatures = [
    { name: 'NFC 電子名片', href: '/nfc-card-editor', icon: IdentificationIcon, minLevel: 3 },
    { name: '數位名片夾', href: '/digital-wallet', icon: WalletIcon, minLevel: 3 },
    { name: '引薦系統', href: '/referrals', icon: HandRaisedIcon, minLevel: 3 },
    { name: '會議預約', href: '/meetings', icon: CalendarDaysIcon, minLevel: 3 },
  ];

  // 核心專屬功能
  const level1Features = [
    { name: '商訪申請表', href: '/prospect-application', icon: ClipboardDocumentListIcon, minLevel: 1 },
    { name: '商訪專區', href: '/prospect-voting', icon: CheckBadgeIcon, minLevel: 1 },
    { name: '黑名單專區', href: '/blacklist', icon: ExclamationTriangleIcon, minLevel: 1 },
  ];

  // 管理員和核心功能
  const managementFeatures = [
    { name: '財務收支表', href: '/financial', icon: CurrencyDollarIcon, minLevel: 1 },
    { name: '申訴信箱', href: '/complaints', icon: ChatBubbleLeftEllipsisIcon, minLevel: 1 },
    { name: '報到系統', href: '/checkin-scanner', icon: QrCodeIcon, minLevel: 1 },
    { name: '出席管理', href: '/attendance-management', icon: ClipboardDocumentCheckIcon, minLevel: 1 },

    { name: '裁判書同步管理', href: '/judgment-sync', icon: ArrowPathIcon, minLevel: 1 },
  ];

  // 開發測試功能（所有登入用戶都可使用）
  const testFeatures = [
    // 測試功能已整合到報到系統中
  ];

  const adminNavigation = [
    { name: '管理儀表板', href: '/admin', icon: ChartBarIcon },
    { name: '會員管理', href: '/admin/users', icon: UsersIcon },
    { name: '待審核會員', href: '/admin/pending', icon: ClockIcon },
    { name: '分會管理', href: '/admin/chapters', icon: BuildingOfficeIcon },
    { name: '活動管理', href: '/admin/events', icon: CalendarIcon },
    { name: '靜態內容管理', href: '/admin/content', icon: Cog6ToothIcon },
    { name: '商媒體管理', href: '/admin/business-media', icon: DocumentMagnifyingGlassIcon },
  ];

  const isCurrentPath = (path) => {
    return location.pathname === path;
  };

  const getMembershipLevelBadge = (level) => {
    const badges = {
      1: { text: '核心', class: 'level-1' },
      2: { text: '幹部', class: 'level-2' },
      3: { text: '會員', class: 'level-3' }
    };
    
    const badge = badges[level] || { text: '未設定', class: 'bg-gray-500' };
    
    return (
      <span className={`badge ${badge.class} text-xs px-2 py-1 rounded-full font-medium`}>
        {badge.text}
      </span>
    );
  };

  // 商會簡報連結組件
  const PresentationLink = ({ mobile }) => {
    if (!presentationUrl) return null;
    
    const handlePresentationClick = (e) => {
      e.preventDefault();
      window.open(presentationUrl, '_blank', 'noopener,noreferrer');
      if (mobile) setSidebarOpen(false);
    };
    
    return (
      <button
        onClick={handlePresentationClick}
        className="nav-link group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full text-left"
      >
        <PresentationChartLineIcon className="mr-3 h-5 w-5" />
        商會簡報
      </button>
    );
  };

  const Sidebar = ({ mobile = false }) => (
    <div className={`flex flex-col h-full ${mobile ? 'px-4' : ''}`}>
      {/* Logo */}
      <div className="flex items-center justify-center h-16 px-4 border-b border-gold-600">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">GBC</span>
          </div>
          <span className="ml-2 text-lg font-semibold text-gold-100">商務菁英會</span>
        </div>
      </div>

      {/* User Info */}
      <div className="p-4 border-b border-gold-600">
        <div className="flex items-center">
          <Avatar 
            src={user?.profilePictureUrl} 
            alt={user?.name}
            size="medium"
          />
          <div className="ml-3 flex-1 min-w-0">
            <p className="text-sm font-medium text-gold-100 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gold-300 truncate">
              {user?.company}
            </p>
          </div>
        </div>
        <div className="mt-2">
          {user?.membershipLevel ? getMembershipLevelBadge(user.membershipLevel) : null}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`${
                isCurrentPath(item.href)
                  ? 'nav-link-active'
                  : 'nav-link'
              } group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full`}
              onClick={() => mobile && setSidebarOpen(false)}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
        
        {/* 商會簡報連結 */}
        <PresentationLink mobile={mobile} />
        
        {/* AI 智慧合作網絡 */}
        <div className="pt-4 pb-2">
          <h3 className="px-2 text-xs font-semibold text-gold-400 uppercase tracking-wider">
            AI 智慧合作網絡
          </h3>
        </div>
        {aiFeatures.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              to={item.href}
              className={`${
                isCurrentPath(item.href)
                  ? 'nav-link-active'
                  : 'nav-link'
              } group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full`}
              onClick={() => mobile && setSidebarOpen(false)}
            >
              <Icon className="mr-3 h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
        
        {/* 教練功能：所有登入者皆可見，不同角色看到不同內容 */}
        {user && (
           <>
             <div className="pt-4 pb-2">
               <h3 className="px-2 text-xs font-semibold text-gold-400 uppercase tracking-wider">
                 教練功能
               </h3>
             </div>
             {coachFeatures.map((item) => {
               const Icon = item.icon;
               return (
                 <Link
                   key={item.name}
                   to={item.href}
                   className={`${
                     isCurrentPath(item.href)
                       ? 'nav-link-active'
                       : 'nav-link'
                   } group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full`}
                   onClick={() => mobile && setSidebarOpen(false)}
                 >
                   <Icon className="mr-3 h-5 w-5" />
                   {item.name}
                 </Link>
               );
             })}
           </>
         )}
        
        {/* Member Features (Level 3+) */}
        {user && (
          <>
            <div className="pt-4 pb-2">
              <h3 className="px-2 text-xs font-semibold text-gold-400 uppercase tracking-wider">
                會員功能
              </h3>
            </div>
            {memberFeatures.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`${
                      isCurrentPath(item.href)
                        ? 'nav-link-active'
                        : 'nav-link'
                    } group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full`}
                    onClick={() => mobile && setSidebarOpen(false)}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
          </>
        )}
        
        {/* Level 1 Core Features */}
        {(user?.membershipLevel === 1 || isAdmin()) && (
          <>
            <div className="pt-4 pb-2">
              <h3 className="px-2 text-xs font-semibold text-gold-400 uppercase tracking-wider">
                核心功能
              </h3>
            </div>
            {level1Features.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    isCurrentPath(item.href)
                      ? 'nav-link-active'
                      : 'nav-link'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full`}
                  onClick={() => mobile && setSidebarOpen(false)}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </>
        )}
        
        {/* Management Features (Admin & Level 1) */}
        {(user?.membershipLevel === 1 || isAdmin()) && (
          <>
            <div className="pt-4 pb-2">
              <h3 className="px-2 text-xs font-semibold text-gold-400 uppercase tracking-wider">
                管理功能
              </h3>
            </div>
            {managementFeatures.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`${
                    isCurrentPath(item.href)
                      ? 'nav-link-active'
                      : 'nav-link'
                  } group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full`}
                  onClick={() => mobile && setSidebarOpen(false)}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gold-600">
        <button
          onClick={handleLogout}
          className="nav-link group flex items-center px-2 py-2 text-sm font-medium rounded-md w-full"
        >
          <ArrowRightOnRectangleIcon className="mr-3 h-5 w-5" />
          登出
        </button>
      </div>
    </div>
  );

  const TopBar = () => (
    <div className="sticky top-0 z-10 flex-shrink-0 flex h-16 bg-primary-800 shadow">
      <button
        type="button"
        className="px-4 border-r border-gold-600 text-gold-300 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-gold-500 md:hidden"
        onClick={() => setSidebarOpen(true)}
      >
        <Bars3Icon className="h-6 w-6" />
      </button>
      <div className="flex-1 px-4 flex justify-between">
        <div className="flex-1 flex" />
        <div className="ml-4 flex items-center md:ml-6">
          <button className="p-1 rounded-full text-gold-300 hover:text-gold-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500">
            <WifiIcon className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 flex z-40 md:hidden ${sidebarOpen ? '' : 'pointer-events-none'}`}>
        <div className={`fixed inset-0 bg-black bg-opacity-75 transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true" onClick={() => setSidebarOpen(false)} />
        <div className={`relative flex-1 flex flex-col max-w-xs w-full bg-primary-900 transform transition ease-in-out duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="absolute top-0 right-0 -mr-12 pt-2">
            <button
              type="button"
              className="ml-1 flex items-center justify-center h-10 w-10 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <XMarkIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </button>
          </div>
          <Sidebar mobile />
        </div>
        <div className="flex-shrink-0 w-14" aria-hidden="true">{/* Dummy element to force sidebar to shrink to fit close icon */}</div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-primary-900 border-r border-gold-600">
          <Sidebar />
        </div>
      </div>

      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <TopBar />
        <main>
          <div className="py-6">
            <div className="px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;