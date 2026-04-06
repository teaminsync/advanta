import React, { useState, useEffect } from 'react';
import { useLanguage, useGameState } from '../context/LanguageContext';
import './EndPage.css';
import { APP_VIDEOS, getPreferredVideoSrc } from '../config/media';
import { useManagedVideoPlayback } from '../hooks/useManagedVideoPlayback';
import { useRef } from 'react';

const EndPage = ({ isActive = true, onProceed }) => {
  const { t, isIOSLikeDevice } = useLanguage();
  const { shouldMuteAll, isPageVisible, hasUserInteracted } = useGameState();
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const videoRef = useRef(null);
  const shouldMuteVideo = shouldMuteAll || !hasUserInteracted;
  const videoSrc = getPreferredVideoSrc(APP_VIDEOS.end, isIOSLikeDevice);

  useManagedVideoPlayback({
    videoRef,
    isPageVisible,
    shouldPlay: !isVideoEnded,
    shouldMute: shouldMuteVideo,
  });

  const handleVideoEnd = () => {
    setIsVideoEnded(true);
  };

  return (
    <div className={`page end-page-container ${isActive ? 'active' : ''}`}>
      <video
        ref={videoRef}
        src={videoSrc}
        className="end-video-bg"
        autoPlay
        muted={shouldMuteVideo}
        playsInline
        preload="auto"
        onEnded={handleVideoEnd}
        onError={() => {}}
      />

      {isVideoEnded && (
        <div className="end-video-overlay">
          <div className="end-video-stage">
            <button className="cashback-btn-video" onClick={onProceed}>
              {t.endPageBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EndPage;
