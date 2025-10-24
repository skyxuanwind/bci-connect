export const themes = [
  { id: 'simple', name: 'Simple', colors: { primary: '#1E3A8A', secondary: '#93C5FD', bg: '#FFFFFF' }, fonts: { zh: 'Noto Sans TC', en: 'Inter' }, layout: 'classic', animation: 'fade' },
  { id: 'youth', name: 'Youth', colors: { primary: '#10B981', secondary: '#FDE68A', bg: '#F0FDF4' }, fonts: { zh: 'Noto Sans TC', en: 'Poppins' }, layout: 'modern', animation: 'slide' },
  { id: 'coolblack', name: 'Cool Black', colors: { primary: '#111827', secondary: '#6B7280', bg: '#0B0F16' }, fonts: { zh: 'Noto Sans TC', en: 'Rubik' }, layout: 'cards', animation: 'fade' },
  { id: 'elegant', name: 'Elegant', colors: { primary: '#7C3AED', secondary: '#FBCFE8', bg: '#FAF5FF' }, fonts: { zh: 'Noto Serif TC', en: 'Merriweather' }, layout: 'center', animation: 'fade' },
  { id: 'business', name: 'Business', colors: { primary: '#0EA5E9', secondary: '#FDE68A', bg: '#F0F9FF' }, fonts: { zh: 'Noto Sans TC', en: 'Inter' }, layout: 'split', animation: 'slide' },
  { id: 'nature', name: 'Nature', colors: { primary: '#16A34A', secondary: '#86EFAC', bg: '#ECFDF5' }, fonts: { zh: 'Noto Sans TC', en: 'Lato' }, layout: 'classic', animation: 'fade' },
  { id: 'sunset', name: 'Sunset', colors: { primary: '#EF4444', secondary: '#FDBA74', bg: '#FFF7ED' }, fonts: { zh: 'Noto Sans TC', en: 'Montserrat' }, layout: 'modern', animation: 'slide' },
  { id: 'tech', name: 'Tech', colors: { primary: '#3B82F6', secondary: '#22D3EE', bg: '#F8FAFC' }, fonts: { zh: 'Noto Sans TC', en: 'IBM Plex Sans' }, layout: 'cards', animation: 'fade' },
  { id: 'warm', name: 'Warm', colors: { primary: '#D97706', secondary: '#FCD34D', bg: '#FFFBEB' }, fonts: { zh: 'Noto Sans TC', en: 'Source Sans Pro' }, layout: 'center', animation: 'fade' },
  { id: 'mono', name: 'Mono', colors: { primary: '#111827', secondary: '#9CA3AF', bg: '#FFFFFF' }, fonts: { zh: 'Noto Sans TC', en: 'Work Sans' }, layout: 'split', animation: 'slide' },
  { id: 'mint', name: 'Mint', colors: { primary: '#0EA5E9', secondary: '#A7F3D0', bg: '#ECFEFF' }, fonts: { zh: 'Noto Sans TC', en: 'Poppins' }, layout: 'classic', animation: 'fade' },
  { id: 'royal', name: 'Royal', colors: { primary: '#2563EB', secondary: '#C7D2FE', bg: '#EEF2FF' }, fonts: { zh: 'Noto Sans TC', en: 'Inter' }, layout: 'modern', animation: 'slide' },
];

export const getThemeById = (id) => themes.find(t => t.id === id) || themes[0];