/** Texturas de piso: catálogo de fotos, mapeamento legado e fallback procedural. */
import { base } from '$app/paths';
import { cache, imageCache, loadingSet, getOrCreate, seededRandom, notifyTextureLoad } from './base';

// ── FLOOR TEXTURES ─────────────────────────────────────────────

export function generateHardwoodTexture(baseColor: string = '#c4a882'): HTMLCanvasElement {
  const id = `hardwood-${baseColor}`;
  return getOrCreate(id, 1024, (cx, S) => {
    const rng = seededRandom(31);

    cx.fillStyle = baseColor;
    cx.fillRect(0, 0, S, S);

    const plankW = 80, plankH = 512;
    const gap = 2;

    for (let x = 0; x < S; x += plankW) {
      const yOff = (Math.floor(x / plankW) % 2) * (plankH / 2);
      for (let y = -plankH; y < S + plankH; y += plankH) {
        const hue = 25 + rng() * 20;
        const sat = 25 + rng() * 20;
        const lit = 45 + rng() * 20;
        cx.fillStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;
        cx.fillRect(x + gap / 2, y + yOff + gap / 2, plankW - gap, plankH - gap);

        // Wood grain
        for (let g = 0; g < 30; g++) {
          const gy = y + yOff + rng() * plankH;
          cx.strokeStyle = `rgba(0,0,0,${0.02 + rng() * 0.06})`;
          cx.lineWidth = 0.3 + rng() * 0.8;
          cx.beginPath();
          cx.moveTo(x + gap, gy);
          for (let gx = 0; gx < plankW - gap; gx += 8) {
            cx.lineTo(x + gap + gx, gy + Math.sin(gx * 0.02 + rng() * 5) * (1 + rng() * 2));
          }
          cx.stroke();
        }

        // Edge bevel
        cx.fillStyle = 'rgba(0,0,0,0.08)';
        cx.fillRect(x, y + yOff, gap, plankH);
        cx.fillRect(x, y + yOff, plankW, gap);
      }
    }
  });
}

/** Floor texture photo paths */
const FLOOR_TEXTURES: Record<string, string> = {
  'light-oak': `${base}/textures/floor-light-oak.jpg`,
  'walnut': `${base}/textures/floor-walnut.jpg`,
  'bamboo': `${base}/textures/floor-bamboo.jpg`,
  'laminate': `${base}/textures/floor-laminate.jpg`,
  'ceramic-white': `${base}/textures/floor-tile-white.jpg`,
  'ceramic-gray': `${base}/textures/floor-tile-gray.jpg`,
  'porcelain': `${base}/textures/floor-porcelain.jpg`,
  'marble-white': `${base}/textures/floor-marble-white.jpg`,
  'marble-dark': `${base}/textures/floor-marble-dark.jpg`,
  'carpet-beige': `${base}/textures/floor-carpet-beige.jpg`,
  'carpet-gray': `${base}/textures/floor-carpet-gray.jpg`,
  'concrete': `${base}/textures/floor-concrete.jpg`,
  'slate': `${base}/textures/floor-slate.jpg`,
  'vinyl': `${base}/textures/floor-vinyl.jpg`,
};

// Legacy material ID mapping (matches materials.ts getMaterial())
const LEGACY_FLOOR_MAP: Record<string, string> = {
  'hardwood': 'light-oak',
  'tile': 'ceramic-white',
  'carpet': 'carpet-beige',
  'marble': 'marble-white',
  'light-wood': 'light-oak',
  'dark-wood': 'walnut',
};

export function getFloorTextureCanvas(materialId: string): HTMLCanvasElement | null {
  // Resolve legacy IDs to actual texture keys
  const resolvedId = LEGACY_FLOOR_MAP[materialId] || materialId;
  const cacheKey = `photo-floor-${resolvedId}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey)!;

  const url = FLOOR_TEXTURES[resolvedId];
  if (!url) return null;

  if (imageCache.has(`floor-${resolvedId}`)) {
    const img = imageCache.get(`floor-${resolvedId}`)!;
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const cx = c.getContext('2d')!;
    cx.drawImage(img, 0, 0);
    cache.set(cacheKey, c);
    return c;
  }

  const loadKey = `floor-${resolvedId}`;
  if (!loadingSet.has(loadKey)) {
    loadingSet.add(loadKey);
    const img = new Image();
    img.onload = () => {
      imageCache.set(loadKey, img);
      cache.delete(cacheKey);
      notifyTextureLoad();
    };
    img.src = url;
  }

  return null;
}

