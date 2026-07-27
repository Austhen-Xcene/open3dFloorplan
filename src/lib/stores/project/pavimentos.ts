/** Operações de pavimento e de projeto: criar, remover, trocar, carregar. */
import { get } from 'svelte/store';
import type { Project, Floor } from '$lib/models/types';
import { currentProject, uid } from './estado';
import { snapshot, limparHistorico } from './historico';

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
  limparHistorico();
  currentProject.set(project);
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

