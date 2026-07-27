/**
 * Geometria de parede e conversão mundo→tela, compartilhadas pelos módulos de desenho.
 *
 * Tudo aqui é função pura: recebe CanvasState + dados e devolve número/ponto.
 */
import type { Point, Wall } from '$lib/models/types';
import type { CanvasState } from '$lib/utils/canvasInteraction';

export function wallLength(w: Wall): number {
  if (w.curvePoint) {
    let len = 0;
    const N = 20;
    let px = w.start.x, py = w.start.y;
    for (let i = 1; i <= N; i++) {
      const t = i / N;
      const mt = 1 - t;
      const nx = mt * mt * w.start.x + 2 * mt * t * w.curvePoint.x + t * t * w.end.x;
      const ny = mt * mt * w.start.y + 2 * mt * t * w.curvePoint.y + t * t * w.end.y;
      len += Math.hypot(nx - px, ny - py);
      px = nx; py = ny;
    }
    return len;
  }
  return Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
}

export function wallPointAt(w: Wall, t: number): Point {
  if (w.curvePoint) {
    const mt = 1 - t;
    return {
      x: mt * mt * w.start.x + 2 * mt * t * w.curvePoint.x + t * t * w.end.x,
      y: mt * mt * w.start.y + 2 * mt * t * w.curvePoint.y + t * t * w.end.y,
    };
  }
  return {
    x: w.start.x + (w.end.x - w.start.x) * t,
    y: w.start.y + (w.end.y - w.start.y) * t,
  };
}

export function wallTangentAt(w: Wall, t: number): Point {
  if (w.curvePoint) {
    const mt = 1 - t;
    const dx = 2 * mt * (w.curvePoint.x - w.start.x) + 2 * t * (w.end.x - w.curvePoint.x);
    const dy = 2 * mt * (w.curvePoint.y - w.start.y) + 2 * t * (w.end.y - w.curvePoint.y);
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }
  const dx = w.end.x - w.start.x;
  const dy = w.end.y - w.start.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: dx / len, y: dy / len };
}

export function wallThicknessScreen(w: Wall, zoom: number): number {
  return Math.max(w.thickness * zoom, 4);
}

/**
 * Half-thickness insets at each end of a wall caused by abutting
 * (non-collinear) neighbor walls. Used for edge-to-edge ("clear span")
 * dimensions: centerline length minus these insets is the distance
 * between the neighbors' inner faces.
 */
export function wallEdgeInsets(w: Wall, allWalls: Wall[]): { start: number; end: number } {
  const EP = 5;
  const wdx = w.end.x - w.start.x, wdy = w.end.y - w.start.y;
  const wl = Math.hypot(wdx, wdy) || 1;
  const insetAt = (pt: Point): number => {
    let inset = 0;
    for (const other of allWalls) {
      if (other.id === w.id) continue;
      const touchesStart = Math.abs(other.start.x - pt.x) < EP && Math.abs(other.start.y - pt.y) < EP;
      const touchesEnd = Math.abs(other.end.x - pt.x) < EP && Math.abs(other.end.y - pt.y) < EP;
      if (!touchesStart && !touchesEnd) continue;
      // Collinear continuations don't narrow the span — only crossing walls do
      const odx = other.end.x - other.start.x, ody = other.end.y - other.start.y;
      const ol = Math.hypot(odx, ody) || 1;
      const cross = Math.abs((wdx / wl) * (ody / ol) - (wdy / wl) * (odx / ol));
      if (cross < 0.1) continue;
      inset = Math.max(inset, other.thickness / 2);
    }
    return inset;
  };
  return { start: insetAt(w.start), end: insetAt(w.end) };
}

// ── Coordinate conversion (local helpers using CanvasState) ─────────

export function wts(cs: CanvasState, wx: number, wy: number): { x: number; y: number } {
  return { x: (wx - cs.camX) * cs.zoom + cs.width / 2, y: (wy - cs.camY) * cs.zoom + cs.height / 2 };
}

// ── Grid ─────────────────────────────────────────────────────────────

