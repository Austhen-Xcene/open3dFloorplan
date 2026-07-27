/**
 * Fase 5 do quadro: marquee, caixa da seleção múltipla, medições, cotas, textos e fantasma de arrasto.
 */
import type { Annotation } from '$lib/models/types';
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { DepsDesenho, Quadro } from './tipos';
import type { Adaptadores } from './adaptadores';
import type { Previas } from './previas';
import type { Medicoes } from './medicoes';

export function criarFaseSelecao(ui: EstadoCanvas, deps: DepsDesenho, ad: Adaptadores, pr: Previas, md: Medicoes) {
  const { getCS, getMultiSelectBBox, worldToScreen, snapWallEndPoint, typedWallLengthCm, applyTypedWallLength } = deps;
  const { drawRooms, drawWall, drawWallJoints, drawSnapPoints, drawDoorOnWall, drawWindowOnWall,
    drawDoorDistanceDimensions, drawWindowDistanceDimensions, drawFurniture, drawStair, drawColumn,
    drawPersistedMeasurements, drawAnnotations, drawTextAnnotations, wallLength, wallPointAt,
    wallTangentAt, wallThicknessScreen } = ad;

  function desenharSelecaoEAnotacoes(q: Quadro) {
    const floor = q.floor; const selId = q.selId; const multiIds = q.multiIds;
    // Marquee selection rectangle
    if (ui.marqueeStart && ui.marqueeEnd) {
      const s = worldToScreen(ui.marqueeStart.x, ui.marqueeStart.y);
      const e = worldToScreen(ui.marqueeEnd.x, ui.marqueeEnd.y);
      const rx = Math.min(s.x, e.x), ry = Math.min(s.y, e.y);
      const rw = Math.abs(e.x - s.x), rh = Math.abs(e.y - s.y);
      if (rw > 2 || rh > 2) {
        ui.ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
        ui.ctx.fillRect(rx, ry, rw, rh);
        ui.ctx.strokeStyle = '#3b82f6';
        ui.ctx.lineWidth = 1;
        ui.ctx.setLineDash([4, 3]);
        ui.ctx.strokeRect(rx, ry, rw, rh);
        ui.ctx.setLineDash([]);
      }
    }

    // Multi-select bounding box
    {
      const bbox = getMultiSelectBBox();
      if (bbox) {
        const s1 = worldToScreen(bbox.minX, bbox.minY);
        const s2 = worldToScreen(bbox.maxX, bbox.maxY);
        ui.ctx.strokeStyle = '#8b5cf6';
        ui.ctx.lineWidth = 1.5;
        ui.ctx.setLineDash([6, 4]);
        ui.ctx.strokeRect(s1.x, s1.y, s2.x - s1.x, s2.y - s1.y);
        ui.ctx.setLineDash([]);
        // Light fill
        ui.ctx.fillStyle = 'rgba(139, 92, 246, 0.08)';
        ui.ctx.fillRect(s1.x, s1.y, s2.x - s1.x, s2.y - s1.y);

        // Move icon in center — 4-arrow crosshair
        const cx = (s1.x + s2.x) / 2, cy = (s1.y + s2.y) / 2;
        const r = 18; // arm length
        const ah = 6;  // arrowhead size
        ui.ctx.save();
        // Background circle
        ui.ctx.beginPath();
        ui.ctx.arc(cx, cy, r + 8, 0, Math.PI * 2);
        ui.ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ui.ctx.fill();
        ui.ctx.strokeStyle = '#8b5cf6';
        ui.ctx.lineWidth = 1.5;
        ui.ctx.stroke();
        // Draw 4 arrows
        ui.ctx.strokeStyle = '#8b5cf6';
        ui.ctx.fillStyle = '#8b5cf6';
        ui.ctx.lineWidth = 2;
        for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
          // Line
          ui.ctx.beginPath();
          ui.ctx.moveTo(cx, cy);
          ui.ctx.lineTo(cx + dx * r, cy + dy * r);
          ui.ctx.stroke();
          // Arrowhead
          ui.ctx.beginPath();
          ui.ctx.moveTo(cx + dx * r, cy + dy * r);
          if (dx !== 0) {
            ui.ctx.lineTo(cx + dx * (r - ah), cy - ah);
            ui.ctx.lineTo(cx + dx * (r - ah), cy + ah);
          } else {
            ui.ctx.lineTo(cx - ah, cy + dy * (r - ah));
            ui.ctx.lineTo(cx + ah, cy + dy * (r - ah));
          }
          ui.ctx.closePath();
          ui.ctx.fill();
        }
        ui.ctx.restore();
      }
    }

    // Persisted measurements
    if (ui.layerVis.measurements && floor) drawPersistedMeasurements(floor);
    // Active measurement
    if (ui.measureStart && ui.measuring) md.drawMeasurement();
    // Annotations
    if (ui.layerVis.annotations && floor) drawAnnotations(floor);
    // Annotation preview
    if (ui.annotating && ui.annotationStart) md.drawAnnotationPreview();
    // Text annotations
    if (floor) drawTextAnnotations(floor);

    // Rotation angle tooltip while dragging rotation handle
    if (ui.draggingHandle === 'rotate' && ui.currentSelectedId && ui.currentFloor) {
      const fi = ui.currentFloor.furniture.find(f => f.id === ui.currentSelectedId);
      if (fi) {
        const sp = worldToScreen(fi.position.x, fi.position.y);
        const rotAngle = Math.round(fi.rotation);
        const label = `${rotAngle}°`;
        const fontSize = 13;
        ui.ctx.font = `bold ${fontSize}px sans-serif`;
        ui.ctx.textAlign = 'center';
        ui.ctx.textBaseline = 'middle';
        const tw = ui.ctx.measureText(label).width;
        const pw = tw + 14;
        const ph = fontSize + 10;
        const tx = sp.x;
        const ty = sp.y - 50;
        ui.ctx.fillStyle = '#1e293b';
        ui.ctx.beginPath();
        ui.ctx.roundRect(tx - pw / 2, ty - ph / 2, pw, ph, 4);
        ui.ctx.fill();
        ui.ctx.fillStyle = '#ffffff';
        ui.ctx.fillText(label, tx, ty);
      }
    }

    // Drag preview ghost
    if (ui.dragPreview) {
      const dp = ui.dragPreview;
      const s = worldToScreen(dp.x - dp.width / 2, dp.y - dp.depth / 2);
      const e2 = worldToScreen(dp.x + dp.width / 2, dp.y + dp.depth / 2);
      ui.ctx.save();
      ui.ctx.globalAlpha = 0.3;
      ui.ctx.fillStyle = '#3b82f6';
      ui.ctx.fillRect(s.x, s.y, e2.x - s.x, e2.y - s.y);
      ui.ctx.strokeStyle = '#3b82f6';
      ui.ctx.lineWidth = 1.5;
      ui.ctx.setLineDash([4, 4]);
      ui.ctx.strokeRect(s.x, s.y, e2.x - s.x, e2.y - s.y);
      ui.ctx.setLineDash([]);
      ui.ctx.restore();
    }

  }
  return { desenharSelecaoEAnotacoes };
}
