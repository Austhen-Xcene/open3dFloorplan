/**
 * Utilidades compartilhadas pelos exportadores.
 *
 * ATENÇÃO: cada formato tem desenho próprio. Ao criar um tipo novo de elemento,
 * ele precisa ser tratado em TODOS os módulos de exportacao/, não só no canvas.
 */
import type { Floor } from '$lib/models/types';
import { drawDoorOnWall, drawWindowOnWall } from '$lib/utils/renderizador';
import type { CanvasState } from '$lib/utils/canvasInteraction';


/** Escape text for safe SVG embedding */
export function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Extend plan bounds so door swing arcs (radius up to door width) aren't clipped.
 */
export function extendBoundsForOpenings(
  floor: Floor,
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
) {
  for (const d of floor.doors) {
    const wall = floor.walls.find(w => w.id === d.wallId);
    if (!wall) continue;
    const px = wall.start.x + (wall.end.x - wall.start.x) * d.position;
    const py = wall.start.y + (wall.end.y - wall.start.y) * d.position;
    bounds.minX = Math.min(bounds.minX, px - d.width);
    bounds.minY = Math.min(bounds.minY, py - d.width);
    bounds.maxX = Math.max(bounds.maxX, px + d.width);
    bounds.maxY = Math.max(bounds.maxY, py + d.width);
  }
}

/**
 * Draw all doors and windows onto an export canvas using the shared
 * full-fidelity renderer. The CanvasState below maps world→canvas as
 * `wx - minX + pad`, matching the export drawing convention.
 */
export function drawOpeningsOnCanvas(
  ctx: CanvasRenderingContext2D,
  floor: Floor,
  minX: number,
  minY: number,
  pad: number,
) {
  const cs: CanvasState = { ctx, width: pad * 2, height: pad * 2, zoom: 1, camX: minX, camY: minY };
  for (const d of floor.doors) {
    const wall = floor.walls.find(w => w.id === d.wallId);
    if (wall) drawDoorOnWall(cs, wall, d);
  }
  for (const win of floor.windows) {
    const wall = floor.walls.find(w => w.id === win.wallId);
    if (wall) drawWindowOnWall(cs, wall, win);
  }
}

