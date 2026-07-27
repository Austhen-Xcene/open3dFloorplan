/** Desenho de paredes e das juntas entre elas. */
import type { Wall, Door, Floor } from '$lib/models/types';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import type { ProjectSettings } from '$lib/stores/settings';
import { formatLength } from '$lib/stores/settings';
import { getWallTextureCanvas } from '$lib/utils/texturas';
import { wallLength, wallPointAt, wallTangentAt, wallEdgeInsets, wallThicknessScreen, wts } from './geometria';

export function drawWall(
  cs: CanvasState,
  w: Wall,
  selected: boolean,
  showDimensions: boolean,
  dimSettings: ProjectSettings,
  allWalls?: Wall[],
): void {
  const { ctx, zoom, width, height } = cs;
  const s = wts(cs, w.start.x, w.start.y);
  const e = wts(cs, w.end.x, w.end.y);
  const thickness = wallThicknessScreen(w, zoom);

  if (w.curvePoint) {
    const cp = wts(cs, w.curvePoint.x, w.curvePoint.y);
    const SEGS = 24;
    const outerPts: { x: number; y: number }[] = [];
    const innerPts: { x: number; y: number }[] = [];

    for (let i = 0; i <= SEGS; i++) {
      const t = i / SEGS;
      const mt = 1 - t;
      const px = mt * mt * s.x + 2 * mt * t * cp.x + t * t * e.x;
      const py = mt * mt * s.y + 2 * mt * t * cp.y + t * t * e.y;
      const tdx = 2 * mt * (cp.x - s.x) + 2 * t * (e.x - cp.x);
      const tdy = 2 * mt * (cp.y - s.y) + 2 * t * (e.y - cp.y);
      const tlen = Math.hypot(tdx, tdy) || 1;
      const nx = (-tdy / tlen) * thickness / 2;
      const ny = (tdx / tlen) * thickness / 2;
      outerPts.push({ x: px + nx, y: py + ny });
      innerPts.push({ x: px - nx, y: py - ny });
    }

    ctx.fillStyle = selected ? '#93c5fd' : '#404040';
    ctx.strokeStyle = selected ? '#3b82f6' : '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(outerPts[0].x, outerPts[0].y);
    for (let i = 1; i < outerPts.length; i++) ctx.lineTo(outerPts[i].x, outerPts[i].y);
    for (let i = innerPts.length - 1; i >= 0; i--) ctx.lineTo(innerPts[i].x, innerPts[i].y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const wlen = wallLength(w);
    if (wlen >= 10 && showDimensions && dimSettings.showExternalDimensions) {
      const midPt = wallPointAt(w, 0.5);
      const midS = wts(cs, midPt.x, midPt.y);
      const midTan = wallTangentAt(w, 0.5);
      const offsetDist = thickness / 2 + 16;
      ctx.fillStyle = dimSettings.dimensionLineColor;
      const fontSize = Math.max(10, 11 * zoom);
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(formatLength(wlen, dimSettings.units), midS.x - midTan.y * offsetDist, midS.y + midTan.x * offsetDist);
    }

    if (selected) {
      const handleSize = 5;
      for (const pt of [s, e]) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, handleSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.fillStyle = '#fbbf24';
      ctx.strokeStyle = '#d97706';
      ctx.lineWidth = 1.5;
      const sz = 6;
      ctx.beginPath();
      ctx.moveTo(cp.x, cp.y - sz);
      ctx.lineTo(cp.x + sz, cp.y);
      ctx.lineTo(cp.x, cp.y + sz);
      ctx.lineTo(cp.x - sz, cp.y);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.strokeStyle = '#d9770680';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(cp.x, cp.y);
      ctx.lineTo(e.x, e.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    return;
  }

  // Straight wall
  const dx = e.x - s.x;
  const dy = e.y - s.y;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;

  const nx = (-dy / len) * thickness / 2;
  const ny = (dx / len) * thickness / 2;

  ctx.fillStyle = selected ? '#93c5fd' : '#404040';
  ctx.strokeStyle = selected ? '#3b82f6' : '#333333';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(s.x + nx, s.y + ny);
  ctx.lineTo(e.x + nx, e.y + ny);
  ctx.lineTo(e.x - nx, e.y - ny);
  ctx.lineTo(s.x - nx, s.y - ny);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Wall texture pattern overlay
  if (w.texture) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(s.x + nx, s.y + ny);
    ctx.lineTo(e.x + nx, e.y + ny);
    ctx.lineTo(e.x - nx, e.y - ny);
    ctx.lineTo(s.x - nx, s.y - ny);
    ctx.closePath();
    ctx.clip();

    const texCanvas = getWallTextureCanvas(w.texture, w.color);
    if (texCanvas) {
      const scale = zoom * 0.25;
      ctx.globalAlpha = 0.6;
      const angle = Math.atan2(dy, dx);
      const cxp = (s.x + e.x) / 2;
      const cyp = (s.y + e.y) / 2;
      ctx.translate(cxp, cyp);
      ctx.rotate(angle);
      ctx.scale(scale, scale);
      const pat = ctx.createPattern(texCanvas, 'repeat');
      if (pat) {
        ctx.fillStyle = pat;
        ctx.fillRect(-len / 2 / scale, -thickness / 2 / scale, len / scale, thickness / scale);
      }
    }
    ctx.restore();
  }

  // Dimension line with arrowheads
  if (!showDimensions || !dimSettings.showExternalDimensions) return;
  const wlen = wallLength(w);
  if (wlen < 10) return;

  // Edge-to-edge (clear span) mode: shorten the measured span by the
  // half-thickness of abutting walls at each end (issue #11).
  let dimLen = wlen;
  let insetS = 0, insetE = 0;
  if (dimSettings.wallMeasureMode === 'edge' && allWalls && !w.curvePoint) {
    const ins = wallEdgeInsets(w, allWalls);
    insetS = ins.start;
    insetE = ins.end;
    dimLen = Math.max(0, wlen - insetS - insetE);
  }
  const ux1 = dx / len, uy1 = dy / len;
  const sd = { x: s.x + ux1 * insetS * zoom, y: s.y + uy1 * insetS * zoom };
  const ed = { x: e.x - ux1 * insetE * zoom, y: e.y - uy1 * insetE * zoom };

  const mx = (sd.x + ed.x) / 2;
  const my = (sd.y + ed.y) / 2;
  const offsetDist = thickness / 2 + 20;
  const nnx = (-dy / len);
  const nny = (dx / len);

  let dimSide = 1;
  const testX = mx + nnx * offsetDist;
  const testY = my + nny * offsetDist;
  if (testX < 10 || testX > width - 10 || testY < 10 || testY > height - 10) dimSide = -1;

  const dOffX = nnx * offsetDist * dimSide;
  const dOffY = nny * offsetDist * dimSide;

  if (dimSettings.showExtensionLines) {
    const extLen = offsetDist + 4;
    ctx.strokeStyle = dimSettings.dimensionLineColor + '80';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(sd.x + nnx * (thickness / 2 + 2) * dimSide, sd.y + nny * (thickness / 2 + 2) * dimSide);
    ctx.lineTo(sd.x + nnx * extLen * dimSide, sd.y + nny * extLen * dimSide);
    ctx.moveTo(ed.x + nnx * (thickness / 2 + 2) * dimSide, ed.y + nny * (thickness / 2 + 2) * dimSide);
    ctx.lineTo(ed.x + nnx * extLen * dimSide, ed.y + nny * extLen * dimSide);
    ctx.stroke();
  }

  const ds = { x: sd.x + dOffX, y: sd.y + dOffY };
  const de = { x: ed.x + dOffX, y: ed.y + dOffY };
  const dimMx = (ds.x + de.x) / 2;
  const dimMy = (ds.y + de.y) / 2;

  ctx.fillStyle = dimSettings.dimensionLineColor;
  const fontSize = Math.max(10, 11 * zoom);
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const dimLabel = formatLength(dimLen, dimSettings.units);
  const textW = ctx.measureText(dimLabel).width;

  const ux2 = dx / len, uy2 = dy / len;
  const halfGap = textW / 2 + 4;
  ctx.strokeStyle = dimSettings.dimensionLineColor;
  ctx.lineWidth = 0.75;
  ctx.beginPath();
  ctx.moveTo(ds.x, ds.y);
  ctx.lineTo(dimMx - ux2 * halfGap, dimMy - uy2 * halfGap);
  ctx.moveTo(dimMx + ux2 * halfGap, dimMy + uy2 * halfGap);
  ctx.lineTo(de.x, de.y);
  ctx.stroke();

  const tickSize = Math.max(4, 5 * zoom);
  ctx.strokeStyle = dimSettings.dimensionLineColor;
  ctx.lineWidth = 1;
  for (const pt of [ds, de]) {
    ctx.beginPath();
    ctx.moveTo(pt.x - (ux2 + nnx * dimSide) * tickSize, pt.y - (uy2 + nny * dimSide) * tickSize);
    ctx.lineTo(pt.x + (ux2 + nnx * dimSide) * tickSize, pt.y + (uy2 + nny * dimSide) * tickSize);
    ctx.stroke();
  }

  ctx.fillStyle = dimSettings.dimensionLineColor;
  ctx.fillText(dimLabel, dimMx, dimMy);

  if (selected) {
    const handleSize = 5;
    for (const pt of [s, e]) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, handleSize, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    const midX = (s.x + e.x) / 2;
    const midY = (s.y + e.y) / 2;
    const sz = 5;
    ctx.fillStyle = '#3b82f6';
    ctx.strokeStyle = '#1d4ed8';
    ctx.lineWidth = 1.5;
    ctx.fillRect(midX - sz, midY - sz, sz * 2, sz * 2);
    ctx.strokeRect(midX - sz, midY - sz, sz * 2, sz * 2);
    const perpX = -(dy / len) * 12;
    const perpY = (dx / len) * 12;
    ctx.strokeStyle = '#3b82f680';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(midX - perpX, midY - perpY);
    ctx.lineTo(midX + perpX, midY + perpY);
    ctx.stroke();
    const arrowSz = 3;
    for (const sign of [1, -1]) {
      const ax = midX + perpX * sign;
      const ay = midY + perpY * sign;
      const adx = perpX / 12 * arrowSz * sign;
      const ady = perpY / 12 * arrowSz * sign;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - adx + ady * 0.5, ay - ady - adx * 0.5);
      ctx.moveTo(ax, ay);
      ctx.lineTo(ax - adx - ady * 0.5, ay - ady + adx * 0.5);
      ctx.stroke();
    }
  }
}

// ── Door drawing ─────────────────────────────────────────────────────

export function drawWallJoints(cs: CanvasState, floor: Floor, selId: string | null): void {
  const { ctx, zoom } = cs;
  const epMap = new Map<string, { x: number; y: number; thickness: number; selected: boolean }[]>();
  for (const w of floor.walls) {
    const sel = w.id === selId;
    for (const ep of [w.start, w.end]) {
      const key = `${Math.round(ep.x)},${Math.round(ep.y)}`;
      if (!epMap.has(key)) epMap.set(key, []);
      epMap.get(key)!.push({ x: ep.x, y: ep.y, thickness: w.thickness, selected: sel });
    }
  }
  for (const [, entries] of epMap) {
    if (entries.length < 2) continue;
    const anySelected = entries.some(e => e.selected);
    const maxThickness = Math.max(...entries.map(e => e.thickness));
    const s = wts(cs, entries[0].x, entries[0].y);
    const r = Math.max(maxThickness * zoom, 4) / 2 + 0.5;
    ctx.fillStyle = anySelected ? '#93c5fd' : '#404040';
    ctx.strokeStyle = anySelected ? '#3b82f6' : '#333333';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
  }
}

// ── Snap points ──────────────────────────────────────────────────────

