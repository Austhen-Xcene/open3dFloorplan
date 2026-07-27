/** Operações sobre portas e janelas. */
import { get } from 'svelte/store';
import type { Door, Window as Win } from '$lib/models/types';
import { currentProject, uid } from './estado';
import { mutate, coalesceKeyFor } from './historico';

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
