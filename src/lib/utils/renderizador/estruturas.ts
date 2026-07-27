/** Desenho de escadas e colunas. */
import type { Stair, Column } from '$lib/models/types';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import { wts } from './geometria';

export function drawStair(cs: CanvasState, stair: Stair, selected: boolean): void {
  const { ctx, zoom } = cs;
  const s = wts(cs, stair.position.x, stair.position.y);
  const w = stair.width * zoom;
  const d = stair.depth * zoom;
  const angle = (stair.rotation * Math.PI) / 180;
  const type = stair.stairType || 'straight';

  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.rotate(angle);

  const fillCol = selected ? '#bfdbfe80' : '#e5e7eb80';
  const strokeCol = selected ? '#3b82f6' : '#555';
  const treadCol = selected ? '#3b82f6' : '#888';

  function drawStairArrowLocal(direction: 'up' | 'down') {
    ctx.fillStyle = selected ? '#3b82f6' : '#555';
    ctx.strokeStyle = selected ? '#3b82f6' : '#555';
    ctx.lineWidth = 1.5;
    const arrowY = direction === 'up' ? -d / 2 + d * 0.15 : d / 2 - d * 0.15;
    const arrowDir = direction === 'up' ? -1 : 1;
    ctx.beginPath();
    ctx.moveTo(0, arrowY + arrowDir * d * 0.3);
    ctx.lineTo(0, arrowY);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, arrowY);
    ctx.lineTo(-w * 0.1, arrowY + arrowDir * d * 0.08);
    ctx.lineTo(w * 0.1, arrowY + arrowDir * d * 0.08);
    ctx.closePath();
    ctx.fill();
  }

  function drawStairLabelLocal() {
    ctx.fillStyle = '#374151';
    ctx.font = `${Math.max(8, 10 * zoom)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const sType = stair.stairType || 'straight';
    const typeLabel = sType === 'straight' ? '' : ` (${sType})`;
    ctx.fillText((stair.direction === 'up' ? 'UP' : 'DN') + typeLabel, 0, 0);
  }

  if (type === 'straight') {
    ctx.fillStyle = fillCol;
    ctx.strokeStyle = strokeCol;
    ctx.lineWidth = selected ? 2 : 1;
    ctx.fillRect(-w / 2, -d / 2, w, d);
    ctx.strokeRect(-w / 2, -d / 2, w, d);
    ctx.strokeStyle = treadCol;
    ctx.lineWidth = 0.5;
    const treadSpacing = d / stair.riserCount;
    for (let i = 1; i < stair.riserCount; i++) {
      const y = -d / 2 + i * treadSpacing;
      ctx.beginPath(); ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y); ctx.stroke();
    }
    drawStairArrowLocal(stair.direction);
    drawStairLabelLocal();

  } else if (type === 'l-shaped') {
    const halfRisers = Math.floor(stair.riserCount / 2);
    const run1D = d / 2;
    const run2W = d / 2;
    ctx.fillStyle = fillCol; ctx.strokeStyle = strokeCol; ctx.lineWidth = selected ? 2 : 1;
    ctx.fillRect(-w / 2, 0, w, run1D); ctx.strokeRect(-w / 2, 0, w, run1D);
    ctx.strokeStyle = treadCol; ctx.lineWidth = 0.5;
    const t1 = run1D / halfRisers;
    for (let i = 1; i < halfRisers; i++) { const y = i * t1; ctx.beginPath(); ctx.moveTo(-w / 2, y); ctx.lineTo(w / 2, y); ctx.stroke(); }
    ctx.fillStyle = fillCol; ctx.strokeStyle = strokeCol; ctx.lineWidth = selected ? 2 : 1;
    ctx.fillRect(-w / 2, -w / 2, w, w / 2); ctx.strokeRect(-w / 2, -w / 2, w, w / 2);
    const run2Risers = stair.riserCount - halfRisers;
    ctx.fillRect(w / 2, -w / 2, run2W, w); ctx.strokeRect(w / 2, -w / 2, run2W, w);
    ctx.strokeStyle = treadCol; ctx.lineWidth = 0.5;
    const t2 = run2W / run2Risers;
    for (let i = 1; i < run2Risers; i++) { const x = w / 2 + i * t2; ctx.beginPath(); ctx.moveTo(x, -w / 2); ctx.lineTo(x, w / 2); ctx.stroke(); }
    ctx.fillStyle = selected ? '#3b82f6' : '#555'; ctx.strokeStyle = selected ? '#3b82f6' : '#555'; ctx.lineWidth = 1.5;
    const ay = run1D * 0.7;
    ctx.beginPath(); ctx.moveTo(0, ay); ctx.lineTo(0, ay - run1D * 0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, ay - run1D * 0.3); ctx.lineTo(-w * 0.08, ay - run1D * 0.22); ctx.lineTo(w * 0.08, ay - run1D * 0.22); ctx.closePath(); ctx.fill();
    drawStairLabelLocal();

  } else if (type === 'u-shaped') {
    const halfRisers = Math.floor(stair.riserCount / 2);
    const runW = (w - w * 0.15) / 2;
    ctx.fillStyle = fillCol; ctx.strokeStyle = strokeCol; ctx.lineWidth = selected ? 2 : 1;
    ctx.fillRect(-w / 2, -d / 2, runW, d); ctx.strokeRect(-w / 2, -d / 2, runW, d);
    ctx.strokeStyle = treadCol; ctx.lineWidth = 0.5;
    const tU = d / halfRisers;
    for (let i = 1; i < halfRisers; i++) { const y = -d / 2 + i * tU; ctx.beginPath(); ctx.moveTo(-w / 2, y); ctx.lineTo(-w / 2 + runW, y); ctx.stroke(); }
    const run2Risers = stair.riserCount - halfRisers;
    ctx.fillStyle = fillCol; ctx.strokeStyle = strokeCol; ctx.lineWidth = selected ? 2 : 1;
    ctx.fillRect(w / 2 - runW, -d / 2, runW, d); ctx.strokeRect(w / 2 - runW, -d / 2, runW, d);
    ctx.strokeStyle = treadCol; ctx.lineWidth = 0.5;
    const tU2 = d / run2Risers;
    for (let i = 1; i < run2Risers; i++) { const y = -d / 2 + i * tU2; ctx.beginPath(); ctx.moveTo(w / 2 - runW, y); ctx.lineTo(w / 2, y); ctx.stroke(); }
    ctx.fillStyle = fillCol; ctx.strokeStyle = strokeCol; ctx.lineWidth = selected ? 2 : 1;
    ctx.fillRect(-w / 2, -d / 2 - w * 0.1, w, w * 0.1); ctx.strokeRect(-w / 2, -d / 2 - w * 0.1, w, w * 0.1);
    ctx.fillStyle = selected ? '#3b82f6' : '#555'; ctx.strokeStyle = selected ? '#3b82f6' : '#555'; ctx.lineWidth = 1.5;
    const lx = -w / 2 + runW / 2;
    ctx.beginPath(); ctx.moveTo(lx, 0); ctx.lineTo(lx, -d * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(lx, -d * 0.2); ctx.lineTo(lx - runW * 0.15, -d * 0.14); ctx.lineTo(lx + runW * 0.15, -d * 0.14); ctx.closePath(); ctx.fill();
    const rx = w / 2 - runW / 2;
    ctx.beginPath(); ctx.moveTo(rx, 0); ctx.lineTo(rx, d * 0.2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx, d * 0.2); ctx.lineTo(rx - runW * 0.15, d * 0.14); ctx.lineTo(rx + runW * 0.15, d * 0.14); ctx.closePath(); ctx.fill();
    drawStairLabelLocal();

  } else if (type === 'spiral') {
    const r = Math.min(w, d) / 2;
    ctx.fillStyle = fillCol; ctx.strokeStyle = strokeCol; ctx.lineWidth = selected ? 2 : 1;
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const postR = r * 0.12;
    ctx.fillStyle = strokeCol; ctx.beginPath(); ctx.arc(0, 0, postR, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = treadCol; ctx.lineWidth = 0.5;
    const totalAngle = Math.PI * 1.75;
    const startAngle = -Math.PI / 2;
    for (let i = 0; i <= stair.riserCount; i++) {
      const a = startAngle + (i / stair.riserCount) * totalAngle;
      ctx.beginPath(); ctx.moveTo(postR * Math.cos(a), postR * Math.sin(a)); ctx.lineTo(r * Math.cos(a), r * Math.sin(a)); ctx.stroke();
    }
    ctx.strokeStyle = selected ? '#3b82f6' : '#555'; ctx.fillStyle = selected ? '#3b82f6' : '#555'; ctx.lineWidth = 1.5;
    const arrowR = r * 0.7;
    const aEnd = startAngle + totalAngle * 0.85;
    ctx.beginPath(); ctx.arc(0, 0, arrowR, startAngle + totalAngle * 0.15, aEnd, false); ctx.stroke();
    const ax2 = arrowR * Math.cos(aEnd);
    const ay2 = arrowR * Math.sin(aEnd);
    const tangent = aEnd + Math.PI / 2;
    ctx.beginPath(); ctx.moveTo(ax2, ay2);
    ctx.lineTo(ax2 + 6 * Math.cos(tangent + 0.4), ay2 + 6 * Math.sin(tangent + 0.4));
    ctx.lineTo(ax2 + 6 * Math.cos(tangent - 0.4), ay2 + 6 * Math.sin(tangent - 0.4));
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#374151'; ctx.font = `${Math.max(8, 10 * zoom)}px sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(stair.direction === 'up' ? 'UP' : 'DN', 0, r + 12 * zoom);
  }

  if (selected) {
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    const bw = type === 'spiral' ? Math.min(w, d) : w;
    const bd = type === 'spiral' ? Math.min(w, d) : d;
    ctx.strokeRect(-bw / 2 - 2, -bd / 2 - 2, bw + 4, bd + 4);
    ctx.setLineDash([]);
  }

  ctx.restore();
}

// ── Column drawing ───────────────────────────────────────────────────

export function drawColumn(cs: CanvasState, col: Column, selected: boolean): void {
  const { ctx, zoom } = cs;
  const s = wts(cs, col.position.x, col.position.y);
  const r = (col.diameter / 2) * zoom;

  ctx.save();
  ctx.translate(s.x, s.y);

  if (col.shape === 'round') {
    ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = selected ? '#bfdbfe' : col.color; ctx.fill();
    ctx.strokeStyle = selected ? '#3b82f6' : '#555'; ctx.lineWidth = selected ? 2 : 1; ctx.stroke();
    ctx.strokeStyle = selected ? '#3b82f680' : '#88888880'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-r, -r); ctx.lineTo(r, r); ctx.moveTo(-r, r); ctx.lineTo(r, -r); ctx.stroke();
  } else {
    const angle = (col.rotation * Math.PI) / 180;
    ctx.rotate(angle);
    const side = col.diameter * zoom;
    ctx.fillStyle = selected ? '#bfdbfe' : col.color;
    ctx.fillRect(-side / 2, -side / 2, side, side);
    ctx.strokeStyle = selected ? '#3b82f6' : '#555'; ctx.lineWidth = selected ? 2 : 1;
    ctx.strokeRect(-side / 2, -side / 2, side, side);
    ctx.strokeStyle = selected ? '#3b82f680' : '#88888880'; ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.moveTo(-side / 2, -side / 2); ctx.lineTo(side / 2, side / 2); ctx.moveTo(-side / 2, side / 2); ctx.lineTo(side / 2, -side / 2); ctx.stroke();
  }

  if (selected) {
    ctx.strokeStyle = '#3b82f6'; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    if (col.shape === 'round') {
      ctx.beginPath(); ctx.arc(0, 0, r + 4, 0, Math.PI * 2); ctx.stroke();
    } else {
      const side = col.diameter * zoom;
      ctx.strokeRect(-side / 2 - 4, -side / 2 - 4, side + 8, side + 8);
    }
    ctx.setLineDash([]);
  }

  ctx.restore();
}

// ── Guide lines ──────────────────────────────────────────────────────

