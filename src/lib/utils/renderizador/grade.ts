/** Grade de fundo e pontos de encaixe (snap). */
import type { Wall, Floor } from '$lib/models/types';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import { wts } from './geometria';

export function drawGrid(
  cs: CanvasState,
  showGrid: boolean,
  snapToGrid: boolean,
  gridSize: number,
): void {
  if (!cs.ctx || !showGrid) return;
  const { ctx, width, height, zoom, camX, camY } = cs;
  const GRID = 20;
  const step = (snapToGrid ? gridSize : GRID) * zoom;
  if (step < 4) return;

  ctx.strokeStyle = '#e8eaed';
  ctx.lineWidth = 0.5;
  const offX = (width / 2 - camX * zoom) % step;
  const offY = (height / 2 - camY * zoom) % step;
  for (let x = offX; x < width; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  for (let y = offY; y < height; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
  }

  const majorStep = 100 * zoom;
  if (majorStep >= 20) {
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 0.8;
    const mOffX = (width / 2 - camX * zoom) % majorStep;
    const mOffY = (height / 2 - camY * zoom) % majorStep;
    for (let x = mOffX; x < width; x += majorStep) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
    }
    for (let y = mOffY; y < height; y += majorStep) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
    }
  }
}

// ── Wall drawing ─────────────────────────────────────────────────────

export function drawSnapPoints(cs: CanvasState, floor: Floor, showGrid: boolean): void {
  if (!showGrid) return;
  const { ctx } = cs;
  ctx.fillStyle = '#3b82f640';
  const seen = new Set<string>();
  for (const w of floor.walls) {
    for (const ep of [w.start, w.end]) {
      const key = `${ep.x},${ep.y}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const s = wts(cs, ep.x, ep.y);
      ctx.beginPath(); ctx.arc(s.x, s.y, 2, 0, Math.PI * 2); ctx.fill();
    }
  }
}

// ── Minimap ──────────────────────────────────────────────────────────

