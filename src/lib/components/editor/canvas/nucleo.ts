/**
 * Núcleo do canvas: conversão de coordenadas, encaixe e as caixas de seleção.
 *
 * Existe para quebrar o ciclo entre desenho e interação — os dois precisam disto, e
 * nenhum dos dois deve depender do outro para tê-lo. É também a lista exata do que o
 * bloco de desenho consome do componente (`DepsDesenho`).
 */
import type { Point } from '$lib/models/types';
import { getRoomPolygon } from '$lib/utils/roomDetection';
import { encaixarNaParede } from '$lib/utils/encaixeParede';
import type { EstadoCanvas } from './estadoCanvas.svelte';

/** Passo da grade de fundo, em unidades de mundo (cm). */
const GRID = 20;
/** Encaixe base quando a grade está desligada, em cm. */
const SNAP = 10;
/** Raio de atração dos pontos notáveis, em px de tela. */
const MAGNETIC_SNAP = 15;
/** Distância máxima para encostar um objeto numa parede, em cm. */
const WALL_SNAP_DIST = 30;

export function criarNucleo(ui: EstadoCanvas) {
  function markDirty() { ui.canvasDirty = true; }
  const getCS = () => ui.getCS();

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


  return {
    markDirty, getCS, snap, screenToWorld, worldToScreen, magneticSnap, angleSnap,
    findConnectedEndpoints, findOwnedConnectedEndpoints,
    getMultiSelectBBox, bboxDoAmbienteSelecionado, snapFurnitureToWall,
    snapWallEndPoint, typedWallLengthCm, applyTypedWallLength,
    GRID, SNAP, MAGNETIC_SNAP, WALL_SNAP_DIST,
  };
}

export type Nucleo = ReturnType<typeof criarNucleo>;
