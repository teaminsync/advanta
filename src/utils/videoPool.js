/**
 * VideoPool - Instagram/TikTok/YouTube Shorts style video management
 * 
 * HOW IT WORKS:
 * 1. Pre-creates 3 persistent video elements at app init
 * 2. Loads videos into hidden elements BEFORE they're needed
 * 3. Swaps visibility (not src) for instant transitions
 * 4. Maintains previous/current/next videos in memory
 * 5. Zero black screens - always has a frame ready to show
 */

class VideoPool {
  constructor() {
    this.pool = [];
    this.container = null;
    this.activeSlot = null;
    this.initialized = false;
  }

  /**
   * Initialize the pool - call this ONCE at app start
   * Creates 3 video elements that will be reused throughout the app
   */
  init() {
    if (this.initialized) {
      console.log('🎬 Video pool already initialized');
      return;
    }

    console.log('🎬 Initializing video pool...');

    // Create hidden container
    this.container = document.createElement('div');
    this.container.id = 'video-pool-container';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: -1;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);

    // Create 3 video slots (previous, current, next)
    for (let i = 0; i < 3; i++) {
      const slot = this.createSlot(i);
      this.pool.push(slot);
      this.container.appendChild(slot.element);
      console.log(`🎬 Created video slot ${i}`);
    }

    this.initialized = true;
    console.log('✅ Video pool initialized with 3 slots');
  }

  createSlot(index) {
    const video = document.createElement('video');
    
    // CRITICAL: Set all attributes for iOS/Android compatibility
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.preload = 'auto';
    video.disablePictureInPicture = true;
    video.controls = false;
    
    // Start hidden with smooth transition capability
    video.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0;
      transition: opacity 0.2s ease-in-out;
      z-index: -1;
    `;

    return {
      element: video,
      src: null,
      status: 'idle', // idle, loading, ready, active
      index,
      listeners: new Map(),
    };
  }

  /**
   * Get a slot by src (if already loaded)
   */
  getSlotBySrc(src) {
    return this.pool.find(slot => slot.src === src);
  }

  /**
   * Get the best available slot for loading a new video
   */
  getBestSlot() {
    // NEVER use the active slot
    const protectedSlots = new Set();
    
    if (this.activeSlot) {
      protectedSlots.add(this.activeSlot);
    }
    
    // Also protect slots that are currently loading (not idle)
    this.pool.forEach(slot => {
      if (slot.status === 'loading' && slot.src) {
        protectedSlots.add(slot);
      }
    });

    // Find an idle slot (not protected)
    let slot = this.pool.find(s => !protectedSlots.has(s) && s.status === 'idle');
    if (slot) {
      console.log(`📍 Using idle slot ${slot.index}`);
      return slot;
    }

    // Find a ready slot (not protected, not active)
    slot = this.pool.find(s => !protectedSlots.has(s) && s.status === 'ready');
    if (slot) {
      console.log(`📍 Using ready slot ${slot.index} (will overwrite)`);
      return slot;
    }

    // Last resort: use the oldest non-protected slot
    slot = this.pool.find(s => !protectedSlots.has(s));
    if (slot) {
      console.log(`⚠️ Using non-protected slot ${slot.index} (last resort)`);
      return slot;
    }
    
    // Absolute last resort: use slot 0 (should never happen with 3 slots)
    console.warn(`⚠️ All slots protected! Using slot 0 anyway`);
    return this.pool[0];
  }

  /**
   * Preload a video into a slot without showing it
   * This is what makes Instagram/TikTok instant - videos are loaded BEFORE needed
   */
  preload(src, priority = 'normal') {
    if (!this.initialized) this.init();
    if (!src) return Promise.resolve(false);

    const videoName = src.substring(src.lastIndexOf('/') + 1, src.lastIndexOf('.'));

    // Already loaded or loading?
    const existing = this.getSlotBySrc(src);
    if (existing) {
      if (existing.element.readyState >= 3) {
        console.log(`✅ Video already loaded: ${videoName} (slot ${existing.index})`);
        return Promise.resolve(true);
      }
      console.log(`⏳ Video already loading: ${videoName} (slot ${existing.index})`);
      // Still loading, return existing promise
      return new Promise((resolve) => {
        existing.element.addEventListener('canplaythrough', () => {
          console.log(`✅ Video finished loading: ${videoName} (slot ${existing.index})`);
          resolve(true);
        }, { once: true });
      });
    }

    // Get a slot and start loading
    const slot = this.getBestSlot();
    
    console.log(`📥 Preloading video: ${videoName} into slot ${slot.index} (priority: ${priority})`);
    
    // Clean up previous assignment
    this.cleanupSlot(slot);
    
    slot.src = src;
    slot.status = 'loading';
    slot.element.style.opacity = '0';
    slot.element.style.zIndex = '0';

    return new Promise((resolve) => {
      const onReady = () => {
        if (slot.src === src) {
          slot.status = 'ready';
          console.log(`✅ Video ready: ${videoName} (slot ${slot.index}, readyState: ${slot.element.readyState})`);
        }
        resolve(true);
      };

      const onError = () => {
        console.error(`❌ Video load error: ${videoName} (slot ${slot.index})`);
        slot.status = 'idle';
        slot.src = null;
        resolve(false);
      };

      slot.element.addEventListener('canplaythrough', onReady, { once: true });
      slot.element.addEventListener('error', onError, { once: true });
      
      slot.element.src = src;
      slot.element.load();
    });
  }

  /**
   * Activate a video for visible playback
   * This is INSTANT because the video is already loaded and ready
   */
  activate(src, options = {}) {
    if (!this.initialized) this.init();

    const {
      muted = true,
      startTime = 0,
      onEnded = null,
      onReady = null,
      fadeIn = true,
    } = options;

    const videoName = src.substring(src.lastIndexOf('/') + 1, src.lastIndexOf('.'));

    // Find the slot with this video
    let slot = this.getSlotBySrc(src);

    if (!slot) {
      console.warn(`⚠️ Video not preloaded: ${videoName} - loading now (may cause delay)`);
      // Not preloaded - load it now (will cause brief delay)
      slot = this.getBestSlot();
      this.cleanupSlot(slot);
      slot.src = src;
      slot.status = 'loading';
      slot.element.src = src;
      slot.element.load();
    } else {
      console.log(`▶️ Activating video: ${videoName} (slot ${slot.index}, readyState: ${slot.element.readyState})`);
    }

    // Hide previous active slot
    if (this.activeSlot && this.activeSlot !== slot) {
      const prevVideoName = this.activeSlot.src ? this.activeSlot.src.substring(this.activeSlot.src.lastIndexOf('/') + 1, this.activeSlot.src.lastIndexOf('.')) : 'unknown';
      console.log(`⏸️ Hiding previous video: ${prevVideoName} (slot ${this.activeSlot.index})`);
      this.activeSlot.element.style.opacity = '0';
      this.activeSlot.element.style.zIndex = '-1';
      this.activeSlot.element.pause();
      if (this.activeSlot.status === 'active') {
        this.activeSlot.status = 'ready';
      }
    }

    // Activate this slot
    this.activeSlot = slot;
    slot.status = 'active';
    slot.element.muted = muted;
    
    if (muted) {
      slot.element.setAttribute('muted', '');
    } else {
      slot.element.removeAttribute('muted');
    }

    // Apply start time if needed
    if (startTime > 0 && Math.abs(slot.element.currentTime - startTime) > 0.3) {
      console.log(`⏩ Seeking to ${startTime}s in ${videoName}`);
      slot.element.currentTime = startTime;
    }

    // Set up ended callback
    if (onEnded) {
      // Remove any existing ended listeners first
      const existingHandlers = slot.element._endedHandlers || [];
      existingHandlers.forEach(handler => {
        slot.element.removeEventListener('ended', handler);
      });
      
      const endedHandler = () => {
        console.log(`🏁 Video ended: ${videoName}`);
        onEnded();
        // Clean up after firing
        slot.element.removeEventListener('ended', endedHandler);
        const idx = (slot.element._endedHandlers || []).indexOf(endedHandler);
        if (idx > -1) slot.element._endedHandlers.splice(idx, 1);
      };
      
      // Track handlers to prevent duplicates
      if (!slot.element._endedHandlers) slot.element._endedHandlers = [];
      slot.element._endedHandlers.push(endedHandler);
      
      slot.element.addEventListener('ended', endedHandler, { once: true });
    }

    // Show and play
    const attemptPlay = () => {
      slot.element.style.zIndex = '1000'; // High z-index when active
      
      if (fadeIn) {
        // Smooth fade in
        requestAnimationFrame(() => {
          slot.element.style.opacity = '1';
        });
      } else {
        slot.element.style.opacity = '1';
      }

      const playPromise = slot.element.play();
      if (playPromise) {
        playPromise
          .then(() => {
            console.log(`✅ Playing: ${videoName} (slot ${slot.index}, muted: ${muted})`);
            if (onReady) onReady();
          })
          .catch((err) => {
            console.error(`❌ Play error for ${videoName}:`, err.name);
            if (err.name === 'AbortError') {
              console.log(`🔄 Retrying play for ${videoName}...`);
              // Retry once
              setTimeout(() => {
                if (slot.status === 'active') {
                  slot.element.play().catch(() => {});
                }
              }, 200);
            }
          });
      }
    };

    if (slot.element.readyState >= 3) {
      // Already ready - play immediately
      console.log(`⚡ Video ready immediately: ${videoName}`);
      attemptPlay();
    } else {
      console.log(`⏳ Waiting for video to be ready: ${videoName}`);
      // Wait for ready
      slot.element.addEventListener('canplay', attemptPlay, { once: true });
    }

    return {
      element: slot.element,
      pause: () => slot.element.pause(),
      play: () => slot.element.play().catch(() => {}),
      seek: (time) => { slot.element.currentTime = time; },
      setMuted: (val) => {
        slot.element.muted = val;
        if (val) {
          slot.element.setAttribute('muted', '');
        } else {
          slot.element.removeAttribute('muted');
        }
      },
      hide: () => {
        slot.element.style.opacity = '0';
        slot.element.style.zIndex = '-1';
        slot.element.pause();
      },
    };
  }

  /**
   * Preload a sequence of videos (previous, current, next)
   * This is the Instagram/TikTok strategy
   */
  preloadSequence(allVideos, currentIndex) {
    const promises = [];

    // Current (highest priority)
    if (allVideos[currentIndex]) {
      promises.push(this.preload(allVideos[currentIndex], 'high'));
    }

    // Next (high priority)
    if (allVideos[currentIndex + 1]) {
      promises.push(this.preload(allVideos[currentIndex + 1], 'high'));
    }

    // Previous (medium priority)
    if (currentIndex > 0 && allVideos[currentIndex - 1]) {
      promises.push(this.preload(allVideos[currentIndex - 1], 'medium'));
    }

    return Promise.all(promises);
  }

  /**
   * Clean up a slot for reuse
   */
  cleanupSlot(slot) {
    slot.element.pause();
    slot.element.removeAttribute('src');
    slot.element.load();
    slot.src = null;
    slot.status = 'idle';
    slot.element.style.opacity = '0';
    slot.element.style.zIndex = '-1';
  }

  /**
   * Get current pool status (for debugging)
   */
  getStatus() {
    return this.pool.map(slot => ({
      index: slot.index,
      status: slot.status,
      src: slot.src ? slot.src.substring(slot.src.lastIndexOf('/') + 1) : null,
      readyState: slot.element.readyState,
      currentTime: slot.element.currentTime.toFixed(2),
    }));
  }

  /**
   * Pause all videos
   */
  pauseAll() {
    this.pool.forEach(slot => slot.element.pause());
  }

  /**
   * Resume active video
   */
  resumeActive() {
    if (this.activeSlot) {
      this.activeSlot.element.play().catch(() => {});
    }
  }
}

// Singleton instance
const videoPool = new VideoPool();

export default videoPool;
