/** Símbolos 2D — instalação elétrica. Ver `primitivas.ts` para o contrato de desenho. */
import type { DrawFn } from './primitivas';

export const drawSymOutlet: DrawFn = (ctx, w, d, color) => {
  const r = Math.min(w, d) * 0.45;
  // Circle
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill(); ctx.stroke();
  // Two vertical slots
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-r * 0.3, -r * 0.35);
  ctx.lineTo(-r * 0.3, r * 0.35);
  ctx.moveTo(r * 0.3, -r * 0.35);
  ctx.lineTo(r * 0.3, r * 0.35);
  ctx.strokeStyle = color;
  ctx.stroke();
};

export const drawSymSwitch: DrawFn = (ctx, w, d, color) => {
  const r = Math.min(w, d) * 0.45;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill(); ctx.stroke();
  // "S" text
  ctx.fillStyle = color;
  ctx.font = `bold ${r * 1.2}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('S', 0, 0);
};

export const drawSymCeilingLight: DrawFn = (ctx, w, d, color) => {
  const r = Math.min(w, d) * 0.45;
  // Circle with X
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#fef9c3';
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.7);
  ctx.lineTo(r * 0.7, r * 0.7);
  ctx.moveTo(r * 0.7, -r * 0.7);
  ctx.lineTo(-r * 0.7, r * 0.7);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
};

export const drawSymRecessedLight: DrawFn = (ctx, w, d, color) => {
  const r = Math.min(w, d) * 0.45;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#fef9c3';
  ctx.fill(); ctx.stroke();
  // Dot in center
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
};

export const drawSymPendant: DrawFn = (ctx, w, d, color) => {
  const r = Math.min(w, d) * 0.45;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#fef9c3';
  ctx.fill(); ctx.stroke();
  // Pendant line + small circle
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.6);
  ctx.lineTo(0, 0);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, r * 0.2, r * 0.3, 0, Math.PI * 2);
  ctx.stroke();
};

export const drawSymCeilingFan: DrawFn = (ctx, w, d, color) => {
  const r = Math.min(w, d) * 0.45;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill(); ctx.stroke();
  // 4 blades
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a) * r * 0.85, Math.sin(a) * r * 0.85);
    ctx.stroke();
  }
  // Center hub
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
};

export const drawSymJunction: DrawFn = (ctx, w, d, color) => {
  const s = Math.min(w, d) * 0.8;
  // Square box
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(-s / 2, -s / 2, s, s);
  ctx.strokeRect(-s / 2, -s / 2, s, s);
  // "J" label
  ctx.fillStyle = color;
  ctx.font = `bold ${s * 0.6}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('J', 0, 0);
};

export const drawSymSmoke: DrawFn = (ctx, w, d, color) => {
  const r = Math.min(w, d) * 0.45;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.stroke();
  // "SD" text
  ctx.fillStyle = color;
  ctx.font = `bold ${r * 0.85}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SD', 0, 0);
};

