import { useState, useEffect, useRef } from 'react';
import { useLanguage, useGameState } from '../context/LanguageContext';
import './EndPage.css';
import { APP_VIDEOS, getPreferredVideoSrc } from '../config/media';
import { useManagedVideoPlayback } from '../hooks/useManagedVideoPlayback';

const EndPage = ({ isActive = true, onProceed }) => {
  const { t, isIOSLikeDevice } = useLanguage();
  const { isPageVisible } = useGameState();
  const [isVideoEnded, setIsVideoEnded] = useState(false);
  const videoRef = useRef(null);
  const hasEndedRef = useRef(false);
  const videoSrc = getPreferredVideoSrc(APP_VIDEOS.end, isIOSLikeDevice);

  // CRITICAL: Set muted as HTML attribute for Android WebView (Realme Browser)
  // WebView requires the attribute, not just the property
  // ALWAYS mute this video - background music is already playing
  useEffect(() => {
    if (videoRef.current) {
      const v = videoRef.current;
      v.muted = true;
      v.defaultMuted = true;
      v.setAttribute('muted', '');
    }
  }, []);

  useManagedVideoPlayback({
    videoRef,
    isPageVisible,
    shouldPlay: !isVideoEnded,
    shouldMute: true,
  });

  const handleVideoEnd = () => {
    if (hasEndedRef.current) return;
    hasEndedRef.current = true;
    setIsVideoEnded(true);
  };

  return (
    <div className={`page end-page-container ${isActive ? 'active' : ''}`}>
      <video
        ref={videoRef}
        src={videoSrc}
        poster={APP_VIDEOS.endPoster}
        className="end-video-bg"
        autoPlay
        muted
        playsInline
        webkit-playsinline="true"
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
