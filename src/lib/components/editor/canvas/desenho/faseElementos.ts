/**
 * Fase 3 do quadro: indicador de encaixe, escadas, colunas, prévias de colocação e calibragem.
 */
import type { Wall, Door, Stair, Column } from '$lib/models/types';
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { DepsDesenho, Quadro } from './tipos';
import { selecionado } from './tipos';
import type { Adaptadores } from './adaptadores';
import type { Previas } from './previas';
import type { Medicoes } from './medicoes';

export function criarFaseElementos(ui: EstadoCanvas, deps: DepsDesenho, ad: Adaptadores, pr: Previas, md: Medicoes) {
  const { getCS, getMultiSelectBBox, worldToScreen, snapWallEndPoint, typedWallLengthCm, applyTypedWallLength } = deps;
  const { drawRooms, drawWall, drawWallJoints, drawSnapPoints, drawDoorOnWall, drawWindowOnWall,
    drawDoorDistanceDimensions, drawWindowDistanceDimensions, drawFurniture, drawStair, drawColumn,
    drawPersistedMeasurements, drawAnnotations, drawTextAnnotations, wallLength, wallPointAt,
    wallTangentAt, wallThicknessScreen } = ad;

  function desenharElementos(q: Quadro) {
    const floor = q.floor; const selId = q.selId; const multiIds = q.multiIds;
    const isSelected = (id: string) => selecionado(q, id);
    // Wall snap indicator — highlight the target wall
    if (ui.wallSnapInfo && ui.currentFloor) {
      const snapWall = ui.currentFloor.walls.find(w => w.id === ui.wallSnapInfo!.wallId);
      if (snapWall) {
        const s = worldToScreen(snapWall.start.x, snapWall.start.y);
        const e = worldToScreen(snapWall.end.x, snapWall.end.y);
        ui.ctx.strokeStyle = '#3b82f6';
        ui.ctx.lineWidth = 2;
        ui.ctx.setLineDash([6, 3]);
        ui.ctx.beginPath();
        ui.ctx.moveTo(s.x, s.y);
        ui.ctx.lineTo(e.x, e.y);
        ui.ctx.stroke();
        ui.ctx.setLineDash([]);
      }
    }

    // Stairs
    if (ui.showStairs && floor.stairs) {
      for (const stair of floor.stairs) {
        drawStair(stair, isSelected(stair.id));
      }
    }

    // Columns
    if (ui.layerVis.columns && floor.columns) {
      for (const col of floor.columns) {
        drawColumn(col, isSelected(col.id));
      }
    }

    // Column placement preview
    if (ui.isPlacingColumn) {
      ui.ctx.save();
      ui.ctx.globalAlpha = 0.5;
      const preview: Column = { id: 'preview', position: ui.mousePos, rotation: 0, shape: ui.placingColShape, diameter: 30, height: 280, color: '#cccccc' };
      drawColumn(preview, false);
      ui.ctx.restore();
    }

    // Stair placement preview
    if (ui.isPlacingStair) {
      ui.ctx.save();
      ui.ctx.globalAlpha = 0.5;
      const preview: Stair = { id: 'preview', position: ui.mousePos, rotation: 0, width: 100, depth: 300, riserCount: 14, direction: 'up', stairType: 'straight' };
      drawStair(preview, false);
      ui.ctx.restore();
    }

    // Calibration points
    if (ui.isCalibrating && ui.calPoints.length > 0) {
      ui.ctx.fillStyle = '#ef4444';
      for (const pt of ui.calPoints) {
        const sp = worldToScreen(pt.x, pt.y);
        ui.ctx.beginPath();
        ui.ctx.arc(sp.x, sp.y, 6, 0, Math.PI * 2);
        ui.ctx.fill();
      }
      if (ui.calPoints.length === 2) {
        const sp1 = worldToScreen(ui.calPoints[0].x, ui.calPoints[0].y);
        const sp2 = worldToScreen(ui.calPoints[1].x, ui.calPoints[1].y);
        ui.ctx.strokeStyle = '#ef4444';
        ui.ctx.lineWidth = 2;
        ui.ctx.setLineDash([6, 4]);
        ui.ctx.beginPath();
        ui.ctx.moveTo(sp1.x, sp1.y);
        ui.ctx.lineTo(sp2.x, sp2.y);
        ui.ctx.stroke();
        ui.ctx.setLineDash([]);
      }
    }

    // Furniture placement preview
    if (ui.currentPlacingId && ui.currentTool === 'furniture') pr.drawFurniturePreview();

    // Door/window placement preview
    if (ui.placementPreview) pr.drawPlacementPreview();

  }
  return { desenharElementos };
}
