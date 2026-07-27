/**
 * Base do gerador de texturas: caches, carregamento das fotos e helpers de ruído.
 *
 * As texturas fotográficas (ambientCG, CC0) vêm de /textures/. Quando a foto ainda não
 * carregou, o chamador cai no gerador procedural da categoria correspondente.
 */
import { base } from '$app/paths';

export const cache = new Map<string, HTMLCanvasElement>();
export const imageCache = new Map<string, HTMLImageElement>();
export const loadingSet = new Set<string>();

/** Photo texture paths (served from /textures/) */
export const PHOTO_TEXTURES: Record<string, string> = {
  'red-brick': `${base}/textures/brick.jpg`,
  'exposed-brick': `${base}/textures/exposed-brick.jpg`,
  'stone': `${base}/textures/stone.jpg`,
  'wood-panel': `${base}/textures/wood-panel.jpg`,
  'concrete-block': `${base}/textures/concrete.jpg`,
  'subway-tile': `${base}/textures/subway-tile.jpg`,
};

/** Load a photo texture into cache and re-render when ready */
export function loadPhotoTexture(id: string, onLoad?: () => void): HTMLCanvasElement | null {
  const cacheKey = `photo-${id}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const url = PHOTO_TEXTURES[id];
  if (!url) return null;

  if (imageCache.has(id)) {
    const img = imageCache.get(id)!;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const cx = c.getContext('2d')!;
    cx.drawImage(img, 0, 0);
    cache.set(cacheKey, c);
    return c;
  }

  // Start loading if not already
  if (!loadingSet.has(id)) {
    loadingSet.add(id);
    const img = new Image();
    img.onload = () => {
      imageCache.set(id, img);
      cache.delete(cacheKey); // clear so next call rebuilds
      cache.delete(id); // clear procedural fallback too
      if (onLoad) onLoad();
    };
    img.src = url;
  }

  return null; // not loaded yet — fallback to procedural
}

export function getOrCreate(id: string, size: number, draw: (cx: CanvasRenderingContext2D, s: number) => void): HTMLCanvasElement {
  if (cache.has(id)) return cache.get(id)!;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const cx = c.getContext('2d')!;
  draw(cx, size);
  cache.set(id, c);
  return c;
}

/** Seed-based pseudo-random for consistent textures */
export function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function clamp(v: number, lo: number, hi: number) { return Math.max(lo, Math.min(hi, v)); }

/** Callback to invoke when a photo texture finishes loading (triggers re-render) */
export const textureLoadCallbacks: Set<() => void> = new Set();
export function notifyTextureLoad() { for (const cb of textureLoadCallbacks) cb(); }
export function setTextureLoadCallback(cb: () => void) { textureLoadCallbacks.add(cb); }
