/**
 * Pré-visualizações: item sendo posicionado, porta/janela sobre a parede e guias de alinhamento.
 */
import type { FurnitureItem } from '$lib/models/types';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';
import { drawFurnitureIcon } from '$lib/utils/icones';
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { DepsDesenho } from './tipos';

import type { Adaptadores } from './adaptadores';

export function criarPrevias(ui: EstadoCanvas, deps: DepsDesenho, ad: Adaptadores) {
  const { markDirty, getCS, getMultiSelectBBox, snapFurnitureToWall, worldToScreen, snapWallEndPoint, typedWallLengthCm, applyTypedWallLength } = deps;

  const { drawFurniture, wallPointAt, wallTangentAt } = ad;

  function drawFurniturePreview() {
    if (!ui.currentPlacingId) return;
    const cat = getCatalogItem(ui.currentPlacingId);
    if (!cat) return;

    const wallSnap = snapFurnitureToWall(ui.mousePos, ui.currentPlacingId, ui.currentPlacingRotation);

    const pos = wallSnap ? wallSnap.position : ui.mousePos;
    const rot = wallSnap ? wallSnap.rotation : ui.currentPlacingRotation;

    const s = worldToScreen(pos.x, pos.y);
    const w = cat.width * ui.zoom;
    const d = cat.depth * ui.zoom;
    const angle = (rot * Math.PI) / 180;

    if (wallSnap && ui.currentFloor) {
      const snapWall = ui.currentFloor.walls.find(wl => wl.id === wallSnap.wallId);
      if (snapWall) {
        const ws = worldToScreen(snapWall.start.x, snapWall.start.y);
        const we = worldToScreen(snapWall.end.x, snapWall.end.y);
        ui.ctx.strokeStyle = '#3b82f6';
        ui.ctx.lineWidth = 2;
        ui.ctx.setLineDash([6, 3]);
        ui.ctx.beginPath();
        ui.ctx.moveTo(ws.x, ws.y);
        ui.ctx.lineTo(we.x, we.y);
        ui.ctx.stroke();
        ui.ctx.setLineDash([]);
      }
    }

    ui.ctx.save();
    ui.ctx.translate(s.x, s.y);
    ui.ctx.rotate(angle);
    ui.ctx.globalAlpha = 0.5;
    drawFurnitureIcon(ui.ctx, ui.currentPlacingId, w, d, cat.color, cat.color);
    ui.ctx.globalAlpha = 1;
    ui.ctx.restore();
  }

  function drawPlacementPreview() {
    if (!ui.placementPreview || !ui.currentFloor) return;
    const wall = ui.currentFloor.walls.find(w => w.id === ui.placementPreview!.wallId);
    if (!wall) return;
    const t = ui.placementPreview.position;
    const wpt = wallPointAt(wall, t);
    const s = worldToScreen(wpt.x, wpt.y);
    const tan = wallTangentAt(wall, t);
    const ux = tan.x, uy = tan.y;
    const nx = -uy, ny = ux;
    const isDoor = ui.placementPreview.type === 'door';
    const doorWidths: Record<string, number> = {
      single: 90, double: 150, sliding: 180, french: 150,
      pocket: 90, bifold: 180, opening: 100, garage: 240,
    };
    const itemWidth = isDoor ? (doorWidths[ui.currentDoorType] ?? 90) : 120;
    const halfW = (itemWidth / 2) * ui.zoom;
    const thickness = Math.max(wall.thickness * ui.zoom, 4);

    ui.ctx.save();
    ui.ctx.globalAlpha = 0.5;

    ui.ctx.fillStyle = '#fafafa';
    const gux = ux * halfW, guy = uy * halfW;
    const gnx = nx * (thickness / 2 + 1), gny = ny * (thickness / 2 + 1);
    ui.ctx.beginPath();
    ui.ctx.moveTo(s.x - gux + gnx, s.y - guy + gny);
    ui.ctx.lineTo(s.x + gux + gnx, s.y + guy + gny);
    ui.ctx.lineTo(s.x + gux - gnx, s.y + guy - gny);
    ui.ctx.lineTo(s.x - gux - gnx, s.y - guy - gny);
    ui.ctx.closePath();
    ui.ctx.fill();

    if (isDoor) {
      // Openings and garage doors have no swing — show the gap and a panel line
      const noSwing = ui.currentDoorType === 'opening' || ui.currentDoorType === 'garage';
      if (!noSwing) {
        const wallAngle = Math.atan2(uy, ux);
        const r = itemWidth * ui.zoom;
        const hingeX = s.x - ux * halfW;
        const hingeY = s.y - uy * halfW;
        const startAngle = wallAngle + Math.PI;
        const endAngle = startAngle + Math.PI / 2;
        ui.ctx.strokeStyle = '#3b82f6';
        ui.ctx.lineWidth = 1;
        ui.ctx.beginPath();
        ui.ctx.arc(hingeX, hingeY, r, Math.min(startAngle, endAngle), Math.max(startAngle, endAngle));
        ui.ctx.stroke();
        ui.ctx.lineWidth = 2.5;
        ui.ctx.beginPath();
        ui.ctx.moveTo(hingeX, hingeY);
        ui.ctx.lineTo(hingeX + r * Math.cos(endAngle), hingeY + r * Math.sin(endAngle));
        ui.ctx.stroke();
      } else if (ui.currentDoorType === 'garage') {
        ui.ctx.strokeStyle = '#3b82f6';
        ui.ctx.lineWidth = 2.5;
        ui.ctx.beginPath();
        ui.ctx.moveTo(s.x - ux * halfW, s.y - uy * halfW);
        ui.ctx.lineTo(s.x + ux * halfW, s.y + uy * halfW);
        ui.ctx.stroke();
      }
      ui.ctx.lineWidth = 1.5;
      ui.ctx.strokeStyle = '#3b82f6';
      const jamb = thickness / 2 + 2;
      for (const sign of [-1, 1]) {
        const jx = s.x + ux * halfW * sign;
        const jy = s.y + uy * halfW * sign;
        ui.ctx.beginPath();
        ui.ctx.moveTo(jx + nx * jamb, jy + ny * jamb);
        ui.ctx.lineTo(jx - nx * jamb, jy - ny * jamb);
        ui.ctx.stroke();
      }
    } else {
      ui.ctx.strokeStyle = '#3b82f6';
      ui.ctx.lineWidth = 2;
      for (const off of [-2, 0, 2]) {
        const ox = nx * off, oy = ny * off;
        ui.ctx.beginPath();
        ui.ctx.moveTo(s.x - ux * halfW + ox, s.y - uy * halfW + oy);
        ui.ctx.lineTo(s.x + ux * halfW + ox, s.y + uy * halfW + oy);
        ui.ctx.stroke();
      }
    }

    ui.ctx.globalAlpha = 1;

    ui.ctx.font = 'bold 11px system-ui, sans-serif';
    const text = isDoor ? 'Click to place door' : 'Click to place window';
    const tm = ui.ctx.measureText(text);
    const tx = s.x, ty = s.y - thickness / 2 - 24;
    const pw = tm.width + 12, ph = 20;
    ui.ctx.fillStyle = '#1e293b';
    ui.ctx.beginPath();
    ui.ctx.roundRect(tx - pw / 2, ty - ph / 2, pw, ph, 4);
    ui.ctx.fill();
    ui.ctx.beginPath();
    ui.ctx.moveTo(tx - 5, ty + ph / 2);
    ui.ctx.lineTo(tx + 5, ty + ph / 2);
    ui.ctx.lineTo(tx, ty + ph / 2 + 5);
    ui.ctx.closePath();
    ui.ctx.fill();
    ui.ctx.fillStyle = '#fff';
    ui.ctx.textAlign = 'center';
    ui.ctx.textBaseline = 'middle';
    ui.ctx.fillText(text, tx, ty);

    ui.ctx.restore();

    const ws = worldToScreen(wall.start.x, wall.start.y);
    const we = worldToScreen(wall.end.x, wall.end.y);
    ui.ctx.strokeStyle = '#3b82f680';
    ui.ctx.lineWidth = 2;
    ui.ctx.setLineDash([6, 3]);
    ui.ctx.beginPath();
    ui.ctx.moveTo(ws.x, ws.y);
    ui.ctx.lineTo(we.x, we.y);
    ui.ctx.stroke();
    ui.ctx.setLineDash([]);
  }

  function drawAlignmentGuides(item: FurnitureItem) {
    if (!ui.currentFloor) return;
    const threshold = 5;
    for (const other of ui.currentFloor.furniture) {
      if (other.id === item.id) continue;
      const s1 = worldToScreen(item.position.x, item.position.y);
      const s2 = worldToScreen(other.position.x, other.position.y);
      ui.ctx.strokeStyle = '#ef4444';
      ui.ctx.lineWidth = 0.5;
      ui.ctx.setLineDash([4, 4]);
      if (Math.abs(item.position.x - other.position.x) < threshold) {
        ui.ctx.beginPath(); ui.ctx.moveTo(s1.x, 0); ui.ctx.lineTo(s1.x, ui.height); ui.ctx.stroke();
      }
      if (Math.abs(item.position.y - other.position.y) < threshold) {
        ui.ctx.beginPath(); ui.ctx.moveTo(0, s1.y); ui.ctx.lineTo(ui.width, s1.y); ui.ctx.stroke();
      }
      ui.ctx.setLineDash([]);
    }
  }

  return { drawFurniturePreview, drawPlacementPreview, drawAlignmentGuides };
}

export type Previas = ReturnType<typeof criarPrevias>;
