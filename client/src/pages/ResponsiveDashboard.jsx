import React, { useEffect, useState } from 'react';
import DesktopSidebar from '../components/DesktopSidebar';
import MobileGrid from '../components/MobileGrid';
import BottomRoleNav from '../components/BottomRoleNav';
import { HomeIcon, UsersIcon, CpuChipIcon, CalendarDaysIcon, CreditCardIcon, Cog6ToothIcon, BriefcaseIcon } from '@heroicons/react/24/outline';

/**
 * ResponsiveDashboard 響應式儀表板頁面
 * - 手機版：3x3 九宮格 + 底部固定導覽列 + 展開卡片
 * - 電腦版：保留側邊欄與主視窗高資訊密度呈現
 */
export default function ResponsiveDashboard() {
  const [openId, setOpenId] = useState(null); // 當前展開的卡片 id
  const [activeTab, setActiveTab] = useState('home'); // 底部導覽選中的分頁

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
        <p>管理引薦流程、追蹤成效與回饋。</p>
        <p className="text-xs text-gold-400">可接入引薦紀錄與統計</p>
      </div>
    ) },
    { id: 'business-communication', title: '業務交流', icon: <UsersIcon className="w-7 h-7" />, content: (
      <div>
        <p>建立交流話題、媒合合作與跟進進度。</p>
      </div>
    ) },
    { id: 'event-registration', title: '活動報名', icon: <CalendarDaysIcon className="w-7 h-7" />, content: (
      <div>
        <p>查看近期活動並快速報名。</p>
      </div>
    ) },
    { id: 'digital-card', title: '電子名片', icon: <CreditCardIcon className="w-7 h-7" />, content: (
      <div>
        <p>管理個人 NFC 名片與分享設定。</p>
      </div>
    ) },
    { id: 'member-directory', title: '會員目錄', icon: <UsersIcon className="w-7 h-7" />, content: (
      <div>
        <p>瀏覽會員名錄與快速檢索。</p>
      </div>
    ) },
    { id: 'business-media', title: '商媒體', icon: <CpuChipIcon className="w-7 h-7" />, content: (
      <div>
        <p>商媒體素材管理與推廣入口。</p>
      </div>
    ) },
    { id: 'ai-map', title: 'AI商業版圖', icon: <CpuChipIcon className="w-7 h-7" />, content: (
      <div>
        <p>AI 驅動的商業洞察與策略建議。</p>
      </div>
    ) },
    { id: 'foundation', title: '商會地基', icon: <HomeIcon className="w-7 h-7" />, content: (
      <div>
        <p>商會核心理念、制度與運作基礎。</p>
      </div>
    ) },
  ];

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
              <div className="rounded-xl bg-primary-800 p-4 border border-primary-700">近7日引薦趨勢圖（可接入現有圖表）</div>
              <div className="rounded-xl bg-primary-800 p-4 border border-primary-700">會員活躍度熱圖（示意）</div>
              <div className="rounded-xl bg-primary-800 p-4 border border-primary-700">AI 策略建議摘要（示意）</div>
            </div>
            {/* 右側列表（示意） */}
            <div className="col-span-4 space-y-4">
              <div className="rounded-xl bg-primary-800 p-4 border border-primary-700">待辦事項列表</div>
              <div className="rounded-xl bg-primary-800 p-4 border border-primary-700">近期活動日程</div>
            </div>
          </section>
        </main>
      </div>

      {/* 手機版：九宮格 + 底部導覽 */}
      <div className="md:hidden">
        {/* 首頁九宮格主視覺 */}
        <header className="px-4 py-3 border-b border-primary-700 bg-primary-900">
          <h1 className="text-xl font-semibold text-gold-300">首頁</h1>
          <p className="text-xs text-gold-400">黑金質感設計，APP般操作體驗</p>
        </header>

        <MobileGrid items={gridItems} openId={openId} setOpenId={setOpenId} />

        {/* 底部導航：依權限動態顯示 3 或 4 個按鈕 */}
        <BottomRoleNav active={activeTab} onNavigate={setActiveTab} />
      </div>
    </div>
  );
}