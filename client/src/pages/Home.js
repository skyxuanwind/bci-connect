import React from 'react';
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
  FireIcon
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
      icon: ShieldSolid,
      title: '資源共享',
      description: '會員間互相分享商業資源，創造合作機會'
    },
    {
      icon: StarSolid,
      title: '精英聚會',
      description: '定期舉辦高品質的商務活動和交流聚會'
    }
  ];



  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800 relative overflow-hidden">
      {/* Premium Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Flowing Light Streams - Irregular and Elegant */}
        <div className="absolute inset-0">
          {/* Main flowing light ribbons */}
          <div className="absolute top-0 left-0 w-full h-full">
            <div className="absolute top-1/6 -left-1/3 w-[200%] h-2 bg-gradient-to-r from-transparent via-gold-400/30 via-amber-500/40 via-gold-300/35 to-transparent transform -rotate-12 animate-[luxuryFlow_12s_cubic-bezier(0.4,0,0.2,1)_infinite] blur-sm"></div>
            <div className="absolute top-2/5 -right-1/3 w-[180%] h-3 bg-gradient-to-r from-transparent via-amber-400/25 via-gold-500/45 via-amber-300/30 to-transparent transform rotate-8 animate-[luxuryFlow_15s_cubic-bezier(0.4,0,0.2,1)_infinite_reverse] blur-sm delay-2000"></div>
            <div className="absolute top-3/5 -left-1/4 w-[160%] h-1 bg-gradient-to-r from-transparent via-gold-300/35 via-amber-400/50 to-transparent transform -rotate-6 animate-[luxuryFlow_18s_cubic-bezier(0.4,0,0.2,1)_infinite] blur-sm delay-4000"></div>
            <div className="absolute top-4/5 -right-1/4 w-[140%] h-2 bg-gradient-to-r from-transparent via-amber-500/20 via-gold-400/40 to-transparent transform rotate-15 animate-[luxuryFlow_20s_cubic-bezier(0.4,0,0.2,1)_infinite_reverse] blur-sm delay-6000"></div>
          </div>
          
          {/* Particle-like flowing elements */}
          <div className="absolute inset-0">
            <div className="absolute top-1/8 left-1/4 w-1 h-1 bg-gold-400 rounded-full animate-[particle_25s_linear_infinite] blur-[0.5px]"></div>
            <div className="absolute top-1/3 right-1/3 w-0.5 h-0.5 bg-amber-300 rounded-full animate-[particle_30s_linear_infinite] blur-[0.5px] delay-3000"></div>
            <div className="absolute top-2/3 left-1/6 w-1.5 h-1.5 bg-gold-500 rounded-full animate-[particle_35s_linear_infinite] blur-[0.5px] delay-7000"></div>
            <div className="absolute top-3/4 right-1/5 w-0.5 h-0.5 bg-amber-400 rounded-full animate-[particle_28s_linear_infinite] blur-[0.5px] delay-10000"></div>
            <div className="absolute top-1/2 left-3/4 w-1 h-1 bg-gold-300 rounded-full animate-[particle_32s_linear_infinite] blur-[0.5px] delay-5000"></div>
          </div>
        </div>
        
        {/* Luxury Flowing Silk Ribbons */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/5 w-[120px] h-full bg-gradient-to-b from-gold-400/8 via-transparent via-amber-500/12 via-transparent to-gold-300/6 transform rotate-35 animate-[silkFlow_22s_ease-in-out_infinite] blur-xl"></div>
          <div className="absolute top-0 right-1/4 w-[100px] h-full bg-gradient-to-b from-amber-400/6 via-transparent via-gold-400/10 via-transparent to-amber-300/8 transform -rotate-25 animate-[silkFlow_28s_ease-in-out_infinite_reverse] blur-xl delay-8000"></div>
          <div className="absolute top-0 left-2/3 w-[80px] h-full bg-gradient-to-b from-gold-500/5 via-transparent via-amber-400/8 to-transparent transform rotate-45 animate-[silkFlow_35s_ease-in-out_infinite] blur-2xl delay-12000"></div>
        </div>
        
        {/* Dynamic Luxury Orbs with Irregular Movement */}
        <div className="absolute -top-32 -right-32 w-[500px] h-[500px] bg-gradient-to-br from-gold-400/12 via-amber-500/8 to-gold-600/6 rounded-full blur-3xl animate-[luxuryOrb_16s_cubic-bezier(0.25,0.46,0.45,0.94)_infinite]"></div>
        <div className="absolute top-1/3 -left-40 w-[400px] h-[400px] bg-gradient-to-tr from-amber-500/10 via-gold-300/6 to-amber-400/8 rounded-full blur-3xl animate-[luxuryOrb_20s_cubic-bezier(0.25,0.46,0.45,0.94)_infinite_reverse] delay-5000"></div>
        <div className="absolute bottom-1/4 right-1/6 w-[300px] h-[300px] bg-gradient-to-t from-gold-500/15 via-amber-400/10 to-transparent rounded-full blur-2xl animate-[luxuryOrb_24s_cubic-bezier(0.25,0.46,0.45,0.94)_infinite] delay-10000"></div>
        <div className="absolute top-1/6 left-1/3 w-[200px] h-[200px] bg-gradient-to-br from-amber-300/8 via-gold-400/12 to-amber-500/6 rounded-full blur-3xl animate-[luxuryOrb_18s_cubic-bezier(0.25,0.46,0.45,0.94)_infinite_reverse] delay-15000"></div>
        
        {/* Elegant Vertical Light Streams */}
        <div className="absolute top-0 left-1/8 w-0.5 h-full bg-gradient-to-b from-transparent via-gold-400/35 via-transparent via-amber-400/40 to-transparent animate-[verticalShimmer_14s_ease-in-out_infinite] delay-2000"></div>
        <div className="absolute top-0 right-1/6 w-0.5 h-full bg-gradient-to-b from-transparent via-amber-400/30 via-transparent via-gold-300/35 to-transparent animate-[verticalShimmer_18s_ease-in-out_infinite] delay-6000"></div>
        <div className="absolute top-0 left-3/4 w-0.5 h-full bg-gradient-to-b from-transparent via-gold-500/25 via-transparent via-amber-500/30 to-transparent animate-[verticalShimmer_22s_ease-in-out_infinite] delay-10000"></div>
        
        {/* Subtle Luxury Accent Elements */}
        <div className="absolute top-1/5 right-1/12 w-[180px] h-[180px] bg-gradient-to-br from-gold-300/6 via-amber-400/4 to-gold-500/8 rounded-full blur-2xl animate-[accentFloat_26s_ease-in-out_infinite] delay-8000"></div>
        <div className="absolute bottom-1/3 left-1/12 w-[220px] h-[220px] bg-gradient-to-tr from-amber-400/5 via-gold-300/7 to-amber-500/4 rounded-full blur-3xl animate-[accentFloat_32s_ease-in-out_infinite_reverse] delay-14000"></div>
        <div className="absolute top-2/3 right-2/3 w-[160px] h-[160px] bg-gradient-to-b from-gold-400/8 via-amber-300/6 to-transparent rounded-full blur-2xl animate-[accentFloat_28s_ease-in-out_infinite] delay-18000"></div>
      </div>
      
      {/* Premium CSS Animations */}
      <style jsx>{`
        @keyframes luxuryFlow {
          0% { transform: translateX(-100px) translateY(0) rotate(-12deg) scaleX(0.8) scaleY(1); opacity: 0; }
          15% { opacity: 0.6; }
          25% { transform: translateX(50px) translateY(-20px) rotate(-8deg) scaleX(1.2) scaleY(1.1); opacity: 0.8; }
          50% { transform: translateX(-30px) translateY(15px) rotate(-15deg) scaleX(0.9) scaleY(0.95); opacity: 1; }
          75% { transform: translateX(80px) translateY(-10px) rotate(-6deg) scaleX(1.1) scaleY(1.05); opacity: 0.7; }
          85% { opacity: 0.4; }
          100% { transform: translateX(200px) translateY(0) rotate(-12deg) scaleX(0.8) scaleY(1); opacity: 0; }
        }
        @keyframes silkFlow {
          0%, 100% { transform: translateY(0) translateX(0) rotate(35deg) scale(1) skewY(0deg); }
          20% { transform: translateY(-40px) translateX(20px) rotate(38deg) scale(1.08) skewY(2deg); }
          40% { transform: translateY(25px) translateX(-15px) rotate(32deg) scale(0.92) skewY(-1deg); }
          60% { transform: translateY(-20px) translateX(30px) rotate(40deg) scale(1.05) skewY(3deg); }
          80% { transform: translateY(35px) translateX(-10px) rotate(30deg) scale(0.95) skewY(-2deg); }
        }
        @keyframes luxuryOrb {
          0%, 100% { transform: translate(0, 0) scale(1) rotate(0deg); opacity: 0.8; }
          15% { transform: translate(30px, -50px) scale(1.1) rotate(45deg); opacity: 1; }
          35% { transform: translate(-20px, 40px) scale(0.9) rotate(90deg); opacity: 0.6; }
          55% { transform: translate(50px, 20px) scale(1.15) rotate(180deg); opacity: 0.9; }
          75% { transform: translate(-40px, -30px) scale(0.85) rotate(270deg); opacity: 0.7; }
          90% { transform: translate(15px, 10px) scale(1.05) rotate(315deg); opacity: 0.8; }
        }
        @keyframes particle {
          0% { transform: translate(0, 100vh) scale(0); opacity: 0; }
          10% { opacity: 1; transform: translate(20px, 90vh) scale(1); }
          25% { transform: translate(-30px, 75vh) scale(1.2); }
          50% { transform: translate(40px, 50vh) scale(0.8); }
          75% { transform: translate(-20px, 25vh) scale(1.1); }
          90% { opacity: 1; transform: translate(10px, 10vh) scale(0.9); }
          100% { transform: translate(0, -10vh) scale(0); opacity: 0; }
        }
        @keyframes verticalShimmer {
          0%, 100% { opacity: 0.2; transform: scaleY(1) scaleX(1); }
          25% { opacity: 0.8; transform: scaleY(1.3) scaleX(1.5); }
          50% { opacity: 1; transform: scaleY(0.8) scaleX(2); }
          75% { opacity: 0.6; transform: scaleY(1.2) scaleX(1.2); }
        }
        @keyframes accentFloat {
          0%, 100% { transform: translateY(0) translateX(0) rotate(0deg) scale(1); }
          25% { transform: translateY(-60px) translateX(40px) rotate(90deg) scale(1.15); }
          50% { transform: translateY(30px) translateX(-50px) rotate(180deg) scale(0.85); }
          75% { transform: translateY(-40px) translateX(30px) rotate(270deg) scale(1.1); }
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
                    <h3 className="text-2xl font-bold text-gold-100 mb-4 group-hover:text-gold-200 transition-colors duration-300">
                      {feature.title}
                    </h3>
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