import { selectedTool, undo, redo, selectedElementId, selectedElementIds, selectedRoomId, removeElement, panMode, beginUndoGroup, endUndoGroup } from '$lib/stores/project';
import { get } from 'svelte/store';
import { localStore } from '$lib/services/datastore';
import { currentProject } from '$lib/stores/project';

export interface ShortcutContext {
  rotateFurniture?: () => void;
  save?: () => void;
}

export function handleGlobalShortcut(e: KeyboardEvent, ctx: ShortcutContext = {}): boolean {
  const mod = e.metaKey || e.ctrlKey;

  // Ctrl+Z undo
  if (mod && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undo();
    return true;
  }
  // Ctrl+Y or Ctrl+Shift+Z redo
  if ((mod && e.key === 'y') || (mod && e.key === 'z' && e.shiftKey)) {
    e.preventDefault();
    redo();
    return true;
  }
  // Ctrl+S save
  if (mod && e.key === 's') {
    e.preventDefault();
    if (ctx.save) ctx.save();
    else {
      const p = get(currentProject);
      if (p) localStore.save(p);
    }
    return true;
  }

  // Don't handle single-key shortcuts if user is typing in an input
  const tag = (e.target as HTMLElement)?.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return false;

  if (e.key === 'Escape') {
    selectedTool.set('select');
    selectedElementId.set(null);
    selectedElementIds.set(new Set());
    selectedRoomId.set(null);
    return true;
  }
  if (e.key === 'Delete' || e.key === 'Backspace') {
    const roomId = get(selectedRoomId);
    if (roomId) {
      const project = get(currentProject);
      const floor = project?.floors.find((item) => item.id === project.activeFloorId);
      const savedRoom = floor?.rooms.find((room) => room.id === roomId);

      // Only persisted environments own deletable walls. A detector-only
      // "Room N" may contain walls borrowed from several real environments.
      if (savedRoom) {
        beginUndoGroup();
        for (const wallId of savedRoom.walls) removeElement(wallId);
        endUndoGroup();
      }
      selectedRoomId.set(null);
      selectedElementIds.set(new Set());
      selectedElementId.set(null);
      return true;
    }

    const multiIds = get(selectedElementIds);
    if (multiIds.size > 0) {
      beginUndoGroup();
      for (const id of multiIds) removeElement(id);
      endUndoGroup();
      selectedElementIds.set(new Set());
      selectedElementId.set(null);
    } else {
      const id = get(selectedElementId);
      if (id) { removeElement(id); selectedElementId.set(null); }
    }
    return true;
  }
  // The W shortcut was intentionally removed: it could activate wall drawing
  // while the user was simply navigating the editor.
  if (e.key === 'd' || e.key === 'D') { selectedTool.set('door'); panMode.set(false); return true; }
  if (!mod && (e.key === 'v' || e.key === 'V')) {
    e.preventDefault();
    selectedTool.set('select');
    panMode.set(false);
    return true;
  }
  if (!mod && (e.key === 'h' || e.key === 'H')) {
    e.preventDefault();
    // The hand tool is a navigation variant of select mode. Explicitly leave
    // wall/door/object placement before enabling panning.
    selectedTool.set('select');
    panMode.set(true);
    return true;
  }
  if (e.key === 't' || e.key === 'T') { selectedTool.set('text'); panMode.set(false); return true; }
  if (e.key === 'r' || e.key === 'R') {
    if (ctx.rotateFurniture) ctx.rotateFurniture();
    return true;
  }
  if (e.key === 'g' || e.key === 'G') {
    // Handled in canvas component
    return false;
  }
  return false;
}
