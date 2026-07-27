/**
 * Fase 1 do quadro: ambientes, paredes, portas, janelas e objetos.
 */
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { DepsDesenho, Quadro } from './tipos';
import { selecionado } from './tipos';
import type { Adaptadores } from './adaptadores';
import type { Previas } from './previas';
import type { Medicoes } from './medicoes';

export function criarFaseEstrutura(ui: EstadoCanvas, deps: DepsDesenho, ad: Adaptadores, pr: Previas, md: Medicoes) {
  const { getCS, getMultiSelectBBox, worldToScreen, snapWallEndPoint, typedWallLengthCm, applyTypedWallLength } = deps;
  const { drawRooms, drawWall, drawWallJoints, drawSnapPoints, drawDoorOnWall, drawWindowOnWall,
    drawDoorDistanceDimensions, drawWindowDistanceDimensions, drawFurniture, drawStair, drawColumn,
    drawPersistedMeasurements, drawAnnotations, drawTextAnnotations, wallLength, wallPointAt,
    wallTangentAt, wallThicknessScreen } = ad;

  function desenharEstrutura(q: Quadro) {
    const floor = q.floor; const selId = q.selId; const multiIds = q.multiIds;
    const isSelected = (id: string) => selecionado(q, id);

    drawRooms();
    drawSnapPoints();

    if (ui.layerVis.walls) {
      for (const w of floor.walls) drawWall(w, isSelected(w.id));
      drawWallJoints(floor, selId);
    }

    if (ui.showDoors) {
      for (const d of floor.doors) {
        const wall = floor.walls.find((w) => w.id === d.wallId);
        if (wall) {
          drawDoorOnWall(wall, d);
          if (isSelected(d.id)) {
            // Selection highlight box
            const t = d.position;
            const wpt = wallPointAt(wall, t);
            const sp = worldToScreen(wpt.x, wpt.y);
            const hw = (d.width / 2) * ui.zoom + 4;
            const hh = (wall.thickness / 2) * ui.zoom + 8;
            const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
            ui.ctx.save();
            ui.ctx.translate(sp.x, sp.y);
            ui.ctx.rotate(angle);
            ui.ctx.strokeStyle = '#3b82f6';
            ui.ctx.lineWidth = 1.5;
            ui.ctx.setLineDash([4, 3]);
            ui.ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
            ui.ctx.setLineDash([]);
            ui.ctx.restore();
          }
          if (ui.showDimensions && isSelected(d.id)) drawDoorDistanceDimensions(wall, d);
        }
      }
    }
    if (ui.showWindows) {
      for (const win of floor.windows) {
        const wall = floor.walls.find((w) => w.id === win.wallId);
        if (wall) {
          drawWindowOnWall(wall, win);
          if (isSelected(win.id)) {
            const t = win.position;
            const wpt = wallPointAt(wall, t);
            const sp = worldToScreen(wpt.x, wpt.y);
            const hw = (win.width / 2) * ui.zoom + 4;
            const hh = (wall.thickness / 2) * ui.zoom + 8;
            const angle = Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
            ui.ctx.save();
            ui.ctx.translate(sp.x, sp.y);
            ui.ctx.rotate(angle);
            ui.ctx.strokeStyle = '#3b82f6';
            ui.ctx.lineWidth = 1.5;
            ui.ctx.setLineDash([4, 3]);
            ui.ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
            ui.ctx.setLineDash([]);
            ui.ctx.restore();
          }
          if (ui.showDimensions && isSelected(win.id)) drawWindowDistanceDimensions(wall, win);
        }
      }
    }

    // Furniture
    if (ui.showFurniture) {
      for (const fi of floor.furniture) {
        const selected = isSelected(fi.id);
        if (selected && ui.draggingFurnitureId === fi.id) pr.drawAlignmentGuides(fi);
        drawFurniture(fi, selected);
      }
    }

  }
  return { desenharEstrutura };
}
