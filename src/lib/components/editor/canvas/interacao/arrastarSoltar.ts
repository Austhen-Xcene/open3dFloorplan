/**
 * Arrastar e soltar do painel lateral para a planta.
 */
import type { Wall, Door, Window as Win } from '$lib/models/types';
import { roomPresets, placePreset } from '$lib/utils/ambientes';
import { selectedTool, selectedElementId, addDoor, addWindow, addFurniture, placingFurnitureId } from '$lib/stores/project';
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { Nucleo } from '../nucleo';
import type { Desenho } from '../desenho';
import type { Localizadores } from './localizar';

export function criarArrastarSoltar(ui: EstadoCanvas, n: Nucleo, d: Desenho, loc: Localizadores) {
  const { markDirty, getCS, snap, screenToWorld, worldToScreen, magneticSnap, angleSnap,
    findConnectedEndpoints, findOwnedConnectedEndpoints, getMultiSelectBBox,
    snapFurnitureToWall, snapWallEndPoint, typedWallLengthCm, applyTypedWallLength,
    GRID, SNAP, MAGNETIC_SNAP, WALL_SNAP_DIST } = n;
  const { draw, scheduleDraw, updateDetectedRooms, drawMinimap, getWorldBBox,
    wallPointAt, hitTestMeasurement, hitTestAnnotation, hitTestTextAnnotation } = d;

  const { findWallAt, findHandleAt, findFurnitureAt, findColumnAt, findStairAt,
    findDoorAt, findWindowAt, findRoomLabelAt, findRoomAt, startRoomDrag, rotateSelectedRoom } = loc;

  function onDragOver(e: DragEvent) {
    if (e.dataTransfer?.types.includes('application/o3d-type')) {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy';
      const rect = ui.canvas.getBoundingClientRect();
      const wp = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
      const itemType = e.dataTransfer?.types.includes('application/o3d-type') ? 'item' : '';
      // Default preview size (furniture ~60x60cm, room ~400x300cm)
      const isRoom = e.dataTransfer?.types.includes('application/o3d-type');
      ui.dragPreview = { x: wp.x, y: wp.y, type: itemType, width: 60, depth: 60 };
    }
  }

  function onDragLeave(e: DragEvent) {
    ui.dragPreview = null;
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    ui.dragPreview = null;
    const itemType = e.dataTransfer?.getData('application/o3d-type');
    const itemId = e.dataTransfer?.getData('application/o3d-id');
    if (!itemType || !itemId) return;

    const rect = ui.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const wp = screenToWorld(sx, sy);
    const pos = { x: snap(wp.x), y: snap(wp.y) };

    if (itemType === 'furniture') {
      const id = addFurniture(itemId, pos);
      selectedElementId.set(id);
      selectedTool.set('select');
      placingFurnitureId.set(null);
    } else if (itemType === 'door') {
      // Find nearest wall to drop point and add door there
      const floor = ui.currentFloor;
      if (floor) {
        let bestWall: Wall | null = null;
        let bestDist = Infinity;
        let bestT = 0.5;
        for (const w of floor.walls) {
          const dx = w.end.x - w.start.x;
          const dy = w.end.y - w.start.y;
          const lenSq = dx * dx + dy * dy;
          if (lenSq < 1) continue;
          const t = Math.max(0.05, Math.min(0.95, ((wp.x - w.start.x) * dx + (wp.y - w.start.y) * dy) / lenSq));
          const px = w.start.x + t * dx;
          const py = w.start.y + t * dy;
          const dist = Math.hypot(wp.x - px, wp.y - py);
          if (dist < bestDist) { bestDist = dist; bestWall = w; bestT = t; }
        }
        if (bestWall && bestDist < 100) {
          const id = addDoor(bestWall.id, bestT, itemId as Door['type']);
          selectedElementId.set(id);
          selectedTool.set('select');
        }
      }
    } else if (itemType === 'window') {
      const floor = ui.currentFloor;
      if (floor) {
        let bestWall: Wall | null = null;
        let bestDist = Infinity;
        let bestT = 0.5;
        for (const w of floor.walls) {
          const dx = w.end.x - w.start.x;
          const dy = w.end.y - w.start.y;
          const lenSq = dx * dx + dy * dy;
          if (lenSq < 1) continue;
          const t = Math.max(0.05, Math.min(0.95, ((wp.x - w.start.x) * dx + (wp.y - w.start.y) * dy) / lenSq));
          const px = w.start.x + t * dx;
          const py = w.start.y + t * dy;
          const dist = Math.hypot(wp.x - px, wp.y - py);
          if (dist < bestDist) { bestDist = dist; bestWall = w; bestT = t; }
        }
        if (bestWall && bestDist < 100) {
          const id = addWindow(bestWall.id, bestT, itemId as Win['type']);
          selectedElementId.set(id);
          selectedTool.set('select');
        }
      }
    } else if (itemType === 'room') {
      const preset = roomPresets.find(p => p.id === itemId);
      if (preset) {
        placePreset(preset, pos);
        selectedTool.set('select');
      }
    }
  }

  return { onDragOver, onDragLeave, onDrop };
}
