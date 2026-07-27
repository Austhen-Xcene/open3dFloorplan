/** Desenho de janelas na parede e das cotas de distância. */
import type { Wall, Door, Window as Win } from '$lib/models/types';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import type { ProjectSettings } from '$lib/stores/settings';
import { formatLength } from '$lib/stores/settings';
import { wallLength, wallPointAt, wallTangentAt, wallThicknessScreen, wts } from './geometria';

export function drawWindowOnWall(cs: CanvasState, wall: Wall, win: Win): void {
  const { ctx, zoom } = cs;
  const t = win.position;
  const wpt = wallPointAt(wall, t);
  const s = wts(cs, wpt.x, wpt.y);

  const tan = wallTangentAt(wall, t);
  const ux = tan.x, uy = tan.y;
  const nx = -uy, ny = ux;

  const hw = (win.width / 2) * zoom;
  const thickness = wallThicknessScreen(wall, zoom);

  // Clear wall area
  ctx.fillStyle = '#fafafa';
  const gux = ux * hw;
  const guy = uy * hw;
  const gnx = nx * (thickness / 2 + 1);
  const gny = ny * (thickness / 2 + 1);
  ctx.beginPath();
  ctx.moveTo(s.x - gux + gnx, s.y - guy + gny);
  ctx.lineTo(s.x + gux + gnx, s.y + guy + gny);
  ctx.lineTo(s.x + gux - gnx, s.y + guy - gny);
  ctx.lineTo(s.x - gux - gnx, s.y - guy - gny);
  ctx.closePath();
  ctx.fill();

  const winType = win.type || 'standard';
  const gap = Math.max(2, thickness * 0.25);

  if (winType === 'bay') {
    const bayDepth = gap * 3;
    const sideW = hw * 0.3;
    const centerW = hw - sideW;

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;

    const lOuter = { x: s.x - ux * hw, y: s.y - uy * hw };
    const lInner = { x: s.x - ux * centerW + nx * bayDepth, y: s.y - uy * centerW + ny * bayDepth };
    ctx.beginPath(); ctx.moveTo(lOuter.x, lOuter.y); ctx.lineTo(lInner.x, lInner.y); ctx.stroke();

    const rInner = { x: s.x + ux * centerW + nx * bayDepth, y: s.y + uy * centerW + ny * bayDepth };
    ctx.beginPath(); ctx.moveTo(lInner.x, lInner.y); ctx.lineTo(rInner.x, rInner.y); ctx.stroke();

    const rOuter = { x: s.x + ux * hw, y: s.y + uy * hw };
    ctx.beginPath(); ctx.moveTo(rInner.x, rInner.y); ctx.lineTo(rOuter.x, rOuter.y); ctx.stroke();

    ctx.strokeStyle = '#99c';
    ctx.lineWidth = 1;
    const inset = 0.3;
    ctx.beginPath();
    ctx.moveTo(lOuter.x + (lInner.x - lOuter.x) * inset, lOuter.y + (lInner.y - lOuter.y) * inset);
    ctx.lineTo(lInner.x - (lInner.x - lOuter.x) * inset, lInner.y - (lInner.y - lOuter.y) * inset);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(lInner.x + (rInner.x - lInner.x) * 0.05, lInner.y + (rInner.y - lInner.y) * 0.05);
    ctx.lineTo(rInner.x - (rInner.x - lInner.x) * 0.05, rInner.y - (rInner.y - lInner.y) * 0.05);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(rInner.x + (rOuter.x - rInner.x) * inset, rInner.y + (rOuter.y - rInner.y) * inset);
    ctx.lineTo(rOuter.x - (rOuter.x - rInner.x) * inset, rOuter.y - (rOuter.y - rInner.y) * inset);
    ctx.stroke();

  } else if (winType === 'sliding') {
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    const offset = gap * 0.4;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw + nx * offset, s.y - uy * hw + ny * offset);
    ctx.lineTo(s.x + ux * hw * 0.1 + nx * offset, s.y + uy * hw * 0.1 + ny * offset);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw * 0.1 - nx * offset, s.y - uy * hw * 0.1 - ny * offset);
    ctx.lineTo(s.x + ux * hw - nx * offset, s.y + uy * hw - ny * offset);
    ctx.stroke();
    ctx.lineWidth = 1;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s.x + ux * hw * side + nx * gap, s.y + uy * hw * side + ny * gap);
      ctx.lineTo(s.x + ux * hw * side - nx * gap, s.y + uy * hw * side - ny * gap);
      ctx.stroke();
    }
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    const aOff = gap * 1.5;
    const ax1 = s.x - ux * hw * 0.3 + nx * aOff;
    const ay1 = s.y - uy * hw * 0.3 + ny * aOff;
    const ax2 = s.x + ux * hw * 0.3 + nx * aOff;
    const ay2 = s.y + uy * hw * 0.3 + ny * aOff;
    ctx.beginPath(); ctx.moveTo(ax1, ay1); ctx.lineTo(ax2, ay2); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(ax2 - ux * 5 + nx * 3, ay2 - uy * 5 + ny * 3);
    ctx.lineTo(ax2, ay2);
    ctx.lineTo(ax2 - ux * 5 - nx * 3, ay2 - uy * 5 - ny * 3);
    ctx.stroke();

  } else if (winType === 'fixed') {
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw + nx * gap, s.y - uy * hw + ny * gap);
    ctx.lineTo(s.x + ux * hw + nx * gap, s.y + uy * hw + ny * gap);
    ctx.lineTo(s.x + ux * hw - nx * gap, s.y + uy * hw - ny * gap);
    ctx.lineTo(s.x - ux * hw - nx * gap, s.y - uy * hw - ny * gap);
    ctx.closePath();
    ctx.stroke();
    ctx.strokeStyle = '#aab';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw + nx * gap, s.y - uy * hw + ny * gap);
    ctx.lineTo(s.x + ux * hw - nx * gap, s.y + uy * hw - ny * gap);
    ctx.moveTo(s.x + ux * hw + nx * gap, s.y + uy * hw + ny * gap);
    ctx.lineTo(s.x - ux * hw - nx * gap, s.y - uy * hw - ny * gap);
    ctx.stroke();

  } else if (winType === 'casement') {
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw + nx * gap, s.y - uy * hw + ny * gap);
    ctx.lineTo(s.x + ux * hw + nx * gap, s.y + uy * hw + ny * gap);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw - nx * gap, s.y - uy * hw - ny * gap);
    ctx.lineTo(s.x + ux * hw - nx * gap, s.y + uy * hw - ny * gap);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw, s.y - uy * hw);
    ctx.lineTo(s.x + ux * hw, s.y + uy * hw);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw + nx * gap, s.y - uy * hw + ny * gap);
    ctx.lineTo(s.x - ux * hw - nx * gap, s.y - uy * hw - ny * gap);
    ctx.moveTo(s.x + ux * hw + nx * gap, s.y + uy * hw + ny * gap);
    ctx.lineTo(s.x + ux * hw - nx * gap, s.y + uy * hw - ny * gap);
    ctx.stroke();
    ctx.strokeStyle = '#88a';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw + nx * gap, s.y - uy * hw + ny * gap);
    ctx.lineTo(s.x + nx * gap * 2.5, s.y + ny * gap * 2.5);
    ctx.lineTo(s.x + ux * hw + nx * gap, s.y + uy * hw + ny * gap);
    ctx.stroke();

  } else {
    // Standard
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw + nx * gap, s.y - uy * hw + ny * gap);
    ctx.lineTo(s.x + ux * hw + nx * gap, s.y + uy * hw + ny * gap);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw - nx * gap, s.y - uy * hw - ny * gap);
    ctx.lineTo(s.x + ux * hw - nx * gap, s.y + uy * hw - ny * gap);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw, s.y - uy * hw);
    ctx.lineTo(s.x + ux * hw, s.y + uy * hw);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * hw + nx * gap, s.y - uy * hw + ny * gap);
    ctx.lineTo(s.x - ux * hw - nx * gap, s.y - uy * hw - ny * gap);
    ctx.moveTo(s.x + ux * hw + nx * gap, s.y + uy * hw + ny * gap);
    ctx.lineTo(s.x + ux * hw - nx * gap, s.y + uy * hw - ny * gap);
    ctx.stroke();
  }
}

// ── Door/Window distance dimensions ──────────────────────────────────

export function drawWindowDistanceDimensions(cs: CanvasState, wall: Wall, window: Win, dimSettings: ProjectSettings): void {
  const { ctx, zoom } = cs;
  const wLength = wallLength(wall);
  if (wLength < 10) return;

  const distFromA = wLength * window.position;
  const distFromB = wLength * (1 - window.position);

  const windowCenter = wallPointAt(wall, window.position);
  const wcScreen = wts(cs, windowCenter.x, windowCenter.y);
  const wallStartScreen = wts(cs, wall.start.x, wall.start.y);
  const wallEndScreen = wts(cs, wall.end.x, wall.end.y);

  if (dimSettings.showExtensionLines) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(wcScreen.x, wcScreen.y); ctx.lineTo(wallStartScreen.x, wallStartScreen.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(wcScreen.x, wcScreen.y); ctx.lineTo(wallEndScreen.x, wallEndScreen.y); ctx.stroke();
    ctx.setLineDash([]);
  }

  const fontSize = Math.max(10, 11 * zoom);
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const [midPoint, dist] of [
    [{ x: (wcScreen.x + wallStartScreen.x) / 2, y: (wcScreen.y + wallStartScreen.y) / 2 }, distFromA],
    [{ x: (wcScreen.x + wallEndScreen.x) / 2, y: (wcScreen.y + wallEndScreen.y) / 2 }, distFromB],
  ] as [{ x: number; y: number }, number][]) {
    const labelText = formatLength(dist, dimSettings.units);
    const textWidth = ctx.measureText(labelText).width;
    const pillWidth = textWidth + 12;
    const pillHeight = fontSize + 6;
    ctx.fillStyle = '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(midPoint.x - pillWidth / 2, midPoint.y - pillHeight / 2, pillWidth, pillHeight, pillHeight / 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.fillText(labelText, midPoint.x, midPoint.y);
  }
}

// ── Furniture drawing ────────────────────────────────────────────────

