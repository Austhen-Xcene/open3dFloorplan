/** Preenchimento, padrão de piso e rótulo dos ambientes. */
import type { Wall, Floor } from '$lib/models/types';
import type { Room } from '$lib/models/types';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import type { ProjectSettings } from '$lib/stores/settings';
import { formatLength, formatArea } from '$lib/stores/settings';
import { getRoomPolygon, roomCentroid } from '$lib/utils/roomDetection';
import { getFloorTextureCanvas } from '$lib/utils/texturas';
import { wts } from './geometria';

const ROOM_FILLS_BY_TYPE: Record<string, string> = {
  'Living Room': 'rgba(96, 165, 250, 0.08)',
  'Bedroom': 'rgba(167, 139, 250, 0.08)',
  'Kitchen': 'rgba(251, 191, 36, 0.08)',
  'Bathroom': 'rgba(45, 212, 191, 0.08)',
  'Dining Room': 'rgba(251, 146, 60, 0.08)',
  'Office': 'rgba(52, 211, 153, 0.08)',
  'Hallway': 'rgba(156, 163, 175, 0.06)',
  'Closet': 'rgba(244, 114, 182, 0.06)',
  'Laundry': 'rgba(129, 140, 248, 0.08)',
  'Garage': 'rgba(163, 163, 163, 0.08)',
};
const ROOM_FILLS_DEFAULT = [
  'rgba(167, 139, 250, 0.07)', 'rgba(96, 165, 250, 0.07)', 'rgba(52, 211, 153, 0.07)',
  'rgba(251, 191, 36, 0.07)', 'rgba(248, 113, 113, 0.07)', 'rgba(244, 114, 182, 0.07)',
  'rgba(45, 212, 191, 0.07)', 'rgba(251, 146, 60, 0.07)',
];

export function getRoomFill(room: Room, index: number): string {
  // Solid-color floors (floorTexture 'none') show the room color much more
  // strongly since there is no texture painted on top.
  const solid = room.floorTexture === 'none';
  if (room.color) {
    const hex = room.color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${solid ? 0.45 : 0.12})`;
  }
  return ROOM_FILLS_BY_TYPE[room.name] ?? ROOM_FILLS_DEFAULT[index % ROOM_FILLS_DEFAULT.length];
}

type FloorPatternType = 'wood' | 'tile' | 'stone' | 'none';
const ROOM_FLOOR_PATTERN: Record<string, FloorPatternType> = {
  'Living Room': 'wood', 'Bedroom': 'wood', 'Office': 'wood', 'Dining Room': 'wood', 'Hallway': 'wood',
  'Kitchen': 'tile', 'Bathroom': 'tile', 'Laundry': 'tile',
  'Garage': 'stone', 'Closet': 'none',
};

export function drawRoomFloorPattern(cs: CanvasState, room: Room, screenPoly: { x: number; y: number }[]): void {
  const { ctx, zoom } = cs;
  // Solid-color floor: no texture, no fallback pattern — the fill from
  // getRoomFill is the floor.
  if (room.floorTexture === 'none') return;
  if (room.floorTexture) {
    const texCanvas = getFloorTextureCanvas(room.floorTexture);
    if (texCanvas) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(screenPoly[0].x, screenPoly[0].y);
      for (let i = 1; i < screenPoly.length; i++) ctx.lineTo(screenPoly[i].x, screenPoly[i].y);
      ctx.closePath(); ctx.clip();
      ctx.globalAlpha = 0.5;
      const scale = zoom * 0.15;
      ctx.scale(scale, scale);
      const pat = ctx.createPattern(texCanvas, 'repeat');
      if (pat) {
        ctx.fillStyle = pat;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (const p of screenPoly) { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; }
        ctx.fillRect(minX / scale - 10, minY / scale - 10, (maxX - minX) / scale + 20, (maxY - minY) / scale + 20);
      }
      ctx.restore();
      return;
    }
  }

  const pattern = ROOM_FLOOR_PATTERN[room.name] ?? 'wood';
  if (pattern === 'none' || zoom < 0.3) return;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(screenPoly[0].x, screenPoly[0].y);
  for (let i = 1; i < screenPoly.length; i++) ctx.lineTo(screenPoly[i].x, screenPoly[i].y);
  ctx.closePath(); ctx.clip();

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of screenPoly) { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; }

  const alpha = Math.min(0.12, 0.04 + zoom * 0.02);
  ctx.strokeStyle = `rgba(120, 120, 120, ${alpha})`;
  ctx.lineWidth = 0.5;

  if (pattern === 'wood') {
    const spacing = 15 * zoom;
    if (spacing > 3) {
      for (let y = minY; y <= maxY; y += spacing) { ctx.beginPath(); ctx.moveTo(minX, y); ctx.lineTo(maxX, y); ctx.stroke(); }
      const jointSpacing = 60 * zoom;
      if (jointSpacing > 8) {
        let row = 0;
        for (let y = minY; y <= maxY; y += spacing) {
          const offset = (row % 2) * jointSpacing * 0.5;
          for (let x = minX + offset; x <= maxX; x += jointSpacing) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + spacing); ctx.stroke(); }
          row++;
        }
      }
    }
  } else if (pattern === 'tile') {
    const tileSize = 30 * zoom;
    if (tileSize > 5) {
      for (let x = minX; x <= maxX; x += tileSize) { ctx.beginPath(); ctx.moveTo(x, minY); ctx.lineTo(x, maxY); ctx.stroke(); }
      for (let y = minY; y <= maxY; y += tileSize) { ctx.beginPath(); ctx.moveTo(minX, y); ctx.lineTo(maxX, y); ctx.stroke(); }
    }
  } else if (pattern === 'stone') {
    const spacing = 25 * zoom;
    if (spacing > 5) {
      const w = maxX - minX, h = maxY - minY;
      for (let d = -h; d <= w; d += spacing) { ctx.beginPath(); ctx.moveTo(minX + d, minY); ctx.lineTo(minX + d + h, maxY); ctx.stroke(); }
    }
  }

  ctx.restore();
}

export function drawRooms(
  cs: CanvasState,
  floor: Floor,
  detectedRooms: Room[],
  currentSelectedRoomId: string | null,
  showRoomLabels: boolean,
  showDimensions: boolean,
  dimSettings: ProjectSettings,
): void {
  const { ctx, zoom } = cs;
  for (let ri = 0; ri < detectedRooms.length; ri++) {
    const room = detectedRooms[ri];
    const poly = getRoomPolygon(room, floor.walls);
    if (poly.length < 3) continue;
    const screenPoly = poly.map(p => wts(cs, p.x, p.y));
    ctx.fillStyle = getRoomFill(room, ri);
    ctx.beginPath();
    ctx.moveTo(screenPoly[0].x, screenPoly[0].y);
    for (let i = 1; i < screenPoly.length; i++) ctx.lineTo(screenPoly[i].x, screenPoly[i].y);
    ctx.closePath(); ctx.fill();

    drawRoomFloorPattern(cs, room, screenPoly);

    const isSelected = currentSelectedRoomId === room.id;
    if (isSelected) {
      ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 2; ctx.setLineDash([5, 3]); ctx.stroke(); ctx.setLineDash([]);
    }

    const centroid = roomCentroid(poly);
    const sc = wts(cs, centroid.x, centroid.y);
    const fontSize = Math.max(11, 13 * zoom);
    if (showRoomLabels) {
      ctx.fillStyle = '#9ca3af';
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(`${room.name} (${formatArea(room.area, dimSettings.units)})`, sc.x, sc.y);
    }

    if (showDimensions && dimSettings.showInternalDimensions && poly.length >= 3) {
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const pt of poly) { if (pt.x < minX) minX = pt.x; if (pt.x > maxX) maxX = pt.x; if (pt.y < minY) minY = pt.y; if (pt.y > maxY) maxY = pt.y; }
      const roomW = (maxX - minX) / 100;
      const roomD = (maxY - minY) / 100;
      if (roomW > 0.1 && roomD > 0.1) {
        const dimFontSize = Math.max(9, 10 * zoom);
        ctx.fillStyle = '#b0b8c4'; ctx.font = `${dimFontSize}px sans-serif`;
        ctx.fillText(`${formatLength(roomW * 100, dimSettings.units)} × ${formatLength(roomD * 100, dimSettings.units)}`, sc.x, sc.y + fontSize + 2);
      }
    }
  }
}

// ── Wall joints ──────────────────────────────────────────────────────

