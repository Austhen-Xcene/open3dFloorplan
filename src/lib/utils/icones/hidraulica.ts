/** Símbolos 2D — instalação hidráulica. Ver `primitivas.ts` para o contrato de desenho. */
import type { DrawFn } from './primitivas';

export const drawSymWaterSupply: DrawFn = (ctx, w, d, color) => {
  const r = Math.min(w, d) * 0.45;
  // Triangle pointing up (water supply)
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.87, r * 0.5);
  ctx.lineTo(-r * 0.87, r * 0.5);
  ctx.closePath();
  ctx.fillStyle = color + '40';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();
  // "W" label
  ctx.fillStyle = color;
  ctx.font = `bold ${r * 0.8}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('W', 0, r * 0.05);
};

export const drawSymDrain: DrawFn = (ctx, w, d, color) => {
  const r = Math.min(w, d) * 0.45;
  // Circle with grid pattern (drain)
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();
  // Cross-hatch
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, 0);
  ctx.lineTo(r * 0.7, 0);
  ctx.moveTo(0, -r * 0.7);
  ctx.lineTo(0, r * 0.7);
  ctx.moveTo(-r * 0.5, -r * 0.5);
  ctx.lineTo(r * 0.5, r * 0.5);
  ctx.moveTo(r * 0.5, -r * 0.5);
  ctx.lineTo(-r * 0.5, r * 0.5);
  ctx.strokeStyle = color;
  ctx.stroke();
};

export const drawSymWaterHeater: DrawFn = (ctx, w, d, color) => {
  const r = Math.min(w, d) * 0.45;
  // Circle
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();
  // "WH" label
  ctx.fillStyle = color;
  ctx.font = `bold ${r * 0.75}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('WH', 0, 0);
};

export const drawSymWasherHookup: DrawFn = (ctx, w, d, color) => {
  const r = Math.min(w, d) * 0.45;
  // Square with valve symbol
  const s = r * 1.4;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.strokeStyle = color;
  ctx.strokeRect(-s / 2, -s / 2, s, s);
  // Two circles (hot/cold)
  ctx.beginPath();
  ctx.arc(-s * 0.2, 0, s * 0.15, 0, Math.PI * 2);
  ctx.strokeStyle = '#dc2626';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(s * 0.2, 0, s * 0.15, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.stroke();
};

export const drawSymGasLine: DrawFn = (ctx, w, d, color) => {
  const r = Math.min(w, d) * 0.45;
  // Diamond shape
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r, 0);
  ctx.lineTo(0, r);
  ctx.lineTo(-r, 0);
  ctx.closePath();
  ctx.fillStyle = color + '30';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();
  // "G" label
  ctx.fillStyle = color;
  ctx.font = `bold ${r * 0.9}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('G', 0, 0);
};

