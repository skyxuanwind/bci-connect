import React from 'react';
import { HomeIcon, UserIcon, CpuChipIcon, CalendarDaysIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

/**
 * BottomNav 手機底部固定導覽列
 * - 五個圖示：首頁、會員、AI、活動、我的
 * - 無障礙：aria-label、role、tabIndex 與鍵盤操作
 */
export default function BottomNav({ active, onNavigate }) {
  const items = [
    { key: 'home', label: '首頁', Icon: HomeIcon },
    { key: 'members', label: '會員', Icon: UserIcon },
    { key: 'ai', label: 'AI', Icon: CpuChipIcon },
    { key: 'events', label: '活動', Icon: CalendarDaysIcon },
    { key: 'me', label: '我的', Icon: Cog6ToothIcon },
  ];

  return (
    <nav
      role="navigation"
      aria-label="底部導覽"
      className="fixed bottom-0 inset-x-0 z-50 bg-primary-900/90 backdrop-blur border-t border-primary-700 md:hidden"
    >
      <ul className="grid grid-cols-5">
        {items.map(({ key, label, Icon }) => (
          <li key={key} className="flex">
            <button
              type="button"
              aria-label={label}
              tabIndex={0}
              onClick={() => onNavigate?.(key)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate?.(key); }}
              className={`flex-1 py-2 flex flex-col items-center justify-center focus:outline-none focus:ring-2 focus:ring-gold-500 ${active === key ? 'text-gold-400' : 'text-gold-200'} hover:text-gold-300`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-0.5">{label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}