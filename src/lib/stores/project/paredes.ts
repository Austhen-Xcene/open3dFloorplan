/** Operações sobre paredes: criar, editar, mover, dividir e duplicar. */
import { get } from 'svelte/store';
import type { Wall, Point } from '$lib/models/types';
import { currentProject, uid } from './estado';
import { mutate, snapshot, coalesceKeyFor } from './historico';

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
