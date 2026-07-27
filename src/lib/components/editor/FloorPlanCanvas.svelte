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
  import { criarNucleo } from './canvas/nucleo';
  import { criarInteracao } from './canvas/interacao';
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

  /** Estado de interface do canvas — ver canvas/estadoCanvas.svelte.ts */
  const ui = new EstadoCanvas();

  /** Coordenadas, encaixe e caixas de seleção — compartilhados por desenho e interação. */
  const n = criarNucleo(ui);
  const { markDirty, getCS, snap, screenToWorld, worldToScreen, bboxDoAmbienteSelecionado, getMultiSelectBBox } = n;

  /** Desenho do quadro — ver canvas/desenho/ */
  const d = criarDesenho(ui, n);
  const { draw, updateDetectedRooms, drawMinimap, getWorldBBox } = d;

  /** Tratadores de evento — ver canvas/interacao/ */
  const acoes = criarInteracao(ui, n, d);
  const {
    onMouseDown, onMouseMove, onMouseUp, onDblClick, onWheel,
    onTouchStart, onTouchMove, onTouchEnd, onKeyDown, onKeyUp,
    onDragOver, onDragLeave, onDrop, onContextMenu, rotateSelectedRoom,
    onMinimapClick, zoomToFit,
  } = acoes;

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

  // ── Hit-testing wrappers (delegating to hitTesting.ts) ──────────────

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
