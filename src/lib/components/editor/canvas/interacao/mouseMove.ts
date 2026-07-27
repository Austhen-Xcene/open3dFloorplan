/**
 * Mover o ponteiro: arrasto, pré-visualização e retorno visual.
 */
import type { Point, Door } from '$lib/models/types';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';
import { positionOnWall } from '$lib/utils/hitTesting';
import { updateWall, moveWallEndpoint, moveWallsTogether, updateDoor, updateWindow, moveFurniture, setFurnitureRotation, scaleFurniture, detectedRoomsStore, moveStair, moveColumn, moveGuide, moveTextAnnotation } from '$lib/stores/project';
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { Nucleo } from '../nucleo';
import type { Desenho } from '../desenho';
import type { Localizadores } from './localizar';

/** Deslocamento mínimo, em px de tela, para o gesto valer como arrasto e não clique. */
const LIMIAR_ARRASTO = 3;

export function criarMouseMove(ui: EstadoCanvas, n: Nucleo, d: Desenho, loc: Localizadores) {
  const { markDirty, getCS, snap, screenToWorld, worldToScreen, magneticSnap, angleSnap,
    findConnectedEndpoints, findOwnedConnectedEndpoints, getMultiSelectBBox,
    snapFurnitureToWall, snapWallEndPoint, typedWallLengthCm, applyTypedWallLength,
    GRID, SNAP, MAGNETIC_SNAP, WALL_SNAP_DIST } = n;
  const { draw, scheduleDraw, updateDetectedRooms, drawMinimap, getWorldBBox,
    wallPointAt, hitTestMeasurement, hitTestAnnotation, hitTestTextAnnotation } = d;

  const { findWallAt, findHandleAt, findFurnitureAt, findColumnAt, findStairAt,
    findDoorAt, findWindowAt, findRoomLabelAt, findRoomAt, startRoomDrag, rotateSelectedRoom } = loc;

  function onMouseMove(e: MouseEvent) {
    markDirty();
    const rect = ui.canvas.getBoundingClientRect();
    const anterior = ui.mousePos;
    ui.mousePos = screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

    if (e.buttons !== 0 && !ui.arrastouDeVerdade) {
      const percorrido = Math.hypot(ui.mousePos.x - anterior.x, ui.mousePos.y - anterior.y) * ui.zoom;
      if (percorrido >= LIMIAR_ARRASTO) ui.arrastouDeVerdade = true;
    }

    // Drag room label
    if (ui.draggingRoomLabelId) {
      const dx = ui.mousePos.x - ui.roomLabelDragStart.x;
      const dy = ui.mousePos.y - ui.roomLabelDragStart.y;
      const newOffset = { x: ui.roomLabelOrigOffset.x + dx, y: ui.roomLabelOrigOffset.y + dy };
      detectedRoomsStore.update(rooms => rooms.map(r => r.id === ui.draggingRoomLabelId ? { ...r, labelOffset: newOffset } : r));
      return;
    }

    // Drag guide line
    if (ui.draggingGuideId && ui.currentFloor?.guides) {
      const g = ui.currentFloor.guides.find(g => g.id === ui.draggingGuideId);
      if (g) {
        const newPos = g.orientation === 'horizontal' ? ui.mousePos.y : ui.mousePos.x;
        moveGuide(ui.draggingGuideId, snap(newPos));
      }
      return;
    }
    if (ui.isPanning) {
      ui.camX -= (e.clientX - ui.panStartX) / ui.zoom;
      ui.camY -= (e.clientY - ui.panStartY) / ui.zoom;
      ui.panStartX = e.clientX;
      ui.panStartY = e.clientY;
    }
    if (ui.draggingWallEndpoint) {
      // Exclude the dragged wall and all connected walls from magnetic snap targets
      const excludeIds = new Set<string>([ui.draggingWallEndpoint.wallId, ...ui.draggingConnectedEndpoints.map(c => c.wallId)]);
      let pt = magneticSnap(ui.mousePos, excludeIds);
      // Angle snap to the opposite endpoint of the primary wall being dragged
      if (ui.currentFloor) {
        const wall = ui.currentFloor.walls.find(w => w.id === ui.draggingWallEndpoint!.wallId);
        if (wall) {
          const other = ui.draggingWallEndpoint.endpoint === 'start' ? wall.end : wall.start;
          pt = angleSnap(other, pt);
        }
      }
      moveWallEndpoint(ui.draggingWallEndpoint.wallId, ui.draggingWallEndpoint.endpoint, pt);
      // Move all connected endpoints together
      for (const conn of ui.draggingConnectedEndpoints) {
        moveWallEndpoint(conn.wallId, conn.endpoint, pt);
      }
    }
    if (ui.draggingWallParallel && ui.currentFloor) {
      const wall = ui.currentFloor.walls.find(w => w.id === ui.draggingWallParallel!.wallId);
      if (wall) {
        // Free movement in all directions
        {
          const mdx = ui.mousePos.x - ui.draggingWallParallel.startMousePos.x;
          const mdy = ui.mousePos.y - ui.draggingWallParallel.startMousePos.y;
          // Snap delta to grid
          const snapStep = ui.currentSnapToGrid ? ui.currentGridSize : SNAP;
          const dx = Math.round(mdx / snapStep) * snapStep;
          const dy = Math.round(mdy / snapStep) * snapStep;
          // Set wall positions from original + offset
          const newStart = {
            x: ui.draggingWallParallel.origStart.x + dx,
            y: ui.draggingWallParallel.origStart.y + dy,
          };
          const newEnd = {
            x: ui.draggingWallParallel.origEnd.x + dx,
            y: ui.draggingWallParallel.origEnd.y + dy,
          };
          moveWallEndpoint(ui.draggingWallParallel.wallId, 'start', newStart);
          moveWallEndpoint(ui.draggingWallParallel.wallId, 'end', newEnd);
          // Move connected walls' shared endpoints so adjacent walls stretch to stay connected
          for (const conn of ui.draggingWallParallel.connectedStart) {
            moveWallEndpoint(conn.wallId, conn.endpoint, newStart);
          }
          for (const conn of ui.draggingWallParallel.connectedEnd) {
            moveWallEndpoint(conn.wallId, conn.endpoint, newEnd);
          }
        }
      }
    }
    if (ui.draggingMultiSelect && ui.currentFloor) {
      const mSnapStep = ui.currentSnapToGrid ? ui.currentGridSize : SNAP;
      const dx = Math.round((ui.mousePos.x - ui.draggingMultiSelect.startMousePos.x) / mSnapStep) * mSnapStep;
      const dy = Math.round((ui.mousePos.y - ui.draggingMultiSelect.startMousePos.y) / mSnapStep) * mSnapStep;
      const selectedWallPositions = new Map<string, { start: Point; end: Point }>();
      for (const [id, orig] of ui.draggingMultiSelect.origPositions) {
        if (orig.start && orig.end) {
          selectedWallPositions.set(id, {
            start: orig.start,
            end: orig.end,
          });
        } else if (orig.position) {
          // Furniture, stair, or column
          const newPos = { x: orig.position.x + dx, y: orig.position.y + dy };
          const fi = ui.currentFloor.furniture.find(f => f.id === id);
          if (fi) { moveFurniture(id, newPos); continue; }
          if (ui.currentFloor.stairs) { const st = ui.currentFloor.stairs.find(s => s.id === id); if (st) { moveStair(id, newPos); continue; } }
          if (ui.currentFloor.columns) { const col = ui.currentFloor.columns.find(c => c.id === id); if (col) { moveColumn(id, newPos); continue; } }
        }
      }
      // Move every selected wall in one store update. In particular, this
      // preserves both independent copies of coincident room-divider walls.
      if (selectedWallPositions.size > 0) {
        moveWallsTogether(selectedWallPositions, dx, dy);
      }
    }
    if (ui.draggingRoomId && ui.currentFloor && ui.roomDragStartPositions.size > 0) {
      const rSnapStep = ui.currentSnapToGrid ? ui.currentGridSize : SNAP;
      const dx = Math.round((ui.mousePos.x - ui.roomDragStartMouse.x) / rSnapStep) * rSnapStep;
      const dy = Math.round((ui.mousePos.y - ui.roomDragStartMouse.y) / rSnapStep) * rSnapStep;
      moveWallsTogether(ui.roomDragStartPositions, dx, dy);
    }
    if (ui.draggingCurveHandle && ui.currentFloor) {
      const wall = ui.currentFloor.walls.find(w => w.id === ui.draggingCurveHandle);
      if (wall) {
        // Check if mouse is close enough to the straight line (if so, snap back to straight)
        const mx = (wall.start.x + wall.end.x) / 2;
        const my = (wall.start.y + wall.end.y) / 2;
        const distToMid = Math.hypot(ui.mousePos.x - mx, ui.mousePos.y - my);
        if (distToMid < 5) {
          // Snap back to straight wall
          updateWall(ui.draggingCurveHandle, { curvePoint: undefined });
        } else {
          updateWall(ui.draggingCurveHandle, { curvePoint: { x: snap(ui.mousePos.x), y: snap(ui.mousePos.y) } });
        }
      }
    }
    if (ui.draggingHandle && ui.currentSelectedId && ui.currentFloor) {
      const fi = ui.currentFloor.furniture.find(f => f.id === ui.currentSelectedId);
      if (fi) {
        const cat = getCatalogItem(fi.catalogId);
        if (cat) {
          if (ui.draggingHandle === 'rotate') {
            // Rotate based on angle from furniture center to mouse
            const dx = ui.mousePos.x - fi.position.x;
            const dy = ui.mousePos.y - fi.position.y;
            let angle = Math.atan2(dx, -dy) * 180 / Math.PI; // 0° = up
            // Hold Shift to snap to 15° increments; otherwise free rotation
            if (ui.shiftDown) {
              angle = Math.round(angle / 15) * 15;
            }
            setFurnitureRotation(ui.currentSelectedId, ((angle % 360) + 360) % 360);
          } else {
            // Resize: compute delta in furniture-local coords
            const dx = ui.mousePos.x - fi.position.x;
            const dy = ui.mousePos.y - fi.position.y;
            const ang = -(fi.rotation * Math.PI) / 180;
            const localX = dx * Math.cos(ang) - dy * Math.sin(ang);
            const localY = dx * Math.sin(ang) + dy * Math.cos(ang);
            const minScale = 10 / Math.max(cat.width, cat.depth); // 10cm minimum
            let newSx = fi.scale?.x ?? 1;
            let newSy = fi.scale?.y ?? 1;
            const isEdge = ['resize-t', 'resize-b', 'resize-l', 'resize-r'].includes(ui.draggingHandle);
            const resizesX = !isEdge || ui.draggingHandle === 'resize-l' || ui.draggingHandle === 'resize-r';
            const resizesY = !isEdge || ui.draggingHandle === 'resize-t' || ui.draggingHandle === 'resize-b';
            if (resizesX) {
              newSx = Math.abs(localX * 2) / cat.width;
              newSx = Math.max(minScale, Math.round(newSx * 20) / 20);
            }
            if (resizesY) {
              newSy = Math.abs(localY * 2) / cat.depth;
              newSy = Math.max(minScale, Math.round(newSy * 20) / 20);
            }
            // Shift: maintain aspect ratio
            if (ui.shiftDown && resizesX && resizesY) {
              const origRatio = (ui.handleOrigScale.x * cat.width) / (ui.handleOrigScale.y * cat.depth);
              const currentRatio = (newSx * cat.width) / (newSy * cat.depth);
              if (currentRatio > origRatio) {
                newSy = (newSx * cat.width) / (origRatio * cat.depth);
              } else {
                newSx = (newSy * cat.depth * origRatio) / cat.width;
              }
            }
            scaleFurniture(ui.currentSelectedId, { x: newSx, y: newSy });
          }
        }
      }
    }
    if (ui.draggingTextAnnotationId && ui.currentFloor?.textAnnotations) {
      const basePos = { x: ui.mousePos.x - ui.textAnnotationDragOffset.x, y: ui.mousePos.y - ui.textAnnotationDragOffset.y };
      moveTextAnnotation(ui.draggingTextAnnotationId, { x: snap(basePos.x), y: snap(basePos.y) });
      // Update inline editor position if open
      if (ui.editingTextAnnotationId === ui.draggingTextAnnotationId) {
        const sp = worldToScreen(snap(basePos.x), snap(basePos.y));
        ui.editingTextAnnotationPos = { x: sp.x, y: sp.y };
      }
    }
    if (ui.draggingColumnId && ui.currentFloor?.columns) {
      const basePos = { x: ui.mousePos.x - ui.columnDragOffset.x, y: ui.mousePos.y - ui.columnDragOffset.y };
      moveColumn(ui.draggingColumnId, { x: snap(basePos.x), y: snap(basePos.y) });
    }
    if (ui.draggingStairId && ui.currentFloor?.stairs) {
      const basePos = { x: ui.mousePos.x - ui.stairDragOffset.x, y: ui.mousePos.y - ui.stairDragOffset.y };
      moveStair(ui.draggingStairId, { x: snap(basePos.x), y: snap(basePos.y) });
    }
    if (ui.draggingFurnitureId) {
      const basePos = { x: ui.mousePos.x - ui.dragOffset.x, y: ui.mousePos.y - ui.dragOffset.y };
      const fi = ui.currentFloor?.furniture.find(f => f.id === ui.draggingFurnitureId);
      if (fi) {
        const wallSnap = snapFurnitureToWall(basePos, fi.catalogId, fi.rotation);
        if (wallSnap) {
          moveFurniture(ui.draggingFurnitureId, wallSnap.position);
          setFurnitureRotation(ui.draggingFurnitureId, wallSnap.rotation);
          ui.dragWasWallSnapped = true;
          ui.wallSnapInfo = { wallId: wallSnap.wallId, side: wallSnap.side, wallAngle: wallSnap.wallAngle };
        } else {
          const snapped = { x: snap(basePos.x), y: snap(basePos.y) };
          // Snap to guide lines
          const GUIDE_SNAP = 10; // world units
          if (ui.currentFloor?.guides) {
            for (const g of ui.currentFloor.guides) {
              if (g.orientation === 'horizontal' && Math.abs(snapped.y - g.position) < GUIDE_SNAP) {
                snapped.y = g.position;
              }
              if (g.orientation === 'vertical' && Math.abs(snapped.x - g.position) < GUIDE_SNAP) {
                snapped.x = g.position;
              }
            }
          }
          moveFurniture(ui.draggingFurnitureId, snapped);
          // Restore original rotation when leaving wall snap
          if (ui.dragWasWallSnapped) {
            setFurnitureRotation(ui.draggingFurnitureId, ui.dragStartRotation);
            ui.dragWasWallSnapped = false;
          }
          ui.wallSnapInfo = null;
        }
      }
    }
    if (ui.draggingDoorId && ui.currentFloor) {
      const door = ui.currentFloor.doors.find(d => d.id === ui.draggingDoorId);
      if (door) {
        const wall = ui.currentFloor.walls.find(w => w.id === door.wallId);
        if (wall) {
          const newPos = positionOnWall(ui.mousePos, wall);
          updateDoor(door.id, { position: newPos });
        }
      }
    }
    if (ui.draggingWindowId && ui.currentFloor) {
      const win = ui.currentFloor.windows.find(w => w.id === ui.draggingWindowId);
      if (win) {
        const wall = ui.currentFloor.walls.find(w => w.id === win.wallId);
        if (wall) {
          const newPos = positionOnWall(ui.mousePos, wall);
          updateWindow(win.id, { position: newPos });
        }
      }
    }
    // Door/window placement preview
    if ((ui.currentTool === 'door' || ui.currentTool === 'window') && ui.currentFloor) {
      const wall = findWallAt(ui.mousePos);
      if (wall) {
        ui.placementPreview = { wallId: wall.id, position: positionOnWall(ui.mousePos, wall), type: ui.currentTool as 'door' | 'window' };
      } else {
        ui.placementPreview = null;
      }
    } else {
      ui.placementPreview = null;
    }

    // Marquee drag update
    if (ui.marqueeStart) {
      ui.marqueeEnd = { ...ui.mousePos };
    }

    if (ui.measuring && ui.measureStart) {
      ui.measureEnd = { ...ui.mousePos };
    }
  }

  return { onMouseMove };
}
