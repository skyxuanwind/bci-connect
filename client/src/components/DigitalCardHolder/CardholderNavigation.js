import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HeartIcon, UserIcon, Cog6ToothIcon } from '@heroicons/react/24/outline';

const CardholderNavigation = () => {
  const location = useLocation();
  const isAuthenticated = localStorage.getItem('cardholderToken') !== null;

  if (!isAuthenticated) {
    return null;
  }

  const navItems = [
    {
      path: '/cardholder/dashboard',
      name: '我的名片夾',
      icon: HeartIcon
    },
    {
      path: '/cardholder/profile',
      name: '個人資料',
      icon: UserIcon
    },
    {
      path: '/cardholder/settings',
      name: '設定',
      icon: Cog6ToothIcon
    }
  ];

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link to="/cardholder/dashboard" className="text-xl font-bold text-gray-900">
                數位名片夾
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                      isActive
                        ? 'border-blue-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
          <div className="flex items-center">
            <button
              onClick={() => {
                localStorage.removeItem('cardholderToken');
                window.location.href = '/cardholder/auth';
              }}
              className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
            >
              登出
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default CardholderNavigation;