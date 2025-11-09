import React from 'react';

const TextContentBlock = React.memo(({ content_data }) => {
  return (
    <div className="content-block">
      <h3 className="block-title">{content_data.title}</h3>
      <p className="text-content">{content_data.text}</p>
    </div>
  );
});

export default TextContentBlock;