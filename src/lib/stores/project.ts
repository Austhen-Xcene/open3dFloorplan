import { writable, derived, get } from 'svelte/store';
import type { Project, Floor, Wall, Door, Window as Win, FurnitureItem, Point, Room, Stair, Column, BackgroundImage, GuideLine, ElementGroup, EntourageItem } from '$lib/models/types';


function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function createDefaultFloor(level = 0): Floor {
  const id = uid();
  return { id, name: level === 0 ? 'Ground Floor' : `Floor ${level}`, level, walls: [], rooms: [], doors: [], windows: [], furniture: [], stairs: [], columns: [], guides: [], measurements: [], annotations: [], textAnnotations: [], groups: [] };
}

export function createDefaultProject(name = 'Untitled Project'): Project {
  const floor = createDefaultFloor();
  return {
    id: uid(),
    name,
    floors: [floor],
    activeFloorId: floor.id,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export const currentProject = writable<Project | null>(null);

export const activeFloor = derived(currentProject, ($p) => {
  if (!$p) return null;
  return $p.floors.find((f) => f.id === $p.activeFloorId) ?? $p.floors[0] ?? null;
});

export type Tool = 'select' | 'wall' | 'door' | 'window' | 'furniture' | 'text' | 'measure' | 'annotate';
export const selectedTool = writable<Tool>('select');
export const snapEnabled = writable<boolean>(true);
/** When true, left-click drag pans the canvas instead of selecting */
export const panMode = writable<boolean>(false);
export const showFurnitureStore = writable<boolean>(true);
export const selectedElementId = writable<string | null>(null);
/** Multi-select: set of element IDs currently selected (used alongside selectedElementId for marquee/shift-click) */
export const selectedElementIds = writable<Set<string>>(new Set());
export const viewMode = writable<'2d' | '3d'>('2d');

// Undo / Redo
interface UndoEntry {
  state: string;
  description: string;
  timestamp: number;
}
const undoStack: UndoEntry[] = [];
const redoStack: UndoEntry[] = [];

/** Reactive store exposing undo history for the UndoHistoryPanel */
export const undoHistoryStore = writable<{ entries: { description: string; timestamp: number }[]; currentIndex: number }>({ entries: [], currentIndex: -1 });

function syncHistoryStore() {
  const entries = undoStack.map(e => ({ description: e.description, timestamp: e.timestamp }));
  // currentIndex: undoStack.length means "current state" (top), entries are past states
  undoHistoryStore.set({ entries, currentIndex: undoStack.length });
}

/** Current undo action description — set before calling mutate/snapshot */
let _nextDescription = '';

// Undo coalescing: rapid consecutive edits to the same field (e.g. typing digits
// into a dimension input, which fires `oninput` per keystroke) should collapse into
// a single undo entry instead of one per keystroke. The first edit pushes the
// pre-edit baseline; subsequent edits sharing the same key within the time window
// reuse it rather than pushing a fresh snapshot.
let _lastCoalesceKey: string | null = null;
let _lastSnapshotTime = 0;
const COALESCE_WINDOW_MS = 800;

/** Break any active coalescing chain so the next edit starts a fresh undo entry. */
function resetCoalescing() {
  _lastCoalesceKey = null;
}

/** Build a coalesce key for an element edit from its type, id, and the fields changed.
 *  Rapid edits to the same element+fields collapse into one undo entry; changing which
 *  fields are edited (or which element) starts a new entry. */
function coalesceKeyFor(type: string, id: string, updates: Record<string, unknown>): string {
  return `${type}:${id}:${Object.keys(updates).sort().join(',')}`;
}

// Undo grouping: batch multiple mutations into a single undo entry
let undoGroupSnapshot: string | null = null;
let undoGroupDepth = 0;

/** Begin an undo group. Nested calls are supported; only the outermost pair takes effect. */
export function beginUndoGroup() {
  if (undoGroupDepth === 0) {
    const p = get(currentProject);
    if (p) undoGroupSnapshot = JSON.stringify(p);
  }
  undoGroupDepth++;
}

/** End an undo group. Commits a single undo entry from the state captured at beginUndoGroup(). */
export function endUndoGroup(description?: string) {
  if (undoGroupDepth <= 0) return;
  undoGroupDepth--;
  if (undoGroupDepth === 0 && undoGroupSnapshot !== null) {
    undoStack.push({ state: undoGroupSnapshot, description: description || _nextDescription || 'Group action', timestamp: Date.now() });
    if (undoStack.length > 50) undoStack.shift();
    redoStack.length = 0;
    undoGroupSnapshot = null;
    _nextDescription = '';
    resetCoalescing();
    syncHistoryStore();
  }
}

function snapshot(description?: string, coalesceKey?: string) {
  // If inside an undo group, skip — the group handles the snapshot
  if (undoGroupDepth > 0) return;
  const p = get(currentProject);
  if (!p) return;
  const now = Date.now();
  // Coalesce rapid consecutive edits to the same field: the top-of-stack entry
  // already holds the correct pre-edit baseline, so don't push another snapshot.
  if (
    coalesceKey &&
    coalesceKey === _lastCoalesceKey &&
    now - _lastSnapshotTime < COALESCE_WINDOW_MS &&
    undoStack.length > 0
  ) {
    _lastSnapshotTime = now;
    redoStack.length = 0;
    return;
  }
  undoStack.push({ state: JSON.stringify(p), description: description || _nextDescription || 'Edit', timestamp: now });
  if (undoStack.length > 50) undoStack.shift();
  redoStack.length = 0;
  _nextDescription = '';
  _lastCoalesceKey = coalesceKey ?? null;
  _lastSnapshotTime = now;
  syncHistoryStore();
}

function reviveDates(p: Project): Project {
  if (p.createdAt && !(p.createdAt instanceof Date)) p.createdAt = new Date(p.createdAt as any);
  if (p.updatedAt && !(p.updatedAt instanceof Date)) p.updatedAt = new Date(p.updatedAt as any);
  return p;
}

export function undo() {
  resetCoalescing();
  const prev = undoStack.pop();
  if (!prev) return;
  const cur = get(currentProject);
  if (cur) redoStack.push({ state: JSON.stringify(cur), description: prev.description, timestamp: prev.timestamp });
  currentProject.set(reviveDates(JSON.parse(prev.state)));
  syncHistoryStore();
}

export function redo() {
  resetCoalescing();
  const next = redoStack.pop();
  if (!next) return;
  const cur = get(currentProject);
  if (cur) undoStack.push({ state: JSON.stringify(cur), description: next.description, timestamp: next.timestamp });
  currentProject.set(reviveDates(JSON.parse(next.state)));
  syncHistoryStore();
}

/** Jump to a specific undo history step by index (0 = oldest) */
export function jumpToUndoStep(targetIndex: number) {
  resetCoalescing();
  const total = undoStack.length; // total past states; current state is at index `total`
  if (targetIndex < 0 || targetIndex > total) return;
  if (targetIndex === total) return; // already at current state

  // We need to go back (total - targetIndex) steps
  // First, save current state to redo
  const cur = get(currentProject);
  if (!cur) return;

  // Push current + all states between current and target onto redo
  const stepsBack = total - targetIndex;
  // Move states from undoStack to redoStack
  redoStack.push({ state: JSON.stringify(cur), description: 'Current state', timestamp: Date.now() });
  for (let i = 0; i < stepsBack - 1; i++) {
    const entry = undoStack.pop()!;
    redoStack.push(entry);
  }
  const target = undoStack.pop()!;
  currentProject.set(reviveDates(JSON.parse(target.state)));
  syncHistoryStore();
}

function mutate(fn: (floor: Floor) => void, description?: string, coalesceKey?: string) {
  const p = get(currentProject);
  if (!p) return;
  snapshot(description, coalesceKey);
  const floor = p.floors.find((f) => f.id === p.activeFloorId);
  if (!floor) return;
  fn(floor);
  p.updatedAt = new Date();
  currentProject.set({ ...p });
}

export function addWall(start: Point, end: Point, showOnboardingTip = true): string {
  const id = uid();
  mutate((f) => {
    f.walls.push({ id, start, end, thickness: 15, height: 280, color: '#444444' });
  }, 'Added wall');
  if (showOnboardingTip) {
    import('$lib/stores/onboarding.svelte').then(m => m.triggerTip('first-wall', end.x > 400 ? 300 : end.x + 20, 120));
  }
  return id;
}

export function removeWall(id: string) {
  mutate((f) => {
    f.walls = f.walls.filter((w) => w.id !== id);
    f.doors = f.doors.filter((d) => d.wallId !== id);
    f.windows = f.windows.filter((w) => w.wallId !== id);
  }, 'Deleted wall');
}

export function addDoor(wallId: string, position: number, doorType: Door['type'] = 'single'): string {
  const id = uid();
  const defaults: Record<Door['type'], { width: number; height: number }> = {
    single: { width: 90, height: 210 },
    double: { width: 150, height: 210 },
    sliding: { width: 180, height: 210 },
    french: { width: 150, height: 210 },
    pocket: { width: 90, height: 210 },
    bifold: { width: 180, height: 210 },
    opening: { width: 100, height: 210 },
    garage: { width: 240, height: 210 },
  };
  const { width, height } = defaults[doorType];
  mutate((f) => {
    f.doors.push({ id, wallId, position, width, height, type: doorType, swingDirection: 'left', flipSide: false });
  }, `Added ${doorType} door`);
  // Onboarding tip
  import('$lib/stores/onboarding.svelte').then(m => m.triggerTip('first-door', 300, 120));
  return id;
}

export function addWindow(wallId: string, position: number, windowType: import('$lib/models/types').Window['type'] = 'standard'): string {
  const id = uid();
  const defaults: Record<import('$lib/models/types').Window['type'], { width: number; height: number }> = {
    standard: { width: 120, height: 120 },
    fixed: { width: 100, height: 100 },
    casement: { width: 80, height: 130 },
    sliding: { width: 180, height: 120 },
    bay: { width: 200, height: 150 },
  };
  const { width, height } = defaults[windowType];
  mutate((f) => {
    f.windows.push({ id, wallId, position, width, height, sillHeight: 90, type: windowType });
  }, `Added ${windowType} window`);
  return id;
}

export function addFurniture(catalogId: string, position: Point): string {
  const id = uid();
  mutate((f) => {
    f.furniture.push({ id, catalogId, position, rotation: 0, scale: { x: 1, y: 1, z: 1 } });
  }, `Added ${catalogId}`);
  // Onboarding tip
  import('$lib/stores/onboarding.svelte').then(m => m.triggerTip('first-furniture', position.x + 20, position.y + 20));
  return id;
}

/** Snapshot the current state before a drag begins (call once at drag start) */
export function beginDrag(description = 'Moved element') {
  snapshot(description);
}

/** Move furniture without creating an undo snapshot on every call (used during drag).
 *  Call `beginDrag()` when the drag starts to snapshot the pre-drag state. */
export function moveFurniture(id: string, position: Point) {
  const p = get(currentProject);
  if (!p) return;
  const floor = p.floors.find((f) => f.id === p.activeFloorId);
  if (!floor) return;
  const item = floor.furniture.find((fi) => fi.id === id);
  if (item) {
    item.position = position;
    p.updatedAt = new Date();
    currentProject.set({ ...p });
  }
}

/** Snapshot the current state before a drag begins (call once at drag start).
 *  Alias for beginDrag() for backward compatibility. */
export function commitFurnitureMove() {
  snapshot('Moved furniture');
}

export function rotateFurniture(id: string, angle: number) {
  mutate((f) => {
    const item = f.furniture.find((fi) => fi.id === id);
    if (item) item.rotation = (item.rotation + angle) % 360;
  }, 'Rotated furniture');
}

export function setFurnitureRotation(id: string, angle: number) {
  mutate((f) => {
    const item = f.furniture.find((fi) => fi.id === id);
    if (item) item.rotation = ((angle % 360) + 360) % 360;
  });
}

export function scaleFurniture(id: string, scale: { x: number; y: number }) {
  mutate((f) => {
    const fi = f.furniture.find((item) => item.id === id);
    if (fi) {
      fi.scale = { x: Math.max(0.2, scale.x), y: Math.max(0.2, scale.y), z: fi.scale.z };
    }
  });
}

export function removeFurniture(id: string) {
  mutate((f) => {
    f.furniture = f.furniture.filter((fi) => fi.id !== id);
  }, 'Deleted furniture');
}

// Stairs
export function addStair(position: Point): string {
  const id = uid();
  mutate((f) => {
    if (!f.stairs) f.stairs = [];
    f.stairs.push({ id, position, rotation: 0, width: 100, depth: 300, riserCount: 14, direction: 'up', stairType: 'straight' });
  }, 'Added stair');
  return id;
}

export function updateStair(id: string, updates: Partial<Stair>) {
  mutate((f) => {
    if (!f.stairs) return;
    const s = f.stairs.find((s) => s.id === id);
    if (s) Object.assign(s, updates);
  }, undefined, coalesceKeyFor('stair', id, updates));
}

export function removeStair(id: string) {
  mutate((f) => {
    if (!f.stairs) return;
    f.stairs = f.stairs.filter((s) => s.id !== id);
  });
}

export function moveStair(id: string, position: Point) {
  const p = get(currentProject);
  if (!p) return;
  const floor = p.floors.find((f) => f.id === p.activeFloorId);
  if (!floor || !floor.stairs) return;
  const s = floor.stairs.find((s) => s.id === id);
  if (s) {
    s.position = position;
    p.updatedAt = new Date();
    currentProject.set({ ...p });
  }
}

// Background Image
export function setBackgroundImage(bg: BackgroundImage | undefined) {
  mutate((f) => {
    f.backgroundImage = bg;
  });
}

export function updateBackgroundImage(updates: Partial<BackgroundImage>) {
  mutate((f) => {
    if (f.backgroundImage) Object.assign(f.backgroundImage, updates);
  });
}

// Column functions
export function addColumn(position: Point, shape: 'round' | 'square' = 'round'): string {
  const id = uid();
  mutate((f) => {
    if (!f.columns) f.columns = [];
    f.columns.push({ id, position, rotation: 0, shape, diameter: 30, height: 280, color: '#cccccc' });
  }, `Added ${shape} column`);
  return id;
}

export function updateColumn(id: string, updates: Partial<Column>) {
  mutate((f) => {
    if (!f.columns) return;
    const c = f.columns.find((c) => c.id === id);
    if (c) Object.assign(c, updates);
  }, undefined, coalesceKeyFor('column', id, updates));
}

export function removeColumn(id: string) {
  mutate((f) => {
    if (!f.columns) return;
    f.columns = f.columns.filter((c) => c.id !== id);
  });
}

export function moveColumn(id: string, position: Point) {
  const p = get(currentProject);
  if (!p) return;
  const floor = p.floors.find((f) => f.id === p.activeFloorId);
  if (!floor || !floor.columns) return;
  const c = floor.columns.find((c) => c.id === id);
  if (c) {
    c.position = position;
    p.updatedAt = new Date();
    currentProject.set({ ...p });
  }
}

/** Tool for placing columns */
export const placingColumn = writable<boolean>(false);
export const placingColumnShape = writable<'round' | 'square'>('round');

/** Tool for placing stairs */
export const placingStair = writable<boolean>(false);

// --- Entourage (2D presentation symbols) ---
export const placingEntourageId = writable<string | null>(null);

export function addEntourageItem(defId: string, position: Point, width: number): string {
  const id = uid();
  mutate((f) => {
    if (!f.entourage) f.entourage = [];
    f.entourage.push({ id, defId, position, width, rotation: 0 });
  }, 'Added entourage');
  return id;
}

/** Move an entourage item without snapshotting (used during drag). */
export function moveEntourage(id: string, position: Point) {
  const p = get(currentProject);
  if (!p) return;
  const floor = p.floors.find((f) => f.id === p.activeFloorId);
  const item = floor?.entourage?.find((e) => e.id === id);
  if (item) {
    item.position = position;
    p.updatedAt = new Date();
    currentProject.set({ ...p });
  }
}

/** Resize an entourage item without snapshotting (used during handle drag). */
export function resizeEntourage(id: string, width: number) {
  const p = get(currentProject);
  if (!p) return;
  const floor = p.floors.find((f) => f.id === p.activeFloorId);
  const item = floor?.entourage?.find((e) => e.id === id);
  if (item) {
    item.width = width;
    p.updatedAt = new Date();
    currentProject.set({ ...p });
  }
}

export function updateEntourageItem(id: string, updates: Partial<EntourageItem>) {
  mutate((f) => {
    const e = f.entourage?.find((e) => e.id === id);
    if (e) Object.assign(e, updates);
  }, undefined, coalesceKeyFor('entourage', id, updates));
}

/** Register an uploaded PNG as a reusable project-level entourage symbol. */
export function addCustomEntourage(name: string, dataUrl: string, aspect: number): string {
  const p = get(currentProject);
  if (!p) return '';
  snapshot('Added custom entourage');
  if (!p.customEntourage) p.customEntourage = [];
  const id = uid();
  p.customEntourage.push({ id, name, dataUrl, aspect });
  p.updatedAt = new Date();
  currentProject.set({ ...p });
  return id;
}

/** Scale calibration mode */
export const calibrationMode = writable<boolean>(false);
export const calibrationPoints = writable<Point[]>([]);

export function removeElement(id: string) {
  mutate((f) => {
    // Check if the element being removed is a wall — if so, also remove associated doors/windows
    const isWall = f.walls.some((w) => w.id === id);
    f.walls = f.walls.filter((w) => w.id !== id);
    if (isWall) {
      // Cascade delete: remove doors and windows attached to this wall
      f.doors = f.doors.filter((d) => d.wallId !== id);
      f.windows = f.windows.filter((w) => w.wallId !== id);
      // A room cannot remain in the current drawing after one of its boundary
      // walls is deleted. Remove its metadata as well so reports never retain
      // environments that no longer exist.
      f.rooms = f.rooms.filter((room) => !room.walls.includes(id));
    }
    f.doors = f.doors.filter((d) => d.id !== id);
    f.windows = f.windows.filter((w) => w.id !== id);
    f.furniture = f.furniture.filter((fi) => fi.id !== id);
    if (f.stairs) f.stairs = f.stairs.filter((s) => s.id !== id);
    if (f.columns) f.columns = f.columns.filter((c) => c.id !== id);
    if (f.textAnnotations) f.textAnnotations = f.textAnnotations.filter((t) => t.id !== id);
    if (f.entourage) f.entourage = f.entourage.filter((e) => e.id !== id);
  }, 'Deleted element');
}

/** Move a wall endpoint without creating an undo snapshot (for dragging) */
export function moveWallEndpoint(id: string, endpoint: 'start' | 'end', position: Point) {
  const p = get(currentProject);
  if (!p) return;
  const floor = p.floors.find((f) => f.id === p.activeFloorId);
  if (!floor) return;
  const w = floor.walls.find((w) => w.id === id);
  if (w) {
    w[endpoint] = position;
    p.updatedAt = new Date();
    currentProject.set({ ...p });
  }
}

/** Move a collection of walls atomically, without touching connected wall IDs. */
export function moveWallsTogether(
  originalPositions: ReadonlyMap<string, { start: Point; end: Point }>,
  dx: number,
  dy: number,
) {
  const p = get(currentProject);
  if (!p) return;
  const floor = p.floors.find((f) => f.id === p.activeFloorId);
  if (!floor) return;

  for (const [wallId, original] of originalPositions) {
    const wall = floor.walls.find((item) => item.id === wallId);
    if (!wall) continue;
    wall.start = { x: original.start.x + dx, y: original.start.y + dy };
    wall.end = { x: original.end.x + dx, y: original.end.y + dy };
  }
  p.updatedAt = new Date();
  currentProject.set({ ...p });
}

export function updateWall(id: string, updates: Partial<Wall>) {
  mutate((f) => {
    const w = f.walls.find((w) => w.id === id);
    if (w) Object.assign(w, updates);
  }, undefined, coalesceKeyFor('wall', id, updates));
}

export function updateDoor(id: string, updates: Partial<Door>) {
  mutate((f) => {
    const d = f.doors.find((d) => d.id === id);
    if (d) Object.assign(d, updates);
  }, undefined, coalesceKeyFor('door', id, updates));
}

export function updateWindow(id: string, updates: Partial<Win>) {
  mutate((f) => {
    const w = f.windows.find((w) => w.id === id);
    if (w) Object.assign(w, updates);
  }, undefined, coalesceKeyFor('window', id, updates));
}

export function updateFurniture(id: string, updates: Partial<FurnitureItem>) {
  mutate((f) => {
    const fi = f.furniture.find((fi) => fi.id === id);
    if (fi) Object.assign(fi, updates);
  }, undefined, coalesceKeyFor('furniture', id, updates));
}

export function updateRoom(id: string, updates: Partial<{ name: string; floorTexture: string; color: string; roomType: import('$lib/models/types').RoomCategory; labelOffset: import('$lib/models/types').Point | undefined }>) {
  mutate((f) => {
    let r = f.rooms.find((r) => r.id === id);
    if (r) {
      Object.assign(r, updates);
    } else {
      // Room not in floor.rooms yet (dynamically detected) — add it so changes persist on save
      const detected = get(detectedRoomsStore).find((r) => r.id === id);
      if (detected) {
        const newRoom = { ...detected, ...updates };
        f.rooms.push(newRoom);
      }
    }
  }, undefined, coalesceKeyFor('room', id, updates));
}

/** Persist a room created from a predefined environment before canvas detection runs. */
export function addRoom(room: Omit<import('$lib/models/types').Room, 'id'>): string {
  const id = uid();
  mutate((f) => {
    f.rooms.push({ id, ...room });
  }, `Added ${room.name}`);
  return id;
}

type RoomBounds = { minX: number; minY: number; maxX: number; maxY: number };
type RoomDirection = 'top' | 'bottom' | 'left' | 'right';

function roomBoundsOnFloor(floor: Floor, room: Room): RoomBounds | null {
  const walls = room.walls
    .map((wallId) => floor.walls.find((wall) => wall.id === wallId))
    .filter((wall): wall is Wall => Boolean(wall));
  if (walls.length !== room.walls.length || walls.length === 0) return null;
  const points = walls.flatMap((wall) => [wall.start, wall.end]);
  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

/**
 * Calculate translations for every connected room on each side of a resized
 * room. Positive deltas push neighbours away; negative deltas pull them in.
 */
function connectedRoomReflowMoves(
  floor: Floor,
  roomId: string,
  horizontalBoundaryDelta: number,
  verticalBoundaryDelta: number,
): Map<string, Point> {
  const boundsByRoom = new Map<string, RoomBounds>();
  for (const room of floor.rooms) {
    const bounds = roomBoundsOnFloor(floor, room);
    if (bounds) boundsByRoom.set(room.id, bounds);
  }

  const moves = new Map<string, Point>();
  const tolerance = 2;
  const overlapsAxis = (a1: number, a2: number, b1: number, b2: number) =>
    Math.min(a2, b2) - Math.max(a1, b1) > tolerance;
  const touches = (from: RoomBounds, candidate: RoomBounds, direction: RoomDirection) => {
    if (direction === 'top') {
      return Math.abs(candidate.maxY - from.minY) <= tolerance
        && overlapsAxis(from.minX, from.maxX, candidate.minX, candidate.maxX);
    }
    if (direction === 'bottom') {
      return Math.abs(candidate.minY - from.maxY) <= tolerance
        && overlapsAxis(from.minX, from.maxX, candidate.minX, candidate.maxX);
    }
    if (direction === 'left') {
      return Math.abs(candidate.maxX - from.minX) <= tolerance
        && overlapsAxis(from.minY, from.maxY, candidate.minY, candidate.maxY);
    }
    return Math.abs(candidate.minX - from.maxX) <= tolerance
      && overlapsAxis(from.minY, from.maxY, candidate.minY, candidate.maxY);
  };

  const collect = (direction: RoomDirection, boundaryDelta: number) => {
    if (Math.abs(boundaryDelta) <= tolerance) return;
    const visited = new Set<string>([roomId]);
    const queue = [roomId];
    const movement = direction === 'top'
      ? { x: 0, y: -boundaryDelta }
      : direction === 'bottom'
        ? { x: 0, y: boundaryDelta }
        : direction === 'left'
          ? { x: -boundaryDelta, y: 0 }
          : { x: boundaryDelta, y: 0 };

    while (queue.length > 0) {
      const currentBounds = boundsByRoom.get(queue.shift()!);
      if (!currentBounds) continue;
      for (const [candidateId, candidateBounds] of boundsByRoom) {
        if (visited.has(candidateId) || !touches(currentBounds, candidateBounds, direction)) continue;
        visited.add(candidateId);
        const previous = moves.get(candidateId) ?? { x: 0, y: 0 };
        moves.set(candidateId, { x: previous.x + movement.x, y: previous.y + movement.y });
        queue.push(candidateId);
      }
    }
  };

  collect('left', horizontalBoundaryDelta);
  collect('right', horizontalBoundaryDelta);
  collect('top', verticalBoundaryDelta);
  collect('bottom', verticalBoundaryDelta);
  return moves;
}

function translateSavedRooms(
  floor: Floor,
  moves: ReadonlyMap<string, Point>,
  excludedWallIds: ReadonlySet<string>,
) {
  for (const [roomId, movement] of moves) {
    const room = floor.rooms.find((item) => item.id === roomId);
    if (!room) continue;
    for (const wallId of room.walls) {
      if (excludedWallIds.has(wallId)) continue;
      const wall = floor.walls.find((item) => item.id === wallId);
      if (!wall) continue;
      wall.start = { x: wall.start.x + movement.x, y: wall.start.y + movement.y };
      wall.end = { x: wall.end.x + movement.x, y: wall.end.y + movement.y };
      if (wall.curvePoint) {
        wall.curvePoint = {
          x: wall.curvePoint.x + movement.x,
          y: wall.curvePoint.y + movement.y,
        };
      }
    }
  }
}

/** Update a rectangular room created by the environment form, keeping its centre fixed. */
export function updateRectangularRoom(roomId: string, name: string, width: number, length: number): boolean {
  const p = get(currentProject);
  if (!p) return false;
  const floor = p.floors.find((f) => f.id === p.activeFloorId);
  const room = floor?.rooms.find((r) => r.id === roomId);
  if (!floor || !room || room.walls.length !== 4) return false;

  const walls = room.walls.map((id) => floor.walls.find((wall) => wall.id === id));
  if (walls.some((wall) => !wall)) return false;

  const points = walls.flatMap((wall) => [wall!.start, wall!.end]);
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const oldWidth = maxX - minX;
  const oldLength = maxY - minY;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const left = cx - width / 2;
  const right = cx + width / 2;
  const top = cy - length / 2;
  const bottom = cy + length / 2;
  const rectangle = [
    { start: { x: left, y: top }, end: { x: right, y: top } },
    { start: { x: right, y: top }, end: { x: right, y: bottom } },
    { start: { x: right, y: bottom }, end: { x: left, y: bottom } },
    { start: { x: left, y: bottom }, end: { x: left, y: top } },
  ];
  const neighbourMoves = connectedRoomReflowMoves(
    floor,
    roomId,
    (width - oldWidth) / 2,
    (length - oldLength) / 2,
  );

  mutate((active) => {
    const savedRoom = active.rooms.find((item) => item.id === roomId);
    if (!savedRoom) return;
    savedRoom.name = name;
    savedRoom.area = Math.round((width * length) / 100) / 100;
    savedRoom.walls.forEach((wallId, index) => {
      const wall = active.walls.find((item) => item.id === wallId);
      if (wall) {
        wall.start = rectangle[index].start;
        wall.end = rectangle[index].end;
      }
    });
    translateSavedRooms(active, neighbourMoves, new Set(savedRoom.walls));
  }, `Updated ${name}`);

  detectedRoomsStore.update((rooms) =>
    rooms.map((item) =>
      item.id === roomId
        ? { ...item, name, area: Math.round((width * length) / 100) / 100 }
        : item,
    ),
  );
  return true;
}

/**
 * Rotate a saved room clockwise by 90 degrees around its centre. When the
 * rotated room grows on one axis, move the touching neighbours (and the
 * connected rooms behind them) so shared boundaries stay touching and rooms
 * never overlap.
 */
export function rotateRoom90(roomId: string): boolean {
  const p = get(currentProject);
  if (!p) return false;
  const floor = p.floors.find((f) => f.id === p.activeFloorId);
  const room = floor?.rooms.find((item) => item.id === roomId);
  if (!floor || !room || room.walls.length === 0) return false;

  type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
  const boundsForRoom = (candidate: Room): Bounds | null => {
    const ownedWalls = candidate.walls
      .map((wallId) => floor.walls.find((wall) => wall.id === wallId))
      .filter((wall): wall is Wall => Boolean(wall));
    if (ownedWalls.length !== candidate.walls.length || ownedWalls.length === 0) return null;
    const ownedPoints = ownedWalls.flatMap((wall) => [wall.start, wall.end]);
    return {
      minX: Math.min(...ownedPoints.map((point) => point.x)),
      minY: Math.min(...ownedPoints.map((point) => point.y)),
      maxX: Math.max(...ownedPoints.map((point) => point.x)),
      maxY: Math.max(...ownedPoints.map((point) => point.y)),
    };
  };

  const roomBounds = new Map<string, Bounds>();
  for (const candidate of floor.rooms) {
    const bounds = boundsForRoom(candidate);
    if (bounds) roomBounds.set(candidate.id, bounds);
  }
  const targetBounds = roomBounds.get(roomId);
  if (!targetBounds) return false;

  const oldWidth = targetBounds.maxX - targetBounds.minX;
  const oldHeight = targetBounds.maxY - targetBounds.minY;
  const cx = (targetBounds.minX + targetBounds.maxX) / 2;
  const cy = (targetBounds.minY + targetBounds.maxY) / 2;
  const rotatePoint = (point: Point): Point => ({
    x: cx - (point.y - cy),
    y: cy + (point.x - cx),
  });

  type Direction = 'top' | 'bottom' | 'left' | 'right';
  const neighbourMoves = new Map<string, Point>();
  const TOUCH_TOLERANCE = 2;
  const overlaps = (a1: number, a2: number, b1: number, b2: number) =>
    Math.min(a2, b2) - Math.max(a1, b1) > TOUCH_TOLERANCE;
  const touchesOutward = (from: Bounds, candidate: Bounds, direction: Direction) => {
    if (direction === 'top') {
      return Math.abs(candidate.maxY - from.minY) <= TOUCH_TOLERANCE
        && overlaps(from.minX, from.maxX, candidate.minX, candidate.maxX);
    }
    if (direction === 'bottom') {
      return Math.abs(candidate.minY - from.maxY) <= TOUCH_TOLERANCE
        && overlaps(from.minX, from.maxX, candidate.minX, candidate.maxX);
    }
    if (direction === 'left') {
      return Math.abs(candidate.maxX - from.minX) <= TOUCH_TOLERANCE
        && overlaps(from.minY, from.maxY, candidate.minY, candidate.maxY);
    }
    return Math.abs(candidate.minX - from.maxX) <= TOUCH_TOLERANCE
      && overlaps(from.minY, from.maxY, candidate.minY, candidate.maxY);
  };

  // Move the whole connected row/column, not just the immediate neighbour.
  // A positive boundary delta pushes the chain out; a negative delta pulls it
  // in so the shared walls remain touching after the room becomes narrower.
  const collectOutwardChain = (direction: Direction, boundaryDelta: number) => {
    if (Math.abs(boundaryDelta) <= TOUCH_TOLERANCE) return;
    const visited = new Set<string>([roomId]);
    const queue = [roomId];
    const movement = direction === 'top'
      ? { x: 0, y: -boundaryDelta }
      : direction === 'bottom'
        ? { x: 0, y: boundaryDelta }
        : direction === 'left'
          ? { x: -boundaryDelta, y: 0 }
          : { x: boundaryDelta, y: 0 };

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const currentBounds = roomBounds.get(currentId);
      if (!currentBounds) continue;
      for (const [candidateId, candidateBounds] of roomBounds) {
        if (visited.has(candidateId) || !touchesOutward(currentBounds, candidateBounds, direction)) continue;
        visited.add(candidateId);
        const previousMovement = neighbourMoves.get(candidateId) ?? { x: 0, y: 0 };
        neighbourMoves.set(candidateId, {
          x: previousMovement.x + movement.x,
          y: previousMovement.y + movement.y,
        });
        queue.push(candidateId);
      }
    }
  };

  const horizontalBoundaryDelta = (oldHeight - oldWidth) / 2;
  const verticalBoundaryDelta = (oldWidth - oldHeight) / 2;
  collectOutwardChain('left', horizontalBoundaryDelta);
  collectOutwardChain('right', horizontalBoundaryDelta);
  collectOutwardChain('top', verticalBoundaryDelta);
  collectOutwardChain('bottom', verticalBoundaryDelta);

  mutate((active) => {
    const savedRoom = active.rooms.find((item) => item.id === roomId);
    if (!savedRoom) return;
    for (const wallId of savedRoom.walls) {
      const wall = active.walls.find((item) => item.id === wallId);
      if (!wall) continue;
      wall.start = rotatePoint(wall.start);
      wall.end = rotatePoint(wall.end);
      if (wall.curvePoint) wall.curvePoint = rotatePoint(wall.curvePoint);
    }
    if (savedRoom.labelOffset) {
      savedRoom.labelOffset = {
        x: -savedRoom.labelOffset.y,
        y: savedRoom.labelOffset.x,
      };
    }

    const rotatedWallIds = new Set(savedRoom.walls);
    for (const [neighbourId, movement] of neighbourMoves) {
      const neighbour = active.rooms.find((item) => item.id === neighbourId);
      if (!neighbour) continue;
      for (const wallId of neighbour.walls) {
        // Generated environments own independent divider walls. This guard
        // avoids translating a legacy shared wall after it has been rotated.
        if (rotatedWallIds.has(wallId)) continue;
        const wall = active.walls.find((item) => item.id === wallId);
        if (!wall) continue;
        wall.start = { x: wall.start.x + movement.x, y: wall.start.y + movement.y };
        wall.end = { x: wall.end.x + movement.x, y: wall.end.y + movement.y };
        if (wall.curvePoint) {
          wall.curvePoint = {
            x: wall.curvePoint.x + movement.x,
            y: wall.curvePoint.y + movement.y,
          };
        }
      }
      if (neighbour.labelOffset) {
        // The label offset is local to the room and therefore stays unchanged.
        neighbour.labelOffset = { ...neighbour.labelOffset };
      }
    }
  }, `Rotated ${room.name}`);
  return true;
}

/**
 * If a moved room overlaps another room, place it against the nearest free
 * boundary. Touching edges are allowed; intersecting interiors are not.
 * This intentionally does not create its own undo snapshot because it is the
 * final step of the room drag already in progress.
 */
export function resolveRoomOverlap(roomId: string): boolean {
  const p = get(currentProject);
  if (!p) return false;
  const floor = p.floors.find((item) => item.id === p.activeFloorId);
  const room = floor?.rooms.find((item) => item.id === roomId);
  if (!floor || !room) return false;

  const target = roomBoundsOnFloor(floor, room);
  if (!target) return false;
  const obstacles = floor.rooms
    .filter((item) => item.id !== roomId)
    .map((item) => roomBoundsOnFloor(floor, item))
    .filter((bounds): bounds is RoomBounds => Boolean(bounds));
  if (obstacles.length === 0) return false;

  const epsilon = 0.01;
  const intersects = (a: RoomBounds, b: RoomBounds) =>
    Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > epsilon
    && Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) > epsilon;
  if (!obstacles.some((bounds) => intersects(target, bounds))) return false;

  const xCandidates = new Set<number>([0]);
  const yCandidates = new Set<number>([0]);
  for (const obstacle of obstacles) {
    xCandidates.add(obstacle.minX - target.maxX);
    xCandidates.add(obstacle.maxX - target.minX);
    yCandidates.add(obstacle.minY - target.maxY);
    yCandidates.add(obstacle.maxY - target.minY);
  }

  let best: Point | null = null;
  let bestCost = Infinity;
  let bestAxes = Infinity;
  for (const dx of xCandidates) {
    for (const dy of yCandidates) {
      if (Math.abs(dx) <= epsilon && Math.abs(dy) <= epsilon) continue;
      const moved = {
        minX: target.minX + dx,
        maxX: target.maxX + dx,
        minY: target.minY + dy,
        maxY: target.maxY + dy,
      };
      if (obstacles.some((bounds) => intersects(moved, bounds))) continue;
      const cost = dx * dx + dy * dy;
      const axes = Number(Math.abs(dx) > epsilon) + Number(Math.abs(dy) > epsilon);
      if (cost < bestCost - epsilon || (Math.abs(cost - bestCost) <= epsilon && axes < bestAxes)) {
        best = { x: dx, y: dy };
        bestCost = cost;
        bestAxes = axes;
      }
    }
  }
  if (!best) return false;

  translateSavedRooms(floor, new Map([[roomId, best]]), new Set());
  p.updatedAt = new Date();
  currentProject.set({ ...p });
  return true;
}

export function addFloor(name?: string, copyCurrentLayout = false) {
  const p = get(currentProject);
  if (!p) return;
  snapshot('Added floor');
  const level = p.floors.length;
  const floor: Floor = { id: uid(), name: name ?? `Floor ${level}`, level, walls: [], rooms: [], doors: [], windows: [], furniture: [], stairs: [], columns: [], guides: [], measurements: [], annotations: [], textAnnotations: [], groups: [] };
  if (copyCurrentLayout) {
    const cur = p.floors.find(f => f.id === p.activeFloorId);
    if (cur) {
      floor.walls = cur.walls.map(w => ({ ...w, id: uid() }));
    }
  }
  p.floors.push(floor);
  p.activeFloorId = floor.id;
  p.updatedAt = new Date();
  currentProject.set({ ...p });
}

export function removeFloor(id: string) {
  const p = get(currentProject);
  if (!p || p.floors.length <= 1) return;
  snapshot('Removed floor');
  p.floors = p.floors.filter(f => f.id !== id);
  if (p.activeFloorId === id) {
    p.activeFloorId = p.floors[0].id;
  }
  p.updatedAt = new Date();
  currentProject.set({ ...p });
}

export function setActiveFloor(floorId: string) {
  const p = get(currentProject);
  if (!p) return;
  if (p.floors.some((f) => f.id === floorId)) {
    p.activeFloorId = floorId;
    currentProject.set({ ...p });
  }
}

export function updateProjectName(name: string) {
  const p = get(currentProject);
  if (!p) return;
  p.name = name;
  p.updatedAt = new Date();
  currentProject.set({ ...p });
}

export function loadProject(project: Project) {
  undoStack.length = 0;
  redoStack.length = 0;
  resetCoalescing();
  currentProject.set(project);
  syncHistoryStore();
}

/** Import a floor's data into the current project's active floor (replaces walls/doors/windows/furniture) */
export function importFloorIntoCurrentProject(floor: import('$lib/models/types').Floor) {
  const p = get(currentProject);
  if (!p) return;
  snapshot('Imported floor');
  const activeFloorIdx = p.floors.findIndex((f) => f.id === p.activeFloorId);
  if (activeFloorIdx === -1) return;
  // snapshot was already called above via snapshot('Imported floor')
  const existing = p.floors[activeFloorIdx];
  // Merge imported data into the active floor
  existing.walls = [...existing.walls, ...floor.walls];
  existing.doors = [...existing.doors, ...floor.doors];
  existing.windows = [...existing.windows, ...floor.windows];
  existing.furniture = [...existing.furniture, ...floor.furniture];
  if (floor.stairs) existing.stairs = [...(existing.stairs || []), ...floor.stairs];
  if (floor.columns) existing.columns = [...(existing.columns || []), ...floor.columns];
  currentProject.set({ ...p });
}

export const selectedRoomId = writable<string | null>(null);
/** Detected rooms (synced from canvas room detection) */
export const detectedRoomsStore = writable<import('$lib/models/types').Room[]>([]);
/** catalogId currently being placed (null = not placing) */
export const placingFurnitureId = writable<string | null>(null);
/** Rotation angle for furniture being placed */
export const placingRotation = writable<number>(0);
/** Door subtype currently selected for placement */
export const placingDoorType = writable<Door['type']>('single');
/** Window subtype currently selected for placement */
export const placingWindowType = writable<import('$lib/models/types').Window['type']>('standard');

/** Duplicate a door onto the same wall */
export function duplicateDoor(id: string): string | null {
  const p = get(currentProject);
  if (!p) return null;
  const floor = p.floors.find(f => f.id === p.activeFloorId);
  if (!floor) return null;
  const d = floor.doors.find(d => d.id === id);
  if (!d) return null;
  const newPos = Math.min(1, d.position + 0.1);
  const newId = uid();
  mutate(f => {
    f.doors.push({ ...d, id: newId, position: newPos });
  });
  return newId;
}

/** Duplicate a window onto the same wall */
export function duplicateWindow(id: string): string | null {
  const p = get(currentProject);
  if (!p) return null;
  const floor = p.floors.find(f => f.id === p.activeFloorId);
  if (!floor) return null;
  const w = floor.windows.find(w => w.id === id);
  if (!w) return null;
  const newPos = Math.min(1, w.position + 0.1);
  const newId = uid();
  mutate(f => {
    f.windows.push({ ...w, id: newId, position: newPos });
  });
  return newId;
}

/** Duplicate furniture */
export function duplicateFurniture(id: string): string | null {
  const p = get(currentProject);
  if (!p) return null;
  const floor = p.floors.find(f => f.id === p.activeFloorId);
  if (!floor) return null;
  const fi = floor.furniture.find(fi => fi.id === id);
  if (!fi) return null;
  const newId = uid();
  mutate(f => {
    f.furniture.push({ ...fi, id: newId, position: { x: fi.position.x + 30, y: fi.position.y + 30 } });
  });
  return newId;
}

/** Move a wall parallel to itself (both endpoints shift by the same perpendicular offset) without undo snapshot (for dragging) */
export function moveWallParallel(id: string, dx: number, dy: number) {
  const p = get(currentProject);
  if (!p) return;
  const floor = p.floors.find((f) => f.id === p.activeFloorId);
  if (!floor) return;
  const w = floor.walls.find((w) => w.id === id);
  if (w) {
    w.start = { x: w.start.x + dx, y: w.start.y + dy };
    w.end = { x: w.end.x + dx, y: w.end.y + dy };
    if (w.curvePoint) {
      w.curvePoint = { x: w.curvePoint.x + dx, y: w.curvePoint.y + dy };
    }
    p.updatedAt = new Date();
    currentProject.set({ ...p });
  }
}

/** Split a wall into two segments at a given parameter t (0-1) */
export function splitWall(id: string, t: number): string | null {
  const p = get(currentProject);
  if (!p) return null;
  const floor = p.floors.find((f) => f.id === p.activeFloorId);
  if (!floor) return null;
  const w = floor.walls.find((w) => w.id === id);
  if (!w || w.curvePoint) return null; // don't split curved walls
  if (t <= 0.001 || t >= 0.999) return null; // prevent division by zero at extremes
  snapshot('Split wall');
  const midPt: Point = {
    x: w.start.x + (w.end.x - w.start.x) * t,
    y: w.start.y + (w.end.y - w.start.y) * t,
  };
  const newId = uid();
  // New wall from midpoint to original end
  floor.walls.push({ id: newId, start: { ...midPt }, end: { ...w.end }, thickness: w.thickness, height: w.height, color: w.color });
  // Shorten original wall to midpoint
  w.end = { ...midPt };
  // Move doors/windows on the original wall: adjust positions
  for (const d of floor.doors) {
    if (d.wallId === id) {
      if (d.position > t) {
        d.wallId = newId;
        d.position = (d.position - t) / (1 - t);
      } else {
        d.position = d.position / t;
      }
    }
  }
  for (const win of floor.windows) {
    if (win.wallId === id) {
      if (win.position > t) {
        win.wallId = newId;
        win.position = (win.position - t) / (1 - t);
      } else {
        win.position = win.position / t;
      }
    }
  }
  p.updatedAt = new Date();
  currentProject.set({ ...p });
  return newId;
}

/** Duplicate a wall */
export function duplicateWall(id: string): string | null {
  const p = get(currentProject);
  if (!p) return null;
  const floor = p.floors.find(f => f.id === p.activeFloorId);
  if (!floor) return null;
  const w = floor.walls.find(w => w.id === id);
  if (!w) return null;
  const newId = uid();
  mutate(f => {
    f.walls.push({ ...w, id: newId, start: { x: w.start.x + 30, y: w.start.y + 30 }, end: { x: w.end.x + 30, y: w.end.y + 30 } });
  });
  return newId;
}

// --- Guide Lines ---
export function addGuide(orientation: 'horizontal' | 'vertical', position: number): string {
  const id = uid();
  mutate(f => {
    if (!f.guides) f.guides = [];
    f.guides.push({ id, orientation, position });
  });
  return id;
}

export function moveGuide(id: string, position: number) {
  mutate(f => {
    if (!f.guides) return;
    const g = f.guides.find(g => g.id === id);
    if (g) g.position = position;
  });
}

export function removeGuide(id: string) {
  mutate(f => {
    if (!f.guides) return;
    f.guides = f.guides.filter(g => g.id !== id);
  });
}

// --- Measurements ---
export function addMeasurement(x1: number, y1: number, x2: number, y2: number): string {
  const id = uid();
  mutate(f => {
    if (!f.measurements) f.measurements = [];
    f.measurements.push({ id, x1, y1, x2, y2 });
  });
  return id;
}

export function removeMeasurement(id: string) {
  mutate(f => {
    if (!f.measurements) return;
    f.measurements = f.measurements.filter(m => m.id !== id);
  });
}

// --- Annotations ---
export function addAnnotation(x1: number, y1: number, x2: number, y2: number, offset = 40, label?: string): string {
  const id = uid();
  mutate(f => {
    if (!f.annotations) f.annotations = [];
    f.annotations.push({ id, x1, y1, x2, y2, offset, label });
  });
  return id;
}

export function removeAnnotation(id: string) {
  mutate(f => {
    if (!f.annotations) return;
    f.annotations = f.annotations.filter(a => a.id !== id);
  });
}

export function updateAnnotation(id: string, updates: Partial<{ x1: number; y1: number; x2: number; y2: number; offset: number; label: string }>) {
  mutate(f => {
    if (!f.annotations) return;
    const a = f.annotations.find(a => a.id === id);
    if (!a) return;
    Object.assign(a, updates);
  }, undefined, coalesceKeyFor('annotation', id, updates));
}

// --- Text Annotations ---
export function addTextAnnotation(x: number, y: number, text: string, fontSize = 16, color = '#1e293b', rotation = 0): string {
  const id = uid();
  mutate(f => {
    if (!f.textAnnotations) f.textAnnotations = [];
    f.textAnnotations.push({ id, x, y, text, fontSize, color, rotation });
  });
  return id;
}

export function removeTextAnnotation(id: string) {
  mutate(f => {
    if (!f.textAnnotations) return;
    f.textAnnotations = f.textAnnotations.filter(t => t.id !== id);
  });
}

export function updateTextAnnotation(id: string, updates: Partial<{ x: number; y: number; text: string; fontSize: number; color: string; rotation: number }>) {
  mutate(f => {
    if (!f.textAnnotations) return;
    const t = f.textAnnotations.find(t => t.id === id);
    if (!t) return;
    Object.assign(t, updates);
  }, undefined, coalesceKeyFor('textAnnotation', id, updates));
}

export function moveTextAnnotation(id: string, position: { x: number; y: number }) {
  const p = get(currentProject);
  if (!p) return;
  const floor = p.floors.find(f => f.id === p.activeFloorId);
  if (!floor?.textAnnotations) return;
  const t = floor.textAnnotations.find(t => t.id === id);
  if (!t) return;
  t.x = position.x;
  t.y = position.y;
  p.updatedAt = new Date();
  currentProject.set({ ...p });
}

// Layer visibility store (used by LayersPanel and FloorPlanCanvas)
export const layerVisibility = writable<{ walls: boolean; doors: boolean; windows: boolean; furniture: boolean; stairs: boolean; columns: boolean; guides: boolean; measurements: boolean; annotations: boolean; entourage: boolean }>({
  walls: true, doors: true, windows: true, furniture: true, stairs: true, columns: true, guides: true, measurements: true, annotations: true, entourage: true,
});

// --- Lock ---
export function toggleFurnitureLock(id: string) {
  mutate((f) => {
    const fi = f.furniture.find((fi) => fi.id === id);
    if (fi) fi.locked = !fi.locked;
  });
}

export function setFurnitureLocked(id: string, locked: boolean) {
  mutate((f) => {
    const fi = f.furniture.find((fi) => fi.id === id);
    if (fi) fi.locked = locked;
  });
}

// --- Element Groups ---
export function createGroup(elementIds: string[]): string | null {
  if (elementIds.length < 2) return null;
  const id = uid();
  mutate((f) => {
    if (!f.groups) f.groups = [];
    // Remove any existing group membership for these elements
    f.groups = f.groups.map(g => ({
      ...g,
      elementIds: g.elementIds.filter(eid => !elementIds.includes(eid))
    })).filter(g => g.elementIds.length >= 2);
    f.groups.push({ id, elementIds: [...elementIds] });
  });
  return id;
}

export function ungroup(groupId: string) {
  mutate((f) => {
    if (!f.groups) return;
    f.groups = f.groups.filter(g => g.id !== groupId);
  });
}

export function ungroupElements(elementIds: string[]) {
  mutate((f) => {
    if (!f.groups) return;
    f.groups = f.groups.filter(g => !g.elementIds.some(eid => elementIds.includes(eid)));
  });
}

export function findGroupForElement(floor: Floor, elementId: string): ElementGroup | undefined {
  if (!floor.groups) return undefined;
  return floor.groups.find(g => g.elementIds.includes(elementId));
}

/** Wall id whose face-on elevation editor is open (null = closed) */
export const elevationWallId = writable<string | null>(null);
/** Armed when Elevation is requested with no wall selected: the next wall
 *  clicked in the plan canvas opens its elevation; empty click / Esc cancels */
export const elevationPickMode = writable<boolean>(false);

// Zoom store for 2D canvas — shared between FloorPlanCanvas and TopBar
export const canvasZoom = writable<number>(1);
// Camera position stores for 2D canvas — used to compute viewport center
export const canvasCamX = writable<number>(0);
export const canvasCamY = writable<number>(0);
