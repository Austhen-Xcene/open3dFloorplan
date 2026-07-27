/** Minimapa: a mesma planta em escala reduzida, no canto. */
import type { Floor } from '$lib/models/types';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';

export function drawMinimap(
  cs: CanvasState,
  minimapCanvas: HTMLCanvasElement,
  floor: Floor,
  getWorldBBox: () => { minX: number; minY: number; maxX: number; maxY: number } | null,
): void {
  const mctx = minimapCanvas.getContext('2d');
  if (!mctx) return;
  const mw = minimapCanvas.width;
  const mh = minimapCanvas.height;
  mctx.clearRect(0, 0, mw, mh);

  const bbox = getWorldBBox();
  if (!bbox) return;

  mctx.fillStyle = '#f0f1f3'; mctx.fillRect(0, 0, mw, mh);

  const bw = bbox.maxX - bbox.minX;
  const bh = bbox.maxY - bbox.minY;
  if (bw < 1 || bh < 1) return;
  const scale = Math.min((mw - 8) / bw, (mh - 8) / bh);
  const ox = (mw - bw * scale) / 2;
  const oy = (mh - bh * scale) / 2;

  function toMini(wx: number, wy: number) {
    return { x: ox + (wx - bbox!.minX) * scale, y: oy + (wy - bbox!.minY) * scale };
  }

  mctx.strokeStyle = '#555';
  mctx.lineWidth = Math.max(1, 2 * scale);
  for (const w of floor.walls) {
    const s = toMini(w.start.x, w.start.y);
    const e = toMini(w.end.x, w.end.y);
    mctx.beginPath();
    if (w.curvePoint) {
      const cp = toMini(w.curvePoint.x, w.curvePoint.y);
      mctx.moveTo(s.x, s.y); mctx.quadraticCurveTo(cp.x, cp.y, e.x, e.y);
    } else {
      mctx.moveTo(s.x, s.y); mctx.lineTo(e.x, e.y);
    }
    mctx.stroke();
  }

  for (const fi of floor.furniture) {
    const cat = getCatalogItem(fi.catalogId);
    if (!cat) continue;
    const p = toMini(fi.position.x, fi.position.y);
    const fw = Math.max(2, (fi.width ?? cat.width) * scale);
    const fd = Math.max(2, (fi.depth ?? cat.depth) * scale);
    mctx.fillStyle = (fi.color ?? cat.color) + 'aa';
    mctx.save();
    mctx.translate(p.x, p.y);
    mctx.rotate((fi.rotation * Math.PI) / 180);
    mctx.fillRect(-fw / 2, -fd / 2, fw, fd);
    mctx.restore();
  }

  const { width, height, zoom, camX, camY } = cs;
  const vpTL = { x: (0 - width / 2) / zoom + camX, y: (0 - height / 2) / zoom + camY };
  const vpBR = { x: (width - width / 2) / zoom + camX, y: (height - height / 2) / zoom + camY };
  const vtl = toMini(vpTL.x, vpTL.y);
  const vbr = toMini(vpBR.x, vpBR.y);
  mctx.strokeStyle = '#3b82f6'; mctx.lineWidth = 1.5;
  mctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
  const vw = vbr.x - vtl.x;
  const vh = vbr.y - vtl.y;
  mctx.fillRect(vtl.x, vtl.y, vw, vh);
  mctx.strokeRect(vtl.x, vtl.y, vw, vh);

  mctx.strokeStyle = '#cbd5e1'; mctx.lineWidth = 1; mctx.strokeRect(0, 0, mw, mh);
}
