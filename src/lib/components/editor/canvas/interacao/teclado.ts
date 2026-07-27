/**
 * Atalhos de teclado do canvas.
 */
import { handleGlobalShortcut } from '$lib/utils/shortcuts';
import { projectSettings } from '$lib/stores/settings';
import { selectedElementId, selectedElementIds, addWall, rotateFurniture, placingFurnitureId, placingRotation, duplicateDoor, duplicateWindow, duplicateFurniture, removeGuide, beginUndoGroup, endUndoGroup, removeMeasurement, removeAnnotation, removeTextAnnotation, toggleFurnitureLock, createGroup, ungroupElements } from '$lib/stores/project';
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { Nucleo } from '../nucleo';
import type { Desenho } from '../desenho';
import type { Localizadores } from './localizar';
import { criarEnquadramento } from './enquadrar';

export function criarTeclado(ui: EstadoCanvas, n: Nucleo, d: Desenho, loc: Localizadores) {
  const { markDirty, getCS, snap, screenToWorld, worldToScreen, magneticSnap, angleSnap,
    findConnectedEndpoints, findOwnedConnectedEndpoints, getMultiSelectBBox,
    snapFurnitureToWall, snapWallEndPoint, typedWallLengthCm, applyTypedWallLength,
    GRID, SNAP, MAGNETIC_SNAP, WALL_SNAP_DIST } = n;
  const { draw, scheduleDraw, updateDetectedRooms, drawMinimap, getWorldBBox,
    wallPointAt, hitTestMeasurement, hitTestAnnotation, hitTestTextAnnotation } = d;

  const { findWallAt, findHandleAt, findFurnitureAt, findColumnAt, findStairAt,
    findDoorAt, findWindowAt, findRoomLabelAt, findRoomAt, startRoomDrag, rotateSelectedRoom } = loc;
  const { zoomToFit } = criarEnquadramento(ui, n, d);

  function onKeyDown(e: KeyboardEvent) {
    ui.shiftDown = e.shiftKey;
    const keyTarget = e.target as HTMLElement | null;
    const keyTargetTag = keyTarget?.tagName;
    const inFormField = keyTargetTag === 'INPUT' || keyTargetTag === 'TEXTAREA' || keyTargetTag === 'SELECT';
    // Canvas shortcuts must never consume text typed in forms (notably Space for room names).
    if (inFormField || keyTarget?.isContentEditable) return;

    if (e.code === 'Space') { ui.spaceDown = true; e.preventDefault(); return; }

    // Exact-length entry while drawing a wall (issue #6):
    // type a number, then Enter places the wall at exactly that length.
    if (ui.currentTool === 'wall' && ui.wallStart && !ui.editingTextAnnotationId && !inFormField && !e.metaKey && !e.ctrlKey) {
      if (/^[0-9.]$/.test(e.key)) {
        ui.typedWallLength += e.key;
        markDirty();
        e.preventDefault();
        return;
      }
      if (e.key === 'Backspace' && ui.typedWallLength) {
        ui.typedWallLength = ui.typedWallLength.slice(0, -1);
        markDirty();
        e.preventDefault();
        return;
      }
      if (e.key === 'Enter' && typedWallLengthCm() !== null) {
        const endPt = applyTypedWallLength(snapWallEndPoint(ui.mousePos));
        if (Math.hypot(endPt.x - ui.wallStart.x, endPt.y - ui.wallStart.y) > 1) {
          addWall(ui.wallStart, endPt);
          ui.wallStart = endPt;
        }
        ui.typedWallLength = '';
        markDirty();
        e.preventDefault();
        return;
      }
    }

    // Delete selected guide line
    if ((e.key === 'Delete' || e.key === 'Backspace') && ui.selectedGuideId) {
      removeGuide(ui.selectedGuideId);
      ui.selectedGuideId = null;
      e.preventDefault();
      return;
    }

    // Delete selected measurement
    if ((e.key === 'Delete' || e.key === 'Backspace') && ui.selectedMeasurementId) {
      removeMeasurement(ui.selectedMeasurementId);
      ui.selectedMeasurementId = null;
      e.preventDefault();
      return;
    }

    // Delete selected text annotation
    if ((e.key === 'Delete' || e.key === 'Backspace') && ui.selectedTextAnnotationId && !ui.editingTextAnnotationId) {
      removeTextAnnotation(ui.selectedTextAnnotationId);
      ui.selectedTextAnnotationId = null;
      selectedElementId.set(null);
      e.preventDefault();
      return;
    }

    // Delete selected annotation
    if ((e.key === 'Delete' || e.key === 'Backspace') && ui.selectedAnnotationId) {
      removeAnnotation(ui.selectedAnnotationId);
      ui.selectedAnnotationId = null;
      e.preventDefault();
      return;
    }

    // Canvas-specific Escape handling (before global shortcut eats it)
    if (e.code === 'Escape') {
      ui.wallStart = null; ui.wallSequenceFirst = null; ui.typedWallLength = '';
      placingFurnitureId.set(null);
      placingRotation.set(0);
      ui.editingTextAnnotationId = null;
      ui.textAnnotationMode = false;
      ui.measuring = false;
      ui.measureStart = null;
      ui.measureEnd = null;
      ui.annotating = false;
      ui.annotationStart = null;
      ui.marqueeStart = null;
      ui.marqueeEnd = null;
    }

    // Select All (Ctrl+A / Cmd+A)
    if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !e.shiftKey) {
      e.preventDefault();
      if (ui.currentFloor) {
        const allIds = new Set<string>();
        for (const w of ui.currentFloor.walls) allIds.add(w.id);
        for (const f of ui.currentFloor.furniture) allIds.add(f.id);
        for (const d of ui.currentFloor.doors) allIds.add(d.id);
        for (const w of ui.currentFloor.windows) allIds.add(w.id);
        if (ui.currentFloor.stairs) for (const s of ui.currentFloor.stairs) allIds.add(s.id);
        if (ui.currentFloor.columns) for (const c of ui.currentFloor.columns) allIds.add(c.id);
        selectedElementIds.set(allIds);
        const first = [...allIds][0] ?? null;
        selectedElementId.set(first);
      }
      return;
    }

    // Deselect All (Ctrl+D / Cmd+D)
    if ((e.ctrlKey || e.metaKey) && e.key === 'd' && !e.shiftKey) {
      e.preventDefault();
      selectedElementIds.set(new Set());
      selectedElementId.set(null);
      return;
    }

    // Toggle Lock (Ctrl+L / Cmd+L)
    if ((e.ctrlKey || e.metaKey) && e.key === 'l' && !e.shiftKey) {
      e.preventDefault();
      if (ui.currentFloor) {
        const idsToLock = ui.currentSelectedIds.size > 0 ? ui.currentSelectedIds : (ui.currentSelectedId ? new Set([ui.currentSelectedId]) : new Set<string>());
        for (const id of idsToLock) {
          const fi = ui.currentFloor.furniture.find(f => f.id === id);
          if (fi) toggleFurnitureLock(id);
        }
      }
      return;
    }

    // Group (Ctrl+G / Cmd+G)
    if ((e.ctrlKey || e.metaKey) && e.key === 'g' && !e.shiftKey) {
      e.preventDefault();
      if (ui.currentFloor && ui.currentSelectedIds.size >= 2) {
        createGroup([...ui.currentSelectedIds]);
      }
      return;
    }

    // Ungroup (Ctrl+Shift+G / Cmd+Shift+G)
    if ((e.ctrlKey || e.metaKey) && e.key === 'G' && e.shiftKey) {
      e.preventDefault();
      if (ui.currentFloor) {
        const idsToUngroup = ui.currentSelectedIds.size > 0 ? [...ui.currentSelectedIds] : (ui.currentSelectedId ? [ui.currentSelectedId] : []);
        if (idsToUngroup.length > 0) ungroupElements(idsToUngroup);
      }
      return;
    }

    // Copy (Ctrl+C / Cmd+C)
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && !e.shiftKey) {
      if (ui.currentFloor) {
        const items: Array<{ type: 'furniture' | 'door' | 'window'; data: any }> = [];
        const idsToCheck = ui.currentSelectedIds.size > 0 ? ui.currentSelectedIds : (ui.currentSelectedId ? new Set([ui.currentSelectedId]) : new Set<string>());
        for (const id of idsToCheck) {
          const fi = ui.currentFloor.furniture.find(f => f.id === id);
          if (fi) { items.push({ type: 'furniture', data: { ...fi } }); continue; }
          const door = ui.currentFloor.doors.find(d => d.id === id);
          if (door) { items.push({ type: 'door', data: { ...door } }); continue; }
          const win = ui.currentFloor.windows.find(w => w.id === id);
          if (win) { items.push({ type: 'window', data: { ...win } }); continue; }
        }
        if (items.length > 0) {
          ui.clipboard = { items };
          e.preventDefault();
          return;
        }
      }
    }

    // Paste (Ctrl+V / Cmd+V)
    if ((e.ctrlKey || e.metaKey) && e.key === 'v' && !e.shiftKey) {
      if (ui.clipboard && ui.clipboard.items.length > 0 && ui.currentFloor) {
        e.preventDefault();
        beginUndoGroup();
        const newIds: string[] = [];
        // We need to duplicate each clipboard item by its stored ID
        // For successive pastes, update clipboard to point to the new IDs
        const newItems: Array<{ type: 'furniture' | 'door' | 'window'; data: any }> = [];
        for (const item of ui.clipboard.items) {
          let newId: string | null = null;
          if (item.type === 'furniture') {
            newId = duplicateFurniture(item.data.id);
          } else if (item.type === 'door') {
            newId = duplicateDoor(item.data.id);
          } else if (item.type === 'window') {
            newId = duplicateWindow(item.data.id);
          }
          if (newId) {
            newIds.push(newId);
            // Update clipboard to reference the newly created element for successive pastes
            const newData = item.type === 'furniture'
              ? ui.currentFloor.furniture.find(f => f.id === newId)
              : item.type === 'door'
              ? ui.currentFloor.doors.find(d => d.id === newId)
              : ui.currentFloor.windows.find(w => w.id === newId);
            newItems.push({ type: item.type, data: newData ? { ...newData } : { ...item.data, id: newId } });
          }
        }
        // Update clipboard for successive pastes
        if (newItems.length > 0) ui.clipboard = { items: newItems };
        endUndoGroup();
        if (newIds.length === 1) {
          selectedElementId.set(newIds[0]);
          selectedElementIds.set(new Set());
        } else if (newIds.length > 1) {
          selectedElementIds.set(new Set(newIds));
          selectedElementId.set(newIds[0]);
        }
        return;
      }

    }

    // Global shortcuts
    const handled = handleGlobalShortcut(e, {
      rotateFurniture: () => {
        if (ui.currentPlacingId) {
          placingRotation.update(r => (r + 15) % 360);
        } else if (ui.currentSelectedId && ui.currentFloor) {
          const fi = ui.currentFloor.furniture.find(f => f.id === ui.currentSelectedId);
          if (fi) rotateFurniture(fi.id, 15);
        }
      }
    });
    if (handled) return;

    if (e.key === 's' || e.key === 'S') {
      projectSettings.update(s => ({ ...s, snapToGrid: !s.snapToGrid }));
    }
    if (e.key === 'g' || e.key === 'G') {
      ui.showGrid = !ui.showGrid;
    }
    if (e.key === 'm' || e.key === 'M') {
      ui.measuring = !ui.measuring;
      if (!ui.measuring) { ui.measureStart = null; ui.measureEnd = null; }
      if (ui.measuring) { ui.annotating = false; ui.annotationStart = null; }
    }
    if (e.key === 'n' || e.key === 'N') {
      ui.annotating = !ui.annotating;
      if (!ui.annotating) { ui.annotationStart = null; }
      if (ui.annotating) { ui.measuring = false; ui.measureStart = null; ui.measureEnd = null; }
    }
    if (e.key === 'f' || e.key === 'F') {
      zoomToFit();
    }
    // 'C' to close wall loop back to first point (but not Ctrl+C)
    if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && ui.wallStart && ui.wallSequenceFirst) {
      if (Math.hypot(ui.wallStart.x - ui.wallSequenceFirst.x, ui.wallStart.y - ui.wallSequenceFirst.y) > 5) {
        addWall(ui.wallStart, ui.wallSequenceFirst);
        ui.wallStart = null;
        ui.wallSequenceFirst = null;
      }
    }
  }

  function onKeyUp(e: KeyboardEvent) {
    ui.shiftDown = e.shiftKey;
    if (e.code === 'Space') ui.spaceDown = false;
  }

  return { onKeyDown, onKeyUp };
}
