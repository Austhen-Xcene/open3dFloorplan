/** Exportação em PNG — reaproveita o renderizador do canvas. */
import type { Project } from '$lib/models/types';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';
import { detectRooms, getRoomPolygon, roomCentroid } from '$lib/utils/roomDetection';
import { projectSettings, formatArea } from '$lib/stores/settings';
import { get } from 'svelte/store';
import { download, extendBoundsForOpenings, drawOpeningsOnCanvas } from './comum';

/**
 * Export the full floor plan as a high-resolution PNG.
 * Renders all walls/rooms/doors/furniture onto an offscreen canvas
 * so the export isn't limited to the current viewport.
 */
export function exportAsPNG(canvas: HTMLCanvasElement, project?: Project) {
  const name = project?.name || 'floorplan';

  if (project) {
    const floor = project.floors.find(f => f.id === project.activeFloorId) ?? project.floors[0];
    if (floor && floor.walls.length > 0) {
      // Compute bounds of all geometry
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const w of floor.walls) {
        for (const p of [w.start, w.end]) {
          minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
          maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
        }
      }
      for (const fi of floor.furniture) {
        minX = Math.min(minX, fi.position.x - 50);
        minY = Math.min(minY, fi.position.y - 50);
        maxX = Math.max(maxX, fi.position.x + 50);
        maxY = Math.max(maxY, fi.position.y + 50);
      }
      const bounds = { minX, minY, maxX, maxY };
      extendBoundsForOpenings(floor, bounds);
      ({ minX, minY, maxX, maxY } = bounds);
      const pad = 80;
      const w = maxX - minX + pad * 2;
      const h = maxY - minY + pad * 2;
      // Scale up for high-res (2x)
      const scale = 2;
      const offscreen = document.createElement('canvas');
      offscreen.width = w * scale;
      offscreen.height = h * scale;
      const ctx = offscreen.getContext('2d')!;
      ctx.scale(scale, scale);
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, w, h);

      // Draw room fills
      const ROOM_COLORS = ['#bfdbfe', '#fde68a', '#bbf7d0', '#fecaca', '#ddd6fe', '#a5f3fc', '#fed7aa'];
      const rooms = detectRooms(floor.walls);
      for (let ri = 0; ri < rooms.length; ri++) {
        const room = rooms[ri];
        const poly = getRoomPolygon(room, floor.walls);
        if (poly.length < 3) continue;
        ctx.fillStyle = ROOM_COLORS[ri % ROOM_COLORS.length];
        ctx.globalAlpha = 0.4;
        ctx.beginPath();
        ctx.moveTo(poly[0].x - minX + pad, poly[0].y - minY + pad);
        for (let i = 1; i < poly.length; i++) {
          ctx.lineTo(poly[i].x - minX + pad, poly[i].y - minY + pad);
        }
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 1;
        // Room label
        const c = roomCentroid(poly);
        ctx.fillStyle = '#444';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(room.name, c.x - minX + pad, c.y - minY + pad);
        ctx.fillStyle = '#888';
        ctx.font = '10px sans-serif';
        ctx.fillText(formatArea(room.area, get(projectSettings).units), c.x - minX + pad, c.y - minY + pad + 14);
      }

      // Draw walls
      ctx.strokeStyle = '#333';
      ctx.lineCap = 'round';
      for (const wall of floor.walls) {
        ctx.lineWidth = wall.thickness;
        ctx.beginPath();
        ctx.moveTo(wall.start.x - minX + pad, wall.start.y - minY + pad);
        ctx.lineTo(wall.end.x - minX + pad, wall.end.y - minY + pad);
        ctx.stroke();
        // Dimension label
        const len = Math.round(Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y));
        const mx = (wall.start.x + wall.end.x) / 2 - minX + pad;
        const my = (wall.start.y + wall.end.y) / 2 - minY + pad;
        ctx.fillStyle = '#666';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${len} cm`, mx, my - 8);
      }


      // Draw doors and windows (shared full-fidelity renderer)
      drawOpeningsOnCanvas(ctx, floor, minX, minY, pad);

      // Draw furniture
      for (const fi of floor.furniture) {
        const fx = fi.position.x - minX + pad;
        const fy = fi.position.y - minY + pad;
        const cat = getCatalogItem(fi.catalogId);
        const fw = fi.width ?? (cat ? cat.width : 30);
        const fd = fi.depth ?? (cat ? cat.depth : 30);
        const color = fi.color ?? (cat ? cat.color : '#a0c4e8');
        const rot = (fi.rotation || 0) * Math.PI / 180;
        ctx.save();
        ctx.translate(fx, fy);
        ctx.rotate(rot);
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = color;
        ctx.fillRect(-fw / 2, -fd / 2, fw, fd);
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 0.5;
        ctx.strokeRect(-fw / 2, -fd / 2, fw, fd);
        ctx.globalAlpha = 1;
        if (cat) {
          ctx.fillStyle = '#333';
          ctx.font = '9px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(cat.name, 0, 4);
        }
        ctx.restore();
      }

      // Title
      ctx.fillStyle = '#222';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${name} — ${floor.name}`, 20, 24);

      offscreen.toBlob((blob) => {
        if (blob) download(blob, `${name}.png`);
      });
      return;
    }
  }

  // Fallback: just capture the viewport canvas
  canvas.toBlob((blob) => {
    if (blob) download(blob, `${name}-2d.png`);
  });
}

