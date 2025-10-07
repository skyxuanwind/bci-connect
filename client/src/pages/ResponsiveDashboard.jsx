import React, { useEffect, useState } from 'react';
import DesktopSidebar from '../components/DesktopSidebar';
import MobileGrid from '../components/MobileGrid';
import BottomNav from '../components/BottomNav';
import { HomeIcon, UsersIcon, CpuChipIcon, CalendarDaysIcon, CreditCardIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

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

  // 範例資料：九宮格功能入口
  const gridItems = [
    { id: 'referrals', title: '引薦紀錄', icon: <CreditCardIcon className="w-7 h-7" />, content: (
      <div>
        <p>近期引薦：王小明 → 林雅婷（商務合作）</p>
        <p>上週引薦：李家豪 → 陳怡君（產品導入）</p>
      </div>
    ) },
    { id: 'members', title: '會員', icon: <UsersIcon className="w-7 h-7" />, content: (
      <ul className="list-disc pl-5">
        <li>會員總數：256</li>
        <li>近30日新增：18</li>
      </ul>
    ) },
    { id: 'ai', title: 'AI 工具', icon: <CpuChipIcon className="w-7 h-7" />, content: (
      <div>
        <p>快速入口：策略建議、文案生成、名片分析</p>
        <p className="text-xs text-gold-400">此區可接入真實 API</p>
      </div>
    ) },
    { id: 'events', title: '活動', icon: <CalendarDaysIcon className="w-7 h-7" />, content: (
      <div>
        <p>近期活動：11/15 聯誼交流會、11/22 產品分享會</p>
      </div>
    ) },
    { id: 'cards', title: '名片', icon: <CreditCardIcon className="w-7 h-7" />, content: (
      <div>
        <p>管理個人 NFC 名片、查看掃描統計</p>
      </div>
    ) },
    { id: 'settings', title: '設定', icon: <Cog6ToothIcon className="w-7 h-7" />, content: (
      <div>
        <p>通知偏好、隱私設定與外觀主題</p>
      </div>
    ) },
    { id: 'home', title: '首頁摘要', icon: <HomeIcon className="w-7 h-7" />, content: (
      <div>
        <p>本週達成率：72%</p>
        <p>待辦：跟進 5 位潛在客戶</p>
      </div>
    ) },
    { id: 'ranking', title: '章節排行', icon: <UsersIcon className="w-7 h-7" />, content: (
      <div>
        <p>章節A：引薦 32 次、成交 12 單</p>
        <p>章節B：引薦 28 次、成交 9 單</p>
      </div>
    ) },
    { id: 'analysis', title: '營運分析', icon: <CpuChipIcon className="w-7 h-7" />, content: (
      <div>
        <p>來源分解、目標 vs 實績、達成率摘要</p>
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

        {/* 底部導航：五個圖示 */}
        <BottomNav active={activeTab} onNavigate={setActiveTab} />
      </div>
    </div>
  );
}