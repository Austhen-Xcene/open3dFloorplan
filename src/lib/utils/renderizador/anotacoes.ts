/** Desenho de guias, medições, cotas e textos livres. */
import type { Floor, Annotation } from '$lib/models/types';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import type { ProjectSettings } from '$lib/stores/settings';
import { formatLength } from '$lib/stores/settings';
import { wts } from './geometria';

export function drawGuides(cs: CanvasState, floor: Floor, selectedGuideId: string | null, RULER_SIZE: number): void {
  if (!cs.ctx) return;
  const { ctx, width, height } = cs;
  const guides = floor.guides ?? [];
  const R = RULER_SIZE;
  for (const g of guides) {
    const selected = g.id === selectedGuideId;
    const color = g.orientation === 'horizontal' ? '#00bcd4' : '#e040fb';
    ctx.save();
    ctx.strokeStyle = color; ctx.lineWidth = selected ? 1.5 : 1;
    ctx.setLineDash([6, 4]); ctx.globalAlpha = selected ? 1.0 : 0.7;
    ctx.beginPath();
    if (g.orientation === 'horizontal') {
      const sy = wts(cs, 0, g.position).y;
      ctx.moveTo(R, sy); ctx.lineTo(width, sy);
    } else {
      const sx = wts(cs, g.position, 0).x;
      ctx.moveTo(sx, R); ctx.lineTo(sx, height);
    }
    ctx.stroke(); ctx.setLineDash([]);

    ctx.font = '10px sans-serif'; ctx.fillStyle = color; ctx.globalAlpha = 1;
    const label = formatLength(g.position, 'metric');
    if (g.orientation === 'horizontal') {
      const sy = wts(cs, 0, g.position).y;
      ctx.textAlign = 'left'; ctx.textBaseline = 'bottom'; ctx.fillText(label, R + 4, sy - 2);
    } else {
      const sx = wts(cs, g.position, 0).x;
      ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(label, sx + 4, R + 2);
    }
    ctx.restore();
  }
}

// ── Persisted measurements ───────────────────────────────────────────

export function drawPersistedMeasurements(cs: CanvasState, floor: Floor, selectedMeasurementId: string | null, dimSettings: ProjectSettings): void {
  if (!floor.measurements) return;
  const { ctx } = cs;
  for (const m of floor.measurements) {
    const s = wts(cs, m.x1, m.y1);
    const e = wts(cs, m.x2, m.y2);
    const selected = m.id === selectedMeasurementId;
    ctx.strokeStyle = selected ? '#3b82f6' : '#ef4444';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.setLineDash([6, 3]);
    ctx.beginPath(); ctx.moveTo(s.x, s.y); ctx.lineTo(e.x, e.y); ctx.stroke();
    ctx.setLineDash([]);

    for (const p of [s, e]) {
      ctx.fillStyle = selected ? '#3b82f6' : '#ef4444';
      ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    }

    const dist = Math.hypot(m.x2 - m.x1, m.y2 - m.y1);
    const mx = (s.x + e.x) / 2;
    const my = (s.y + e.y) / 2;
    ctx.fillStyle = selected ? '#3b82f6' : '#ef4444';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    ctx.fillText(formatLength(dist, dimSettings.units), mx, my - 6);
  }
}

// ── Text annotations ─────────────────────────────────────────────────

export function drawTextAnnotations(cs: CanvasState, floor: Floor, selectedTextAnnotationId: string | null, currentSelectedId: string | null): void {
  if (!floor.textAnnotations) return;
  const { ctx, zoom } = cs;
  for (const ta of floor.textAnnotations) {
    const selected = ta.id === selectedTextAnnotationId || ta.id === currentSelectedId;
    const s = wts(cs, ta.x, ta.y);
    const fontSize = Math.max(8, ta.fontSize * zoom);
    ctx.save();
    ctx.translate(s.x, s.y);
    if (ta.rotation) ctx.rotate(ta.rotation * Math.PI / 180);
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = ta.color || '#1e293b';
    const lines = ta.text.split('\n');
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], 0, -totalHeight / 2 + lineHeight / 2 + i * lineHeight);
    }
    if (selected) {
      let maxW = 0;
      for (const line of lines) { const w = ctx.measureText(line).width; if (w > maxW) maxW = w; }
      const pad = 4;
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1.5; ctx.setLineDash([4, 3]);
      ctx.strokeRect(-maxW / 2 - pad, -totalHeight / 2 - pad, maxW + pad * 2, totalHeight + pad * 2);
      ctx.setLineDash([]);
    }
    ctx.restore();
  }
}

// ── Dimension annotations ────────────────────────────────────────────

export function drawAnnotation(cs: CanvasState, a: Annotation, selected: boolean, dimSettings: ProjectSettings): void {
  const { ctx, zoom } = cs;
  const offset = a.offset || 40;
  const dx = a.x2 - a.x1, dy = a.y2 - a.y1;
  const len = Math.hypot(dx, dy);
  if (len < 1) return;

  const ux = dx / len, uy = dy / len;
  const nx = -uy, ny = ux;

  const d1x = a.x1 + nx * offset, d1y = a.y1 + ny * offset;
  const d2x = a.x2 + nx * offset, d2y = a.y2 + ny * offset;

  const s1 = wts(cs, a.x1, a.y1);
  const s2 = wts(cs, a.x2, a.y2);
  const sd1 = wts(cs, d1x, d1y);
  const sd2 = wts(cs, d2x, d2y);

  const color = selected ? '#3b82f6' : '#6366f1';

  ctx.strokeStyle = color; ctx.lineWidth = 0.75;
  const extBeyond = 4 * zoom;
  ctx.beginPath();
  ctx.moveTo(s1.x, s1.y); ctx.lineTo(sd1.x + nx * extBeyond * zoom, sd1.y + ny * extBeyond * zoom);
  ctx.moveTo(s2.x, s2.y); ctx.lineTo(sd2.x + nx * extBeyond * zoom, sd2.y + ny * extBeyond * zoom);
  ctx.stroke();

  const dimMx = (sd1.x + sd2.x) / 2;
  const dimMy = (sd1.y + sd2.y) / 2;

  const dist = Math.hypot(a.x2 - a.x1, a.y2 - a.y1);
  const label = a.label || formatLength(dist, dimSettings.units);
  const fontSize = Math.max(10, 11 * zoom);
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const textW = ctx.measureText(label).width;
  const halfGap = textW / 2 + 4;

  ctx.strokeStyle = color; ctx.lineWidth = selected ? 1.5 : 1;
  const sux = (sd2.x - sd1.x) / Math.hypot(sd2.x - sd1.x, sd2.y - sd1.y) || 0;
  const suy = (sd2.y - sd1.y) / Math.hypot(sd2.x - sd1.x, sd2.y - sd1.y) || 0;
  ctx.beginPath();
  ctx.moveTo(sd1.x, sd1.y); ctx.lineTo(dimMx - sux * halfGap, dimMy - suy * halfGap);
  ctx.moveTo(dimMx + sux * halfGap, dimMy + suy * halfGap); ctx.lineTo(sd2.x, sd2.y);
  ctx.stroke();

  const arrowLen = Math.max(6, 7 * zoom);
  const arrowW = Math.max(2.5, 3 * zoom);
  ctx.fillStyle = color;
  for (const [px, py, dir] of [[sd1.x, sd1.y, 1], [sd2.x, sd2.y, -1]] as [number, number, number][]) {
    const adx = sux * arrowLen * dir;
    const ady = suy * arrowLen * dir;
    const apx = -suy * arrowW;
    const apy = sux * arrowW;
    ctx.beginPath(); ctx.moveTo(px, py);
    ctx.lineTo(px + adx + apx, py + ady + apy);
    ctx.lineTo(px + adx - apx, py + ady - apy);
    ctx.closePath(); ctx.fill();
  }

  ctx.fillStyle = color;
  ctx.fillText(label, dimMx, dimMy);

  if (selected) {
    for (const p of [s1, s2]) {
      ctx.fillStyle = '#3b82f6'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
}

export function drawAnnotations(cs: CanvasState, floor: Floor, selectedAnnotationId: string | null, dimSettings: ProjectSettings): void {
  if (!floor.annotations) return;
  for (const a of floor.annotations) {
    drawAnnotation(cs, a, a.id === selectedAnnotationId, dimSettings);
  }
}

// ── Rooms ────────────────────────────────────────────────────────────

