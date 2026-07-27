/**
 * Abertura do menu de contexto: descobre o alvo sob o cursor.
 */
import { selectedElementId, selectedRoomId, addMeasurement } from '$lib/stores/project';
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { Nucleo } from '../nucleo';
import type { Desenho } from '../desenho';
import type { Localizadores } from './localizar';

export function criarMenuContexto(ui: EstadoCanvas, n: Nucleo, d: Desenho, loc: Localizadores) {
  const { markDirty, getCS, snap, screenToWorld, worldToScreen, magneticSnap, angleSnap,
    findConnectedEndpoints, findOwnedConnectedEndpoints, getMultiSelectBBox,
    snapFurnitureToWall, snapWallEndPoint, typedWallLengthCm, applyTypedWallLength,
    GRID, SNAP, MAGNETIC_SNAP, WALL_SNAP_DIST } = n;
  const { draw, scheduleDraw, updateDetectedRooms, drawMinimap, getWorldBBox,
    wallPointAt, hitTestMeasurement, hitTestAnnotation, hitTestTextAnnotation } = d;

  const { findWallAt, findHandleAt, findFurnitureAt, findColumnAt, findStairAt,
    findDoorAt, findWindowAt, findRoomLabelAt, findRoomAt, startRoomDrag, rotateSelectedRoom } = loc;

  function onContextMenu(e: MouseEvent) {
    e.preventDefault();

    // If in measurement mode, use old behaviour
    if (ui.measuring) {
      const rect = ui.canvas.getBoundingClientRect();
      const wp = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      if (!ui.measureStart || ui.measureEnd) {
        ui.measureStart = wp;
        ui.measureEnd = null;
      } else {
        ui.measureEnd = wp;
        addMeasurement(ui.measureStart.x, ui.measureStart.y, wp.x, wp.y);
        ui.measureStart = null;
        ui.measureEnd = null;
      }
      return;
    }

    // Show context menu
    const rect = ui.canvas.getBoundingClientRect();
    const wp = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

    // Hit-test in priority order: furniture > door > window > wall > room > canvas
    const fi = findFurnitureAt(wp);
    if (fi) {
      selectedElementId.set(fi.id);
      ui.ctxMenuTargetType = 'furniture';
      ui.ctxMenuTargetId = fi.id;
      ui.ctxMenuFurniture = fi;
      ui.ctxMenuWall = null;
      ui.ctxMenuRoom = null;
    } else {
      const door = findDoorAt(wp);
      if (door) {
        selectedElementId.set(door.id);
        ui.ctxMenuTargetType = 'door';
        ui.ctxMenuTargetId = door.id;
        ui.ctxMenuFurniture = null;
        ui.ctxMenuWall = null;
        ui.ctxMenuRoom = null;
      } else {
        const win = findWindowAt(wp);
        if (win) {
          selectedElementId.set(win.id);
          ui.ctxMenuTargetType = 'window';
          ui.ctxMenuTargetId = win.id;
          ui.ctxMenuFurniture = null;
          ui.ctxMenuWall = null;
          ui.ctxMenuRoom = null;
        } else {
          const wall = findWallAt(wp);
          if (wall) {
            selectedElementId.set(wall.id);
            ui.ctxMenuTargetType = 'wall';
            ui.ctxMenuTargetId = wall.id;
            ui.ctxMenuWall = wall;
            ui.ctxMenuFurniture = null;
            ui.ctxMenuRoom = null;
          } else {
            const room = findRoomAt(wp);
            if (room) {
              selectedRoomId.set(room.id);
              ui.ctxMenuTargetType = 'room';
              ui.ctxMenuTargetId = room.id;
              ui.ctxMenuRoom = room;
              ui.ctxMenuWall = null;
              ui.ctxMenuFurniture = null;
            } else {
              ui.ctxMenuTargetType = 'canvas';
              ui.ctxMenuTargetId = null;
              ui.ctxMenuWall = null;
              ui.ctxMenuFurniture = null;
              ui.ctxMenuRoom = null;
            }
          }
        }
      }
    }

    ui.ctxMenuX = e.clientX;
    ui.ctxMenuY = e.clientY;
    ui.ctxMenuVisible = true;
  }

  return { onContextMenu };
}
