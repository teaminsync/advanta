import { useEffect, useState } from 'react';
import './ScreenLoadingOverlay.css';
import { APP_IMAGES } from '../config/media';

const ScreenLoadingOverlay = ({ visible }) => {
  const [backgroundImage, setBackgroundImage] = useState(APP_IMAGES.bgFallback);

  useEffect(() => {
    // Try to use the current page's background if available
    const currentBg = document.querySelector('.page.active img.fluid-bg, .page.active .transition-video');
    if (currentBg) {
      if (currentBg.tagName === 'IMG') {
        setBackgroundImage(currentBg.src);
      } else if (currentBg.tagName === 'VIDEO') {
        // For videos, use a fallback background
        setBackgroundImage(APP_IMAGES.bgFallback);
      }
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="screen-loading-overlay" aria-live="polite" aria-busy="true">
      <div 
        className="screen-loading-bg-blur" 
        style={{ backgroundImage: `url(${backgroundImage})` }}
      />
      <div className="screen-loading-spinner-wrap">
        <div className="screen-loading-spinner" />
      </div>
    </div>
  );
};

export default ScreenLoadingOverlay;
