/**
 * Duplo clique, roda do mouse e gestos de toque.
 */
import { positionOnWall } from '$lib/utils/hitTesting';
import { onMount } from 'svelte';
import { selectedElementId, addWall, placingRotation, splitWall, addGuide } from '$lib/stores/project';
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { Nucleo } from '../nucleo';
import { RULER_SIZE } from '../desenho/tipos';
import type { Desenho } from '../desenho';
import type { Localizadores } from './localizar';

export function criarGestos(ui: EstadoCanvas, n: Nucleo, d: Desenho, loc: Localizadores) {
  const { markDirty, getCS, snap, screenToWorld, worldToScreen, magneticSnap, angleSnap,
    findConnectedEndpoints, findOwnedConnectedEndpoints, getMultiSelectBBox,
    snapFurnitureToWall, snapWallEndPoint, typedWallLengthCm, applyTypedWallLength,
    GRID, SNAP, MAGNETIC_SNAP, WALL_SNAP_DIST } = n;
  const { draw, scheduleDraw, updateDetectedRooms, drawMinimap, getWorldBBox,
    wallPointAt, hitTestMeasurement, hitTestAnnotation, hitTestTextAnnotation } = d;

  const { findWallAt, findHandleAt, findFurnitureAt, findColumnAt, findStairAt,
    findDoorAt, findWindowAt, findRoomLabelAt, findRoomAt, startRoomDrag, rotateSelectedRoom } = loc;

  function onDblClick(e: MouseEvent) {
    const rect = ui.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const R = RULER_SIZE;

    // Double-click on horizontal ruler → add horizontal guide
    if (sy < R && sx > R) {
      const wp = screenToWorld(sx, sy);
      addGuide('horizontal', wp.y);
      return;
    }
    // Double-click on vertical ruler → add vertical guide
    if (sx < R && sy > R) {
      const wp = screenToWorld(sx, sy);
      addGuide('vertical', wp.x);
      return;
    }

    // Double-click on a text annotation to edit it
    if (ui.currentTool === 'select' && ui.currentFloor) {
      const wp = screenToWorld(sx, sy);
      const textHitId = hitTestTextAnnotation(wp, ui.currentFloor);
      if (textHitId) {
        const ta = ui.currentFloor.textAnnotations?.find(t => t.id === textHitId);
        if (ta) {
          const sp = worldToScreen(ta.x, ta.y);
          ui.editingTextAnnotationId = textHitId;
          ui.editingTextAnnotationPos = { x: sp.x, y: sp.y };
          ui.editingTextAnnotationValue = ta.text;
          ui.selectedTextAnnotationId = textHitId;
          selectedElementId.set(textHitId);
          return;
        }
      }
    }

    // Double-click on a wall in select mode to split it
    if (ui.currentTool === 'select') {
      const wp = screenToWorld(sx, sy);
      const wall = findWallAt(wp);
      if (wall && !wall.curvePoint) {
        const t = positionOnWall(wp, wall);
        if (t > 0.05 && t < 0.95) {
          const newId = splitWall(wall.id, t);
          if (newId) {
            selectedElementId.set(null);
            return;
          }
        }
      }
    }
    if (ui.currentTool === 'wall' && ui.wallStart && ui.wallSequenceFirst) {
      // Auto-close the wall loop back to the first point if we have at least 2 walls
      if (Math.hypot(ui.wallStart.x - ui.wallSequenceFirst.x, ui.wallStart.y - ui.wallSequenceFirst.y) > 5) {
        addWall(ui.wallStart, ui.wallSequenceFirst);
      }
      ui.wallStart = null;
      ui.wallSequenceFirst = null;
    }
  }

  /** Deslocamento mínimo, em px de tela, para o gesto valer como arrasto e não clique. */
  const LIMIAR_ARRASTO = 3;

  function onWheel(e: WheelEvent) {
    markDirty();
    e.preventDefault();
    if (ui.currentPlacingId && !e.ctrlKey) {
      // Rotate furniture preview
      const delta = e.deltaY > 0 ? 15 : -15;
      placingRotation.update(r => (r + delta) % 360);
      return;
    }

    const rect = ui.canvas.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;

    if (e.ctrlKey) {
      // Pinch-to-zoom on trackpad (or Ctrl+scroll)
      const factor = e.deltaY > 0 ? 0.95 : 1.05;
      const newZoom = Math.max(0.1, Math.min(10, ui.zoom * factor));
      // Zoom towards cursor position
      const worldX = (sx - ui.width / 2) / ui.zoom + ui.camX;
      const worldY = (sy - ui.height / 2) / ui.zoom + ui.camY;
      ui.camX = worldX - (sx - ui.width / 2) / newZoom;
      ui.camY = worldY - (sy - ui.height / 2) / newZoom;
      ui.zoom = newZoom;
    } else if (Math.abs(e.deltaX) > 0) {
      // Two-finger trackpad pan (deltaX present means trackpad gesture)
      ui.camX += e.deltaX / ui.zoom;
      ui.camY += e.deltaY / ui.zoom;
    } else {
      // Regular scroll wheel: zoom towards cursor
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(10, ui.zoom * factor));
      // Zoom towards cursor position
      const worldX = (sx - ui.width / 2) / ui.zoom + ui.camX;
      const worldY = (sy - ui.height / 2) / ui.zoom + ui.camY;
      ui.camX = worldX - (sx - ui.width / 2) / newZoom;
      ui.camY = worldY - (sy - ui.height / 2) / newZoom;
      ui.zoom = newZoom;
    }
  }

  // ── Touch input (phones/tablets) ──────────────────────────────────
  // One finger drives the existing mouse pipeline via synthetic MouseEvents
  // (so every tool works unchanged); two fingers pinch-zoom and pan.
  // Listeners are registered manually in onMount with { passive: false }
  // because we must preventDefault to stop scrolling and the browser's
  // compatibility mouse events (which would double-fire the handlers).
  let pinchState: { dist: number; cx: number; cy: number } | null = null;
  let singleTouchActive = false;
  let lastTapTime = 0;
  let lastTapX = 0;
  let lastTapY = 0;

  function dispatchMouse(type: 'mousedown' | 'mousemove' | 'mouseup' | 'click' | 'dblclick', clientX: number, clientY: number) {
    ui.canvas.dispatchEvent(new MouseEvent(type, {
      clientX,
      clientY,
      button: 0,
      buttons: type === 'mousedown' || type === 'mousemove' ? 1 : 0,
      bubbles: true,
      cancelable: true,
    }));
  }

  function onTouchStart(e: TouchEvent) {
    e.preventDefault();
    if (e.touches.length === 1) {
      singleTouchActive = true;
      dispatchMouse('mousedown', e.touches[0].clientX, e.touches[0].clientY);
    } else if (e.touches.length === 2) {
      // Second finger landed: abandon any single-finger drag and start pinching
      if (singleTouchActive) {
        dispatchMouse('mouseup', e.touches[0].clientX, e.touches[0].clientY);
        singleTouchActive = false;
      }
      const a = e.touches[0], b = e.touches[1];
      pinchState = {
        dist: Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY),
        cx: (a.clientX + b.clientX) / 2,
        cy: (a.clientY + b.clientY) / 2,
      };
    }
  }

  function onTouchMove(e: TouchEvent) {
    e.preventDefault();
    if (pinchState && e.touches.length >= 2) {
      const a = e.touches[0], b = e.touches[1];
      const dist = Math.hypot(b.clientX - a.clientX, b.clientY - a.clientY);
      const cx = (a.clientX + b.clientX) / 2;
      const cy = (a.clientY + b.clientY) / 2;
      const rect = ui.canvas.getBoundingClientRect();
      const sx = cx - rect.left, sy = cy - rect.top;
      // Zoom about the pinch midpoint (same math as onWheel)
      const newZoom = Math.max(0.1, Math.min(10, ui.zoom * (dist / (pinchState.dist || dist))));
      const worldX = (sx - ui.width / 2) / ui.zoom + ui.camX;
      const worldY = (sy - ui.height / 2) / ui.zoom + ui.camY;
      ui.camX = worldX - (sx - ui.width / 2) / newZoom;
      ui.camY = worldY - (sy - ui.height / 2) / newZoom;
      ui.zoom = newZoom;
      // Two-finger pan: camera follows the midpoint
      ui.camX -= (cx - pinchState.cx) / newZoom;
      ui.camY -= (cy - pinchState.cy) / newZoom;
      pinchState = { dist, cx, cy };
      markDirty();
    } else if (singleTouchActive && e.touches.length === 1) {
      dispatchMouse('mousemove', e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  function onTouchEnd(e: TouchEvent) {
    e.preventDefault();
    if (pinchState) {
      // Leaving pinch: ignore the remaining finger until it lifts too
      if (e.touches.length < 2) pinchState = null;
      return;
    }
    if (singleTouchActive && e.touches.length === 0) {
      const t = e.changedTouches[0];
      singleTouchActive = false;
      dispatchMouse('mouseup', t.clientX, t.clientY);
      // Synthesize click so document-level click-outside handlers (menus) fire
      dispatchMouse('click', t.clientX, t.clientY);
      // Double-tap → dblclick (finish wall chains, rename rooms, …)
      const now = Date.now();
      if (now - lastTapTime < 350 && Math.hypot(t.clientX - lastTapX, t.clientY - lastTapY) < 30) {
        dispatchMouse('dblclick', t.clientX, t.clientY);
        lastTapTime = 0;
      } else {
        lastTapTime = now;
        lastTapX = t.clientX;
        lastTapY = t.clientY;
      }
    }
  }

  // ── Exact-length wall entry (issue #6) ────────────────────────────
  /** Shared endpoint snapping for wall drawing: magnetic + Shift/angle snap. */
  return { onDblClick, onWheel, onTouchStart, onTouchMove, onTouchEnd };
}
