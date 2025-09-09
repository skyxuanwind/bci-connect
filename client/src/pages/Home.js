import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  UserGroupIcon,
  GlobeAltIcon,
  ShieldCheckIcon,
  StarIcon,
  ArrowRightIcon,
  SparklesIcon,
  TrophyIcon,
  BuildingOfficeIcon,
  CrownIcon,
  DiamondIcon,
  ShieldExclamationIcon,
  FireIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import {
  CrownIcon as CrownSolid,
  FireIcon as FireSolid,
  ShieldCheckIcon as ShieldSolid,
  StarIcon as StarSolid
} from '@heroicons/react/24/solid';

const Home = () => {
  const { isAuthenticated } = useAuth();
  // 移除統計數據相關的狀態和 API 調用
  const [activeTooltip, setActiveTooltip] = useState(null);

  const features = [
    {
      icon: UserGroupIcon,
      title: '專業網絡',
      description: '連接各行業的商務精英，建立有價值的商業關係',
      tooltip: '透過我們的平台，您可以與來自不同行業的商務領袖建立聯繫，擴展您的專業人脈網絡，發現新的商業合作機會。'
    },
    {
      icon: GlobeAltIcon,
      title: '全球視野',
      description: '分享國際商務經驗，拓展全球商業機會',
      tooltip: '參與國際商務討論，了解全球市場趨勢，與國際商務夥伴交流經驗，把握跨國合作商機。'
    },
    {
      icon: ShieldSolid,
      title: '資源共享',
      description: '會員間互相分享商業資源，創造合作機會',
      tooltip: '會員可以分享行業資源、商業情報、合作夥伴推薦等，實現資源互補，創造雙贏局面。'
    },
    {
      icon: StarSolid,
      title: '精英聚會',
      description: '定期舉辦高品質的商務活動和交流聚會',
      tooltip: '我們定期舉辦線上線下的商務聚會、研討會、工作坊等活動，提供面對面交流的機會。'
    }
  ];



  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Flowing silk-like waves */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-1/4 -left-1/4 w-[150%] h-32 bg-gradient-to-r from-transparent via-gold-400/20 to-transparent transform -rotate-12 animate-[wave_8s_ease-in-out_infinite] blur-sm"></div>
            <div className="absolute top-1/2 -right-1/4 w-[150%] h-24 bg-gradient-to-r from-transparent via-amber-500/15 to-transparent transform rotate-12 animate-[wave_10s_ease-in-out_infinite_reverse] blur-sm delay-1000"></div>
            <div className="absolute top-3/4 -left-1/4 w-[150%] h-20 bg-gradient-to-r from-transparent via-gold-300/25 to-transparent transform -rotate-6 animate-[wave_12s_ease-in-out_infinite] blur-sm delay-2000"></div>
          </div>
        </div>
        
        {/* Luxury flowing ribbons */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/3 w-96 h-full bg-gradient-to-b from-gold-400/10 via-transparent to-amber-500/10 transform rotate-45 animate-[float_15s_ease-in-out_infinite] blur-xl"></div>
          <div className="absolute top-0 right-1/3 w-80 h-full bg-gradient-to-b from-amber-400/8 via-transparent to-gold-400/8 transform -rotate-45 animate-[float_18s_ease-in-out_infinite_reverse] blur-xl delay-3000"></div>
        </div>
        
        {/* Dynamic golden orbs */}
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-gradient-to-br from-gold-400/15 to-amber-600/8 rounded-full blur-3xl animate-[pulse_6s_ease-in-out_infinite]"></div>
        <div className="absolute top-1/2 -left-32 w-80 h-80 bg-gradient-to-tr from-amber-500/12 to-gold-300/6 rounded-full blur-3xl animate-[pulse_8s_ease-in-out_infinite] delay-2000"></div>
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-gradient-to-t from-gold-500/18 to-transparent rounded-full blur-2xl animate-[pulse_10s_ease-in-out_infinite] delay-4000"></div>
        
        {/* Elegant light streams */}
        <div className="absolute top-0 left-1/5 w-px h-full bg-gradient-to-b from-transparent via-gold-400/40 to-transparent animate-[shimmer_7s_ease-in-out_infinite] delay-1000"></div>
        <div className="absolute top-0 right-1/5 w-px h-full bg-gradient-to-b from-transparent via-amber-400/35 to-transparent animate-[shimmer_9s_ease-in-out_infinite] delay-3000"></div>
        
        {/* Subtle luxury accents */}
        <div className="absolute top-1/6 right-1/8 w-40 h-40 bg-gradient-to-br from-gold-300/8 to-amber-500/4 rounded-full blur-2xl animate-[float_20s_ease-in-out_infinite] delay-5000"></div>
        <div className="absolute bottom-1/4 left-1/8 w-48 h-48 bg-gradient-to-tr from-amber-400/6 to-gold-300/3 rounded-full blur-3xl animate-[float_25s_ease-in-out_infinite] delay-7000"></div>
      </div>
      
      {/* Custom CSS animations */}
      <style jsx>{`
        @keyframes wave {
          0%, 100% { transform: translateX(0) rotate(-12deg) scaleY(1); }
          25% { transform: translateX(20px) rotate(-10deg) scaleY(1.1); }
          50% { transform: translateX(-10px) rotate(-14deg) scaleY(0.9); }
          75% { transform: translateX(15px) rotate(-8deg) scaleY(1.05); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(45deg) scale(1); }
          33% { transform: translateY(-20px) rotate(47deg) scale(1.05); }
          66% { transform: translateY(10px) rotate(43deg) scale(0.95); }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.3; transform: scaleY(1); }
          50% { opacity: 0.8; transform: scaleY(1.2); }
        }
      `}</style>
      
      {/* Navigation */}
      <nav className="relative z-50 bg-black/40 backdrop-blur-xl border-b border-gold-500/30 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center">
              <div className="w-12 h-12 bg-gradient-to-br from-gold-400 to-amber-600 rounded-xl flex items-center justify-center shadow-xl shadow-gold-500/25">
                <span className="text-black font-bold text-lg">GBC</span>
              </div>
              <div className="ml-4">
                <span className="text-2xl font-bold bg-gradient-to-r from-gold-300 to-amber-400 bg-clip-text text-transparent">商務菁英會</span>
                <div className="text-xs text-gold-400/80 font-medium tracking-wider">BUSINESS ELITE CLUB</div>
              </div>
            </div>
            
            <div className="flex items-center space-x-6">
              {isAuthenticated ? (
                <Link
                  to="/dashboard"
                  className="bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-black font-bold py-3 px-8 rounded-xl transition-all duration-300 shadow-xl shadow-gold-500/25 hover:shadow-gold-400/40 transform hover:scale-105"
                >
                  進入系統
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gold-300 hover:text-gold-100 font-semibold transition-colors duration-300 px-4 py-2 rounded-lg hover:bg-gold-500/10"
                  >
                    會員登入
                  </Link>
                  <Link
                    to="/register"
                    className="bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-black font-bold py-3 px-8 rounded-xl transition-all duration-300 shadow-xl shadow-gold-500/25 hover:shadow-gold-400/40 transform hover:scale-105"
                  >
                    立即加入
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 text-white py-32 lg:py-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Premium Badge */}
            <div className="inline-flex items-center px-6 py-2 rounded-full bg-gradient-to-r from-gold-500/20 to-amber-600/20 border border-gold-400/30 backdrop-blur-sm mb-8">
              <span className="text-gold-300 font-semibold text-sm tracking-wide">PREMIUM BUSINESS NETWORK</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold mb-8 leading-tight">
              <span className="bg-gradient-to-r from-gold-200 via-gold-300 to-amber-400 bg-clip-text text-transparent drop-shadow-2xl">
                GBC
              </span>
              <br />
              <span className="text-white drop-shadow-2xl">商務菁英會</span>
            </h1>
            
            <div className="max-w-4xl mx-auto mb-12">
              <p className="text-2xl md:text-3xl mb-6 text-gold-200 font-light leading-relaxed">
                連接商務精英，創造無限商機
              </p>
              <p className="text-lg md:text-xl text-gray-300 leading-relaxed max-w-3xl mx-auto">
                加入我們的專業網絡，與各行業領袖建立深度連結，共同開創商業新機遇。
                在這裡，每一次交流都可能成為改變命運的契機。
              </p>
            </div>
            
            {!isAuthenticated && (
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Link
                  to="/register"
                  className="group bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-black font-bold py-4 px-10 rounded-2xl transition-all duration-300 shadow-2xl shadow-gold-500/30 hover:shadow-gold-400/50 transform hover:scale-105 flex items-center"
                >
                  <TrophyIcon className="h-6 w-6 mr-3 group-hover:rotate-12 transition-transform duration-300" />
                  立即加入菁英圈
                  <ArrowRightIcon className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
                <Link
                  to="/login"
                  className="group bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-semibold py-4 px-10 rounded-2xl transition-all duration-300 border border-gold-400/30 hover:border-gold-300/50 flex items-center"
                >
                  會員專屬登入
                  <ArrowRightIcon className="ml-3 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 py-24 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-gold-500/10 to-amber-600/10 border border-gold-400/20 backdrop-blur-sm mb-6">
              <span className="text-gold-300 font-medium text-sm">ELITE ADVANTAGES</span>
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              <span className="bg-gradient-to-r from-gold-200 to-amber-300 bg-clip-text text-transparent">
                為什麼選擇
              </span>
              <br />
              <span className="text-white">GBC商務菁英會？</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              我們提供專業的商務交流平台，幫助您建立有價值的商業關係，
              在這個精英網絡中實現商業價值的最大化。
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="group relative">
                  <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-xl rounded-3xl p-8 border border-gold-500/20 hover:border-gold-400/40 transition-all duration-500 hover:shadow-2xl hover:shadow-gold-500/20 transform hover:-translate-y-2">
                    <div className="w-20 h-20 bg-gradient-to-br from-gold-500/20 to-amber-600/20 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-gold-400/30 group-hover:scale-110 transition-transform duration-300">
                      <Icon className="h-10 w-10 text-gold-400 group-hover:text-gold-300 transition-colors duration-300" />
                    </div>
                    <div className="flex items-center justify-center mb-4 relative">
                      <h3 className="text-2xl font-bold text-gold-100 group-hover:text-gold-200 transition-colors duration-300">
                        {feature.title}
                      </h3>
                      <div className="relative ml-2">
                        <button
                          className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-opacity-50"
                          onMouseEnter={() => setActiveTooltip(index)}
                          onMouseLeave={() => setActiveTooltip(null)}
                          onClick={() => setActiveTooltip(activeTooltip === index ? null : index)}
                        >
                          <InformationCircleIcon className="h-3 w-3 text-white" />
                        </button>
                        {activeTooltip === index && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-gray-900 text-white text-sm rounded-lg p-3 shadow-xl border border-gold-500/20 z-50">
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
                            {feature.tooltip}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-300 leading-relaxed group-hover:text-gray-200 transition-colors duration-300">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>



      {/* CTA Section */}
      <section className="relative z-10 py-24 lg:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative">
            {/* Background Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-gold-500/10 via-amber-500/20 to-gold-500/10 rounded-3xl blur-3xl"></div>
            
            <div className="relative bg-gradient-to-br from-gray-800/40 to-gray-900/60 backdrop-blur-2xl rounded-3xl border border-gold-400/30 p-12 lg:p-16 text-center shadow-2xl">
              <div className="mb-8">
                <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
                  <span className="bg-gradient-to-r from-gold-200 to-amber-300 bg-clip-text text-transparent">
                    準備加入
                  </span>
                  <br />
                  <span className="text-white">菁英行列了嗎？</span>
                </h2>
                <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
                  立即註冊成為GBC商務菁英會會員，開始您的商務網絡之旅。
                  在這裡，每一個連結都是機遇，每一次交流都是成長。
                </p>
              </div>
              
              {!isAuthenticated && (
                <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                  <Link
                    to="/register"
                    className="group bg-gradient-to-r from-gold-500 to-amber-600 hover:from-gold-400 hover:to-amber-500 text-black font-bold py-5 px-12 rounded-2xl transition-all duration-300 shadow-2xl shadow-gold-500/30 hover:shadow-gold-400/50 transform hover:scale-105 flex items-center text-lg"
                  >
                    <TrophyIcon className="h-7 w-7 mr-3 group-hover:rotate-12 transition-transform duration-300" />
                    立即成為菁英會員
                    <ArrowRightIcon className="ml-3 h-6 w-6 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                  <div className="text-gray-400 text-sm">
                    已經是會員？
                    <Link to="/login" className="text-gold-400 hover:text-gold-300 font-semibold ml-2 transition-colors duration-300">
                      立即登入 →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 bg-gradient-to-t from-black via-gray-900 to-gray-800 text-white py-16 border-t border-gold-500/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-gold-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-xl shadow-gold-500/25">
                <span className="text-black font-bold text-xl">GBC</span>
              </div>
              <div className="ml-4">
                <span className="text-3xl font-bold bg-gradient-to-r from-gold-300 to-amber-400 bg-clip-text text-transparent">商務菁英會</span>
                <div className="text-sm text-gold-400/80 font-medium tracking-wider">BUSINESS ELITE CLUB</div>
              </div>
            </div>
            <p className="text-xl text-gold-200 mb-6 font-light">
              連接商務精英，創造無限商機
            </p>
            <div className="w-24 h-px bg-gradient-to-r from-transparent via-gold-400 to-transparent mx-auto mb-6"></div>
            <p className="text-gray-400 text-sm">
              © 2025 GBC Business Elite Club. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;