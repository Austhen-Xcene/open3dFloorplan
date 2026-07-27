/** Exportação em SVG — desenho vetorial próprio, independente do canvas. */
import type { Project } from '$lib/models/types';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';
import { detectRooms, getRoomPolygon, roomCentroid } from '$lib/utils/roomDetection';
import { projectSettings, formatArea } from '$lib/stores/settings';
import { get } from 'svelte/store';
import { escapeXml, download, extendBoundsForOpenings } from './comum';

export function exportAsSVG(project: Project) {
  const floor = project.floors.find(f => f.id === project.activeFloorId) ?? project.floors[0];
  if (!floor || floor.walls.length === 0) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const w of floor.walls) {
    for (const p of [w.start, w.end]) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
  }
  const svgBounds = { minX, minY, maxX, maxY };
  extendBoundsForOpenings(floor, svgBounds);
  ({ minX, minY, maxX, maxY } = svgBounds);
  const pad = 50;
  const vw = maxX - minX + pad * 2;
  const vh = maxY - minY + pad * 2;

  let paths = '';

  // Room fills
  const ROOM_COLORS_SVG = ['#bfdbfe', '#fde68a', '#bbf7d0', '#fecaca', '#ddd6fe', '#a5f3fc', '#fed7aa'];
  const rooms = detectRooms(floor.walls);
  for (let ri = 0; ri < rooms.length; ri++) {
    const room = rooms[ri];
    const poly = getRoomPolygon(room, floor.walls);
    if (poly.length < 3) continue;
    const pts = poly.map(p => `${p.x - minX + pad},${p.y - minY + pad}`).join(' ');
    const color = ROOM_COLORS_SVG[ri % ROOM_COLORS_SVG.length];
    paths += `  <polygon points="${pts}" fill="${color}" fill-opacity="0.4" stroke="none"/>\n`;
    const c = roomCentroid(poly);
    const cx = c.x - minX + pad;
    const cy = c.y - minY + pad;
    paths += `  <text x="${cx}" y="${cy}" text-anchor="middle" font-size="12" fill="#444" font-family="sans-serif" font-weight="bold">${escapeXml(room.name)}</text>\n`;
    paths += `  <text x="${cx}" y="${cy + 14}" text-anchor="middle" font-size="10" fill="#888" font-family="sans-serif">${formatArea(room.area, get(projectSettings).units)}</text>\n`;
  }

  for (const w of floor.walls) {
    const x1 = w.start.x - minX + pad;
    const y1 = w.start.y - minY + pad;
    const x2 = w.end.x - minX + pad;
    const y2 = w.end.y - minY + pad;
    paths += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#333" stroke-width="${w.thickness}" stroke-linecap="round"/>\n`;
    // dimension label
    const len = Math.round(Math.hypot(x2 - x1, y2 - y1));
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    paths += `  <text x="${mx}" y="${my - 8}" text-anchor="middle" font-size="11" fill="#666" font-family="sans-serif">${len} cm</text>\n`;
  }

  // Doors: wall gap + jambs + type-specific glyph (swing arc / panels)
  const n2 = (v: number) => v.toFixed(2);
  for (const d of floor.doors) {
    const wall = floor.walls.find(w => w.id === d.wallId);
    if (!wall) continue;
    const wdx = wall.end.x - wall.start.x;
    const wdy = wall.end.y - wall.start.y;
    const wlen = Math.hypot(wdx, wdy) || 1;
    const ux = wdx / wlen, uy = wdy / wlen;
    const nx = -uy, ny = ux;
    const px = wall.start.x + wdx * d.position - minX + pad;
    const py = wall.start.y + wdy * d.position - minY + pad;
    const hw = d.width / 2;
    const th = Math.max(wall.thickness, 4) / 2 + 1;
    const wallAngle = Math.atan2(uy, ux);
    const swingDir = d.swingDirection === 'left' ? 1 : -1;
    const sideFlip = (d.flipSide ?? false) ? -1 : 1;

    // Clear the wall gap
    const gapPts = [
      [px - ux * hw + nx * th, py - uy * hw + ny * th],
      [px + ux * hw + nx * th, py + uy * hw + ny * th],
      [px + ux * hw - nx * th, py + uy * hw - ny * th],
      [px - ux * hw - nx * th, py - uy * hw - ny * th],
    ].map(([x, y]) => `${n2(x)},${n2(y)}`).join(' ');
    paths += `  <polygon points="${gapPts}" fill="white"/>\n`;

    // Jamb ticks
    for (const sign of [-1, 1]) {
      const jx = px + ux * hw * sign;
      const jy = py + uy * hw * sign;
      paths += `  <line x1="${n2(jx + nx * (th + 1))}" y1="${n2(jy + ny * (th + 1))}" x2="${n2(jx - nx * (th + 1))}" y2="${n2(jy - ny * (th + 1))}" stroke="#444" stroke-width="1.5"/>\n`;
    }

    const doorType = d.type || 'single';
    const svgArc = (hx: number, hy: number, r: number, a0: number, a1: number) => {
      const x0 = hx + r * Math.cos(a0), y0 = hy + r * Math.sin(a0);
      const x1 = hx + r * Math.cos(a1), y1 = hy + r * Math.sin(a1);
      return {
        path: `M ${n2(x0)} ${n2(y0)} A ${n2(r)} ${n2(r)} 0 0 ${a1 > a0 ? 1 : 0} ${n2(x1)} ${n2(y1)}`,
        ex: x1, ey: y1,
      };
    };

    if (doorType === 'single' || doorType === 'pocket') {
      const r = d.width;
      const hx = px + ux * hw * swingDir;
      const hy = py + uy * hw * swingDir;
      const sa = wallAngle + (swingDir === 1 ? Math.PI : 0);
      const ea = sa + (-swingDir) * sideFlip * (Math.PI / 2);
      if (doorType === 'pocket') {
        paths += `  <line x1="${n2(hx)}" y1="${n2(hy)}" x2="${n2(hx + ux * d.width * swingDir)}" y2="${n2(hy + uy * d.width * swingDir)}" stroke="#999" stroke-width="2" stroke-dasharray="4,3"/>\n`;
      } else {
        const arc = svgArc(hx, hy, r, sa, ea);
        paths += `  <path d="${arc.path}" fill="none" stroke="#666" stroke-width="1"/>\n`;
      }
      const panelAngle = doorType === 'pocket' ? sa : ea;
      paths += `  <line x1="${n2(hx)}" y1="${n2(hy)}" x2="${n2(hx + r * Math.cos(panelAngle))}" y2="${n2(hy + r * Math.sin(panelAngle))}" stroke="#444" stroke-width="2.5"/>\n`;
      paths += `  <circle cx="${n2(hx)}" cy="${n2(hy)}" r="2.5" fill="#444"/>\n`;
    } else if (doorType === 'double' || doorType === 'french') {
      const r = hw;
      for (const side of [-1, 1] as const) {
        const hx = px + ux * hw * side;
        const hy = py + uy * hw * side;
        const arcSwing = side === -1 ? swingDir : -swingDir;
        const sa = wallAngle + Math.PI * (side === 1 ? 1 : 0);
        const ea = sa + arcSwing * sideFlip * (Math.PI / 2);
        const arc = svgArc(hx, hy, r, sa, ea);
        paths += `  <path d="${arc.path}" fill="none" stroke="#666" stroke-width="1"/>\n`;
        paths += `  <line x1="${n2(hx)}" y1="${n2(hy)}" x2="${n2(hx + r * Math.cos(ea))}" y2="${n2(hy + r * Math.sin(ea))}" stroke="#444" stroke-width="2.5"/>\n`;
        paths += `  <circle cx="${n2(hx)}" cy="${n2(hy)}" r="2" fill="#444"/>\n`;
      }
    } else if (doorType === 'sliding') {
      const panelW = hw * 0.9;
      const offset = Math.max(wall.thickness, 4) * 0.15 * sideFlip;
      paths += `  <line x1="${n2(px - ux * hw)}" y1="${n2(py - uy * hw)}" x2="${n2(px + ux * panelW * 0.1)}" y2="${n2(py + uy * panelW * 0.1)}" stroke="#444" stroke-width="2"/>\n`;
      paths += `  <line x1="${n2(px - ux * panelW * 0.1 + nx * offset)}" y1="${n2(py - uy * panelW * 0.1 + ny * offset)}" x2="${n2(px + ux * hw + nx * offset)}" y2="${n2(py + uy * hw + ny * offset)}" stroke="#444" stroke-width="2"/>\n`;
    } else if (doorType === 'bifold') {
      const panelCount = 4;
      const panelW = d.width / panelCount;
      const foldAngle = Math.PI / 6;
      let bx = px - ux * hw;
      let by = py - uy * hw;
      let poly = `${n2(bx)},${n2(by)}`;
      for (let i = 0; i < panelCount; i++) {
        const angle = wallAngle + (i % 2 === 0 ? foldAngle * swingDir : -foldAngle * swingDir * 0.3);
        bx += panelW * Math.cos(angle);
        by += panelW * Math.sin(angle);
        poly += ` ${n2(bx)},${n2(by)}`;
      }
      paths += `  <polyline points="${poly}" fill="none" stroke="#444" stroke-width="2"/>\n`;
    } else if (doorType === 'garage') {
      // Overhead garage door: panel line across the opening
      paths += `  <line x1="${n2(px - ux * hw)}" y1="${n2(py - uy * hw)}" x2="${n2(px + ux * hw)}" y2="${n2(py + uy * hw)}" stroke="#444" stroke-width="2.5"/>\n`;
    } else if (doorType === 'opening') {
      // Plain doorway: dashed threshold lines along both wall faces
      for (const side of [-1, 1]) {
        const ox = nx * (th - 1) * side, oy = ny * (th - 1) * side;
        paths += `  <line x1="${n2(px - ux * hw + ox)}" y1="${n2(py - uy * hw + oy)}" x2="${n2(px + ux * hw + ox)}" y2="${n2(py + uy * hw + oy)}" stroke="#999" stroke-width="1" stroke-dasharray="5,4"/>\n`;
      }
    }
  }

  // Windows: wall gap + double-line glyph
  for (const win of floor.windows) {
    const wall = floor.walls.find(w => w.id === win.wallId);
    if (!wall) continue;
    const wdx = wall.end.x - wall.start.x;
    const wdy = wall.end.y - wall.start.y;
    const wlen = Math.hypot(wdx, wdy) || 1;
    const ux = wdx / wlen, uy = wdy / wlen;
    const nx = -uy, ny = ux;
    const px = wall.start.x + wdx * win.position - minX + pad;
    const py = wall.start.y + wdy * win.position - minY + pad;
    const hw = win.width / 2;
    const th = Math.max(wall.thickness, 4) / 2 + 1;
    const gap = Math.max(2, Math.max(wall.thickness, 4) * 0.25);

    const gapPts = [
      [px - ux * hw + nx * th, py - uy * hw + ny * th],
      [px + ux * hw + nx * th, py + uy * hw + ny * th],
      [px + ux * hw - nx * th, py + uy * hw - ny * th],
      [px - ux * hw - nx * th, py - uy * hw - ny * th],
    ].map(([x, y]) => `${n2(x)},${n2(y)}`).join(' ');
    paths += `  <polygon points="${gapPts}" fill="white"/>\n`;

    // Frame lines (double line) + end caps
    for (const s of [-1, 1]) {
      paths += `  <line x1="${n2(px - ux * hw + nx * gap * s)}" y1="${n2(py - uy * hw + ny * gap * s)}" x2="${n2(px + ux * hw + nx * gap * s)}" y2="${n2(py + uy * hw + ny * gap * s)}" stroke="#555" stroke-width="1.5"/>\n`;
      paths += `  <line x1="${n2(px + ux * hw * s + nx * gap)}" y1="${n2(py + uy * hw * s + ny * gap)}" x2="${n2(px + ux * hw * s - nx * gap)}" y2="${n2(py + uy * hw * s - ny * gap)}" stroke="#555" stroke-width="1.5"/>\n`;
    }
  }

  // Furniture rectangles (actual dimensions from catalog)
  for (const fi of floor.furniture) {
    const fx = fi.position.x - minX + pad;
    const fy = fi.position.y - minY + pad;
    const cat = getCatalogItem(fi.catalogId);
    const fw = fi.width ?? (cat ? cat.width : 30);
    const fd = fi.depth ?? (cat ? cat.depth : 30);
    const color = fi.color ?? (cat ? cat.color : '#a0c4e8');
    const rot = fi.rotation || 0;
    paths += `  <g transform="translate(${fx},${fy}) rotate(${rot})">\n`;
    paths += `    <rect x="${-fw / 2}" y="${-fd / 2}" width="${fw}" height="${fd}" fill="${color}" stroke="#555" stroke-width="0.5" rx="2" opacity="0.7"/>\n`;
    if (cat) {
      paths += `    <text x="0" y="4" text-anchor="middle" font-size="9" fill="#333" font-family="sans-serif">${escapeXml(cat.name)}</text>\n`;
    }
    paths += `  </g>\n`;
  }

  // Measurements
  if (floor.measurements) {
    for (const m of floor.measurements) {
      const x1 = m.x1 - minX + pad, y1 = m.y1 - minY + pad;
      const x2 = m.x2 - minX + pad, y2 = m.y2 - minY + pad;
      paths += `  <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#ef4444" stroke-width="1" stroke-dasharray="6,3" stroke-linecap="round"/>\n`;
      const dist = Math.round(Math.hypot(m.x2 - m.x1, m.y2 - m.y1));
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      paths += `  <text x="${mx}" y="${my - 6}" text-anchor="middle" font-size="10" fill="#ef4444" font-family="sans-serif" font-weight="bold">${dist} cm</text>\n`;
    }
  }

  // Annotations (dimension callouts)
  if (floor.annotations) {
    for (const a of floor.annotations) {
      const ax1 = a.x1 - minX + pad, ay1 = a.y1 - minY + pad;
      const ax2 = a.x2 - minX + pad, ay2 = a.y2 - minY + pad;
      const dx = ax2 - ax1, dy = ay2 - ay1;
      const len = Math.hypot(dx, dy);
      if (len < 1) continue;
      const ux = dx / len, uy = dy / len;
      const nx = -uy, ny = ux;
      const offset = a.offset || 40;
      const d1x = ax1 + nx * offset, d1y = ay1 + ny * offset;
      const d2x = ax2 + nx * offset, d2y = ay2 + ny * offset;
      // Leader lines
      paths += `  <line x1="${ax1}" y1="${ay1}" x2="${d1x}" y2="${d1y}" stroke="#6366f1" stroke-width="0.75"/>\n`;
      paths += `  <line x1="${ax2}" y1="${ay2}" x2="${d2x}" y2="${d2y}" stroke="#6366f1" stroke-width="0.75"/>\n`;
      // Dimension line
      paths += `  <line x1="${d1x}" y1="${d1y}" x2="${d2x}" y2="${d2y}" stroke="#6366f1" stroke-width="1"/>\n`;
      // Arrowheads
      const arrowLen = 7, arrowW = 3;
      for (const [px, py, dir] of [[d1x, d1y, 1], [d2x, d2y, -1]] as [number, number, number][]) {
        const adx = ux * arrowLen * dir, ady = uy * arrowLen * dir;
        const apx = -uy * arrowW, apy = ux * arrowW;
        paths += `  <polygon points="${px},${py} ${px + adx + apx},${py + ady + apy} ${px + adx - apx},${py + ady - apy}" fill="#6366f1"/>\n`;
      }
      // Label
      const dist = Math.round(Math.hypot(a.x2 - a.x1, a.y2 - a.y1));
      const label = a.label || `${dist} cm`;
      const mx = (d1x + d2x) / 2, my = (d1y + d2y) / 2;
      paths += `  <text x="${mx}" y="${my - 4}" text-anchor="middle" font-size="10" fill="#6366f1" font-family="sans-serif">${escapeXml(label)}</text>\n`;
    }
  }

  // Text annotations
  if (floor.textAnnotations) {
    for (const ta of floor.textAnnotations) {
      const tx = ta.x - minX + pad;
      const ty = ta.y - minY + pad;
      const transform = ta.rotation ? ` transform="rotate(${ta.rotation} ${tx} ${ty})"` : '';
      paths += `  <text x="${tx}" y="${ty}" text-anchor="middle" dominant-baseline="central" font-size="${ta.fontSize}" fill="${escapeXml(ta.color)}" font-family="sans-serif"${transform}>${escapeXml(ta.text)}</text>\n`;
    }
  }

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" width="${vw}" height="${vh}">
  <rect width="100%" height="100%" fill="white"/>
${paths}</svg>`;

  const blob = new Blob([svg], { type: 'image/svg+xml' });
  download(blob, `${project.name || 'floorplan'}.svg`);
}

