/**
 * Estado base do editor: projeto corrente, pavimento ativo e stores de UI.
 *
 * Não contém mutação — quem altera o projeto usa `mutate` de ./historico.
 */
import { writable, derived } from 'svelte/store';
import type { Project, Floor, Door, Point, Room } from '$lib/models/types';


export function uid(): string {
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

/** Tool for placing columns */
export const placingColumn = writable<boolean>(false);
export const placingColumnShape = writable<'round' | 'square'>('round');

/** Tool for placing stairs */
export const placingStair = writable<boolean>(false);

/** Scale calibration mode */
export const calibrationMode = writable<boolean>(false);
export const calibrationPoints = writable<Point[]>([]);
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

export const layerVisibility = writable<{ walls: boolean; doors: boolean; windows: boolean; furniture: boolean; stairs: boolean; columns: boolean; guides: boolean; measurements: boolean; annotations: boolean }>({
  walls: true, doors: true, windows: true, furniture: true, stairs: true, columns: true, guides: true, measurements: true, annotations: true,
});

// --- Lock ---
export const canvasZoom = writable<number>(1);
// Camera position stores for 2D canvas — used to compute viewport center
export const canvasCamX = writable<number>(0);
export const canvasCamY = writable<number>(0);
