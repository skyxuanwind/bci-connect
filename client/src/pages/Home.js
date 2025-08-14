import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  UserGroupIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  StarIcon,
  ArrowRightIcon
} from '@heroicons/react/24/outline';

const Home = () => {
  const { isAuthenticated } = useAuth();
  // 移除統計數據相關的狀態和 API 調用

  const features = [
    {
      icon: UserGroupIcon,
      title: '專業網絡',
      description: '連接各行業的商務精英，建立有價值的商業關係'
    },
    {
      icon: GlobeAltIcon,
      title: '全球視野',
      description: '分享國際商務經驗，拓展全球商業機會'
    },
    {
      icon: ShieldCheckIcon,
      title: '資源共享',
      description: '會員間互相分享商業資源，創造合作機會'
    },
    {
      icon: StarIcon,
      title: '精英聚會',
      description: '定期舉辦高品質的商務活動和交流聚會'
    }
  ];



  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">BCI</span>
              </div>
              <span className="ml-2 text-xl font-bold text-primary-900">商務菁英會</span>
            </div>
            
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="btn-primary"
                >
                  進入系統
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-primary-900 hover:text-primary-700 font-medium"
                  >
                    登入
                  </Link>
                  <Link
                    to="/register"
                    className="btn-primary"
                  >
                    註冊
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-primary text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 text-shadow">
              BCI商務菁英會
            </h1>
            <p className="text-xl md:text-2xl mb-8 text-blue-100 max-w-3xl mx-auto">
              連接商務精英，創造無限商機
            </p>
            <p className="text-lg mb-12 text-blue-200 max-w-2xl mx-auto">
              加入我們的專業網絡，與各行業領袖建立深度連結，共同開創商業新機遇
            </p>
            
            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  to="/register"
                  className="bg-gold-600 hover:bg-gold-700 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200 flex items-center justify-center"
                >
                  立即加入
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  to="/login"
                  className="bg-white bg-opacity-10 hover:bg-opacity-20 text-white font-bold py-3 px-8 rounded-lg transition-colors duration-200 border border-white border-opacity-30"
                >
                  會員登入
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-900 mb-4">
              為什麼選擇BCI商務菁英會？
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              我們提供專業的商務交流平台，幫助您建立有價值的商業關係
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="text-center">
                  <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Icon className="h-8 w-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-semibold text-primary-900 mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="py-20 bg-gradient-gold text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            準備加入我們了嗎？
          </h2>
          <p className="text-xl mb-8 text-yellow-100">
            立即註冊成為BCI商務菁英會會員，開始您的商務網絡之旅
          </p>
          
          {!isAuthenticated && (
            <Link
              to="/register"
              className="bg-white text-gold-600 hover:bg-gray-100 font-bold py-3 px-8 rounded-lg transition-colors duration-200 inline-flex items-center"
            >
              立即註冊
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Link>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="w-8 h-8 bg-gold-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">BCI</span>
              </div>
              <span className="ml-2 text-xl font-bold">商務菁英會</span>
            </div>
            <p className="text-blue-200 mb-4">
              連接商務精英，創造無限商機
            </p>
            <p className="text-blue-300 text-sm">
              © 2024 BCI Business Elite Club. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;