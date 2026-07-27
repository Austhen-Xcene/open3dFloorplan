/**
 * Modo seleção do mousedown: escolhe o elemento sob o cursor e inicia o arrasto.
 *
 * Extraído de onMouseDown por tamanho — é o ramo `else if (tool === 'select')`.
 */
import type { Point } from '$lib/models/types';
import { selectedElementId, selectedElementIds, selectedRoomId, commitFurnitureMove, findGroupForElement } from '$lib/stores/project';
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { Nucleo } from '../nucleo';
import type { Desenho } from '../desenho';
import type { Localizadores } from './localizar';

export function criarMouseDownSelecao(ui: EstadoCanvas, n: Nucleo, d: Desenho, loc: Localizadores) {
  const { markDirty, getCS, snap, screenToWorld, worldToScreen, magneticSnap, angleSnap,
    findConnectedEndpoints, findOwnedConnectedEndpoints, getMultiSelectBBox,
    snapFurnitureToWall, snapWallEndPoint, typedWallLengthCm, applyTypedWallLength,
    GRID, SNAP, MAGNETIC_SNAP, WALL_SNAP_DIST } = n;
  const { draw, scheduleDraw, updateDetectedRooms, drawMinimap, getWorldBBox,
    wallPointAt, hitTestMeasurement, hitTestAnnotation, hitTestTextAnnotation } = d;
  const { findWallAt, findHandleAt, findFurnitureAt, findColumnAt, findStairAt,
    findDoorAt, findWindowAt, findRoomLabelAt, findRoomAt, startRoomDrag, rotateSelectedRoom } = loc;

  function tratarSelecao(e: MouseEvent, wp: Point) {
      // Multi-select bounding box drag — check FIRST before individual elements
      if (ui.currentSelectedIds.size >= 2 && ui.currentFloor) {
        const bbox = getMultiSelectBBox();
        if (bbox && wp.x >= bbox.minX && wp.x <= bbox.maxX && wp.y >= bbox.minY && wp.y <= bbox.maxY) {
          const origPositions = new Map<string, { start?: Point; end?: Point; position?: Point }>();
          for (const id of ui.currentSelectedIds) {
            const w = ui.currentFloor.walls.find(w => w.id === id);
            if (w) { origPositions.set(id, { start: { ...w.start }, end: { ...w.end } }); continue; }
            const fi = ui.currentFloor.furniture.find(f => f.id === id);
            if (fi) { origPositions.set(id, { position: { ...fi.position } }); continue; }
            if (ui.currentFloor.stairs) { const st = ui.currentFloor.stairs.find(s => s.id === id); if (st) { origPositions.set(id, { position: { ...st.position } }); continue; } }
            if (ui.currentFloor.columns) { const col = ui.currentFloor.columns.find(c => c.id === id); if (col) { origPositions.set(id, { position: { ...col.position } }); continue; } }
          }
          ui.draggingMultiSelect = { startMousePos: { ...wp }, origPositions };
          commitFurnitureMove();
          return;
        }
      }
      // Check wall endpoint handles first (drag-to-resize walls)
      if (ui.currentSelectedId && ui.currentFloor) {
        const selWall = ui.currentFloor.walls.find(w => w.id === ui.currentSelectedId);
        if (selWall) {
          const epThreshold = 15 / ui.zoom;
          if (Math.hypot(wp.x - selWall.start.x, wp.y - selWall.start.y) < epThreshold) {
            ui.draggingWallEndpoint = { wallId: selWall.id, endpoint: 'start' };
            ui.draggingConnectedEndpoints = findOwnedConnectedEndpoints(selWall.start, selWall.id);
            commitFurnitureMove(); // uses same undo snapshot mechanism
            return;
          }
          if (Math.hypot(wp.x - selWall.end.x, wp.y - selWall.end.y) < epThreshold) {
            ui.draggingWallEndpoint = { wallId: selWall.id, endpoint: 'end' };
            ui.draggingConnectedEndpoints = findOwnedConnectedEndpoints(selWall.end, selWall.id);
            commitFurnitureMove();
            return;
          }
          // Check midpoint handle: Alt+drag = curve, normal drag = parallel move
          const curveHandlePt = selWall.curvePoint
            ? selWall.curvePoint
            : { x: (selWall.start.x + selWall.end.x) / 2, y: (selWall.start.y + selWall.end.y) / 2 };
          if (Math.hypot(wp.x - curveHandlePt.x, wp.y - curveHandlePt.y) < epThreshold) {
            if (e.altKey) {
              ui.draggingCurveHandle = selWall.id;
            } else if (!selWall.curvePoint) {
              // Parallel drag for straight walls
              ui.draggingWallParallel = {
                wallId: selWall.id,
                startMousePos: { ...wp },
                origStart: { ...selWall.start },
                origEnd: { ...selWall.end },
                connectedStart: findOwnedConnectedEndpoints(selWall.start, selWall.id),
                connectedEnd: findOwnedConnectedEndpoints(selWall.end, selWall.id),
              };
            } else {
              // For curved walls, midpoint handle still curves
              ui.draggingCurveHandle = selWall.id;
            }
            commitFurnitureMove();
            return;
          }
        }
      }

      // Check selection handles first (resize/rotate on selected furniture)
      const handle = findHandleAt(wp);
      if (handle && ui.currentSelectedId && ui.currentFloor) {
        const fi = ui.currentFloor.furniture.find(f => f.id === ui.currentSelectedId);
        if (fi) {
          ui.draggingHandle = handle;
          ui.handleDragStart = { ...wp };
          ui.handleOrigScale = { x: fi.scale?.x ?? 1, y: fi.scale?.y ?? 1 };
          ui.handleOrigRotation = fi.rotation;
          commitFurnitureMove(); // snapshot for undo
          return;
        }
      }
      // Helper: select an element (shift = add to multi-select)
      function selectElement(id: string, isShift: boolean, isCtrl: boolean = false) {
        if (isShift) {
          selectedElementIds.update(ids => {
            const next = new Set(ids);
            // Also include the current single selection if any
            if (ui.currentSelectedId && ui.currentSelectedId !== id) next.add(ui.currentSelectedId);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
          });
          selectedElementId.set(id);
        } else {
          // Group selection: if element is in a group and not ctrl-clicking, select all group members
          const group = ui.currentFloor ? findGroupForElement(ui.currentFloor, id) : undefined;
          if (group && !isCtrl) {
            selectedElementId.set(id);
            selectedElementIds.set(new Set(group.elementIds));
          } else {
            selectedElementId.set(id);
            selectedElementIds.set(new Set());
          }
        }
        selectedRoomId.set(null);
      }

      // Check doors/windows first (they sit on walls, so check before walls)
      const door = findDoorAt(wp);
      if (door) {
        selectElement(door.id, e.shiftKey);
        if (!e.shiftKey) ui.draggingDoorId = door.id;
        return;
      }
      const win = findWindowAt(wp);
      if (win) {
        selectElement(win.id, e.shiftKey);
        if (!e.shiftKey) ui.draggingWindowId = win.id;
        return;
      }
      // Check columns
      const col = findColumnAt(wp);
      if (col) {
        selectElement(col.id, e.shiftKey);
        if (!e.shiftKey) {
          ui.draggingColumnId = col.id;
          ui.columnDragOffset = { x: wp.x - col.position.x, y: wp.y - col.position.y };
          commitFurnitureMove(); // snapshot before drag for undo
        }
        return;
      }
      // Check stairs
      const stair = findStairAt(wp);
      if (stair) {
        selectElement(stair.id, e.shiftKey);
        if (!e.shiftKey) {
          ui.draggingStairId = stair.id;
          ui.stairDragOffset = { x: wp.x - stair.position.x, y: wp.y - stair.position.y };
          commitFurnitureMove(); // snapshot before drag for undo
        }
        return;
      }
      // Check furniture
      const fi = findFurnitureAt(wp);
      if (fi) {
        selectElement(fi.id, e.shiftKey, e.ctrlKey || e.metaKey);
        if (!e.shiftKey && !fi.locked) {
          ui.draggingFurnitureId = fi.id;
          commitFurnitureMove(); // snapshot before drag for undo
          ui.dragOffset = { x: wp.x - fi.position.x, y: wp.y - fi.position.y };
          ui.dragStartRotation = fi.rotation;
          ui.dragWasWallSnapped = false;
        }
        return;
      }
      // Alt+drag keeps the advanced label-positioning behaviour available.
      // A normal click on the central label selects and moves the room itself.
      if (e.altKey) {
        const labelRoom = findRoomLabelAt(wp);
        if (labelRoom) {
          ui.draggingRoomLabelId = labelRoom.id;
          ui.roomLabelDragStart = { x: wp.x, y: wp.y };
          ui.roomLabelOrigOffset = { x: labelRoom.labelOffset?.x ?? 0, y: labelRoom.labelOffset?.y ?? 0 };
          selectedRoomId.set(labelRoom.id);
          selectedElementId.set(null);
          selectedElementIds.set(new Set());
          return;
        }
      }

      // After checking all placed objects, any free point inside a room selects
      // it immediately. This includes the room name at its centre.
      const room = findRoomAt(wp);
      if (room) {
        startRoomDrag(room, wp);
        return;
      }

      // Walls remain individually selectable when clicking directly on a line.
      const wall = findWallAt(wp);
      if (wall) {
        selectElement(wall.id, e.shiftKey);
        return;
      }

      // Empty space — start marquee selection
      ui.marqueeStart = { ...wp };
      ui.marqueeEnd = { ...wp };
      if (!e.shiftKey) {
        selectedElementId.set(null);
        selectedElementIds.set(new Set());
      }
      selectedRoomId.set(null);
  }

  return { tratarSelecao };
}
