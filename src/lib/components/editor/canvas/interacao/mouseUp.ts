/**
 * Soltar o botão: encerra o arrasto e registra no histórico se houve deslocamento.
 */
import type { Point } from '$lib/models/types';
import type { Room } from '$lib/models/types';
import { getRoomPolygon, roomCentroid } from '$lib/utils/roomDetection';
import { selectedElementId, selectedElementIds, selectedRoomId, resolveRoomOverlap, commitFurnitureMove, detectedRoomsStore, updateRoom } from '$lib/stores/project';
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { Nucleo } from '../nucleo';
import type { Desenho } from '../desenho';
import type { Localizadores } from './localizar';

export function criarMouseUp(ui: EstadoCanvas, n: Nucleo, d: Desenho, loc: Localizadores) {
  const { markDirty, getCS, snap, screenToWorld, worldToScreen, magneticSnap, angleSnap,
    findConnectedEndpoints, findOwnedConnectedEndpoints, getMultiSelectBBox,
    snapFurnitureToWall, snapWallEndPoint, typedWallLengthCm, applyTypedWallLength,
    GRID, SNAP, MAGNETIC_SNAP, WALL_SNAP_DIST } = n;
  const { draw, scheduleDraw, updateDetectedRooms, drawMinimap, getWorldBBox,
    wallPointAt, hitTestMeasurement, hitTestAnnotation, hitTestTextAnnotation } = d;

  const { findWallAt, findHandleAt, findFurnitureAt, findColumnAt, findStairAt,
    findDoorAt, findWindowAt, findRoomLabelAt, findRoomAt, startRoomDrag, rotateSelectedRoom } = loc;

  function onMouseUp(e: MouseEvent) {
    markDirty();
    ui.isPanning = false;
    ui.draggingGuideId = null;

    // Finalize room label drag
    if (ui.draggingRoomLabelId) {
      const dx = ui.mousePos.x - ui.roomLabelDragStart.x;
      const dy = ui.mousePos.y - ui.roomLabelDragStart.y;
      const newOffset = { x: ui.roomLabelOrigOffset.x + dx, y: ui.roomLabelOrigOffset.y + dy };
      updateRoom(ui.draggingRoomLabelId, { labelOffset: newOffset });
      detectedRoomsStore.update(rooms => rooms.map(r => r.id === ui.draggingRoomLabelId ? { ...r, labelOffset: newOffset } : r));
      ui.draggingRoomLabelId = null;
    }

    // Finalize marquee selection
    if (ui.marqueeStart && ui.marqueeEnd && ui.currentFloor) {
      const minX = Math.min(ui.marqueeStart.x, ui.marqueeEnd.x);
      const maxX = Math.max(ui.marqueeStart.x, ui.marqueeEnd.x);
      const minY = Math.min(ui.marqueeStart.y, ui.marqueeEnd.y);
      const maxY = Math.max(ui.marqueeStart.y, ui.marqueeEnd.y);
      const marqueeW = maxX - minX;
      const marqueeH = maxY - minY;

      // Only treat as marquee if dragged at least a small distance
      if (marqueeW > 5 || marqueeH > 5) {
        const ids = new Set<string>(e.shiftKey ? ui.currentSelectedIds : []);

        function ptInRect(p: Point) {
          return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
        }

        // Marquee selection treats a room as one indivisible item. A room is
        // selected by its centre and all of its owned walls are added together.
        // Individual walls are intentionally never selected by the marquee;
        // that remains exclusive to clicking directly on a wall.
        const selectedRooms: Room[] = [];
        const selectableRooms = ui.currentFloor.rooms.length > 0
          ? ui.currentFloor.rooms
          : ui.detectedRooms;
        for (const room of selectableRooms) {
          const polygon = getRoomPolygon(room, ui.currentFloor.walls);
          if (polygon.length < 3 || !ptInRect(roomCentroid(polygon))) continue;
          const savedRoom = ui.currentFloor.rooms.find((item) => item.id === room.id);
          const ownedWallIds = savedRoom?.walls ?? room.walls;
          for (const wallId of ownedWallIds) ids.add(wallId);
          selectedRooms.push(room);
        }
        // Doors/windows: center point inside
        for (const d of ui.currentFloor.doors) {
          const w = ui.currentFloor.walls.find(w => w.id === d.wallId);
          if (w) {
            const cx = w.start.x + (w.end.x - w.start.x) * d.position;
            const cy = w.start.y + (w.end.y - w.start.y) * d.position;
            if (ptInRect({ x: cx, y: cy })) ids.add(d.id);
          }
        }
        for (const win of ui.currentFloor.windows) {
          const w = ui.currentFloor.walls.find(w => w.id === win.wallId);
          if (w) {
            const cx = w.start.x + (w.end.x - w.start.x) * win.position;
            const cy = w.start.y + (w.end.y - w.start.y) * win.position;
            if (ptInRect({ x: cx, y: cy })) ids.add(win.id);
          }
        }
        // Furniture: center inside
        for (const fi of ui.currentFloor.furniture) {
          if (ptInRect(fi.position)) ids.add(fi.id);
        }
        // Stairs: center inside
        if (ui.currentFloor.stairs) {
          for (const st of ui.currentFloor.stairs) {
            if (ptInRect(st.position)) ids.add(st.id);
          }
        }
        // Columns: center inside
        if (ui.currentFloor.columns) {
          for (const col of ui.currentFloor.columns) {
            if (ptInRect(col.position)) ids.add(col.id);
          }
        }

        if (ids.size > 0) {
          selectedElementIds.set(ids);
          if (selectedRooms.length > 0) {
            // Keep room properties visible without presenting one of its walls
            // as the primary selection.
            selectedRoomId.set(selectedRooms[0].id);
            selectedElementId.set(null);
          } else {
            const first = ids.values().next().value;
            if (first) selectedElementId.set(first);
          }
        }
      }
      ui.marqueeStart = null;
      ui.marqueeEnd = null;
    }

    // A room may be dragged directly or through its four-wall multi-selection.
    // Resolve any overlap only when the pointer is released.
    const droppedRoomId = ui.draggingRoomId
      ?? (ui.draggingMultiSelect ? ui.currentSelectedRoomId : null);
    if (droppedRoomId) resolveRoomOverlap(droppedRoomId);

    // Só registra no histórico se o ponteiro andou de verdade. Sem isto, um clique
    // simples num elemento criava uma entrada fantasma e o Ctrl+Z seguinte "não fazia
    // nada" — o usuário precisava desfazer duas vezes.
    if (ui.arrastouDeVerdade) {
      if (ui.draggingFurnitureId) commitFurnitureMove();
      if (ui.draggingHandle) commitFurnitureMove();
      if (ui.draggingWallEndpoint) commitFurnitureMove();
      if (ui.draggingWallParallel) commitFurnitureMove();
      if (ui.draggingCurveHandle) commitFurnitureMove();
      if (ui.draggingMultiSelect) commitFurnitureMove();
      if (ui.draggingRoomId) commitFurnitureMove();
      if (ui.draggingStairId) commitFurnitureMove();
      if (ui.draggingColumnId) commitFurnitureMove();
      if (ui.draggingTextAnnotationId) commitFurnitureMove();
    }
    ui.arrastouDeVerdade = false;
    ui.draggingTextAnnotationId = null;
    ui.draggingRoomId = null;
    ui.roomDragStartPositions.clear();
    ui.draggingMultiSelect = null;
    ui.draggingWallParallel = null;
    ui.draggingCurveHandle = null;
    ui.draggingFurnitureId = null;
    ui.draggingStairId = null;
    ui.draggingColumnId = null;
    ui.draggingDoorId = null;
    ui.draggingWindowId = null;
    ui.draggingHandle = null;
    ui.draggingWallEndpoint = null;
    ui.draggingConnectedEndpoints = [];
    ui.wallSnapInfo = null;
    if (ui.measuring && ui.measureStart && ui.measureEnd) {
      // Keep measurement visible until next click
    }
  }

  return { onMouseUp };
}
