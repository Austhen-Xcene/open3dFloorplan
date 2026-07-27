/** Desenho de um item do catálogo, com seleção, alças e rótulo. */
import type { FurnitureItem, Stair } from '$lib/models/types';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';
import { drawFurnitureIcon } from '$lib/utils/icones';
import { wts } from './geometria';

export function drawFurnitureItem(cs: CanvasState, item: FurnitureItem, selected: boolean): void {
  const { ctx, zoom } = cs;
  const cat = getCatalogItem(item.catalogId);
  if (!cat) return;
  const s = wts(cs, item.position.x, item.position.y);
  const sx = item.scale?.x ?? 1;
  const sy = item.scale?.y ?? 1;
  const w = (item.width ?? cat.width) * Math.abs(sx) * zoom;
  const d = (item.depth ?? cat.depth) * Math.abs(sy) * zoom;
  const angle = (item.rotation * Math.PI) / 180;

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(angle);
  ctx.scale(Math.sign(sx) || 1, Math.sign(sy) || 1);

  const itemColor = item.color ?? cat.color;
  const strokeColor = selected ? '#3b82f6' : itemColor;
  ctx.lineWidth = selected ? 2 : 1;
  drawFurnitureIcon(ctx, item.catalogId, w, d, itemColor, strokeColor);

  const fontSize = Math.max(8, Math.min(12, Math.min(w, d) * 0.2));
  if (Math.min(w, d) > 20) {
    ctx.fillStyle = '#374151';
    ctx.font = `${fontSize * 0.7}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(cat.name, 0, d / 2 + fontSize * 0.8);
  }

  if (selected) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(-w / 2 - 2, -d / 2 - 2, w + 4, d + 4);
    ctx.setLineDash([]);

    const hs = 5;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5;
    // Corner handles
    for (const [hx, hy] of [[-w/2, -d/2], [w/2, -d/2], [-w/2, d/2], [w/2, d/2]]) {
      ctx.fillRect(hx - hs, hy - hs, hs * 2, hs * 2);
      ctx.strokeRect(hx - hs, hy - hs, hs * 2, hs * 2);
    }

    // Edge midpoint handles
    const ehs = 4; // slightly smaller
    for (const [hx, hy] of [[0, -d/2], [0, d/2], [-w/2, 0], [w/2, 0]]) {
      ctx.fillRect(hx - ehs, hy - ehs, ehs * 2, ehs * 2);
      ctx.strokeRect(hx - ehs, hy - ehs, ehs * 2, ehs * 2);
    }

    const rotY = -d / 2 - 18;
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -d / 2 - 2);
    ctx.lineTo(0, rotY + 5);
    ctx.stroke();
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.arc(0, rotY, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(0, rotY, 3, -Math.PI * 0.8, Math.PI * 0.4);
    ctx.stroke();
    const arrowAngle2 = Math.PI * 0.4;
    const ax = Math.cos(arrowAngle2) * 3;
    const ay = Math.sin(arrowAngle2) * 3;
    ctx.beginPath();
    ctx.moveTo(ax + 1.5, rotY + ay - 1);
    ctx.lineTo(ax, rotY + ay);
    ctx.lineTo(ax - 1, rotY + ay - 2);
    ctx.stroke();
  }

  ctx.restore();
}

// ── Stair drawing ────────────────────────────────────────────────────

