import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import './EndPage.css';
import { APP_VIDEOS } from '../config/media';
import { useManagedVideoPlayback } from '../hooks/useManagedVideoPlayback';
import { useRef } from 'react';

const EndPage = ({ onProceed }) => {
  const { t, shouldMuteAll, isPageVisible, hasUserInteracted, isIOSLikeDevice } = useLanguage();
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const videoRef = useRef(null);
  const shouldMuteVideo = shouldMuteAll || !hasUserInteracted || isIOSLikeDevice;

  useManagedVideoPlayback({
    videoRef,
    isPageVisible,
    shouldPlay: !isVideoEnded,
    shouldMute: shouldMuteVideo,
  });

  return (
    <div className="page active end-page-container">
      <video
        ref={videoRef}
        src={APP_VIDEOS.end}
        className="end-video-bg"
        autoPlay
        muted={shouldMuteVideo}
        playsInline
        preload="auto"
        onEnded={() => setIsVideoEnded(true)}
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
