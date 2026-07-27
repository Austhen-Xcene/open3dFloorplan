<script lang="ts">
  import { onMount } from 'svelte';
  import { activeFloor, selectedTool, selectedElementId, selectedElementIds, selectedRoomId, addWall, addDoor, addWindow, updateWall, moveWallEndpoint, moveWallsTogether, resolveRoomOverlap, updateDoor, updateWindow, addFurniture, moveFurniture, commitFurnitureMove, rotateFurniture, rotateRoom90, setFurnitureRotation, scaleFurniture, removeElement, placingFurnitureId, placingRotation, placingDoorType, placingWindowType, detectedRoomsStore, duplicateDoor, duplicateWindow, duplicateFurniture, duplicateWall, moveWallParallel, splitWall, snapEnabled, placingStair, addStair, moveStair, updateStair, placingColumn, placingColumnShape, addColumn, moveColumn, updateColumn, calibrationMode, calibrationPoints, updateBackgroundImage, setBackgroundImage, canvasZoom, canvasCamX, canvasCamY, panMode, showFurnitureStore, addGuide, moveGuide, removeGuide, beginUndoGroup, endUndoGroup, layerVisibility, updateRoom, addMeasurement, removeMeasurement, addAnnotation, removeAnnotation, updateAnnotation, addTextAnnotation, removeTextAnnotation, updateTextAnnotation, moveTextAnnotation, toggleFurnitureLock, createGroup, ungroupElements, findGroupForElement } from '$lib/stores/project';
  import type { Point, Wall, Door, Window as Win, FurnitureItem, Stair, Column, GuideLine, Measurement, Annotation, TextAnnotation } from '$lib/models/types';
  import type { Floor, Room } from '$lib/models/types';
  import { detectRooms, getRoomPolygon, roomCentroid } from '$lib/utils/roomDetection';
  import { getMaterial } from '$lib/utils/materials';
  import { getCatalogItem } from '$lib/utils/furnitureCatalog';
  import { drawFurnitureIcon } from '$lib/utils/icones';
  import { handleGlobalShortcut } from '$lib/utils/shortcuts';
  import { drawRulers as desenharReguas } from '$lib/utils/renderizador';
  import { encaixarNaParede } from '$lib/utils/encaixeParede';
  import { executarAcaoMenuContexto } from './canvas/acoesMenuContexto';
  import { assinaturaGeometria, reconciliarAmbientes } from '$lib/utils/reconciliarAmbientes';
  import { EstadoCanvas, type HandleType } from './canvas/estadoCanvas.svelte';
  import { criarDesenho } from './canvas/desenho';
  import ContextMenu from './ContextMenu.svelte';
  import BarraStatus from './canvas/BarraStatus.svelte';
  import PainelCamadas from './canvas/PainelCamadas.svelte';
  import DicaFerramenta from './canvas/DicaFerramenta.svelte';
  import ControleZoomCanvas from './canvas/ControleZoomCanvas.svelte';
  import BarraElementoSelecionado from './canvas/BarraElementoSelecionado.svelte';
  import EditorTextoInline from './canvas/EditorTextoInline.svelte';
  import { roomPresets, placePreset } from '$lib/utils/ambientes';
  import { getWallTextureCanvas, getFloorTextureCanvas, setTextureLoadCallback } from '$lib/utils/texturas';
  import { projectSettings, formatLength, formatArea } from '$lib/stores/settings';
  import type { ProjectSettings } from '$lib/stores/settings';
  import type { CanvasState } from '$lib/utils/canvasInteraction';
  import { drawWall as _drawWall, drawDoorOnWall as _drawDoorOnWall, drawWindowOnWall as _drawWindowOnWall, drawDoorDistanceDimensions as _drawDoorDistanceDimensions, drawWindowDistanceDimensions as _drawWindowDistanceDimensions, drawFurnitureItem, drawStair as _drawStair, drawColumn as _drawColumn, drawGuides as _drawGuides, drawPersistedMeasurements as _drawPersistedMeasurements, drawTextAnnotations as _drawTextAnnotations, drawAnnotation as _drawAnnotation, drawAnnotations as _drawAnnotations, drawRooms as _drawRooms, drawWallJoints as _drawWallJoints, drawSnapPoints as _drawSnapPoints, drawMinimap as _drawMinimap } from '$lib/utils/renderizador';
  import { pointInPolygon, positionOnWall, findWallAt as _findWallAt, findHandleAt as _findHandleAt, findFurnitureAt as _findFurnitureAt, findColumnAt as _findColumnAt, findStairAt as _findStairAt, findDoorAt as _findDoorAt, findWindowAt as _findWindowAt, findRoomAt as _findRoomAt, hitTestMeasurement as _hitTestMeasurement, hitTestAnnotation as _hitTestAnnotation, hitTestTextAnnotation as _hitTestTextAnnotation } from '$lib/utils/hitTesting';

  /** Estado de interface do canvas — ver canvas/estadoCanvas.svelte.ts */
  const ui = new EstadoCanvas();

  /** Delegações mantidas para não reescrever as ~200 chamadas existentes. */
  function markDirty() { ui.canvasDirty = true; }
  const getCS = () => ui.getCS();


  // Camera

  // O laço de desenho só repinta quando `canvasDirty` está marcado.
  canvasZoom.subscribe(v => { ui.zoom = v; });
  $effect(() => { canvasZoom.set(ui.zoom); });
  $effect(() => { canvasCamX.set(ui.camX); });
  $effect(() => { canvasCamY.set(ui.camY); });

  /**
   * Alternar grade, réguas, minimapa ou camada muda o que deve aparecer, mas não passa
   * por nenhum handler que marque o canvas como sujo — sem isto, a mudança só aparecia
   * no próximo movimento do mouse.
   */
  $effect(() => {
    void ui.showGrid; void ui.showRulers; void ui.showMinimap;
    void ui.showRoomLabels; void ui.showDimensions;
    void ui.layerVis.walls; void ui.layerVis.doors; void ui.layerVis.windows;
    void ui.layerVis.furniture; void ui.layerVis.stairs; void ui.layerVis.columns;
    void ui.layerVis.guides; void ui.layerVis.measurements; void ui.layerVis.annotations;
    void ui.dimSettings;
    markDirty();
  });

  // Wall drawing state
  // Digits typed while drawing a wall — Enter places the wall at exactly this length (issue #6)

  // Pan state

  // Furniture drag state

  // Guide lines

  // Measurement tool

  // Annotation tool (dimension annotations)

  // Text annotation tool

  // Grid toggle

  // Ruler toggle

  // Layer visibility toggles
  // Sync showFurnitureStore ↔ layerVisibility.furniture
  $effect(() => { showFurnitureStore.set(ui.layerVis.furniture); });
  projectSettings.subscribe((s) => {
    ui.dimSettings = s;
    ui.showDimensions = s.showDimensions;
  });
  const RULER_SIZE = 24;

  // Detected rooms

  const GRID = 20;
  const SNAP = 10;
  const MAGNETIC_SNAP = 15;
  const WALL_SNAP_DIST = 30; // cm — distance threshold to snap furniture to wall

  // Store subscriptions

  // Room label drag state

  // Room drag state

  // Wall endpoint drag state (includes all connected walls at the corner)

  // Resize/rotate handle drag state

  // Wall parallel drag state (drag midpoint to move wall parallel)

  // Curve handle drag state

  // Wall snap state for visual feedback

  // Door/window placement preview state

  // Marquee (drag-to-select) state

  // Multi-select drag state

  // Clipboard for copy/paste (Ctrl+C / Ctrl+V)

  // Context menu state

  /**
   * Compute bounding box of all multi-selected elements.
   */
  /**
   * Caixa do ambiente selecionado, a partir do polígono dele.
   *
   * Não usa `getMultiSelectBBox` de propósito: inserir pelo formulário seleciona o
   * ambiente mas não monta a seleção das 4 paredes, e o botão de girar sumia.
   */
  function bboxDoAmbienteSelecionado(): { minX: number; minY: number; maxX: number; maxY: number } | null {
    if (!ui.currentSelectedRoomId || !ui.currentFloor) return null;
    const ambiente = ui.currentFloor.rooms.find((r) => r.id === ui.currentSelectedRoomId)
      ?? ui.detectedRooms.find((r) => r.id === ui.currentSelectedRoomId);
    if (!ambiente) return null;
    const poligono = getRoomPolygon(ambiente, ui.currentFloor.walls);
    if (poligono.length < 3) return null;
    const xs = poligono.map((p) => p.x);
    const ys = poligono.map((p) => p.y);
    return { minX: Math.min(...xs), maxX: Math.max(...xs), minY: Math.min(...ys), maxY: Math.max(...ys) };
  }

  function getMultiSelectBBox(): { minX: number; minY: number; maxX: number; maxY: number } | null {
    if (ui.currentSelectedIds.size < 2 || !ui.currentFloor) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let found = false;
    function expand(x: number, y: number) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y; found = true; }
    for (const id of ui.currentSelectedIds) {
      const wall = ui.currentFloor!.walls.find(w => w.id === id);
      if (wall) { expand(wall.start.x, wall.start.y); expand(wall.end.x, wall.end.y); continue; }
      const fi = ui.currentFloor!.furniture.find(f => f.id === id);
      if (fi) { expand(fi.position.x, fi.position.y); continue; }
      if (ui.currentFloor!.stairs) { const st = ui.currentFloor!.stairs.find(s => s.id === id); if (st) { expand(st.position.x, st.position.y); continue; } }
      if (ui.currentFloor!.columns) { const col = ui.currentFloor!.columns.find(c => c.id === id); if (col) { expand(col.position.x, col.position.y); continue; } }
      // doors/windows — compute position on wall
      const door = ui.currentFloor!.doors.find(d => d.id === id);
      if (door) { const w = ui.currentFloor!.walls.find(w => w.id === door.wallId); if (w) { const cx = w.start.x + (w.end.x - w.start.x) * door.position; const cy = w.start.y + (w.end.y - w.start.y) * door.position; expand(cx, cy); } continue; }
      const win = ui.currentFloor!.windows.find(w => w.id === id);
      if (win) { const w = ui.currentFloor!.walls.find(w => w.id === win.wallId); if (w) { const cx = w.start.x + (w.end.x - w.start.x) * win.position; const cy = w.start.y + (w.end.y - w.start.y) * win.position; expand(cx, cy); } continue; }
    }
    if (!found) return null;
    const pad = 20;
    return { minX: minX - pad, minY: minY - pad, maxX: maxX + pad, maxY: maxY + pad };
  }

  /**
   * Snap furniture position so its edge is flush against the nearest wall.
   * Returns adjusted position and rotation, or null if no wall is close enough.
   */
  function snapFurnitureToWall(pos: Point, catalogId: string, currentRotation: number) {
    if (!ui.currentFloor) return null;
    return encaixarNaParede(ui.currentFloor, pos, catalogId, WALL_SNAP_DIST, snap);
  }

  function snap(v: number): number {
    if (!ui.currentSnapEnabled) return v;
    const step = ui.currentSnapToGrid ? ui.currentGridSize : SNAP;
    return Math.round(v / step) * step;
  }

  function screenToWorld(sx: number, sy: number): Point {
    return { x: (sx - ui.width / 2) / ui.zoom + ui.camX, y: (sy - ui.height / 2) / ui.zoom + ui.camY };
  }

  function worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: (wx - ui.camX) * ui.zoom + ui.width / 2, y: (wy - ui.camY) * ui.zoom + ui.height / 2 };
  }

  /** Find all other wall endpoints that share the same point (within tolerance) */
  function findConnectedEndpoints(pt: Point, excludeWallId: string): { wallId: string; endpoint: 'start' | 'end' }[] {
    const tolerance = 2;
    const results: { wallId: string; endpoint: 'start' | 'end' }[] = [];
    if (!ui.currentFloor) return results;
    for (const w of ui.currentFloor.walls) {
      if (w.id === excludeWallId) continue;
      if (Math.hypot(w.start.x - pt.x, w.start.y - pt.y) < tolerance) {
        results.push({ wallId: w.id, endpoint: 'start' });
      }
      if (Math.hypot(w.end.x - pt.x, w.end.y - pt.y) < tolerance) {
        results.push({ wallId: w.id, endpoint: 'end' });
      }
    }
    return results;
  }

  /**
   * Generated environments keep independent coincident walls at their
   * boundaries. When editing one wall, only stretch walls owned by the same
   * saved environment so the neighbour's boundary remains untouched.
   */
  function findOwnedConnectedEndpoints(
    pt: Point,
    wallId: string,
  ): { wallId: string; endpoint: 'start' | 'end' }[] {
    const connected = findConnectedEndpoints(pt, wallId);
    if (!ui.currentFloor) return connected;
    const owner = ui.currentFloor.rooms.find((room) => room.walls.includes(wallId));
    if (!owner) return connected;
    const ownedWallIds = new Set(owner.walls);
    return connected.filter((item) => ownedWallIds.has(item.wallId));
  }

  function magneticSnap(p: Point, excludeWallIds?: Set<string>): Point & { snappedToEndpoint?: boolean; snappedToWall?: boolean; snappedWallId?: string } {
    if (!ui.currentFloor) return { x: snap(p.x), y: snap(p.y) };
    let best: Point & { snappedToEndpoint?: boolean; snappedToWall?: boolean; snappedWallId?: string } = { x: snap(p.x), y: snap(p.y) };
    let bestDist = MAGNETIC_SNAP / ui.zoom;
    // First pass: snap to endpoints (highest priority)
    for (const w of ui.currentFloor.walls) {
      if (excludeWallIds && excludeWallIds.has(w.id)) continue;
      for (const ep of [w.start, w.end]) {
        const d = Math.hypot(p.x - ep.x, p.y - ep.y);
        if (d < bestDist) {
          bestDist = d;
          best = { x: ep.x, y: ep.y, snappedToEndpoint: true };
        }
      }
    }
    // Second pass: snap to nearest point on wall segments (lower priority, only if no endpoint snap)
    if (!best.snappedToEndpoint) {
      const wallSnapThreshold = (MAGNETIC_SNAP + 10) / ui.zoom;
      let bestWallDist = wallSnapThreshold;
      for (const w of ui.currentFloor.walls) {
        if (excludeWallIds && excludeWallIds.has(w.id)) continue;
        const wx = w.end.x - w.start.x;
        const wy = w.end.y - w.start.y;
        const wLen = Math.hypot(wx, wy);
        if (wLen < 1) continue;
        // Project p onto the wall segment
        const t = ((p.x - w.start.x) * wx + (p.y - w.start.y) * wy) / (wLen * wLen);
        if (t < 0.02 || t > 0.98) continue; // skip near endpoints (already handled)
        const projX = w.start.x + wx * t;
        const projY = w.start.y + wy * t;
        const d = Math.hypot(p.x - projX, p.y - projY);
        if (d < bestWallDist) {
          bestWallDist = d;
          best = { x: projX, y: projY, snappedToWall: true, snappedWallId: w.id };
        }
      }
    }
    return best;
  }

  function angleSnap(start: Point, end: Point): Point {
    if (!ui.currentSnapEnabled) return end;
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy);
    if (len < 5) return end;
    const angle = Math.atan2(dy, dx);
    const snapAngles = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -Math.PI, -3 * Math.PI / 4, -Math.PI / 2, -Math.PI / 4];
    const ANGLE_THRESHOLD = Math.PI / 18;
    for (const sa of snapAngles) {
      if (Math.abs(angle - sa) < ANGLE_THRESHOLD) {
        return { x: start.x + len * Math.cos(sa), y: start.y + len * Math.sin(sa) };
      }
    }
    return end;
  }

  function resize() {
    const parent = ui.canvas?.parentElement;
    if (!parent) return;
    ui.width = parent.clientWidth;
    ui.height = parent.clientHeight;
    if (ui.canvas) {
      ui.canvas.width = ui.width;
      ui.canvas.height = ui.height;
    }
    markDirty();
  }

  /** Bloco de desenho — ver canvas/desenho/. */
  const desenho = criarDesenho(ui, {
    markDirty, getCS, getMultiSelectBBox, snapFurnitureToWall,
    worldToScreen, snapWallEndPoint, typedWallLengthCm, applyTypedWallLength,
  });
  const {
    draw, scheduleDraw, updateDetectedRooms, drawMinimap, getWorldBBox,
    wallPointAt, hitTestMeasurement, hitTestAnnotation, hitTestTextAnnotation,
  } = desenho;

  onMount(() => {
    ui.ctx = ui.canvas.getContext('2d')!;
    resize();
    // Re-render when photo textures finish loading
    setTextureLoadCallback(() => { /* draw loop is already running via rAF */ });
    const resizeObs = new ResizeObserver(resize);
    resizeObs.observe(ui.canvas.parentElement!);
    requestAnimationFrame(draw);

    let initialFitDone = false;
    const unsub1 = activeFloor.subscribe((f) => {
      ui.currentFloor = f;
      markDirty();
      if (!initialFitDone && f && f.walls.length > 0) {
        initialFitDone = true;
        // Delay slightly to ensure canvas is sized
        requestAnimationFrame(() => { zoomToFit(); });
      }
    });
    const unsub2 = selectedElementId.subscribe((id) => { ui.currentSelectedId = id; markDirty(); });
    const unsub3 = selectedRoomId.subscribe((id) => { ui.currentSelectedRoomId = id; markDirty(); });
    const unsub4 = placingFurnitureId.subscribe((id) => { ui.currentPlacingId = id; markDirty(); });
    const unsub5 = placingRotation.subscribe((r) => { ui.currentPlacingRotation = r; markDirty(); });
    const unsub6 = selectedTool.subscribe((t) => {
      ui.currentTool = t;
      ui.textAnnotationMode = t === 'text';
      if (t !== 'text') { ui.editingTextAnnotationId = null; }
      markDirty();
    });
    const unsub7 = detectedRoomsStore.subscribe((rooms) => { if (rooms.length > 0) ui.detectedRooms = rooms; markDirty(); });
    const unsub8 = placingDoorType.subscribe((t) => { ui.currentDoorType = t; markDirty(); });
    const unsub9 = placingWindowType.subscribe((t) => { ui.currentWindowType = t; markDirty(); });
    const unsub10 = snapEnabled.subscribe((v) => { ui.currentSnapEnabled = v; markDirty(); });
    const unsub_snapgrid = projectSettings.subscribe((s) => { ui.currentSnapToGrid = s.snapToGrid; ui.currentGridSize = s.gridSize; markDirty(); });
    const unsub11 = placingStair.subscribe((v) => { ui.isPlacingStair = v; markDirty(); });
    const unsub_layers = layerVisibility.subscribe((v) => { ui.layerVis = v; markDirty(); });
    const unsub_col = placingColumn.subscribe((v) => { ui.isPlacingColumn = v; markDirty(); });
    const unsub_cols = placingColumnShape.subscribe((v) => { ui.placingColShape = v; markDirty(); });
    const unsub12 = calibrationMode.subscribe((v) => { ui.isCalibrating = v; markDirty(); });
    const unsub13 = calibrationPoints.subscribe((pts) => { ui.calPoints = pts; markDirty(); });
    const unsub_multi = selectedElementIds.subscribe((ids) => { ui.currentSelectedIds = ids; markDirty(); });
    const unsub14 = activeFloor.subscribe((f) => {
      if (f?.backgroundImage?.dataUrl && (!ui.bgImage || ui.bgImage.src !== f.backgroundImage.dataUrl)) {
        const img = new Image();
        img.onload = () => { ui.bgImage = img; };
        img.src = f.backgroundImage.dataUrl;
      } else if (!f?.backgroundImage) {
        ui.bgImage = null;
      }
    });

    // Clipboard image paste handler — only if no internal furniture clipboard
    function handlePaste(e: ClipboardEvent) {
      if (!e.clipboardData) return;
      if (ui.clipboard && ui.clipboard.items.length > 0) return; // internal clipboard takes priority
      const files = e.clipboardData.files;
      for (let i = 0; i < files.length; i++) {
        if (files[i].type.startsWith('image/')) {
          e.preventDefault();
          const reader = new FileReader();
          reader.onload = () => {
            setBackgroundImage({
              dataUrl: reader.result as string,
              position: { x: ui.camX, y: ui.camY },
              scale: 1,
              opacity: 0.5,
              rotation: 0,
              locked: false
            });
          };
          reader.readAsDataURL(files[i]);
          return;
        }
      }
    }
    document.addEventListener('paste', handlePaste);

    // Touch input — registered manually so the handlers are non-passive
    // (Svelte attaches touch listeners passively, which blocks preventDefault)
    ui.canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    ui.canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    ui.canvas.addEventListener('touchend', onTouchEnd, { passive: false });
    ui.canvas.addEventListener('touchcancel', onTouchEnd, { passive: false });

    return () => { resizeObs.disconnect(); unsub1(); unsub2(); unsub3(); unsub4(); unsub5(); unsub6(); unsub7(); unsub8(); unsub9(); unsub10(); unsub11(); unsub12(); unsub13(); unsub_multi(); unsub14(); unsub_col(); unsub_cols(); unsub_layers(); unsub_snapgrid(); document.removeEventListener('paste', handlePaste); ui.canvas.removeEventListener('touchstart', onTouchStart); ui.canvas.removeEventListener('touchmove', onTouchMove); ui.canvas.removeEventListener('touchend', onTouchEnd); ui.canvas.removeEventListener('touchcancel', onTouchEnd); };
  });

  /** Compute world bounding box of all elements */
  function onMinimapClick(e: MouseEvent) {
    if (!ui.minimapCanvas || !ui.currentFloor) return;
    const rect = ui.minimapCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const mw = ui.minimapCanvas.width;
    const mh = ui.minimapCanvas.height;

    const bbox = getWorldBBox();
    if (!bbox) return;
    const bw = bbox.maxX - bbox.minX;
    const bh = bbox.maxY - bbox.minY;
    if (bw < 1 || bh < 1) return;
    const scale = Math.min((mw - 8) / bw, (mh - 8) / bh);
    const ox = (mw - bw * scale) / 2;
    const oy = (mh - bh * scale) / 2;

    // Convert mini-map coords to world coords
    ui.camX = bbox.minX + (mx - ox) / scale;
    ui.camY = bbox.minY + (my - oy) / scale;
  }

  function zoomToFit() {
    if (!ui.currentFloor || (ui.currentFloor.walls.length === 0 && ui.currentFloor.furniture.length === 0)) {
      ui.camX = 0; ui.camY = 0; ui.zoom = 1;
      return;
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    function expand(x: number, y: number) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    // Walls (including curve control points)
    for (const w of ui.currentFloor.walls) {
      expand(w.start.x, w.start.y);
      expand(w.end.x, w.end.y);
      if (w.curvePoint) expand(w.curvePoint.x, w.curvePoint.y);
    }
    // Furniture
    for (const fi of ui.currentFloor.furniture) {
      const cat = getCatalogItem(fi.catalogId);
      if (!cat) continue;
      const hw = (fi.width ?? cat.width) / 2;
      const hd = (fi.depth ?? cat.depth) / 2;
      const r = Math.hypot(hw, hd); // conservative radius for rotated items
      expand(fi.position.x - r, fi.position.y - r);
      expand(fi.position.x + r, fi.position.y + r);
    }
    // Doors & windows (position on their parent wall)
    for (const d of ui.currentFloor.doors) {
      const w = ui.currentFloor.walls.find(wl => wl.id === d.wallId);
      if (w) { const pt = wallPointAt(w, d.position); expand(pt.x, pt.y); }
    }
    for (const win of ui.currentFloor.windows) {
      const w = ui.currentFloor.walls.find(wl => wl.id === win.wallId);
      if (w) { const pt = wallPointAt(w, win.position); expand(pt.x, pt.y); }
    }
    // Stairs
    if (ui.currentFloor.stairs) {
      for (const st of ui.currentFloor.stairs) {
        expand(st.position.x - st.width / 2, st.position.y - st.depth / 2);
        expand(st.position.x + st.width / 2, st.position.y + st.depth / 2);
      }
    }
    // Columns
    if (ui.currentFloor.columns) {
      for (const col of ui.currentFloor.columns) {
        const r = col.diameter / 2;
        expand(col.position.x - r, col.position.y - r);
        expand(col.position.x + r, col.position.y + r);
      }
    }
    if (minX === Infinity) { ui.camX = 0; ui.camY = 0; ui.zoom = 1; return; }
    const padding = 80;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    ui.camX = (minX + maxX) / 2;
    ui.camY = (minY + maxY) / 2;
    ui.zoom = Math.min(ui.width / contentW, ui.height / contentH, 3);
    ui.zoom = Math.max(ui.zoom, 0.1);
    markDirty();
  }

  // ── Hit-testing wrappers (delegating to hitTesting.ts) ──────────────

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

  function onMouseDown(e: MouseEvent) {
    markDirty();
    if (e.button === 1 || (e.button === 0 && (ui.spaceDown || $panMode || (e.shiftKey && ui.currentTool === 'select')))) {
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
  function snapWallEndPoint(raw: Point): Point {
    let endPt = magneticSnap(raw);
    if (!ui.wallStart) return endPt;
    if (ui.shiftDown) {
      // Force strict angle snap when Shift is held (0°, 45°, 90°, 135°, 180°)
      const sdx = endPt.x - ui.wallStart.x;
      const sdy = endPt.y - ui.wallStart.y;
      const slen = Math.hypot(sdx, sdy);
      if (slen > 5) {
        const rawAngle = Math.atan2(sdy, sdx);
        const snapAngles = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, -Math.PI, -3 * Math.PI / 4, -Math.PI / 2, -Math.PI / 4];
        let bestAngle = 0, bestDiff = Infinity;
        for (const sa of snapAngles) { const diff = Math.abs(rawAngle - sa); if (diff < bestDiff) { bestDiff = diff; bestAngle = sa; } }
        endPt = { x: ui.wallStart.x + slen * Math.cos(bestAngle), y: ui.wallStart.y + slen * Math.sin(bestAngle) };
      }
    } else {
      endPt = angleSnap(ui.wallStart, endPt);
    }
    return endPt;
  }

  function typedWallLengthCm(): number | null {
    const v = parseFloat(ui.typedWallLength);
    if (!isFinite(v) || v <= 0) return null;
    return ui.dimSettings.units === 'imperial' ? v * 2.54 : v;
  }

  /** Override the wall end point to the exact typed length along the current direction. */
  function applyTypedWallLength(endPt: Point): Point {
    const lenCm = typedWallLengthCm();
    if (!ui.wallStart || lenCm === null) return endPt;
    const dx = endPt.x - ui.wallStart.x, dy = endPt.y - ui.wallStart.y;
    const d = Math.hypot(dx, dy);
    if (d < 0.001) return endPt;
    return { x: ui.wallStart.x + (dx / d) * lenCm, y: ui.wallStart.y + (dy / d) * lenCm };
  }

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

  function handleContextMenuAction(action: string) {
    if (!ui.currentFloor) return;
    executarAcaoMenuContexto(action, {
      pavimento: ui.currentFloor,
      idAlvo: ui.ctxMenuTargetId,
      parede: ui.ctxMenuWall,
      ambiente: ui.ctxMenuRoom,
      idsSelecionados: ui.currentSelectedIds,
      enquadrar: () => zoomToFit(),
    });
  }

  let cursorStyle = $derived(
    ui.spaceDown || ui.isPanning || $panMode || (ui.shiftDown && ui.currentTool === 'select') ? 'grab' :
    ui.draggingFurnitureId ? 'move' :
    ui.draggingRoomId ? 'move' :
    ui.draggingMultiSelect ? 'move' :
    ui.draggingDoorId ? 'move' :
    ui.draggingWindowId ? 'move' :
    ui.draggingStairId ? 'move' :
    ui.draggingColumnId ? 'move' :
    ui.draggingTextAnnotationId ? 'move' :
    ui.draggingWallParallel ? 'move' :
    ui.draggingCurveHandle ? 'crosshair' :
    ui.draggingWallEndpoint ? 'crosshair' :
    ui.draggingHandle === 'rotate' ? 'grabbing' :
    (ui.draggingHandle === 'resize-t' || ui.draggingHandle === 'resize-b') ? 'ns-resize' :
    (ui.draggingHandle === 'resize-l' || ui.draggingHandle === 'resize-r') ? 'ew-resize' :
    ui.draggingHandle?.startsWith('resize') ? 'nwse-resize' :
    ui.currentTool === 'text' ? 'text' :
    ui.currentTool === 'select' ? 'default' :
    ui.currentTool === 'furniture' ? 'copy' :
    (ui.currentTool === 'door' || ui.currentTool === 'window') ? (ui.placementPreview ? 'crosshair' : 'not-allowed') :
    'crosshair'
  );
</script>
<svelte:window on:keydown={onKeyDown} on:keyup={onKeyUp} />

<div class="w-full h-full relative overflow-hidden" role="application">
  <canvas
    bind:this={ui.canvas}
    class="block w-full h-full touch-none"
    tabindex="0"
    aria-label="Área de desenho da planta"
    style="cursor: {cursorStyle}"
    onmousedown={onMouseDown}
    onmousemove={onMouseMove}
    onmouseup={onMouseUp}
    ondblclick={onDblClick}
    onwheel={onWheel}
    oncontextmenu={onContextMenu}
    ondragover={onDragOver}
    ondragleave={onDragLeave}
    ondrop={onDrop}
  ></canvas>

  {#if ui.currentSelectedRoomId && ui.currentFloor && ui.currentTool === 'select'}
    {@const bbox = bboxDoAmbienteSelecionado()}
    {#if bbox}
      {@const pos = worldToScreen((bbox.minX + bbox.maxX) / 2, bbox.minY)}
      <button
        class="absolute z-50 h-9 flex items-center gap-2 rounded-lg bg-slate-800 px-4 text-sm font-medium text-blue-300 shadow-lg hover:bg-slate-700 hover:text-blue-200 transition-colors"
        style="left: {pos.x}px; top: {pos.y - 8}px; transform: translate(-50%, -100%);"
        title="Girar ambiente 90°"
        aria-label="Girar ambiente 90 graus"
        onclick={rotateSelectedRoom}
      >
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12a9 9 0 1 1-2.64-6.36"/>
          <path d="M21 3v6h-6"/>
        </svg>
        <span>Girar ambiente</span>
      </button>
    {/if}
  {/if}

  <EditorTextoInline
    bind:id={ui.editingTextAnnotationId}
    bind:valor={ui.editingTextAnnotationValue}
    posicao={ui.editingTextAnnotationPos}
    pavimento={ui.currentFloor}
    onEncerrar={() => { ui.selectedTextAnnotationId = null; markDirty(); }}
  />

  {#if ui.currentFloor && ui.currentFloor.walls.length === 0 && ui.currentFloor.furniture.length === 0 && ui.currentFloor.doors.length === 0}
    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div class="text-center opacity-60">
        <div class="text-5xl mb-3">🏠</div>
        <div class="text-sm font-medium text-gray-500">Comece a planta da sua casa</div>
        <div class="text-xs text-gray-400 mt-1">Use as ferramentas da lateral para inserir os ambientes</div>
      </div>
    </div>
  {/if}

  {#if ui.showMinimap && ui.currentFloor && ui.currentFloor.walls.length > 0}
    <canvas
      bind:this={ui.minimapCanvas}
      width="180"
      height="120"
      class="absolute bottom-10 right-2 rounded-lg shadow-lg border border-gray-300 cursor-crosshair bg-white max-md:hidden"
      style="z-index: 15;"
      onclick={onMinimapClick}
    ></canvas>
  {/if}

  <BarraStatus
    pavimento={ui.currentFloor}
    ambientesDetectados={ui.detectedRooms}
    zoom={ui.zoom}
    qtdSelecionada={ui.currentSelectedRoomId ? 0 : ui.currentSelectedIds.size}
    bind:grade={ui.showGrid}
    bind:reguas={ui.showRulers}
    bind:minimapa={ui.showMinimap}
    bind:painelCamadas={ui.showLayerPanel}
    mostrarEquipamentos={ui.showFurniture}
    encaixeNaGrade={ui.currentSnapToGrid}
    onEnquadrar={() => zoomToFit()}
  />

  {#if ui.showLayerPanel}
    <PainelCamadas
      visibilidade={ui.layerVis}
      bind:rotulosAmbiente={ui.showRoomLabels}
      bind:cotas={ui.showDimensions}
    />
  {/if}

  {#if (ui.currentSelectedId || ui.currentSelectedIds.size > 0) && ui.currentFloor && ui.currentTool === 'select'}
    <BarraElementoSelecionado
      pavimento={ui.currentFloor}
      idSelecionado={ui.currentSelectedId}
      idsSelecionados={ui.currentSelectedIds}
      paraTela={worldToScreen}
    />
  {/if}

  <DicaFerramenta
    ferramenta={ui.currentTool}
    desenhandoParede={!!ui.wallStart}
    idEmColocacao={ui.currentPlacingId}
    rotacaoEmColocacao={ui.currentPlacingRotation}
    medindo={ui.measuring}
    anotandoTexto={ui.textAnnotationMode}
    anotandoCota={ui.annotating}
    primeiroPontoCota={!!ui.annotationStart}
  />

  <ControleZoomCanvas bind:zoom={ui.zoom} onEnquadrar={() => zoomToFit()} />

  <ContextMenu
    x={ui.ctxMenuX}
    y={ui.ctxMenuY}
    visible={ui.ctxMenuVisible}
    targetType={ui.ctxMenuTargetType}
    targetId={ui.ctxMenuTargetId}
    targetWall={ui.ctxMenuWall}
    targetFurniture={ui.ctxMenuFurniture}
    targetRoom={ui.ctxMenuRoom}
    clipboard={ui.clipboard}
    onclose={() => { ui.ctxMenuVisible = false; }}
    onaction={handleContextMenuAction}
  />
</div>
