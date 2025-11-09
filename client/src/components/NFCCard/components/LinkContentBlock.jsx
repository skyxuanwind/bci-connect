import React from 'react';
import { ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

const LinkContentBlock = React.memo(({ content_data, trackEvent }) => {
  return (
    <div className="content-block">
      <h3 className="block-title">{content_data.title}</h3>
      <a
        href={content_data.url}
        target="_blank"
        rel="noopener noreferrer"
        className="link-button"
        onClick={() => trackEvent('link_click', { url: content_data.url })}
      >
        <span>{content_data.text}</span>
        <ArrowTopRightOnSquareIcon className="h-4 w-4" />
      </a>
    </div>
  );
});

export default LinkContentBlock;