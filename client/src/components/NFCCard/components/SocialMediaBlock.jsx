import React from 'react';
import { FaLinkedin, FaFacebook, FaTwitter, FaInstagram, FaYoutube, FaTiktok } from 'react-icons/fa';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

const SocialMediaBlock = React.memo(({ content_data, trackEvent }) => {
  const socialPlatforms = [
    { key: 'linkedin', name: 'LinkedIn', icon: <FaLinkedin />, color: '#0077B5' },
    { key: 'facebook', name: 'Facebook', icon: <FaFacebook />, color: '#1877F2' },
    { key: 'instagram', name: 'Instagram', icon: <FaInstagram />, color: '#E4405F' },
    { key: 'twitter', name: 'Twitter', icon: <FaTwitter />, color: '#1DA1F2' },
    { key: 'youtube', name: 'YouTube', icon: <FaYoutube />, color: '#FF0000' },
    { key: 'tiktok', name: 'TikTok', icon: <FaTiktok />, color: '#000000' },
  ];

  const activePlatforms = socialPlatforms.filter((platform) => content_data[platform.key]);

  if (activePlatforms.length === 0) return null;

  return (
    <div className="content-block">
      <h3 className="block-title">社群媒體</h3>
      <div className="social-media-buttons">
        {activePlatforms.map((platform) => (
          <a
            key={platform.key}
            href={content_data[platform.key]}
            target="_blank"
            rel="noopener noreferrer"
            className="social-media-button"
            style={{ borderLeft: `3px solid ${platform.color}` }}
            onClick={() => trackEvent('social_click', { platform: platform.key })}
          >
            <span style={{ color: platform.color }}>{platform.icon}</span>
            <span>{platform.name}</span>
            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </a>
        ))}
      </div>
    </div>
  );
});

export default SocialMediaBlock;