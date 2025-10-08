// 共用的行動裝置偵測工具
// 使用視窗寬度與 UA 雙判斷，避免單一方法誤判
export const isMobile = () => {
  try {
    if (typeof window !== 'undefined') {
      const byViewport = window.matchMedia && window.matchMedia('(max-width: 767px)').matches;
      const byUA = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      return byViewport || byUA;
    }
  } catch (e) {}
  return false;
};