import React from 'react';

const VideoContentBlock = React.memo(({ content_data, getYouTubeVideoId }) => {
  const videoId = getYouTubeVideoId(content_data.url);

  return (
    <div className="content-block">
      <h3 className="block-title">{content_data.title}</h3>
      {videoId ? (
        <div className="video-wrapper">
          <iframe
            src={`https://www.youtube.com/embed/${videoId}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            title={content_data.title}
          ></iframe>
        </div>
      ) : (
        <p className="text-content">無效的 YouTube 連結</p>
      )}
    </div>
  );
});

export default VideoContentBlock;