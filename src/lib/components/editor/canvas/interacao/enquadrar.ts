/**
 * Enquadramento do projeto (tecla F) e navegação pelo minimapa.
 */
import { getCatalogItem } from '$lib/utils/furnitureCatalog';
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { Nucleo } from '../nucleo';
import type { Desenho } from '../desenho';

export function criarEnquadramento(ui: EstadoCanvas, n: Nucleo, d: Desenho) {
  const { markDirty } = n;
  const { getWorldBBox, wallPointAt } = d;

  function onMinimapClick(e: MouseEvent) {
    if (!ui.minimapCanvas || !ui.currentFloor) return;
    const rect = ui.minimapCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const mw = ui.minimapCanvas.width;
    const mh = ui.minimapCanvas.height;

    const bbox = getWorldBBox();
    if (!bbox) return;
    const bw = bbox.maxX - bbox.minX;
    const bh = bbox.maxY - bbox.minY;
    if (bw < 1 || bh < 1) return;
    const scale = Math.min((mw - 8) / bw, (mh - 8) / bh);
    const ox = (mw - bw * scale) / 2;
    const oy = (mh - bh * scale) / 2;

    // Convert mini-map coords to world coords
    ui.camX = bbox.minX + (mx - ox) / scale;
    ui.camY = bbox.minY + (my - oy) / scale;
  }

  function zoomToFit() {
    if (!ui.currentFloor || (ui.currentFloor.walls.length === 0 && ui.currentFloor.furniture.length === 0)) {
      ui.camX = 0; ui.camY = 0; ui.zoom = 1;
      return;
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    function expand(x: number, y: number) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    // Walls (including curve control points)
    for (const w of ui.currentFloor.walls) {
      expand(w.start.x, w.start.y);
      expand(w.end.x, w.end.y);
      if (w.curvePoint) expand(w.curvePoint.x, w.curvePoint.y);
    }
    // Furniture
    for (const fi of ui.currentFloor.furniture) {
      const cat = getCatalogItem(fi.catalogId);
      if (!cat) continue;
      const hw = (fi.width ?? cat.width) / 2;
      const hd = (fi.depth ?? cat.depth) / 2;
      const r = Math.hypot(hw, hd); // conservative radius for rotated items
      expand(fi.position.x - r, fi.position.y - r);
      expand(fi.position.x + r, fi.position.y + r);
    }
    // Doors & windows (position on their parent wall)
    for (const d of ui.currentFloor.doors) {
      const w = ui.currentFloor.walls.find(wl => wl.id === d.wallId);
      if (w) { const pt = wallPointAt(w, d.position); expand(pt.x, pt.y); }
    }
    for (const win of ui.currentFloor.windows) {
      const w = ui.currentFloor.walls.find(wl => wl.id === win.wallId);
      if (w) { const pt = wallPointAt(w, win.position); expand(pt.x, pt.y); }
    }
    // Stairs
    if (ui.currentFloor.stairs) {
      for (const st of ui.currentFloor.stairs) {
        expand(st.position.x - st.width / 2, st.position.y - st.depth / 2);
        expand(st.position.x + st.width / 2, st.position.y + st.depth / 2);
      }
    }
    // Columns
    if (ui.currentFloor.columns) {
      for (const col of ui.currentFloor.columns) {
        const r = col.diameter / 2;
        expand(col.position.x - r, col.position.y - r);
        expand(col.position.x + r, col.position.y + r);
      }
    }
    if (minX === Infinity) { ui.camX = 0; ui.camY = 0; ui.zoom = 1; return; }
    const padding = 80;
    const contentW = maxX - minX + padding * 2;
    const contentH = maxY - minY + padding * 2;
    ui.camX = (minX + maxX) / 2;
    ui.camY = (minY + maxY) / 2;
    ui.zoom = Math.min(ui.width / contentW, ui.height / contentH, 3);
    ui.zoom = Math.max(ui.zoom, 0.1);
    markDirty();
  }

  return { onMinimapClick, zoomToFit };
}
