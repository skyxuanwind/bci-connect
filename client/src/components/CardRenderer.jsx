import React from 'react';
import {
  ArrowTopRightOnSquareIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentArrowDownIcon,
  LinkIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { FaLinkedin, FaFacebook, FaTwitter, FaInstagram, FaYoutube, FaTiktok } from 'react-icons/fa';

// 解析 YouTube 或 Vimeo ID（優先 YouTube，補充 Vimeo）
const getYouTubeId = (url) => {
  try {
    const u = new URL(url);
    if (u.hostname.includes('youtube.com')) return u.searchParams.get('v');
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1);
    return null;
  } catch { return null; }
};
const getVimeoId = (url) => {
  try {
    const u = new URL(url);
    return u.hostname.includes('vimeo.com') ? u.pathname.split('/').pop() : null;
  } catch { return null; }
};

// 將編輯器的區塊標準化為名片用格式
export const normalizeBlock = (block) => {
  if (!block) return null;
  if (block.content_type && block.content_data) return block; // 已是標準格式

  switch (block.type) {
    case 'link':
      return {
        content_type: 'link',
        content_data: { title: block.title || '連結', url: block.url || '' }
      };
    case 'video': {
      const yt = getYouTubeId(block.url || '');
      const vi = getVimeoId(block.url || '');
      return {
        content_type: 'video',
        content_data: {
          title: block.title || '影片',
          type: yt ? 'youtube' : vi ? 'vimeo' : 'video',
          url: block.url || ''
        }
      };
    }
    case 'carousel':
      return {
        content_type: 'carousel',
        content_data: {
          title: block.title || '圖片輪播',
          images: (block.images || []).map((img) =>
            typeof img === 'string' ? { url: img } : img || {}
          )
        }
      };
    case 'richtext':
      return {
        content_type: 'richtext',
        content_data: { title: block.title || '文字介紹', html: block.html || '' }
      };
    case 'contact':
      return {
        content_type: 'contact',
        content_data: { title: block.title || '聯絡方式' }
      };
    case 'text':
    default:
      return {
        content_type: 'text',
        content_data: { title: block.title || '文字區塊', content: block.content || '' }
      };
  }
};

// 共享內容渲染器：與 MemberCard 的 renderContentBlock 對齊
export const renderContentBlock = ({ block, index = 0, options = {} }) => {
  if (!block || !block.content_data) return null;

  const {
    layoutType = 'standard',
    contactInfo = {},
    accentColor = '#cccccc',
    blockCarouselIndexMap = {},
    setBlockCarouselIndexMap = () => {},
    trackEvent = () => {},
    onOpenImagePreview = null,
    getCarouselSwipeHandlers = null
  } = options;

  const { content_data } = block;
  const titleText = (content_data?.title || '').trim();

  switch (block.content_type) {
    case 'text': {
      if (titleText === 'LINE ID') return null; // 與 MemberCard 保持：LINE ID 在完整版不重複顯示
      return (
        <div className="content-block">
          <h3 className="block-title">{content_data.title || '文字區塊'}</h3>
          <div className="description-text">{content_data.content || ''}</div>
        </div>
      );
    }

    case 'richtext':
      return (
        <div className="content-block">
          {content_data.title && (<h3 className="block-title">{content_data.title}</h3>)}
          <div
            className="prose prose-invert max-w-none text-gold-200"
            dangerouslySetInnerHTML={{ __html: content_data.html || '' }}
          />
        </div>
      );

    case 'link':
    case 'website':
      return (
        <div className="content-block">
          <h3 className="block-title">{content_data.title || '連結'}</h3>
          {content_data.url && (
            <a
              href={content_data.url.startsWith('http') ? content_data.url : `https://${content_data.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-200 hover:text-gold-100 transition-colors flex items-center gap-2"
              onClick={() => trackEvent('contact_click', { contentType: 'link', contentId: content_data.url })}
            >
              <LinkIcon className="h-4 w-4" />
              {content_data.url}
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </a>
          )}
        </div>
      );

    case 'news':
      return (
        <div className="content-block">
          <h3 className="block-title">{content_data.title || '新聞'}</h3>
          {content_data.url && (
            <a
              href={content_data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-200 hover:text-gold-100 transition-colors flex items-center gap-2"
              onClick={() => trackEvent('contact_click', { contentType: 'news', contentId: content_data.url })}
            >
              <LinkIcon className="h-4 w-4" />
              查看新聞
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </a>
          )}
        </div>
      );

    case 'file':
      return (
        <div className="content-block">
          <h3 className="block-title">{content_data.title || '檔案'}</h3>
          {content_data.url && (
            <a
              href={content_data.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-gold-200 hover:text-gold-100 transition-colors flex items-center gap-2"
              onClick={() => trackEvent('contact_click', { contentType: 'file', contentId: content_data.id })}
            >
              <DocumentArrowDownIcon className="h-4 w-4" />
              下載檔案
              <ArrowTopRightOnSquareIcon className="h-3 w-3" />
            </a>
          )}
        </div>
      );

    case 'video': {
      const url = content_data.url || '';
      const yt = content_data.type === 'youtube' ? getYouTubeId(url) : getYouTubeId(url);
      const vi = content_data.type === 'vimeo' ? getVimeoId(url) : getVimeoId(url);
      const src = yt ? `https://www.youtube.com/embed/${yt}` : vi ? `https://player.vimeo.com/video/${vi}` : '';
      return (
        <div className="content-block">
          <h3 className="block-title">{content_data.title || '影片'}</h3>
          {src ? (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <iframe
                src={src}
                title={content_data.title || 'Video'}
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
          ) : (
            <div className="text-gold-300">影片內容</div>
          )}
        </div>
      );
    }

    case 'image':
      return (
        <div className="content-block">
          <h3 className="block-title">{content_data.title || '圖片'}</h3>
          {content_data.url && (
            <div className="relative">
              <img
                src={content_data.url}
                alt={content_data.alt || content_data.title}
                className="w-full rounded-lg cursor-zoom-in object-cover"
                style={{ aspectRatio: '16/9' }}
                loading="lazy"
                decoding="async"
                srcSet={buildResponsiveSrcSet(content_data.url)}
                sizes="(max-width: 480px) 100vw, 480px"
                onClick={() => onOpenImagePreview && onOpenImagePreview(content_data.url)}
              />
              {content_data.alt && (
                <p className="text-xs text-gold-400 mt-2 italic">{content_data.alt}</p>
              )}
            </div>
          )}
        </div>
      );

    case 'carousel': {
      const imgs = content_data?.images || [];
      const curIdx = blockCarouselIndexMap[index] || 0;
      const goto = (n) => {
        if (!imgs.length) return;
        const next = (n + imgs.length) % imgs.length;
        setBlockCarouselIndexMap(prev => ({ ...prev, [index]: next }));
      };
      const prevSlide = () => goto(curIdx - 1);
      const nextSlide = () => goto(curIdx + 1);
      const swipeProps = typeof getCarouselSwipeHandlers === 'function' ? (getCarouselSwipeHandlers(index) || {}) : {};

      return (
        <div className="content-block">
          <h3 className="block-title">{content_data?.title || '圖片輪播'}</h3>
          {imgs.length > 0 ? (
            <div className="relative">
              <div className="w-full bg-black/20 rounded flex items-center justify-center overflow-hidden" style={{ minHeight: '180px' }} {...swipeProps}>
                <img
                  src={imgs[curIdx]?.url}
                  alt={imgs[curIdx]?.alt || ''}
                  className="max-h-72 w-auto object-contain rounded"
                  loading="lazy"
                  decoding="async"
                  srcSet={buildResponsiveSrcSet(imgs[curIdx]?.url)}
                  sizes="(max-width: 480px) 100vw, 480px"
                />
              </div>
              <button
                onClick={prevSlide}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-amber-200 rounded hover:bg-black/60"
                aria-label="上一張"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 text-amber-200 rounded hover:bg-black/60"
                aria-label="下一張"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
              <div className="flex items-center justify-center gap-2 mt-2">
                {imgs.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goto(i)}
                    className={`h-2 w-2 rounded-full ${i === curIdx ? 'bg-amber-400' : 'bg-amber-700 opacity-60'}`}
                    aria-label={`第 ${i + 1} 張`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-amber-100 text-xs">未添加圖片</div>
          )}
        </div>
      );
    }

    case 'social': {
      const socialPlatforms = [
        { key: 'linkedin', name: 'LinkedIn', icon: <FaLinkedin />, color: '#0077B5' },
        { key: 'facebook', name: 'Facebook', icon: <FaFacebook />, color: '#1877F2' },
        { key: 'instagram', name: 'Instagram', icon: <FaInstagram />, color: '#E4405F' },
        { key: 'twitter', name: 'Twitter', icon: <FaTwitter />, color: '#1DA1F2' },
        { key: 'youtube', name: 'YouTube', icon: <FaYoutube />, color: '#FF0000' },
        { key: 'tiktok', name: 'TikTok', icon: <FaTiktok />, color: '#000000' }
      ];

      const activePlatforms = socialPlatforms.filter(platform => content_data[platform.key]);
      if (activePlatforms.length === 0) return null;

      return (
        <div className="content-block">
          <h3 className="block-title">社群媒體</h3>
          <div className="flex flex-wrap gap-3">
            {activePlatforms.map(platform => (
              <a
                key={platform.key}
                href={content_data[platform.key]}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary-800 hover:bg-primary-700 transition-colors"
                style={{ borderLeft: `3px solid ${platform.color}` }}
                onClick={() => trackEvent('contact_click', { contentType: 'social', contentId: platform.key })}
              >
                <span style={{ color: platform.color }}>{platform.icon}</span>
                <span className="text-gold-200">{platform.name}</span>
                <ArrowTopRightOnSquareIcon className="h-3 w-3 text-gold-400" />
              </a>
            ))}
          </div>
        </div>
      );
    }

    case 'map':
      return (
        <div className="content-block">
          <h3 className="block-title">{content_data.title || '地點'}</h3>
          {content_data.address && (
            <div>
              <div className="flex items-center gap-2 text-gold-200 mb-3">
                <MapPinIcon className="h-4 w-4" />
                <span>{content_data.address}</span>
              </div>
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(content_data.address)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-800 hover:bg-primary-700 rounded-lg transition-colors text-gold-200"
                onClick={() => trackEvent('contact_click', { contentType: 'map', contentId: content_data.address })}
              >
                <MapPinIcon className="h-4 w-4" />
                在 Google Maps 中查看
                <ArrowTopRightOnSquareIcon className="h-3 w-3" />
              </a>
            </div>
          )}
        </div>
      );

    case 'icon': {
      const iconMap = {
        star: '⭐', heart: '❤️', diamond: '💎', crown: '👑', trophy: '🏆', fire: '🔥', lightning: '⚡', rocket: '🚀', target: '🎯', medal: '🏅', gem: '💍', sparkles: '✨'
      };
      const sizeMap = { small: 'text-base', medium: 'text-lg', large: 'text-xl', xlarge: 'text-2xl' };
      return (
        <div className="content-block">
          <h3 className="block-title">{content_data.title || '圖標'}</h3>
          <div className="flex items-center gap-3">
            {content_data.icon_url ? (
              <img
                src={content_data.icon_url}
                alt={content_data.description}
                className={`${sizeMap[content_data.size] || 'text-lg'}`}
                style={{
                  height: content_data.size === 'small' ? '16px' :
                         content_data.size === 'medium' ? '20px' :
                         content_data.size === 'large' ? '24px' : '28px'
                }}
                loading="lazy"
                decoding="async"
              />
            ) : (
              <span className={`${sizeMap[content_data.size] || 'text-lg'}`}>
                {iconMap[content_data.icon_type] || '⭐'}
              </span>
            )}
            <span className="text-gold-200">{content_data.description || '裝飾圖標'}</span>
          </div>
        </div>
      );
    }

    case 'contact': {
      if ((layoutType || 'standard') === 'standard') return null;
      const info = contactInfo || {};
      const buttons = [];
      if (info.phone) buttons.push({ label: '電話', href: `tel:${info.phone}` });
      if (info.email) buttons.push({ label: '電子郵件', href: `mailto:${info.email}` });
      if (info.website) buttons.push({ label: '網站', href: info.website?.startsWith('http') ? info.website : `https://${info.website}` });
      if (buttons.length === 0) return null;
      return (
        <div className="content-block">
          <h3 className="block-title">{content_data.title || '聯絡方式'}</h3>
          <div className="flex flex-wrap gap-2">
            {buttons.map((b, idx) => (
              <a
                key={idx}
                href={b.href}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-lg text-white text-sm transition-colors"
                style={{ backgroundColor: accentColor }}
                onClick={() => trackEvent('contact_click', { contentType: 'contact', contentId: b.label })}
              >
                {b.label}
              </a>
            ))}
          </div>
        </div>
      );
    }

    default:
      return null;
  }
};

export default renderContentBlock;
// 生成 Cloudinary 友好的 responsive srcSet（若非 Cloudinary，回退為 ?w= 寬度參數）
const buildResponsiveSrcSet = (url, widths = [480, 720, 1080, 1440]) => {
  if (!url) return '';
  try {
    const u = new URL(url);
    if (u.hostname.includes('res.cloudinary.com')) {
      const parts = u.pathname.split('/');
      const uploadIdx = parts.findIndex(p => p === 'upload');
      if (uploadIdx !== -1) {
        const prefix = parts.slice(0, uploadIdx + 1).join('/');
        const suffix = parts.slice(uploadIdx + 1).join('/');
        return widths.map(w => `${u.origin}${prefix}/f_auto,q_auto,dpr_auto,w_${w}/${suffix} ${w}w`).join(', ');
      }
    }
    return widths.map(w => `${url}${url.includes('?') ? '&' : '?'}w=${w} ${w}w`).join(', ');
  } catch {
    return widths.map(w => `${url}${url.includes('?') ? '&' : '?'}w=${w} ${w}w`).join(', ');
  }
};