/**
 * AssetPreloader - Comprehensive preloading for ALL game assets
 * 
 * Preloads:
 * - Videos (via video pool)
 * - Images (backgrounds, UI elements)
 * - Audio (SFX, music)
 * - Fonts (if needed)
 * 
 * Strategy: Load everything BEFORE it's needed for instant page transitions
 */

import videoPool from './videoPool';
import { APP_AUDIO, APP_IMAGES, LEVEL_BACKGROUNDS } from '../config/media';

class AssetPreloader {
  constructor() {
    this.imageCache = new Map();
    this.audioCache = new Map();
    this.loadingPromises = new Map();
  }

  /**
   * Preload an image
   */
  preloadImage(src) {
    if (!src) return Promise.resolve(false);
    
    const imageName = src.substring(src.lastIndexOf('/') + 1);
    
    // Already loaded or loading
    if (this.imageCache.has(src)) {
      return Promise.resolve(true);
    }

    // Check if already loading
    if (this.loadingPromises.has(`img:${src}`)) {
      return this.loadingPromises.get(`img:${src}`);
    }


    const promise = new Promise((resolve) => {
      const img = new Image();
      img.decoding = 'async';
      img.loading = 'eager';
      
      img.onload = () => {
        this.imageCache.set(src, img);
        this.loadingPromises.delete(`img:${src}`);
        resolve(true);
      };
      
      img.onerror = () => {
        this.loadingPromises.delete(`img:${src}`);
        console.error(`❌ Image load error: ${imageName}`);
        resolve(false);
      };
      
      img.src = src;
    });

    this.loadingPromises.set(`img:${src}`, promise);
    return promise;
  }

  /**
   * Preload audio
   */
  preloadAudio(src) {
    if (!src) return Promise.resolve(false);
    
    const audioName = src.substring(src.lastIndexOf('/') + 1);
    
    // Already loaded or loading
    if (this.audioCache.has(src)) {
      return Promise.resolve(true);
    }

    // Check if already loading
    if (this.loadingPromises.has(`audio:${src}`)) {
      return this.loadingPromises.get(`audio:${src}`);
    }


    const promise = new Promise((resolve) => {
      const audio = new Audio();
      audio.preload = 'auto';
      
      let settled = false;
      const finish = (success) => {
        if (settled) return;
        settled = true;
        
        if (success) {
          this.audioCache.set(src, audio);
        } else {
          console.error(`❌ Audio load error: ${audioName}`);
        }
        
        this.loadingPromises.delete(`audio:${src}`);
        resolve(success);
      };
      
      audio.addEventListener('canplaythrough', () => finish(true), { once: true });
      audio.addEventListener('error', () => finish(false), { once: true });
      
      audio.src = src;
      audio.load();
      
      // Timeout after 10 seconds
      setTimeout(() => finish(false), 10000);
    });

    this.loadingPromises.set(`audio:${src}`, promise);
    return promise;
  }

  /**
   * Preload all assets for a specific level
   */
  preloadLevelAssets(levelIndex) {
    const promises = [];

    // Level background
    if (LEVEL_BACKGROUNDS[levelIndex]) {
      promises.push(this.preloadImage(LEVEL_BACKGROUNDS[levelIndex]));
    }

    // Next level background (for smooth transition)
    if (LEVEL_BACKGROUNDS[levelIndex + 1]) {
      promises.push(this.preloadImage(LEVEL_BACKGROUNDS[levelIndex + 1]));
    }

    // Previous level background (for back button)
    if (levelIndex > 0 && LEVEL_BACKGROUNDS[levelIndex - 1]) {
      promises.push(this.preloadImage(LEVEL_BACKGROUNDS[levelIndex - 1]));
    }

    return Promise.all(promises);
  }

  /**
   * Preload all UI images used across the game
   */
  preloadUIAssets() {
    const uiImages = [
      APP_IMAGES.frame,
      APP_IMAGES.formFarmer,
      APP_IMAGES.bgFallback,
      APP_IMAGES.bgFallbackCropped,
      APP_IMAGES.buttonPrimary,
      APP_IMAGES.buttonSecondary,
      APP_IMAGES.inputPanel,
      APP_IMAGES.volumeButton,
      APP_IMAGES.settingsBg,
      APP_IMAGES.actionButtonBg,
      APP_IMAGES.arrowIcon,
      APP_IMAGES.homeIcon,
      APP_IMAGES.pauseIcon,
      APP_IMAGES.playIcon,
      APP_IMAGES.soundIcon,
      APP_IMAGES.letterButton,
      APP_IMAGES.wrongAnswerButton,
      APP_IMAGES.correctOrb,
      APP_IMAGES.wrongOrb,
      APP_IMAGES.happinessBar,
      APP_IMAGES.timerBg,
      APP_IMAGES.glow,
      APP_IMAGES.logo,
    ];

    return Promise.all(uiImages.filter(Boolean).map(src => this.preloadImage(src)));
  }

  /**
   * Preload all audio files
   */
  preloadAudioAssets() {
    const audioFiles = [
      APP_AUDIO.correct,
      APP_AUDIO.wrong,
      APP_AUDIO.timeOver,
      APP_AUDIO.timer,
      // Note: Background music is loaded separately by App.jsx
    ];

    return Promise.all(audioFiles.filter(Boolean).map(src => this.preloadAudio(src)));
  }

  /**
   * Preload all level backgrounds
   */
  preloadAllBackgrounds() {
    return Promise.all(
      LEVEL_BACKGROUNDS.filter(Boolean).map(src => this.preloadImage(src))
    );
  }

  /**
   * Preload assets for the next page in the flow
   * This is called BEFORE navigation to ensure instant page load
   */
  preloadNextPageAssets(currentPage, currentLevel) {
    const promises = [];

    switch (currentPage) {
      case 'formPage':
        // Next: challengeIntroPage (Frame 5)
        // Video already handled by videoPool
        promises.push(this.preloadLevelAssets(0));
        break;

      case 'challengeIntroPage':
        // Next: challengePage
        promises.push(this.preloadLevelAssets(currentLevel));
        break;

      case 'challengePage':
        // Next: transitionVideo
        // Video already handled by videoPool
        promises.push(this.preloadLevelAssets(currentLevel + 1));
        break;

      case 'transitionVideo':
        // Next: challengePage
        promises.push(this.preloadLevelAssets(currentLevel + 1));
        break;

      case 'finalTransitionVideo':
        // Next: finalAnimationPage
        // No specific assets needed
        break;

      case 'finalAnimationPage':
        // Next: postAnimationTransitionVideo
        // Video already handled by videoPool
        break;

      default:
        break;
    }

    return Promise.all(promises);
  }

  /**
   * Preload assets for the previous page (for back button)
   */
  preloadPreviousPageAssets(currentPage, currentLevel) {
    const promises = [];

    switch (currentPage) {
      case 'challengePage':
        // Previous: transitionVideo or challengeIntroPage
        if (currentLevel > 0) {
          promises.push(this.preloadLevelAssets(currentLevel - 1));
        }
        break;

      case 'transitionVideo':
        // Previous: challengePage
        promises.push(this.preloadLevelAssets(currentLevel));
        break;

      default:
        break;
    }

    return Promise.all(promises);
  }

  /**
   * Aggressive preload - load EVERYTHING at game start
   * This is what Instagram/TikTok do - load all content upfront
   */
  async preloadEverything() {
    const startTime = performance.now();
    
    await Promise.all([
      this.preloadUIAssets(),
      this.preloadAudioAssets(),
      this.preloadAllBackgrounds(),
    ]);
    
    const duration = ((performance.now() - startTime) / 1000).toFixed(2);
  }

  /**
   * Get preload status for debugging
   */
  getStatus() {
    return {
      imagesLoaded: this.imageCache.size,
      audioLoaded: this.audioCache.size,
      loading: this.loadingPromises.size,
    };
  }
}

// Singleton instance
const assetPreloader = new AssetPreloader();

export default assetPreloader;
