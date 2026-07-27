/**
 * Medição em curso, pré-visualização de cota e guias de ângulo do desenho de parede.
 */
import type { Point } from '$lib/models/types';
import { formatLength } from '$lib/stores/settings';
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { DepsDesenho } from './tipos';

export function criarMedicoes(ui: EstadoCanvas, deps: DepsDesenho) {
  const { markDirty, getCS, getMultiSelectBBox, snapFurnitureToWall, worldToScreen, snapWallEndPoint, typedWallLengthCm, applyTypedWallLength } = deps;

  function drawMeasurement() {
    if (!ui.measureStart) return;
    const end = ui.measureEnd ?? ui.mousePos;
    const s = worldToScreen(ui.measureStart.x, ui.measureStart.y);
    const e = worldToScreen(end.x, end.y);
    ui.ctx.strokeStyle = '#ef4444';
    ui.ctx.lineWidth = 1.5;
    ui.ctx.setLineDash([6, 3]);
    ui.ctx.beginPath(); ui.ctx.moveTo(s.x, s.y); ui.ctx.lineTo(e.x, e.y); ui.ctx.stroke();
    ui.ctx.setLineDash([]);

    for (const p of [s, e]) {
      ui.ctx.fillStyle = '#ef4444';
      ui.ctx.beginPath(); ui.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ui.ctx.fill();
    }

    const dist = Math.hypot(end.x - ui.measureStart.x, end.y - ui.measureStart.y);
    const mx = (s.x + e.x) / 2;
    const my = (s.y + e.y) / 2;
    ui.ctx.fillStyle = '#ef4444';
    ui.ctx.font = 'bold 12px sans-serif';
    ui.ctx.textAlign = 'center';
    ui.ctx.textBaseline = 'bottom';
    ui.ctx.fillText(formatLength(dist, ui.dimSettings.units), mx, my - 6);
  }

  function drawAnnotationPreview() {
    if (!ui.annotationStart) return;
    const end = ui.mousePos;
    const offset = 40;
    const dx = end.x - ui.annotationStart.x, dy = end.y - ui.annotationStart.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;

    const ux = dx / len, uy = dy / len;
    const nx = -uy, ny = ux;

    const d1x = ui.annotationStart.x + nx * offset, d1y = ui.annotationStart.y + ny * offset;
    const d2x = end.x + nx * offset, d2y = end.y + ny * offset;

    const s1 = worldToScreen(ui.annotationStart.x, ui.annotationStart.y);
    const s2 = worldToScreen(end.x, end.y);
    const sd1 = worldToScreen(d1x, d1y);
    const sd2 = worldToScreen(d2x, d2y);

    const color = '#6366f180';

    ui.ctx.strokeStyle = color;
    ui.ctx.lineWidth = 0.75;
    ui.ctx.beginPath();
    ui.ctx.moveTo(s1.x, s1.y);
    ui.ctx.lineTo(sd1.x, sd1.y);
    ui.ctx.moveTo(s2.x, s2.y);
    ui.ctx.lineTo(sd2.x, sd2.y);
    ui.ctx.stroke();

    ui.ctx.strokeStyle = color;
    ui.ctx.lineWidth = 1;
    ui.ctx.beginPath();
    ui.ctx.moveTo(sd1.x, sd1.y);
    ui.ctx.lineTo(sd2.x, sd2.y);
    ui.ctx.stroke();

    const dist = Math.hypot(end.x - ui.annotationStart.x, end.y - ui.annotationStart.y);
    const dimMx = (sd1.x + sd2.x) / 2;
    const dimMy = (sd1.y + sd2.y) / 2;
    ui.ctx.fillStyle = '#6366f1';
    const fontSize = Math.max(10, 11 * ui.zoom);
    ui.ctx.font = `${fontSize}px sans-serif`;
    ui.ctx.textAlign = 'center';
    ui.ctx.textBaseline = 'middle';
    ui.ctx.fillText(formatLength(dist, ui.dimSettings.units), dimMx, dimMy - 8);

    for (const p of [s1, s2]) {
      ui.ctx.fillStyle = '#6366f1';
      ui.ctx.beginPath();
      ui.ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ui.ctx.fill();
    }
  }

  function drawAngleGuides(start: Point) {
    const s = worldToScreen(start.x, start.y);
    ui.ctx.strokeStyle = '#3b82f640';
    ui.ctx.lineWidth = 1;
    ui.ctx.setLineDash([4, 4]);
    const guideLen = 200;
    const angles = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -3 * Math.PI / 4, -Math.PI / 2, -Math.PI / 4];
    for (const a of angles) {
      ui.ctx.beginPath(); ui.ctx.moveTo(s.x, s.y);
      ui.ctx.lineTo(s.x + guideLen * Math.cos(a), s.y + guideLen * Math.sin(a));
      ui.ctx.stroke();
    }
    ui.ctx.setLineDash([]);
  }

  return { drawMeasurement, drawAnnotationPreview, drawAngleGuides };
}

export type Medicoes = ReturnType<typeof criarMedicoes>;
