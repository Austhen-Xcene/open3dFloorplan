/**
 * Pressionar o botão: seleção, início de arrasto e colocação de elemento.
 */
import type { Column, Measurement, Annotation } from '$lib/models/types';
import { positionOnWall } from '$lib/utils/hitTesting';
import { selectedTool, selectedElementId, addWall, addDoor, addWindow, addFurniture, commitFurnitureMove, rotateFurniture, placingStair, addStair, placingColumn, addColumn, calibrationMode, calibrationPoints, updateBackgroundImage, panMode, addAnnotation, updateAnnotation, addTextAnnotation } from '$lib/stores/project';
import { get } from 'svelte/store';
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { Nucleo } from '../nucleo';
import type { Desenho } from '../desenho';
import type { Localizadores } from './localizar';
import { criarMouseDownSelecao } from './mouseDownSelecao';

export function criarMouseDown(ui: EstadoCanvas, n: Nucleo, d: Desenho, loc: Localizadores) {
  const { markDirty, getCS, snap, screenToWorld, worldToScreen, magneticSnap, angleSnap,
    findConnectedEndpoints, findOwnedConnectedEndpoints, getMultiSelectBBox,
    snapFurnitureToWall, snapWallEndPoint, typedWallLengthCm, applyTypedWallLength,
    GRID, SNAP, MAGNETIC_SNAP, WALL_SNAP_DIST } = n;
  const { draw, scheduleDraw, updateDetectedRooms, drawMinimap, getWorldBBox,
    wallPointAt, hitTestMeasurement, hitTestAnnotation, hitTestTextAnnotation } = d;
  const { findWallAt, findHandleAt, findFurnitureAt, findColumnAt, findStairAt,
    findDoorAt, findWindowAt, findRoomLabelAt, findRoomAt, startRoomDrag, rotateSelectedRoom } = loc;
  const { tratarSelecao } = criarMouseDownSelecao(ui, n, d, loc);

  function onMouseDown(e: MouseEvent) {
    markDirty();
    if (e.button === 1 || (e.button === 0 && (ui.spaceDown || get(panMode) || (e.shiftKey && ui.currentTool === 'select')))) {
      ui.isPanning = true;
      ui.panStartX = e.clientX;
      ui.panStartY = e.clientY;
      return;
    }
    if (e.button !== 0) return;

    const rect = ui.canvas.getBoundingClientRect();
    const wp = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
    const tool = ui.currentTool;

    // Text annotation tool: click to place text
    if (ui.textAnnotationMode) {
      const snapped = { x: snap(wp.x), y: snap(wp.y) };
      // Check if clicking on an existing text annotation to edit it
      if (ui.currentFloor) {
        const hitId = hitTestTextAnnotation(wp, ui.currentFloor);
        if (hitId) {
          // Edit existing text annotation
          const ta = ui.currentFloor.textAnnotations?.find(t => t.id === hitId);
          if (ta) {
            const sp = worldToScreen(ta.x, ta.y);
            ui.editingTextAnnotationId = hitId;
            ui.editingTextAnnotationPos = { x: sp.x, y: sp.y };
            ui.editingTextAnnotationValue = ta.text;
            ui.selectedTextAnnotationId = hitId;
            selectedElementId.set(hitId);
            return;
          }
        }
      }
      // Place new text annotation — show inline input
      const sp = worldToScreen(snapped.x, snapped.y);
      const id = addTextAnnotation(snapped.x, snapped.y, 'Text', 16, '#1e293b', 0);
      ui.editingTextAnnotationId = id;
      ui.editingTextAnnotationPos = { x: sp.x, y: sp.y };
      ui.editingTextAnnotationValue = '';
      ui.selectedTextAnnotationId = id;
      selectedElementId.set(id);
      return;
    }

    // Annotation tool: click first point, then second point
    if (ui.annotating) {
      const snapped = magneticSnap(wp);
      if (!ui.annotationStart) {
        ui.annotationStart = { x: snapped.x, y: snapped.y };
      } else {
        const id = addAnnotation(ui.annotationStart.x, ui.annotationStart.y, snapped.x, snapped.y, 40);
        // Prompt for custom label
        const customLabel = prompt('Annotation label (leave empty for auto dimension):');
        if (customLabel) {
          updateAnnotation(id, { label: customLabel });
        }
        ui.annotationStart = null;
      }
      return;
    }

    // Column placement (before select-mode handlers to avoid interception)
    if (ui.isPlacingColumn) {
      const pos = { x: snap(wp.x), y: snap(wp.y) };
      const id = addColumn(pos, ui.placingColShape);
      selectedElementId.set(id);
      placingColumn.set(false);
      return;
    }

    if (ui.isPlacingStair) {
      const pos = { x: snap(wp.x), y: snap(wp.y) };
      const id = addStair(pos);
      selectedElementId.set(id);
      placingStair.set(false);
      return;
    }

    // Guide line click detection (select / start drag)
    if (tool === 'select' && ui.currentFloor?.guides) {
      const GUIDE_HIT = 6 / ui.zoom; // 6px tolerance in world units
      for (const g of ui.currentFloor.guides) {
        if (g.orientation === 'horizontal' && Math.abs(wp.y - g.position) < GUIDE_HIT) {
          ui.selectedGuideId = g.id;
          ui.draggingGuideId = g.id;
          selectedElementId.set(null);
          return;
        }
        if (g.orientation === 'vertical' && Math.abs(wp.x - g.position) < GUIDE_HIT) {
          ui.selectedGuideId = g.id;
          ui.draggingGuideId = g.id;
          selectedElementId.set(null);
          return;
        }
      }
      // Click elsewhere deselects guide
      ui.selectedGuideId = null;
    }

    // Measurement click detection (select)
    if (tool === 'select' && ui.currentFloor) {
      const hitId = hitTestMeasurement(wp, ui.currentFloor);
      if (hitId) {
        ui.selectedMeasurementId = hitId;
        ui.selectedAnnotationId = null;
        selectedElementId.set(null);
        return;
      }
      ui.selectedMeasurementId = null;
    }

    // Text annotation click detection (select + drag)
    if (tool === 'select' && ui.currentFloor) {
      const textHitId = hitTestTextAnnotation(wp, ui.currentFloor);
      if (textHitId) {
        ui.selectedTextAnnotationId = textHitId;
        ui.selectedAnnotationId = null;
        ui.selectedMeasurementId = null;
        selectedElementId.set(textHitId);
        const ta = ui.currentFloor.textAnnotations?.find(t => t.id === textHitId);
        if (ta) {
          ui.draggingTextAnnotationId = textHitId;
          ui.textAnnotationDragOffset = { x: wp.x - ta.x, y: wp.y - ta.y };
          commitFurnitureMove();
        }
        return;
      }
      ui.selectedTextAnnotationId = null;
    }

    // Annotation click detection (select)
    if (tool === 'select' && ui.currentFloor) {
      const hitId = hitTestAnnotation(wp, ui.currentFloor);
      if (hitId) {
        ui.selectedAnnotationId = hitId;
        ui.selectedMeasurementId = null;
        selectedElementId.set(null);
        return;
      }
      ui.selectedAnnotationId = null;
    }

    // Calibration mode click
    if (ui.isCalibrating) {
      calibrationPoints.update(pts => {
        const newPts = [...pts, { x: wp.x, y: wp.y }];
        if (newPts.length >= 2) {
          const dist = Math.hypot(newPts[1].x - newPts[0].x, newPts[1].y - newPts[0].y);
          const realDist = prompt('Enter the real-world distance between these two points (in cm):');
          if (realDist && Number(realDist) > 0) {
            const pixelsPerCm = dist / Number(realDist);
            if (ui.currentFloor?.backgroundImage) {
              updateBackgroundImage({ scale: ui.currentFloor.backgroundImage.scale * (1 / pixelsPerCm) });
            }
          }
          calibrationMode.set(false);
          return [];
        }
        return newPts;
      });
      return;
    }

    // Column and stair placement moved earlier (before select-mode handlers)

    if (tool === 'furniture' && ui.currentPlacingId) {
      const wallSnap = snapFurnitureToWall(wp, ui.currentPlacingId, ui.currentPlacingRotation);
      const pos = wallSnap ? wallSnap.position : { x: snap(wp.x), y: snap(wp.y) };
      const rot = wallSnap ? wallSnap.rotation : ui.currentPlacingRotation;
      const id = addFurniture(ui.currentPlacingId, pos);
      if (rot !== 0) {
        rotateFurniture(id, rot);
      }
      selectedElementId.set(id);
      return;
    }

    if (tool === 'wall') {
      let endPt = snapWallEndPoint(wp);
      if (ui.wallStart) endPt = applyTypedWallLength(endPt);
      ui.typedWallLength = '';
      if (!ui.wallStart) {
        ui.wallStart = endPt;
        ui.wallSequenceFirst = endPt;
      } else {
        // Auto-close: if clicking near the first point of the sequence, close the loop
        if (ui.wallSequenceFirst && Math.hypot(endPt.x - ui.wallSequenceFirst.x, endPt.y - ui.wallSequenceFirst.y) < 20 && Math.hypot(ui.wallStart.x - ui.wallSequenceFirst.x, ui.wallStart.y - ui.wallSequenceFirst.y) > 20) {
          addWall(ui.wallStart, ui.wallSequenceFirst);
          ui.wallStart = null;
          ui.wallSequenceFirst = null;
        } else if (Math.hypot(endPt.x - ui.wallStart.x, endPt.y - ui.wallStart.y) > 5) {
          addWall(ui.wallStart, endPt);
          ui.wallStart = endPt;
        }
      }
    } else if (tool === 'select') {
      tratarSelecao(e, wp);
    } else if (tool === 'door') {
      const wall = findWallAt(wp);
      if (wall) {
        addDoor(wall.id, positionOnWall(wp, wall), ui.currentDoorType);
        selectedTool.set('select');
      }
    } else if (tool === 'window') {
      const wall = findWallAt(wp);
      if (wall) {
        addWindow(wall.id, positionOnWall(wp, wall), ui.currentWindowType);
        selectedTool.set('select');
      }
    }
  }

  return { onMouseDown };
}
