/** Exportação em PDF (jsPDF) — desenho vetorial próprio, independente do canvas. */
import type { Project, Floor } from '$lib/models/types';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';
import { detectRooms, getRoomPolygon, roomCentroid } from '$lib/utils/roomDetection';
import { projectSettings, formatArea } from '$lib/stores/settings';
import { get } from 'svelte/store';
import jsPDF from 'jspdf';
import { extendBoundsForOpenings, drawOpeningsOnCanvas } from './comum';

export function exportPDF(project: Project) {
  const floor = project.floors.find(f => f.id === project.activeFloorId) ?? project.floors[0];
  if (!floor || floor.walls.length === 0) return;

  const settings = get(projectSettings);
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pw = pdf.internal.pageSize.getWidth();   // ~297
  const ph = pdf.internal.pageSize.getHeight();   // ~210
  const margin = 10;
  const titleBlockH = 22;

  // ── helpers ──
  function drawPageBorder() {
    pdf.setDrawColor(40);
    pdf.setLineWidth(0.5);
    pdf.rect(margin, margin, pw - margin * 2, ph - margin * 2);
    // inner border
    pdf.setLineWidth(0.15);
    pdf.rect(margin + 1, margin + 1, pw - margin * 2 - 2, ph - margin * 2 - 2);
  }

  function drawTitleBlock() {
    const tbY = ph - margin - titleBlockH;
    const tbW = pw - margin * 2;
    pdf.setDrawColor(40);
    pdf.setLineWidth(0.4);
    pdf.rect(margin, tbY, tbW, titleBlockH);
    // vertical dividers
    const col1 = margin + tbW * 0.45;
    const col2 = margin + tbW * 0.7;
    pdf.line(col1, tbY, col1, tbY + titleBlockH);
    pdf.line(col2, tbY, col2, tbY + titleBlockH);

    // Project name
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text(project.name || 'Untitled Project', margin + 4, tbY + 9);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(floor.name, margin + 4, tbY + 15);
    if (project.description) {
      pdf.setFontSize(7);
      pdf.text(project.description.substring(0, 60), margin + 4, tbY + 19);
    }

    // Date / scale
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    pdf.setFontSize(8);
    pdf.text(`Date: ${today}`, col1 + 4, tbY + 9);
    pdf.text(`Units: ${settings.units}`, col1 + 4, tbY + 15);

    // Branding
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.text('openplan3d.com', col2 + 4, tbY + 9);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7);
    pdf.text('Created with Open 3D Floor Planner', col2 + 4, tbY + 15);
  }

  // ── Page 1: Floor Plan ──
  drawPageBorder();

  // Render floor plan onto an offscreen canvas then embed as image
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const w of floor.walls) {
    for (const p of [w.start, w.end]) {
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
    }
  }
  for (const fi of floor.furniture) {
    minX = Math.min(minX, fi.position.x - 60);
    minY = Math.min(minY, fi.position.y - 60);
    maxX = Math.max(maxX, fi.position.x + 60);
    maxY = Math.max(maxY, fi.position.y + 60);
  }
  const pdfBounds = { minX, minY, maxX, maxY };
  extendBoundsForOpenings(floor, pdfBounds);
  ({ minX, minY, maxX, maxY } = pdfBounds);

  const pad = 80;
  const planW = maxX - minX + pad * 2;
  const planH = maxY - minY + pad * 2;
  const scale = 2;
  const offscreen = document.createElement('canvas');
  offscreen.width = planW * scale;
  offscreen.height = planH * scale;
  const ctx = offscreen.getContext('2d')!;
  ctx.scale(scale, scale);
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, planW, planH);

  // Room fills
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
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x - minX + pad, poly[i].y - minY + pad);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    const c = roomCentroid(poly);
    ctx.fillStyle = '#444';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(room.name, c.x - minX + pad, c.y - minY + pad);
    ctx.fillStyle = '#888';
    ctx.font = '11px sans-serif';
    ctx.fillText(formatArea(room.area, settings.units), c.x - minX + pad, c.y - minY + pad + 15);
  }

  // Walls
  ctx.strokeStyle = '#333';
  ctx.lineCap = 'round';
  for (const wall of floor.walls) {
    ctx.lineWidth = wall.thickness;
    ctx.beginPath();
    ctx.moveTo(wall.start.x - minX + pad, wall.start.y - minY + pad);
    ctx.lineTo(wall.end.x - minX + pad, wall.end.y - minY + pad);
    ctx.stroke();
    const len = Math.round(Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y));
    const mx = (wall.start.x + wall.end.x) / 2 - minX + pad;
    const my = (wall.start.y + wall.end.y) / 2 - minY + pad;
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${len} cm`, mx, my - 8);
  }


  // Doors and windows (shared full-fidelity renderer)
  drawOpeningsOnCanvas(ctx, floor, minX, minY, pad);

  // Furniture
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

  // Embed rendered plan into PDF
  const imgData = offscreen.toDataURL('image/png');
  const drawAreaW = pw - margin * 2 - 4;
  const drawAreaH = ph - margin * 2 - titleBlockH - 6;
  const aspect = planW / planH;
  let imgW = drawAreaW;
  let imgH = drawAreaW / aspect;
  if (imgH > drawAreaH) { imgH = drawAreaH; imgW = drawAreaH * aspect; }
  const imgX = margin + 2 + (drawAreaW - imgW) / 2;
  const imgY = margin + 2 + (drawAreaH - imgH) / 2;
  pdf.addImage(imgData, 'PNG', imgX, imgY, imgW, imgH);

  drawTitleBlock();

  // ── Page 2: Room Schedule ──
  if (rooms.length > 0) {
    pdf.addPage('a4', 'landscape');
    drawPageBorder();

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Room Schedule', margin + 6, margin + 12);
    pdf.setDrawColor(60);

    // Table setup
    const tX = margin + 6;
    let tY = margin + 20;
    const colWidths = [12, 70, 45, 55, 65]; // #, Name, Type, Area, Floor Texture
    const headers = ['#', 'Room Name', 'Type', 'Area', 'Floor Texture'];
    const rowH = 8;
    const tableW = colWidths.reduce((a, b) => a + b, 0);

    // Header row
    pdf.setFillColor(50, 50, 60);
    pdf.rect(tX, tY, tableW, rowH, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    let cx = tX;
    for (let i = 0; i < headers.length; i++) {
      pdf.text(headers[i], cx + 3, tY + 5.5);
      cx += colWidths[i];
    }
    tY += rowH;

    // Data rows
    pdf.setTextColor(40, 40, 40);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    let totalArea = 0;
    for (let ri = 0; ri < rooms.length; ri++) {
      const room = rooms[ri];
      // Merge with stored room data for texture info
      const storedRoom = floor.rooms.find(r => r.name === room.name);
      totalArea += room.area;

      // Alternating row background
      if (ri % 2 === 0) {
        pdf.setFillColor(245, 245, 250);
        pdf.rect(tX, tY, tableW, rowH, 'F');
      }
      // Row border
      pdf.setDrawColor(200);
      pdf.setLineWidth(0.15);
      pdf.rect(tX, tY, tableW, rowH);

      cx = tX;
      const rowData = [
        String(ri + 1),
        room.name,
        storedRoom?.roomType || 'indoor',
        formatArea(room.area, settings.units),
        storedRoom?.floorTexture || '—'
      ];
      for (let i = 0; i < rowData.length; i++) {
        pdf.text(rowData[i].substring(0, 30), cx + 3, tY + 5.5);
        cx += colWidths[i];
      }
      tY += rowH;
    }

    // Total row
    pdf.setFillColor(50, 50, 60);
    pdf.rect(tX, tY, tableW, rowH, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL', tX + colWidths[0] + 3, tY + 5.5);
    pdf.text(formatArea(totalArea, settings.units), tX + colWidths[0] + colWidths[1] + colWidths[2] + 3, tY + 5.5);
    pdf.setTextColor(0);

    // Summary stats below table
    tY += rowH + 10;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(80);
    pdf.text(`${rooms.length} rooms  ·  ${floor.walls.length} walls  ·  ${floor.doors.length} doors  ·  ${floor.windows.length} windows  ·  ${floor.furniture.length} furniture items`, tX, tY);

    drawTitleBlock();
  }

  pdf.save(`${project.name || 'floorplan'}.pdf`);
}
