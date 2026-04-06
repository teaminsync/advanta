const mediaPromiseCache = new Map();

const storePromise = (key, factory) => {
  if (!key) return Promise.resolve();
  if (!mediaPromiseCache.has(key)) {
    mediaPromiseCache.set(key, factory());
  }
  return mediaPromiseCache.get(key);
};

export const preloadImage = (src) =>
  storePromise(`image:${src}`, () => new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.loading = 'eager';
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = src;
  }));

export const preloadAudio = (src) =>
  storePromise(`audio:${src}`, () => new Promise((resolve) => {
    const audio = new Audio();
    audio.preload = 'metadata';
    let settled = false;
    const finish = (didLoad) => {
      if (settled) return;
      settled = true;
      resolve(didLoad);
    };
    audio.addEventListener('canplaythrough', () => finish(true), { once: true });
    audio.addEventListener('error', () => finish(false), { once: true });
    audio.src = src;
    audio.load();
    setTimeout(() => finish(false), 3000);
  }));

export const preloadVideo = (src) =>
  storePromise(`video:${src}`, () => new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto'; // Changed from 'metadata' to 'auto' to load full video
    video.playsInline = true;
    video.muted = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    let settled = false;

    const finish = (didLoad) => {
      if (settled) return;
      settled = true;
      // Keep video element in DOM but hidden to maintain cache
      video.style.display = 'none';
      video.style.position = 'absolute';
      video.style.pointerEvents = 'none';
      resolve(didLoad);
    };

    // Wait for enough data to play through without buffering
    video.addEventListener('canplaythrough', () => finish(true), { once: true });
    video.addEventListener('error', () => finish(false), { once: true });
    video.src = src;
    video.load();
    setTimeout(() => finish(false), 15000); // Increased timeout for full video load
  }));

export const preloadMediaBundle = ({ images = [], videos = [], audio = [] }) =>
  Promise.allSettled([
    ...images.map(preloadImage),
    ...videos.map(preloadVideo),
    ...audio.map(preloadAudio),
  ]);
