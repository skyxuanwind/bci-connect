import React from 'react';
import { HomeIcon, UserIcon, Cog6ToothIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';

/**
 * BottomRoleNav 手機底部固定導覽列（依權限動態）
 * - 一般用戶顯示三個按鈕：首頁、個人資料、設定
 * - 核心或幹部顯示四個按鈕：首頁、個人資料、設定、核心功能（或幹部功能）
 */
export default function BottomRoleNav({ active, onNavigate }) {
  const { user, isAdmin } = useAuth();
  const level = user?.membershipLevel;
  const isCore = level === 'core' || Number(level) === 1;
  const isCadre = level === 'cadre' || Number(level) === 2;
  const privileged = isCore || isCadre || (typeof isAdmin === 'function' && isAdmin());

  const baseItems = [
    { key: 'home', label: '首頁', Icon: HomeIcon },
    { key: 'profile', label: '個人資料', Icon: UserIcon },
    { key: 'settings', label: '設定', Icon: Cog6ToothIcon },
  ];

  const extraItem = privileged
    ? { key: 'core', label: isCore || (typeof isAdmin === 'function' && isAdmin()) ? '核心功能' : '幹部功能', Icon: ShieldCheckIcon }
    : null;

  const items = extraItem ? [...baseItems, extraItem] : baseItems;

  const cols = items.length;

  return (
    <nav
      role="navigation"
      aria-label="底部導覽"
      className="fixed bottom-0 inset-x-0 z-50 bg-primary-900/90 backdrop-blur border-t border-primary-700 md:hidden"
    >
      <ul className={`grid ${cols === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
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