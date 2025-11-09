import React from 'react';

const ImageContentBlock = React.memo(({ content_data, onOpenPreview, onDownload, cardData }) => {
  return (
    <div className="content-block">
      <h3 className="block-title">{content_data.title}</h3>
      <div className="image-wrapper">
        <img
          src={content_data.url}
          alt={content_data.title}
          onClick={() => onOpenPreview(content_data.url)}
        />
        <button onClick={() => onDownload(content_data.url, cardData.user_name)}>下載</button>
      </div>
    </div>
  );
});

export default ImageContentBlock;