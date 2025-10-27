// 專業SVG圖標：統一風格（描邊、圓角、寬高 w-6 h-6）
// 提供各行業鍵對應的 Icon 組件
export const IndustryIcons = {
  photographer: ({ className = "w-6 h-6", isDark = false }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="6" width="18" height="14" rx="3" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2"/>
      <path d="M9 6L10.5 4H13.5L15 6" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <circle cx="12" cy="13" r="4" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2"/>
    </svg>
  ),
  store: ({ className = "w-6 h-6", isDark = false }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 10L5 4H19L21 10" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <rect x="4" y="10" width="16" height="10" rx="2" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2"/>
      <path d="M9 15H15" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  business: ({ className = "w-6 h-6", isDark = false }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="4" width="8" height="16" rx="2" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2"/>
      <rect x="13" y="8" width="8" height="12" rx="2" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2"/>
      <path d="M6 8H8M6 12H8M6 16H8" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  designer: ({ className = "w-6 h-6", isDark = false }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 14L14 4L20 10L10 20L4 14Z" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M12 6L18 12" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  fitness: ({ className = "w-6 h-6", isDark = false }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 8L3 11L6 14M18 8L21 11L18 14M8 6L11 3L14 6M8 18L11 21L14 18" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <rect x="7" y="9" width="10" height="6" rx="3" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2"/>
    </svg>
  ),
  restaurant: ({ className = "w-6 h-6", isDark = false }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 3V11C6 12.657 7.343 14 9 14V21" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M10 3V11C10 12.657 11.343 14 13 14V21" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M18 3L18 21" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  education: ({ className = "w-6 h-6", isDark = false }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 10L12 6L21 10L12 14L3 10Z" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinejoin="round"/>
      <path d="M6 12V16C9 18 15 18 18 16V12" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  legal: ({ className = "w-6 h-6", isDark = false }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 3V21" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M5 10L12 13L19 10" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
      <path d="M7 17H9M15 17H17" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  musician: ({ className = "w-6 h-6", isDark = false }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 18V5L21 3V16" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="6" cy="18" r="3" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2"/>
      <circle cx="18" cy="16" r="3" stroke={isDark ? "#E5E7EB" : "#374151"} strokeWidth="2"/>
    </svg>
  )
};

export default IndustryIcons;