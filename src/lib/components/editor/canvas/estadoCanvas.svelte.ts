/**
 * Estado da área de desenho.
 *
 * Uma instância por FloorPlanCanvas. Existe para que o desenho e os tratadores de
 * evento possam morar em módulos próprios em vez de num componente de 4000 linhas:
 * todos recebem esta instância em vez de fechar sobre variáveis soltas.
 *
 * Campos declarados com `$state` são reativos (o markup depende deles). Os demais
 * são de trabalho — lidos e escritos dentro de um mesmo gesto, sem passar pela tela.
 *
 * ATENÇÃO: isto é ESTADO DE INTERFACE, não dado do projeto. Nada aqui é persistido.
 * O projeto do usuário vive em `stores/project` e só muda por `mutate`.
 */
import type { Point, Wall, Door, Window as Win, FurnitureItem, Floor, Room } from '$lib/models/types';
import type { ProjectSettings } from '$lib/stores/settings';
import type { CanvasState } from '$lib/utils/canvasInteraction';

export type HandleType =
  | 'resize-tl' | 'resize-tr' | 'resize-bl' | 'resize-br'
  | 'resize-t' | 'resize-b' | 'resize-l' | 'resize-r'
  | 'rotate';

export class EstadoCanvas {
  // ── Viewport e câmera ───────────────────────────────────────────────────
  /** Atribuídos por `bind:this` na montagem — nunca leia antes do onMount. */
  canvas!: HTMLCanvasElement;
  ctx!: CanvasRenderingContext2D;
  width = $state(800);
  height = $state(600);
  camX = $state(0);
  camY = $state(0);
  zoom = $state(1);
  minimapCanvas!: HTMLCanvasElement;

  // ── Espelho das stores — sincronizado nas subscrições do onMount ────────
  currentFloor: Floor | null = $state(null);
  currentSelectedId: string | null = $state(null);
  currentSelectedRoomId: string | null = $state(null);
  currentSelectedIds: Set<string> = $state(new Set());
  currentPlacingId: string | null = $state(null);
  currentPlacingRotation: number = $state(0);
  currentTool: string = $state('select');
  currentDoorType: Door['type'] = $state('single');
  currentWindowType: Win['type'] = $state('standard');
  currentSnapEnabled: boolean = $state(true);
  currentSnapToGrid: boolean = $state(true);
  currentGridSize: number = $state(25);
  isPlacingStair: boolean = $state(false);
  isPlacingColumn: boolean = $state(false);
  placingColShape: 'round' | 'square' = $state('round');
  isCalibrating: boolean = $state(false);
  calPoints: Point[] = $state([]);
  bgImage: HTMLImageElement | null = $state(null);

  // ── Desenho de parede ───────────────────────────────────────────────────
  wallStart: Point | null = $state(null);
  typedWallLength = $state('');
  wallSequenceFirst: Point | null = $state(null);
  mousePos: Point = $state({ x: 0, y: 0 });

  // ── Navegação (pan) e modificadores de teclado ──────────────────────────
  isPanning = $state(false);
  panStartX = 0;
  panStartY = 0;
  spaceDown = $state(false);
  shiftDown = $state(false);

  // ── Arrasto de elementos ────────────────────────────────────────────────
  draggingFurnitureId: string | null = $state(null);
  dragOffset: Point = { x: 0, y: 0 };
  dragStartRotation: number = 0;
  dragWasWallSnapped: boolean = false;
  draggingDoorId: string | null = $state(null);
  draggingWindowId: string | null = $state(null);
  draggingStairId: string | null = $state(null);
  stairDragOffset: Point = { x: 0, y: 0 };
  draggingColumnId: string | null = $state(null);
  columnDragOffset: Point = { x: 0, y: 0 };
  draggingGuideId: string | null = $state(null);
  draggingTextAnnotationId: string | null = $state(null);
  textAnnotationDragOffset: Point = { x: 0, y: 0 };
  dragPreview: { x: number; y: number; type: string; width: number; depth: number } | null = $state(null);
  /**
   * O ponteiro andou o bastante para valer como arrasto?
   * Separa clique de arrasto: só arrasto de verdade entra no histórico.
   */
  arrastouDeVerdade = false;

  // ── Arrasto de ambiente e do rótulo dele ────────────────────────────────
  draggingRoomLabelId: string | null = $state(null);
  roomLabelDragStart: Point = { x: 0, y: 0 };
  roomLabelOrigOffset: Point = { x: 0, y: 0 };
  draggingRoomId: string | null = $state(null);
  roomDragStartMouse: Point = { x: 0, y: 0 };
  roomDragStartPositions: Map<string, { start: Point; end: Point }> = new Map();

  // ── Arrasto de parede: ponta, paralela e curvatura ──────────────────────
  draggingWallEndpoint: { wallId: string; endpoint: 'start' | 'end' } | null = $state(null);
  draggingConnectedEndpoints: { wallId: string; endpoint: 'start' | 'end' }[] = $state([]);
  draggingWallParallel: { wallId: string; startMousePos: Point; origStart: Point; origEnd: Point; origCurve?: Point; connectedStart: { wallId: string; endpoint: 'start' | 'end' }[]; connectedEnd: { wallId: string; endpoint: 'start' | 'end' }[] } | null = $state(null);
  draggingCurveHandle: string | null = $state(null); // wallId being curved

  // ── Alças de redimensionar e girar ──────────────────────────────────────
  draggingHandle = $state<HandleType | null>(null);
  handleDragStart: Point = { x: 0, y: 0 };
  handleOrigScale: { x: number; y: number } = { x: 1, y: 1 };
  handleOrigRotation: number = 0;

  // ── Seleção múltipla (marquee) e arrasto do conjunto ────────────────────
  marqueeStart: Point | null = $state(null);
  marqueeEnd: Point | null = $state(null);
  draggingMultiSelect: { startMousePos: Point; origPositions: Map<string, { start?: Point; end?: Point; position?: Point }> } | null = $state(null);

  // ── Medição, cotas e texto livre ────────────────────────────────────────
  selectedGuideId: string | null = $state(null);
  measureStart: Point | null = $state(null);
  measureEnd: Point | null = $state(null);
  measuring = $state(false);
  selectedMeasurementId: string | null = $state(null);
  annotating = $state(false);
  annotationStart: Point | null = $state(null);
  selectedAnnotationId: string | null = $state(null);
  textAnnotationMode = $state(false);
  editingTextAnnotationId: string | null = $state(null);
  editingTextAnnotationPos: { x: number; y: number } = $state({ x: 0, y: 0 });
  editingTextAnnotationValue: string = $state('');
  selectedTextAnnotationId: string | null = $state(null);

  // ── Encaixe e pré-visualização ──────────────────────────────────────────
  wallSnapInfo: { wallId: string; side: 'normal' | 'anti'; wallAngle: number } | null = $state(null);
  placementPreview: { wallId: string; position: number; type: 'door' | 'window' } | null = $state(null);

  // ── Visualização: camadas, grade, réguas, minimapa ──────────────────────
  showGrid = $state(true);
  showRulers = $state(true);
  layerVis = $state({ walls: true, doors: true, windows: true, furniture: true, stairs: true, columns: true, guides: true, measurements: true, annotations: true });
  showRoomLabels = $state(true);
  showDimensions = $state(true);
  dimSettings: ProjectSettings = $state({
    units: 'metric', showDimensions: true, showExternalDimensions: true,
    showInternalDimensions: false, showExtensionLines: true,
    showObjectDistance: true, dimensionLineColor: '#1e293b',
    wallMeasureMode: 'centerline', snapToGrid: true, gridSize: 25,
  });
  showLayerPanel = $state(false);
  showMinimap = $state(true);
  /** Atalhos de leitura para `layerVis` — o desenho consulta estes o tempo todo. */
  showFurniture = $derived(this.layerVis.furniture);
  showDoors = $derived(this.layerVis.doors);
  showWindows = $derived(this.layerVis.windows);
  showStairs = $derived(this.layerVis.stairs);
  /** Marcado a cada alteração; o laço de desenho consome e redesenha. */
  canvasDirty = true;

  // ── Ambientes detectados ────────────────────────────────────────────────
  detectedRooms: Room[] = $state([]);
  lastWallHash = '';

  // ── Área de transferência (Ctrl+C / Ctrl+V) ─────────────────────────────
  clipboard: { items: Array<{ type: 'furniture' | 'door' | 'window'; data: any }> } | null = $state(null);

  // ── Menu de contexto ────────────────────────────────────────────────────
  ctxMenuVisible = $state(false);
  ctxMenuX = $state(0);
  ctxMenuY = $state(0);
  ctxMenuTargetType: 'furniture' | 'wall' | 'door' | 'window' | 'room' | 'canvas' | null = $state(null);
  ctxMenuTargetId: string | null = $state(null);
  ctxMenuWall: Wall | null = $state(null);
  ctxMenuFurniture: FurnitureItem | null = $state(null);
  ctxMenuRoom: Room | null = $state(null);

  /** Recorte atual da câmera, como as funções puras de desenho esperam. */
  getCS(): CanvasState {
    return { ctx: this.ctx, width: this.width, height: this.height, zoom: this.zoom, camX: this.camX, camY: this.camY };
  }
}
