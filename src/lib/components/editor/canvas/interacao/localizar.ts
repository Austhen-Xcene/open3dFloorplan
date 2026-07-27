/**
 * Descobre o que está sob o ponteiro e inicia o arrasto de ambiente.
 */
import type { Point, Wall, Door, Window as Win, FurnitureItem, Stair, Column } from '$lib/models/types';
import type { Room } from '$lib/models/types';
import { getRoomPolygon, roomCentroid } from '$lib/utils/roomDetection';
import { pointInPolygon, positionOnWall, findWallAt as _findWallAt, findHandleAt as _findHandleAt, findFurnitureAt as _findFurnitureAt, findColumnAt as _findColumnAt, findStairAt as _findStairAt, findDoorAt as _findDoorAt, findWindowAt as _findWindowAt, findRoomAt as _findRoomAt } from '$lib/utils/hitTesting';
import { selectedElementId, selectedElementIds, selectedRoomId, rotateRoom90, detectedRoomsStore, updateRoom } from '$lib/stores/project';
import type { EstadoCanvas, HandleType } from '../estadoCanvas.svelte';
import type { Nucleo } from '../nucleo';
import type { Desenho } from '../desenho';

export function criarLocalizadores(ui: EstadoCanvas, n: Nucleo, d: Desenho) {
  const { markDirty, getCS, snap, screenToWorld, worldToScreen, magneticSnap, angleSnap,
    findConnectedEndpoints, findOwnedConnectedEndpoints, getMultiSelectBBox,
    snapFurnitureToWall, snapWallEndPoint, typedWallLengthCm, applyTypedWallLength,
    GRID, SNAP, MAGNETIC_SNAP, WALL_SNAP_DIST } = n;
  const { draw, scheduleDraw, updateDetectedRooms, drawMinimap, getWorldBBox,
    wallPointAt, hitTestMeasurement, hitTestAnnotation, hitTestTextAnnotation } = d;

  function findWallAt(p: Point): Wall | null {
    if (!ui.currentFloor) return null;
    return _findWallAt(p, ui.currentFloor.walls, ui.zoom);
  }

  function findHandleAt(p: Point): HandleType | null {
    if (!ui.currentFloor) return null;
    return _findHandleAt(p, ui.currentSelectedId, ui.currentFloor.furniture, ui.zoom);
  }

  function findFurnitureAt(p: Point): FurnitureItem | null {
    if (!ui.currentFloor) return null;
    return _findFurnitureAt(p, ui.currentFloor.furniture);
  }

  function findColumnAt(p: Point): Column | null {
    if (!ui.currentFloor) return null;
    return _findColumnAt(p, ui.currentFloor.columns);
  }

  function findStairAt(p: Point): Stair | null {
    if (!ui.currentFloor) return null;
    return _findStairAt(p, ui.currentFloor.stairs);
  }

  function findDoorAt(p: Point): Door | null {
    if (!ui.currentFloor) return null;
    return _findDoorAt(p, ui.currentFloor.doors, ui.currentFloor.walls, ui.zoom);
  }

  function findWindowAt(p: Point): Win | null {
    if (!ui.currentFloor) return null;
    return _findWindowAt(p, ui.currentFloor.windows, ui.currentFloor.walls, ui.zoom);
  }

  function findRoomLabelAt(p: Point): Room | null {
    if (!ui.currentFloor || !ui.showRoomLabels) return null;
    for (const room of ui.detectedRooms) {
      const poly = getRoomPolygon(room, ui.currentFloor.walls);
      if (poly.length < 3) continue;
      const centroid = roomCentroid(poly);
      const lx = centroid.x + (room.labelOffset?.x ?? 0);
      const ly = centroid.y + (room.labelOffset?.y ?? 0);
      // Check if click is within label area (approx 80x40 world units)
      const hitW = 80 / ui.zoom;
      const hitH = 40 / ui.zoom;
      if (Math.abs(p.x - lx) < hitW && Math.abs(p.y - ly) < hitH) {
        // Check if clicking the reset icon
        if (room.labelOffset && (room.labelOffset.x !== 0 || room.labelOffset.y !== 0)) {
          const resetOffX = 50 / ui.zoom; // approximate reset icon position
          if (p.x > lx + resetOffX * 0.5 && Math.abs(p.y - ly) < 15 / ui.zoom) {
            // Reset label position
            updateRoom(room.id, { labelOffset: undefined });
            detectedRoomsStore.update(rooms => rooms.map(r => r.id === room.id ? { ...r, labelOffset: undefined } : r));
            return null; // consumed click
          }
        }
        return room;
      }
    }
    return null;
  }

  function findRoomAt(p: Point): Room | null {
    if (!ui.currentFloor) return null;
    // Persisted environments own an explicit set of wall IDs. Prefer them so
    // overlapping legacy rooms can still be selected and moved independently.
    const savedRoom = _findRoomAt(p, [...ui.currentFloor.rooms].reverse(), ui.currentFloor.walls);
    if (savedRoom) return savedRoom;
    // Do not let the geometry detector turn gaps or composite faces into
    // selectable rooms when the user is working with saved environments.
    if (ui.currentFloor.rooms.length > 0) return null;
    return _findRoomAt(p, ui.detectedRooms, ui.currentFloor.walls);
  }

  function startRoomDrag(room: Room, pointer: Point) {
    if (!ui.currentFloor) return;
    selectedRoomId.set(room.id);
    selectedElementId.set(null);
    ui.draggingRoomId = room.id;
    ui.roomDragStartMouse = { x: pointer.x, y: pointer.y };
    ui.roomDragStartPositions.clear();
    const savedRoom = ui.currentFloor.rooms.find((item) => item.id === room.id);
    const ownedWallIds = savedRoom?.walls ?? room.walls;
    // A directly clicked room uses the same complete visual selection as a
    // marquee-selected room: all owned walls, bounding box and centre handle.
    selectedElementIds.set(new Set(ownedWallIds));
    for (const wallId of ownedWallIds) {
      const wall = ui.currentFloor.walls.find((item) => item.id === wallId);
      if (wall) {
        ui.roomDragStartPositions.set(wallId, {
          start: { ...wall.start },
          end: { ...wall.end },
        });
      }
    }
  }

  function rotateSelectedRoom() {
    if (!ui.currentSelectedRoomId || !ui.currentFloor) return;
    const room = ui.currentFloor.rooms.find((item) => item.id === ui.currentSelectedRoomId);
    if (!room || !rotateRoom90(room.id)) return;
    selectedElementId.set(null);
    selectedElementIds.set(new Set(room.walls));
    selectedRoomId.set(room.id);
  }

  // pointInPolygon, pointToSegmentDist, positionOnWall imported from hitTesting.ts

  return { findWallAt, findHandleAt, findFurnitureAt, findColumnAt, findStairAt,
    findDoorAt, findWindowAt, findRoomLabelAt, findRoomAt, startRoomDrag, rotateSelectedRoom };
}

export type Localizadores = ReturnType<typeof criarLocalizadores>;
