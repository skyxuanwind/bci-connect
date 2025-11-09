import React from 'react';
import { MapPinIcon, ArrowTopRightOnSquareIcon } from '@heroicons/react/24/outline';

const MapBlock = React.memo(({ content_data, trackEvent }) => {
  return (
    <div className="content-block">
      <h3 className="block-title">{content_data.title || '地點'}</h3>
      {content_data.address && (
        <div>
          <div className="address">
            <MapPinIcon className="h-4 w-4" />
            <span>{content_data.address}</span>
          </div>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(content_data.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="map-button"
            onClick={() => trackEvent('map_click', { address: content_data.address })}
          >
            <MapPinIcon className="h-4 w-4" />
            在 Google Maps 中查看
            <ArrowTopRightOnSquareIcon className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
});

export default MapBlock;