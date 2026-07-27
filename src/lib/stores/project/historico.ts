/**
 * Histórico de desfazer/refazer e o `mutate` — o único caminho para alterar o projeto.
 *
 * Padrões de uso:
 *  - ação atômica ............ mutate(fn, 'Descrição')
 *  - arrasto contínuo ........ beginDrag() … mutação … commit
 *  - digitação em campo ...... mutate(fn, 'Descrição', coalesceKey)
 *  - várias mutações = 1 undo  beginUndoGroup() … endUndoGroup('Descrição')
 */
import { writable, get } from 'svelte/store';
import type { Project, Floor } from '$lib/models/types';
import { currentProject } from './estado';

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
export function coalesceKeyFor(type: string, id: string, updates: Record<string, unknown>): string {
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

export function snapshot(description?: string, coalesceKey?: string) {
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

export function mutate(fn: (floor: Floor) => void, description?: string, coalesceKey?: string) {
  const p = get(currentProject);
  if (!p) return;
  snapshot(description, coalesceKey);
  const floor = p.floors.find((f) => f.id === p.activeFloorId);
  if (!floor) return;
  fn(floor);
  p.updatedAt = new Date();
  currentProject.set({ ...p });
}


/** Snapshot the current state before a drag begins (call once at drag start) */
export function beginDrag(description = 'Moved element') {
  snapshot(description);
}


/** Zera o histórico — usado ao carregar outro projeto, para não misturar as pilhas. */
export function limparHistorico() {
  undoStack.length = 0;
  redoStack.length = 0;
  resetCoalescing();
  syncHistoryStore();
}
