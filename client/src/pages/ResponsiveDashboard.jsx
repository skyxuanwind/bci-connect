import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DesktopSidebar from '../components/DesktopSidebar';
import MobileGrid from '../components/MobileGrid';
import { HomeIcon, UsersIcon, CpuChipIcon, CalendarDaysIcon, CreditCardIcon, Cog6ToothIcon, BriefcaseIcon, ClipboardDocumentListIcon, CheckBadgeIcon, ExclamationTriangleIcon, CurrencyDollarIcon, ChatBubbleLeftEllipsisIcon, QrCodeIcon, ClipboardDocumentCheckIcon, SparklesIcon } from '@heroicons/react/24/outline';

/**
 * ResponsiveDashboard 響應式儀表板頁面
 * - 手機版：3x3 九宮格 + 底部固定導覽列 + 展開卡片
 * - 電腦版：保留側邊欄與主視窗高資訊密度呈現
 */
export default function ResponsiveDashboard() {
  const [openId, setOpenId] = useState(null); // 當前展開的卡片 id
  const { user, isAdmin } = useAuth();
  const level = user?.membershipLevel;
  const isCore = level === 'core' || Number(level) === 1;
  const isCadre = level === 'cadre' || Number(level) === 2;
  const adminUser = typeof isAdmin === 'function' ? isAdmin() : false;
  // 底部導覽移至全局 Layout，移除本地 activeTab 與 navigate

  // 鍵盤 ESC 關閉展開卡片
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') setOpenId(null); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // 主功能卡片：依指定順序與標題
  let gridItems = [
    { id: 'referral-system', title: '引薦系統', icon: <BriefcaseIcon className="w-7 h-7" />, content: (
      <div>
        <p className="text-base sm:text-lg text-gold-200 antialiased">管理引薦流程、追蹤成效與回饋。</p>
        <p className="text-sm sm:text-base text-gold-400 antialiased">可接入引薦紀錄與統計</p>
        <div className="mt-2">
          <Link to="/referrals" className="inline-flex items-center px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-primary-700 text-gold-100 hover:text-gold-50 font-semibold text-sm sm:text-base hover:bg-primary-600 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-yellow-500/50 hover:drop-shadow-[0_6px_16px_rgba(253,216,53,0.25)]">前往引薦系統</Link>
        </div>
      </div>
    ) },
    { id: 'business-communication', title: '業務交流', icon: <UsersIcon className="w-7 h-7" />, content: (
      <div>
        <p className="text-base sm:text-lg text-gold-200 antialiased">建立交流話題、媒合合作與跟進進度。</p>
        <div className="mt-2">
          <Link to="/meetings" className="inline-flex items-center px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-primary-700 text-gold-100 hover:text-gold-50 font-semibold text-sm sm:text-base hover:bg-primary-600 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-yellow-500/50 hover:drop-shadow-[0_6px_16px_rgba(253,216,53,0.25)]">安排交流</Link>
        </div>
      </div>
    ) },
    { id: 'event-registration', title: '活動報名', icon: <CalendarDaysIcon className="w-7 h-7" />, content: (
      <div>
        <p className="text-base sm:text-lg text-gold-200 antialiased">查看近期活動並快速報名。</p>
        <div className="mt-2">
          <Link to="/events" className="inline-flex items-center px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-primary-700 text-gold-100 hover:text-gold-50 font-semibold text-sm sm:text-base hover:bg-primary-600 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-yellow-500/50 hover:drop-shadow-[0_6px_16px_rgba(253,216,53,0.25)]">前往活動列表</Link>
        </div>
      </div>
    ) },
    { id: 'digital-card', title: '電子名片', icon: <CreditCardIcon className="w-7 h-7" />, content: (
      <div>
        <p className="text-base sm:text-lg text-gold-200 antialiased">管理個人 NFC 名片與分享設定。</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link to="/nfc-card-editor" className="inline-flex items-center px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-primary-700 text-gold-100 hover:text-gold-50 font-semibold text-sm sm:text-base hover:bg-primary-600 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-yellow-500/50 hover:drop-shadow-[0_6px_16px_rgba(253,216,53,0.25)]">NFC 電子名片</Link>
          <Link to="/digital-wallet" className="inline-flex items-center px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-primary-700 text-gold-100 hover:text-gold-50 font-semibold text-sm sm:text-base hover:bg-primary-600 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-yellow-500/50 hover:drop-shadow-[0_6px_16px_rgba(253,216,53,0.25)]">數位名片夾</Link>
        </div>
      </div>
    ) },
    { id: 'member-directory', title: '會員目錄', icon: <UsersIcon className="w-7 h-7" />, content: (
      <div>
        <p className="text-base sm:text-lg text-gold-200 antialiased">瀏覽會員名錄與快速檢索。</p>
        <div className="mt-2">
          <Link to="/members" className="inline-flex items-center px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-primary-700 text-gold-100 hover:text-gold-50 font-semibold text-sm sm:text-base hover:bg-primary-600 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-yellow-500/50 hover:drop-shadow-[0_6px_16px_rgba(253,216,53,0.25)]">前往會員目錄</Link>
        </div>
      </div>
    ) },
    { id: 'business-media', title: '商媒體', icon: <CpuChipIcon className="w-7 h-7" />, content: (
      <div>
        <p className="text-base sm:text-lg text-gold-200 antialiased">商媒體素材管理與推廣入口。</p>
        <div className="mt-2">
          <Link to="/business-media" className="inline-flex items-center px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-primary-700 text-gold-100 hover:text-gold-50 font-semibold text-sm sm:text-base hover:bg-primary-600 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-yellow-500/50 hover:drop-shadow-[0_6px_16px_rgba(253,216,53,0.25)]">前往商媒體</Link>
        </div>
      </div>
    ) },
    { id: 'ai-map', title: 'AI商業版圖', icon: <CpuChipIcon className="w-7 h-7" />, content: (
      <div>
        <p className="text-base sm:text-lg text-gold-200 antialiased">AI 驅動的商業洞察與策略建議。</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <Link to="/ai-profile" className="inline-flex items-center px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-primary-700 text-gold-100 hover:text-gold-50 font-semibold text-sm sm:text-base hover:bg-primary-600 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-yellow-500/50 hover:drop-shadow-[0_6px_16px_rgba(253,216,53,0.25)]">AI 深度畫像</Link>
          <Link to="/business-dashboard" className="inline-flex items-center px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-primary-700 text-gold-100 hover:text-gold-50 font-semibold text-sm sm:text-base hover:bg-primary-600 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-yellow-500/50 hover:drop-shadow-[0_6px_16px_rgba(253,216,53,0.25)]">我的商業儀表板</Link>
        </div>
      </div>
    ) },
    { id: 'foundation', title: '商會地基', icon: <HomeIcon className="w-7 h-7" />, content: (
      <div>
        <p className="text-base sm:text-lg text-gold-200 antialiased">商會核心理念、制度與運作基礎。</p>
        <div className="mt-2">
          <Link to="/foundation" className="inline-flex items-center px-5 py-2.5 sm:px-6 sm:py-3 rounded-xl bg-primary-700 text-gold-100 hover:text-gold-50 font-semibold text-sm sm:text-base hover:bg-primary-600 transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-yellow-500/50 hover:drop-shadow-[0_6px_16px_rgba(253,216,53,0.25)]">前往商會地基</Link>
        </div>
      </div>
    ) },
  ];

  // 已移除：手機App版頁面中的教練功能與財務收支表卡片（改置於核心功能頁面）

  // 底部導覽已整合到 Layout

  return (
    <div className="min-h-screen bg-primary-900 text-gold-200">
      {/* 電腦版：側邊欄 + 主內容 */}
      <div className="hidden md:flex">
        <DesktopSidebar />
        <main className="flex-1 p-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-gold-300">商務儀表板</h1>
            <div className="text-xs text-gold-400">維持現有設計不變（示意）</div>
          </div>
          <section className="mt-6 grid grid-cols-12 gap-4">
            {/* 左側密集資訊卡片（示意） */}
            <div className="col-span-8 space-y-4">
              <div className="rounded-xl bg-primary-800 p-4 border border-primary-700 shadow-xl">近7日引薦趨勢圖（可接入現有圖表）</div>
              <div className="rounded-xl bg-primary-800 p-4 border border-primary-700 shadow-xl">會員活躍度熱圖（示意）</div>
              <div className="rounded-xl bg-primary-800 p-4 border border-primary-700 shadow-xl">AI 策略建議摘要（示意）</div>
            </div>
            {/* 右側列表（示意） */}
            <div className="col-span-4 space-y-4">
              <div className="rounded-xl bg-primary-800 p-4 border border-primary-700 shadow-xl">待辦事項列表</div>
              <div className="rounded-xl bg-primary-800 p-4 border border-primary-700 shadow-xl">近期活動日程</div>
            </div>
          </section>
        </main>
      </div>

      {/* 手機版：九宮格（底部導覽由 Layout 統一顯示） */}
      <div className="md:hidden">
        {/* 首頁九宮格主視覺：LOGO + 英文標題（移除原文字） */}
        <header className="px-4 py-4 border-b border-gold-600 bg-gradient-to-r from-black via-primary-900 to-black">
          <div className="flex items-center gap-3">
            <img src="/images/gbc-logo.svg" alt="GBC Logo" className="h-7 w-auto sm:h-8 select-none" />
            <span className="text-lg sm:text-xl font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-yellow-300 to-yellow-500">
              Golden Bridge Conference
            </span>
          </div>
        </header>

        <MobileGrid items={gridItems} openId={openId} setOpenId={setOpenId} />

        {/* 已移除：手機App版頁面下方核心/幹部功能區塊（保留底部導航） */}
        {/* MobileGrid 已有 padding-bottom 保護底部導覽，不需額外間距 */}
      </div>
    </div>
  );
}