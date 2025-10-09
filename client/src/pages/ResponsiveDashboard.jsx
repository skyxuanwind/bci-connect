import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import DesktopSidebar from '../components/DesktopSidebar';
import MobileGrid from '../components/MobileGrid';
import { HomeIcon, UsersIcon, CpuChipIcon, CalendarDaysIcon, CreditCardIcon, Cog6ToothIcon, BriefcaseIcon, ClipboardDocumentListIcon, CheckBadgeIcon, ExclamationTriangleIcon, CurrencyDollarIcon, ChatBubbleLeftEllipsisIcon, QrCodeIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';

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

  // 八張卡片：依指定順序與標題
  const gridItems = [
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

        {/* 核心/幹部功能清單卡片（不更動底部導覽；採用黑金卡片質感） */}
        <section className="px-4 pt-4 pb-24 space-y-6">
          {/* 核心功能（僅核心或管理員顯示） */}
          {(isCore || adminUser) && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gold-200 mb-3">核心功能</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 商訪申請表 */}
              <Link to="/prospect-application" className="group rounded-2xl bg-gradient-to-br from-black/60 via-primary-900/80 to-primary-800/80 border border-yellow-600/40 shadow-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ClipboardDocumentListIcon className="w-6 h-6 text-yellow-400" />
                  <div>
                    <div className="text-base sm:text-lg font-semibold text-gold-200 flex items-center">商訪申請表 <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500 text-yellow-300">核心</span></div>
                    <div className="text-sm text-gold-400">填寫與提交商訪申請</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gold-300 group-hover:text-yellow-300">前往</span>
                  <Link to="/prospect-voting" className="text-xs text-yellow-300 hover:text-yellow-200 underline">商訪專區</Link>
                </div>
              </Link>
              {/* 黑名單專區 */}
              <Link to="/blacklist" className="group rounded-2xl bg-gradient-to-br from-black/60 via-primary-900/80 to-primary-800/80 border border-yellow-600/40 shadow-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400" />
                  <div>
                    <div className="text-base sm:text-lg font-semibold text-gold-200 flex items-center">黑名單專區 <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500 text-yellow-300">核心</span></div>
                    <div className="text-sm text-gold-400">維護與查詢黑名單</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gold-300 group-hover:text-yellow-300">前往</span>
                  <Link to="/foundation" className="text-xs text-yellow-300 hover:text-yellow-200 underline">操作指南</Link>
                </div>
              </Link>
              {/* 申訴信箱 */}
              <Link to="/complaints" className="group rounded-2xl bg-gradient-to-br from-black/60 via-primary-900/80 to-primary-800/80 border border-yellow-600/40 shadow-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ChatBubbleLeftEllipsisIcon className="w-6 h-6 text-yellow-400" />
                  <div>
                    <div className="text-base sm:text-lg font-semibold text-gold-200 flex items-center">申訴信箱 <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500 text-yellow-300">核心</span></div>
                    <div className="text-sm text-gold-400">處理成員申訴</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gold-300 group-hover:text-yellow-300">前往</span>
                  <Link to="/foundation" className="text-xs text-yellow-300 hover:text-yellow-200 underline">操作指南</Link>
                </div>
              </Link>
              {/* 出席管理 */}
              <Link to="/attendance-management" className="group rounded-2xl bg-gradient-to-br from-black/60 via-primary-900/80 to-primary-800/80 border border-yellow-600/40 shadow-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <ClipboardDocumentCheckIcon className="w-6 h-6 text-yellow-400" />
                  <div>
                    <div className="text-base sm:text-lg font-semibold text-gold-200 flex items-center">出席管理 <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500 text-yellow-300">核心</span></div>
                    <div className="text-sm text-gold-400">管理與導出出席資料</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gold-300 group-hover:text-yellow-300">前往</span>
                  <Link to="/checkin-scanner" className="text-xs text-yellow-300 hover:text-yellow-200 underline">報到系統</Link>
                </div>
              </Link>
            </div>
          </div>
          )}

          {/* 幹部功能（僅幹部或管理員顯示） */}
          {(isCadre || adminUser) && (
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gold-200 mb-3">幹部功能</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* 商訪專區 */}
              <Link to="/prospect-voting" className="group rounded-2xl bg-gradient-to-br from-black/60 via-primary-900/80 to-primary-800/80 border border-yellow-600/40 shadow-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckBadgeIcon className="w-6 h-6 text-yellow-400" />
                  <div>
                    <div className="text-base sm:text-lg font-semibold text-gold-200 flex items-center">商訪專區 <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500 text-yellow-300">幹部</span></div>
                    <div className="text-sm text-gold-400">查看與管理商訪</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gold-300 group-hover:text-yellow-300">前往</span>
                  <Link to="/prospect-application" className="text-xs text-yellow-300 hover:text-yellow-200 underline">申請表</Link>
                </div>
              </Link>
              {/* 財務收支表 */}
              <Link to="/financial" className="group rounded-2xl bg-gradient-to-br from-black/60 via-primary-900/80 to-primary-800/80 border border-yellow-600/40 shadow-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CurrencyDollarIcon className="w-6 h-6 text-yellow-400" />
                  <div>
                    <div className="text-base sm:text-lg font-semibold text-gold-200 flex items-center">財務收支表 <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500 text-yellow-300">幹部</span></div>
                    <div className="text-sm text-gold-400">查看財務記錄</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gold-300 group-hover:text-yellow-300">前往</span>
                  <Link to="/foundation" className="text-xs text-yellow-300 hover:text-yellow-200 underline">操作指南</Link>
                </div>
              </Link>
              {/* 報到系統 */}
              <Link to="/checkin-scanner" className="group rounded-2xl bg-gradient-to-br from-black/60 via-primary-900/80 to-primary-800/80 border border-yellow-600/40 shadow-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <QrCodeIcon className="w-6 h-6 text-yellow-400" />
                  <div>
                    <div className="text-base sm:text-lg font-semibold text-gold-200 flex items-center">報到系統 <span className="ml-2 text-[10px] px-2 py-0.5 rounded-full border border-yellow-500 text-yellow-300">幹部</span></div>
                    <div className="text-sm text-gold-400">活動現場掃描報到</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gold-300 group-hover:text-yellow-300">前往</span>
                  <Link to="/attendance-management" className="text-xs text-yellow-300 hover:text-yellow-200 underline">出席管理</Link>
                </div>
              </Link>
            </div>
          </div>
          )}
        </section>
      </div>
    </div>
  );
}