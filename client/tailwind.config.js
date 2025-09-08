/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#fafafa', // 極淺灰
          100: '#f5f5f5', // 淺灰
          200: '#e5e5e5', // 中淺灰
          300: '#d4d4d4', // 中灰
          400: '#a3a3a3', // 深中灰
          500: '#737373', // 深灰
          600: '#525252', // 更深灰
          700: '#404040', // 深色灰
          800: '#262626', // 極深灰
          900: '#171717', // 主要黑色
        },
        gold: {
          50: '#fffef7', // 極淺金
          100: '#fffbeb', // 淺金背景
          200: '#fef3c7', // 淺金
          300: '#fde68a', // 中淺金
          400: '#fcd34d', // 中金
          500: '#f59e0b', // 標準金
          600: '#d97706', // 深金
          700: '#b45309', // 更深金
          800: '#92400e', // 極深金
          900: '#78350f', // 最深金
        },
        accent: {
          50: '#fffdf2', // 香檳色淺
          100: '#fef7cd', // 香檳色
          200: '#fef08a', // 淺香檳
          300: '#fde047', // 中香檳
          400: '#facc15', // 深香檳
          500: '#eab308', // 標準香檳
          600: '#ca8a04', // 深香檳金
          700: '#a16207', // 更深香檳
          800: '#854d0e', // 極深香檳
          900: '#713f12', // 最深香檳
        },
        gray: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'Noto Sans', 'sans-serif'],
      },
      boxShadow: {
        'elegant': '0 4px 6px -1px rgba(13, 37, 63, 0.1), 0 2px 4px -1px rgba(13, 37, 63, 0.06)',
        'elegant-lg': '0 10px 15px -3px rgba(13, 37, 63, 0.1), 0 4px 6px -2px rgba(13, 37, 63, 0.05)',
        'gold': '0 4px 6px -1px rgba(212, 175, 55, 0.1), 0 2px 4px -1px rgba(212, 175, 55, 0.06)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-gold': 'pulseGold 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        pulseGold: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        }
      }
    },
  },
  plugins: [],
}