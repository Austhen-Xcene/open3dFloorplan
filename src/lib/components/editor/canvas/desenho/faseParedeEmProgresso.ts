/**
 * Fase 4 do quadro: retorno visual do desenho de parede em andamento.
 */
import type { Wall } from '$lib/models/types';
import { formatLength } from '$lib/stores/settings';
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { DepsDesenho, Quadro } from './tipos';
import type { Adaptadores } from './adaptadores';
import type { Previas } from './previas';
import type { Medicoes } from './medicoes';

export function criarFaseParedeEmProgresso(ui: EstadoCanvas, deps: DepsDesenho, ad: Adaptadores, pr: Previas, md: Medicoes) {
  const { getCS, getMultiSelectBBox, worldToScreen, snapWallEndPoint, typedWallLengthCm, applyTypedWallLength } = deps;
  const { drawRooms, drawWall, drawWallJoints, drawSnapPoints, drawDoorOnWall, drawWindowOnWall,
    drawDoorDistanceDimensions, drawWindowDistanceDimensions, drawFurniture, drawStair, drawColumn,
    drawPersistedMeasurements, drawAnnotations, drawTextAnnotations, wallLength, wallPointAt,
    wallTangentAt, wallThicknessScreen } = ad;

  function desenharParedeEmProgresso(q: Quadro) {
    const floor = q.floor; const selId = q.selId; const multiIds = q.multiIds;
    // Wall in progress — draw close indicator at first point
    if (ui.wallSequenceFirst && ui.wallStart && ui.currentTool === 'wall' && (ui.wallStart.x !== ui.wallSequenceFirst.x || ui.wallStart.y !== ui.wallSequenceFirst.y)) {
      const fp = worldToScreen(ui.wallSequenceFirst.x, ui.wallSequenceFirst.y);
      const distToFirst = Math.hypot(ui.mousePos.x - ui.wallSequenceFirst.x, ui.mousePos.y - ui.wallSequenceFirst.y);
      const isNear = distToFirst < 20;
      ui.ctx.beginPath();
      ui.ctx.arc(fp.x, fp.y, isNear ? 8 : 5, 0, Math.PI * 2);
      ui.ctx.strokeStyle = isNear ? '#3b82f6' : '#64748b';
      ui.ctx.lineWidth = isNear ? 2.5 : 1.5;
      ui.ctx.stroke();
      if (isNear) {
        ui.ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
        ui.ctx.fill();
      }
    }
    if (ui.wallStart && ui.currentTool === 'wall') {
      md.drawAngleGuides(ui.wallStart);
      const endPt = applyTypedWallLength(snapWallEndPoint(ui.mousePos));
      const s = worldToScreen(ui.wallStart.x, ui.wallStart.y);
      const e = worldToScreen(endPt.x, endPt.y);
      const dx = e.x - s.x, dy = e.y - s.y;
      const len = Math.hypot(dx, dy);
      if (len > 1) {
        const thickness = Math.max(20 * ui.zoom, 4);
        const nx = (-dy / len) * thickness / 2;
        const ny = (dx / len) * thickness / 2;
        ui.ctx.fillStyle = '#3b82f620';
        ui.ctx.strokeStyle = '#3b82f6';
        ui.ctx.lineWidth = 1;
        ui.ctx.setLineDash([6, 4]);
        ui.ctx.beginPath();
        ui.ctx.moveTo(s.x + nx, s.y + ny); ui.ctx.lineTo(e.x + nx, e.y + ny);
        ui.ctx.lineTo(e.x - nx, e.y - ny); ui.ctx.lineTo(s.x - nx, s.y - ny);
        ui.ctx.closePath(); ui.ctx.fill(); ui.ctx.stroke();
        ui.ctx.setLineDash([]);
      }

      // Dimension label on the wall preview (pill style)
      const plen = Math.hypot(endPt.x - ui.wallStart.x, endPt.y - ui.wallStart.y);
      const angle = Math.atan2(endPt.y - ui.wallStart.y, endPt.x - ui.wallStart.x) * 180 / Math.PI;
      const displayAngle = ((angle % 360) + 360) % 360;
      const dimMidX = (s.x + e.x) / 2;
      const dimMidY = (s.y + e.y) / 2;
      const typedActive = typedWallLengthCm() !== null;
      const dimText = typedActive
        ? `${formatLength(plen, ui.dimSettings.units)} ⏎`
        : formatLength(plen, ui.dimSettings.units);
      const angleText = ui.shiftDown ? `${Math.round(displayAngle)}° ⇧` : `${Math.round(displayAngle)}°`;

      // Dimension pill (on the wall) — amber while an exact length is being typed
      ui.ctx.font = 'bold 11px system-ui, sans-serif';
      const dimTW = ui.ctx.measureText(dimText).width;
      const dimPW = dimTW + 12;
      const dimPH = 18;
      ui.ctx.fillStyle = typedActive ? '#b45309' : '#1e293b';
      ui.ctx.beginPath();
      ui.ctx.roundRect(dimMidX - dimPW / 2, dimMidY - dimPH / 2 - 12, dimPW, dimPH, dimPH / 2);
      ui.ctx.fill();
      ui.ctx.fillStyle = '#ffffff';
      ui.ctx.textAlign = 'center';
      ui.ctx.textBaseline = 'middle';
      ui.ctx.fillText(dimText, dimMidX, dimMidY - 12);

      // Angle indicator near cursor
      const angleTW = ui.ctx.measureText(angleText).width;
      const anglePW = angleTW + 12;
      const anglePH = 18;
      const angleX = e.x + 20;
      const angleY = e.y - 20;
      ui.ctx.fillStyle = ui.shiftDown ? '#7c3aed' : '#3b82f6';
      ui.ctx.beginPath();
      ui.ctx.roundRect(angleX - anglePW / 2, angleY - anglePH / 2, anglePW, anglePH, anglePH / 2);
      ui.ctx.fill();
      ui.ctx.fillStyle = '#ffffff';
      ui.ctx.fillText(angleText, angleX, angleY);

      // Snap indicator — green ring when snapping to existing endpoint
      if ((endPt as any).snappedToEndpoint) {
        ui.ctx.strokeStyle = '#22c55e';
        ui.ctx.lineWidth = 2.5;
        ui.ctx.beginPath();
        ui.ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
        ui.ctx.stroke();
        ui.ctx.fillStyle = '#22c55e40';
        ui.ctx.fill();
      }

      // Wall extension snap indicator — magenta ring + highlight target wall when snapping to wall segment
      if ((endPt as any).snappedToWall && (endPt as any).snappedWallId && ui.currentFloor) {
        // Draw snap point indicator
        ui.ctx.strokeStyle = '#ec4899';
        ui.ctx.lineWidth = 2.5;
        ui.ctx.beginPath();
        ui.ctx.arc(e.x, e.y, 8, 0, Math.PI * 2);
        ui.ctx.stroke();
        ui.ctx.fillStyle = '#ec489940';
        ui.ctx.fill();
        // Draw crosshair at snap point
        ui.ctx.strokeStyle = '#ec4899';
        ui.ctx.lineWidth = 1;
        ui.ctx.beginPath();
        ui.ctx.moveTo(e.x - 12, e.y); ui.ctx.lineTo(e.x + 12, e.y);
        ui.ctx.moveTo(e.x, e.y - 12); ui.ctx.lineTo(e.x, e.y + 12);
        ui.ctx.stroke();
        // Highlight the target wall
        const targetWall = ui.currentFloor.walls.find(w => w.id === (endPt as any).snappedWallId);
        if (targetWall) {
          const tw1 = worldToScreen(targetWall.start.x, targetWall.start.y);
          const tw2 = worldToScreen(targetWall.end.x, targetWall.end.y);
          ui.ctx.strokeStyle = '#ec4899';
          ui.ctx.lineWidth = 2;
          ui.ctx.setLineDash([6, 3]);
          ui.ctx.beginPath();
          ui.ctx.moveTo(tw1.x, tw1.y);
          ui.ctx.lineTo(tw2.x, tw2.y);
          ui.ctx.stroke();
          ui.ctx.setLineDash([]);
        }
        // "Extend to wall" tooltip
        ui.ctx.font = 'bold 10px system-ui, sans-serif';
        const extText = 'Snap to wall';
        const extTW = ui.ctx.measureText(extText).width;
        ui.ctx.fillStyle = '#ec4899';
        ui.ctx.beginPath();
        ui.ctx.roundRect(e.x - extTW / 2 - 6, e.y + 14, extTW + 12, 16, 8);
        ui.ctx.fill();
        ui.ctx.fillStyle = '#ffffff';
        ui.ctx.textAlign = 'center';
        ui.ctx.textBaseline = 'middle';
        ui.ctx.fillText(extText, e.x, e.y + 22);
      }
    }

  }
  return { desenharParedeEmProgresso };
}
