/** Desenho de portas na parede e das cotas de distância. */
import type { Wall, Door } from '$lib/models/types';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import type { ProjectSettings } from '$lib/stores/settings';
import { formatLength } from '$lib/stores/settings';
import { wallLength, wallPointAt, wallTangentAt, wallThicknessScreen, wts } from './geometria';

export function drawDoorOnWall(cs: CanvasState, wall: Wall, door: Door): void {
  const { ctx, zoom } = cs;
  const t = door.position;
  const wpt = wallPointAt(wall, t);
  const s = wts(cs, wpt.x, wpt.y);

  const tan = wallTangentAt(wall, t);
  const ux = tan.x, uy = tan.y;
  const nx = -uy, ny = ux;

  const halfDoor = (door.width / 2) * zoom;
  const thickness = wallThicknessScreen(wall, zoom);
  const wallAngle = Math.atan2(uy, ux);
  const swingDir = door.swingDirection === 'left' ? 1 : -1;
  const sideFlip = (door.flipSide ?? false) ? -1 : 1;

  // Clear wall area for door gap
  ctx.fillStyle = '#fafafa';
  const gux = ux * halfDoor;
  const guy = uy * halfDoor;
  const gnx = nx * (thickness / 2 + 1);
  const gny = ny * (thickness / 2 + 1);
  ctx.beginPath();
  ctx.moveTo(s.x - gux + gnx, s.y - guy + gny);
  ctx.lineTo(s.x + gux + gnx, s.y + guy + gny);
  ctx.lineTo(s.x + gux - gnx, s.y + guy - gny);
  ctx.lineTo(s.x - gux - gnx, s.y - guy - gny);
  ctx.closePath();
  ctx.fill();

  // Door jamb ticks
  const jamb = thickness / 2 + 2;
  ctx.strokeStyle = '#444';
  ctx.lineWidth = 1.5;
  for (const sign of [-1, 1]) {
    const jx = s.x + ux * halfDoor * sign;
    const jy = s.y + uy * halfDoor * sign;
    ctx.beginPath();
    ctx.moveTo(jx + nx * jamb, jy + ny * jamb);
    ctx.lineTo(jx - nx * jamb, jy - ny * jamb);
    ctx.stroke();
  }

  const doorType = door.type || 'single';

  if (doorType === 'single' || doorType === 'pocket') {
    const r = door.width * zoom;
    const hingeX = s.x + ux * halfDoor * swingDir;
    const hingeY = s.y + uy * halfDoor * swingDir;
    const startAngle = wallAngle + (swingDir === 1 ? Math.PI : 0);
    const endAngle = startAngle + (-swingDir) * sideFlip * (Math.PI / 2);

    if (doorType === 'pocket') {
      ctx.setLineDash([4, 3]);
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(hingeX, hingeY);
      ctx.lineTo(hingeX + ux * halfDoor * 2 * swingDir, hingeY + uy * halfDoor * 2 * swingDir);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hingeX, hingeY, r, Math.min(startAngle, endAngle), Math.max(startAngle, endAngle));
      ctx.stroke();
    }

    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#444';
    ctx.beginPath();
    ctx.moveTo(hingeX, hingeY);
    const panelAngle = doorType === 'pocket' ? startAngle : endAngle;
    ctx.lineTo(hingeX + r * Math.cos(panelAngle), hingeY + r * Math.sin(panelAngle));
    ctx.stroke();

    ctx.fillStyle = '#444';
    ctx.beginPath();
    ctx.arc(hingeX, hingeY, 2.5, 0, Math.PI * 2);
    ctx.fill();

  } else if (doorType === 'double' || doorType === 'french') {
    const r = halfDoor;
    for (const side of [-1, 1] as const) {
      const hx = s.x + ux * halfDoor * side;
      const hy = s.y + uy * halfDoor * side;
      const arcSwing = side === -1 ? swingDir : -swingDir;
      const sa = wallAngle + Math.PI * (side === 1 ? 1 : 0);
      const ea = sa + arcSwing * sideFlip * (Math.PI / 2);

      ctx.strokeStyle = '#666';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(hx, hy, r, Math.min(sa, ea), Math.max(sa, ea));
      ctx.stroke();

      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#444';
      ctx.beginPath();
      ctx.moveTo(hx, hy);
      ctx.lineTo(hx + r * Math.cos(ea), hy + r * Math.sin(ea));
      ctx.stroke();

      ctx.fillStyle = '#444';
      ctx.beginPath();
      ctx.arc(hx, hy, 2, 0, Math.PI * 2);
      ctx.fill();
    }
    if (doorType === 'french') {
      ctx.strokeStyle = '#aaa';
      ctx.lineWidth = 0.5;
    }

  } else if (doorType === 'sliding') {
    const panelW = halfDoor * 0.9;
    const offset = thickness * 0.15 * sideFlip;
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * halfDoor, s.y - uy * halfDoor);
    ctx.lineTo(s.x + ux * panelW * 0.1, s.y + uy * panelW * 0.1);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s.x - ux * panelW * 0.1 + nx * offset, s.y - uy * panelW * 0.1 + ny * offset);
    ctx.lineTo(s.x + ux * halfDoor + nx * offset, s.y + uy * halfDoor + ny * offset);
    ctx.stroke();
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    const arrowY2 = ny * (thickness * 0.4);
    const arrowX2 = nx * (thickness * 0.4);
    const ax = s.x - arrowX2;
    const ay = s.y - arrowY2;
    ctx.beginPath();
    ctx.moveTo(ax - ux * halfDoor * 0.5, ay - uy * halfDoor * 0.5);
    ctx.lineTo(ax + ux * halfDoor * 0.5, ay + uy * halfDoor * 0.5);
    ctx.stroke();
    const ahx = ax + ux * halfDoor * 0.5;
    const ahy = ay + uy * halfDoor * 0.5;
    ctx.beginPath();
    ctx.moveTo(ahx - ux * 6 + nx * 4, ahy - uy * 6 + ny * 4);
    ctx.lineTo(ahx, ahy);
    ctx.lineTo(ahx - ux * 6 - nx * 4, ahy - uy * 6 - ny * 4);
    ctx.stroke();

  } else if (doorType === 'bifold') {
    const panelCount = 4;
    const panelW = (door.width / panelCount) * zoom;
    const foldAngle = Math.PI / 6;
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    let px = s.x - ux * halfDoor;
    let py = s.y - uy * halfDoor;
    for (let i = 0; i < panelCount; i++) {
      const angle = wallAngle + (i % 2 === 0 ? foldAngle * swingDir : -foldAngle * swingDir * 0.3);
      const ex = px + panelW * Math.cos(angle);
      const ey = py + panelW * Math.sin(angle);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(ex, ey);
      ctx.stroke();
      ctx.fillStyle = '#666';
      ctx.beginPath();
      ctx.arc(px, py, 1.5, 0, Math.PI * 2);
      ctx.fill();
      px = ex;
      py = ey;
    }

  } else if (doorType === 'opening') {
    // Plain doorway (no door): dashed threshold lines along both wall faces
    ctx.strokeStyle = '#999';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    for (const side of [-1, 1]) {
      const ox = nx * (thickness / 2) * side;
      const oy = ny * (thickness / 2) * side;
      ctx.beginPath();
      ctx.moveTo(s.x - ux * halfDoor + ox, s.y - uy * halfDoor + oy);
      ctx.lineTo(s.x + ux * halfDoor + ox, s.y + uy * halfDoor + oy);
      ctx.stroke();
    }
    ctx.setLineDash([]);

  } else if (doorType === 'garage') {
    // Overhead/sectional garage door: panel line across the opening with
    // section ticks, plus dashed overhead-track lines into the garage.
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(s.x - ux * halfDoor, s.y - uy * halfDoor);
    ctx.lineTo(s.x + ux * halfDoor, s.y + uy * halfDoor);
    ctx.stroke();
    ctx.lineWidth = 1;
    const segs = 4;
    for (let i = 1; i < segs; i++) {
      const t2 = -1 + (2 * i) / segs;
      const tx = s.x + ux * halfDoor * t2;
      const ty = s.y + uy * halfDoor * t2;
      ctx.beginPath();
      ctx.moveTo(tx + nx * 3, ty + ny * 3);
      ctx.lineTo(tx - nx * 3, ty - ny * 3);
      ctx.stroke();
    }
    const trackDir = (door.flipSide ?? false) ? -1 : 1;
    const trackLen = halfDoor * 0.8;
    ctx.setLineDash([4, 3]);
    ctx.strokeStyle = '#999';
    for (const side of [-1, 1]) {
      const bx = s.x + ux * halfDoor * 0.7 * side;
      const by = s.y + uy * halfDoor * 0.7 * side;
      ctx.beginPath();
      ctx.moveTo(bx, by);
      ctx.lineTo(bx + nx * trackLen * trackDir, by + ny * trackLen * trackDir);
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }
}

// ── Window drawing ───────────────────────────────────────────────────

export function drawDoorDistanceDimensions(cs: CanvasState, wall: Wall, door: Door, dimSettings: ProjectSettings): void {
  const { ctx, zoom } = cs;
  const wLength = wallLength(wall);
  if (wLength < 10) return;

  const distFromA = wLength * door.position;
  const distFromB = wLength * (1 - door.position);

  const doorCenter = wallPointAt(wall, door.position);
  const dcScreen = wts(cs, doorCenter.x, doorCenter.y);
  const wallStartScreen = wts(cs, wall.start.x, wall.start.y);
  const wallEndScreen = wts(cs, wall.end.x, wall.end.y);

  if (dimSettings.showExtensionLines) {
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(dcScreen.x, dcScreen.y); ctx.lineTo(wallStartScreen.x, wallStartScreen.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(dcScreen.x, dcScreen.y); ctx.lineTo(wallEndScreen.x, wallEndScreen.y); ctx.stroke();
    ctx.setLineDash([]);
  }

  const fontSize = Math.max(10, 11 * zoom);
  ctx.font = `${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (const [midPoint, dist] of [
    [{ x: (dcScreen.x + wallStartScreen.x) / 2, y: (dcScreen.y + wallStartScreen.y) / 2 }, distFromA],
    [{ x: (dcScreen.x + wallEndScreen.x) / 2, y: (dcScreen.y + wallEndScreen.y) / 2 }, distFromB],
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

