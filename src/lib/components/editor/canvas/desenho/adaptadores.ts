/**
 * Adaptadores finos sobre utils/renderizador, mais a geometria de parede que o desenho usa. Cada um só injeta o CanvasState e o estado de interface.
 */
import type { Point, Wall, Door, Window as Win, FurnitureItem, Stair, Column, Annotation } from '$lib/models/types';
import type { Floor } from '$lib/models/types';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';
import { drawRulers as desenharReguas } from '$lib/utils/renderizador';
import { assinaturaGeometria, reconciliarAmbientes } from '$lib/utils/reconciliarAmbientes';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import { drawWall as _drawWall, drawDoorOnWall as _drawDoorOnWall, drawWindowOnWall as _drawWindowOnWall, drawDoorDistanceDimensions as _drawDoorDistanceDimensions, drawWindowDistanceDimensions as _drawWindowDistanceDimensions, drawFurnitureItem, drawStair as _drawStair, drawColumn as _drawColumn, drawGuides as _drawGuides, drawPersistedMeasurements as _drawPersistedMeasurements, drawTextAnnotations as _drawTextAnnotations, drawAnnotation as _drawAnnotation, drawAnnotations as _drawAnnotations, drawRooms as _drawRooms, drawWallJoints as _drawWallJoints, drawSnapPoints as _drawSnapPoints, drawMinimap as _drawMinimap } from '$lib/utils/renderizador';
import { hitTestMeasurement as _hitTestMeasurement, hitTestAnnotation as _hitTestAnnotation, hitTestTextAnnotation as _hitTestTextAnnotation } from '$lib/utils/hitTesting';
import { detectedRoomsStore } from '$lib/stores/project';
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { DepsDesenho } from './tipos';
import { RULER_SIZE, GRID } from './tipos';

export function criarAdaptadores(ui: EstadoCanvas, deps: DepsDesenho) {
  const { markDirty, getCS, getMultiSelectBBox, snapFurnitureToWall, worldToScreen, snapWallEndPoint, typedWallLengthCm, applyTypedWallLength } = deps;

  function drawGrid() {
    if (!ui.ctx || !ui.showGrid) return;
    const step = (ui.currentSnapToGrid ? ui.currentGridSize : GRID) * ui.zoom;
    if (step < 4) return;

    // Minor grid
    ui.ctx.strokeStyle = '#e8eaed';
    ui.ctx.lineWidth = 0.5;
    const offX = (ui.width / 2 - ui.camX * ui.zoom) % step;
    const offY = (ui.height / 2 - ui.camY * ui.zoom) % step;
    for (let x = offX; x < ui.width; x += step) {
      ui.ctx.beginPath(); ui.ctx.moveTo(x, 0); ui.ctx.lineTo(x, ui.height); ui.ctx.stroke();
    }
    for (let y = offY; y < ui.height; y += step) {
      ui.ctx.beginPath(); ui.ctx.moveTo(0, y); ui.ctx.lineTo(ui.width, y); ui.ctx.stroke();
    }

    // Major grid (every 100cm / 1m)
    const majorStep = 100 * ui.zoom;
    if (majorStep >= 20) {
      ui.ctx.strokeStyle = '#d1d5db';
      ui.ctx.lineWidth = 0.8;
      const mOffX = (ui.width / 2 - ui.camX * ui.zoom) % majorStep;
      const mOffY = (ui.height / 2 - ui.camY * ui.zoom) % majorStep;
      for (let x = mOffX; x < ui.width; x += majorStep) {
        ui.ctx.beginPath(); ui.ctx.moveTo(x, 0); ui.ctx.lineTo(x, ui.height); ui.ctx.stroke();
      }
      for (let y = mOffY; y < ui.height; y += majorStep) {
        ui.ctx.beginPath(); ui.ctx.moveTo(0, y); ui.ctx.lineTo(ui.width, y); ui.ctx.stroke();
      }
    }
  }

  function wallLength(w: Wall): number {
    if (w.curvePoint) {
      // Approximate quadratic bezier length with 20 segments
      let len = 0;
      const N = 20;
      let px = w.start.x, py = w.start.y;
      for (let i = 1; i <= N; i++) {
        const t = i / N;
        const mt = 1 - t;
        const nx = mt * mt * w.start.x + 2 * mt * t * w.curvePoint.x + t * t * w.end.x;
        const ny = mt * mt * w.start.y + 2 * mt * t * w.curvePoint.y + t * t * w.end.y;
        len += Math.hypot(nx - px, ny - py);
        px = nx; py = ny;
      }
      return len;
    }
    return Math.hypot(w.end.x - w.start.x, w.end.y - w.start.y);
  }

  /** Get point on wall at parameter t (0-1), handling curves */
  function wallPointAt(w: Wall, t: number): Point {
    if (w.curvePoint) {
      const mt = 1 - t;
      return {
        x: mt * mt * w.start.x + 2 * mt * t * w.curvePoint.x + t * t * w.end.x,
        y: mt * mt * w.start.y + 2 * mt * t * w.curvePoint.y + t * t * w.end.y,
      };
    }
    return {
      x: w.start.x + (w.end.x - w.start.x) * t,
      y: w.start.y + (w.end.y - w.start.y) * t,
    };
  }

  /** Get tangent direction at parameter t on wall */
  function wallTangentAt(w: Wall, t: number): Point {
    if (w.curvePoint) {
      const mt = 1 - t;
      const dx = 2 * mt * (w.curvePoint.x - w.start.x) + 2 * t * (w.end.x - w.curvePoint.x);
      const dy = 2 * mt * (w.curvePoint.y - w.start.y) + 2 * t * (w.end.y - w.curvePoint.y);
      const len = Math.hypot(dx, dy) || 1;
      return { x: dx / len, y: dy / len };
    }
    const dx = w.end.x - w.start.x;
    const dy = w.end.y - w.start.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  }

  function wallThicknessScreen(w: Wall): number {
    return Math.max(w.thickness * ui.zoom, 4);
  }


  // ── Delegating wrappers to extracted modules ──────────────────────────

  function drawDoorDistanceDimensions(wall: Wall, door: Door) {
    _drawDoorDistanceDimensions(getCS(), wall, door, ui.dimSettings);
  }

  function drawWindowDistanceDimensions(wall: Wall, window: Win) {
    _drawWindowDistanceDimensions(getCS(), wall, window, ui.dimSettings);
  }

  function drawWall(w: Wall, selected: boolean) {
    _drawWall(getCS(), w, selected, ui.showDimensions, ui.dimSettings, ui.currentFloor?.walls);
  }

  function drawDoorOnWall(wall: Wall, door: Door) {
    _drawDoorOnWall(getCS(), wall, door);
  }

  function drawWindowOnWall(wall: Wall, win: Win) {
    _drawWindowOnWall(getCS(), wall, win);
  }

  function drawFurniture(item: FurnitureItem, selected: boolean) {
    drawFurnitureItem(getCS(), item, selected);
  }

  // Track wall snap during placement preview

  function drawPersistedMeasurements(floor: Floor) {
    _drawPersistedMeasurements(getCS(), floor, ui.selectedMeasurementId, ui.dimSettings);
  }

  function hitTestMeasurement(wp: Point, floor: Floor): string | null {
    return _hitTestMeasurement(wp, floor, ui.zoom);
  }

  function drawAnnotation(a: Annotation, selected: boolean) {
    _drawAnnotation(getCS(), a, selected, ui.dimSettings);
  }

  function drawAnnotations(floor: Floor) {
    _drawAnnotations(getCS(), floor, ui.selectedAnnotationId, ui.dimSettings);
  }

  function hitTestAnnotation(wp: Point, floor: Floor): string | null {
    return _hitTestAnnotation(wp, floor, ui.zoom);
  }

  function drawTextAnnotations(floor: Floor) {
    _drawTextAnnotations(getCS(), floor, ui.selectedTextAnnotationId, ui.currentSelectedId);
  }

  function hitTestTextAnnotation(wp: Point, floor: Floor): string | null {
    return _hitTestTextAnnotation(wp, floor, ui.ctx, ui.zoom);
  }

  function drawWallJoints(floor: Floor, selId: string | null) {
    _drawWallJoints(getCS(), floor, selId);
  }

  function drawSnapPoints() {
    if (!ui.currentFloor) return;
    _drawSnapPoints(getCS(), ui.currentFloor, ui.showGrid);
  }

  function drawRooms() {
    if (!ui.currentFloor) return;
    _drawRooms(getCS(), ui.currentFloor, ui.detectedRooms, ui.currentSelectedRoomId, ui.showRoomLabels, ui.showDimensions, ui.dimSettings);
  }

  function updateDetectedRooms() {
    if (!ui.currentFloor) return;
    const hash = assinaturaGeometria(ui.currentFloor);
    if (hash === ui.lastWallHash) return;
    ui.lastWallHash = hash;

    const reconciliados = reconciliarAmbientes(ui.currentFloor, ui.detectedRooms);
    ui.detectedRooms = reconciliados;
    detectedRoomsStore.set(reconciliados);
  }
  function drawGuides() {
    if (!ui.currentFloor) return;
    _drawGuides(getCS(), ui.currentFloor, ui.selectedGuideId, RULER_SIZE);
  }

  function drawStair(stair: Stair, selected: boolean) {
    _drawStair(getCS(), stair, selected);
  }

  function drawColumn(col: Column, selected: boolean) {
    _drawColumn(getCS(), col, selected);
  }

  function drawRulers() {
    if (!ui.ctx || !ui.showRulers) return;
    desenharReguas(getCS(), ui.dimSettings, RULER_SIZE, ui.mousePos);
  }

  function drawBackgroundImage() {
    if (!ui.bgImage || !ui.currentFloor?.backgroundImage) return;
    const bg = ui.currentFloor.backgroundImage;
    const s = worldToScreen(bg.position.x, bg.position.y);
    ui.ctx.save();
    ui.ctx.globalAlpha = bg.opacity;
    ui.ctx.translate(s.x, s.y);
    ui.ctx.rotate(bg.rotation * Math.PI / 180);
    const sw = ui.bgImage.width * bg.scale * ui.zoom;
    const sh = ui.bgImage.height * bg.scale * ui.zoom;
    ui.ctx.drawImage(ui.bgImage, -sw / 2, -sh / 2, sw, sh);
    ui.ctx.restore();
  }


  function getWorldBBox(): { minX: number; minY: number; maxX: number; maxY: number } | null {
    if (!ui.currentFloor) return null;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    let found = false;
    function expand(x: number, y: number) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; found = true; }
    for (const w of ui.currentFloor.walls) { expand(w.start.x, w.start.y); expand(w.end.x, w.end.y); if (w.curvePoint) expand(w.curvePoint.x, w.curvePoint.y); }
    for (const fi of ui.currentFloor.furniture) { const cat = getCatalogItem(fi.catalogId); if (!cat) continue; const r = Math.hypot((fi.width ?? cat.width) / 2, (fi.depth ?? cat.depth) / 2); expand(fi.position.x - r, fi.position.y - r); expand(fi.position.x + r, fi.position.y + r); }
    if (ui.currentFloor.stairs) for (const st of ui.currentFloor.stairs) { expand(st.position.x - st.width / 2, st.position.y - st.depth / 2); expand(st.position.x + st.width / 2, st.position.y + st.depth / 2); }
    if (ui.currentFloor.columns) for (const col of ui.currentFloor.columns) { const r = col.diameter / 2; expand(col.position.x - r, col.position.y - r); expand(col.position.x + r, col.position.y + r); }
    if (!found) return null;
    const pad = 50;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }

  function drawMinimap() {
    if (!ui.showMinimap || !ui.minimapCanvas || !ui.currentFloor) return;
    _drawMinimap(getCS(), ui.minimapCanvas, ui.currentFloor, getWorldBBox);
  }

  return { drawGrid, wallLength, wallPointAt, wallTangentAt, wallThicknessScreen,
    drawDoorDistanceDimensions, drawWindowDistanceDimensions, drawWall, drawDoorOnWall,
    drawWindowOnWall, drawFurniture, drawPersistedMeasurements, hitTestMeasurement,
    drawAnnotation, drawAnnotations, hitTestAnnotation, drawTextAnnotations,
    hitTestTextAnnotation, drawWallJoints, drawSnapPoints, drawRooms, updateDetectedRooms,
    drawGuides, drawStair, drawColumn, drawRulers, drawBackgroundImage, getWorldBBox, drawMinimap };
}

export type Adaptadores = ReturnType<typeof criarAdaptadores>;
