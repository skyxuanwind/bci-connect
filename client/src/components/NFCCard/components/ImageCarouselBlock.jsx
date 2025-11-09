import React from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';

const ImageCarouselBlock = React.memo(({ content_data, currentMediaIndex, setCurrentMediaIndex, swipeHandlers }) => {
  const { imgs } = content_data;
  const curIdx = currentMediaIndex[content_data.id] || 0;

  const goto = (i) => {
    setCurrentMediaIndex({ ...currentMediaIndex, [content_data.id]: i });
  };

  const prev = () => {
    goto(curIdx === 0 ? imgs.length - 1 : curIdx - 1);
  };

  const next = () => {
    goto(curIdx === imgs.length - 1 ? 0 : curIdx + 1);
  };

  return (
    <div className="content-block" {...(swipeHandlers || {})}>
      <h3 className="block-title">{content_data.title}</h3>
      {imgs && imgs.length > 0 ? (
        <div className="carousel-wrapper">
          <div className="carousel-inner" style={{ transform: `translateX(-${curIdx * 100}%)` }}>
            {imgs.map((img, i) => (
              <img key={i} src={img.url} alt={img.title} />
            ))}
          </div>
          <button onClick={prev} className="carousel-control prev">
            <ChevronLeftIcon className="h-4 w-4" />
          </button>
          <button onClick={next} className="carousel-control next">
            <ChevronRightIcon className="h-4 w-4" />
          </button>
          <div className="carousel-dots">
            {imgs.map((_, i) => (
              <button
                key={i}
                onClick={() => goto(i)}
                className={`dot ${i === curIdx ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>
      ) : (
        <p className="text-content">未添加圖片</p>
      )}
    </div>
  );
});

export default ImageCarouselBlock;