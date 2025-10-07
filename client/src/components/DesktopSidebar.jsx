import React from 'react';
import { HomeIcon, UsersIcon, CpuChipIcon, CalendarDaysIcon, CreditCardIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

/**
 * DesktopSidebar 電腦版側邊欄
 * - 保留現有設計思路，垂直排列圖示 + 標籤
 * - 可選收合功能（此版本提供基本樣式）
 */
export default function DesktopSidebar() {
  const items = [
    { key: 'dashboard', label: '儀表板', Icon: HomeIcon },
    { key: 'members', label: '會員', Icon: UsersIcon },
    { key: 'ai', label: 'AI 工具', Icon: CpuChipIcon },
    { key: 'events', label: '活動', Icon: CalendarDaysIcon },
    { key: 'cards', label: '名片', Icon: CreditCardIcon },
    { key: 'settings', label: '設定', Icon: Cog6ToothIcon },
  ];

  return (
    <aside aria-label="側邊導覽" className="hidden md:flex md:flex-col md:w-56 bg-primary-900 border-r border-primary-700">
      <div className="px-4 py-3 border-b border-primary-700">
        <h2 className="text-gold-300 font-semibold">功能選單</h2>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {items.map(({ key, label, Icon }) => (
          <button key={key} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-gold-200 hover:text-gold-300 hover:bg-primary-800 focus:outline-none focus:ring-2 focus:ring-gold-500">
            <Icon className="w-5 h-5" />
            <span className="text-sm">{label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}