/** Símbolos 2D — iluminação. Ver `primitivas.ts` para o contrato de desenho. */
import { roundRect, type DrawFn } from './primitivas';

export const drawCeilingLight: DrawFn = (ctx, w, d) => {
  const r = Math.min(w, d) * 0.4;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Rays
  ctx.strokeStyle = '#f59e0b80';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 1.1, Math.sin(a) * r * 1.1);
    ctx.lineTo(Math.cos(a) * r * 1.5, Math.sin(a) * r * 1.5);
    ctx.stroke();
  }
};

export const drawChandelier: DrawFn = (ctx, w, d) => {
  const r = Math.min(w, d) * 0.35;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Decorative arms with bulbs
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const ex = Math.cos(a) * r * 1.4;
    const ey = Math.sin(a) * r * 1.4;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
    ctx.lineTo(ex, ey);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(ex, ey, 3, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
  }
};

export const drawFloorLamp: DrawFn = (ctx, w, d) => {
  // Base circle
  const r = Math.min(w, d) * 0.35;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Center pole
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = '#555';
  ctx.fill();
};

export const drawTableLamp: DrawFn = (ctx, w, d) => {
  const r = Math.min(w, d) * 0.4;
  // Shade (circle)
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Base
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = '#666';
  ctx.fill();
};

export const drawWallSconce: DrawFn = (ctx, w, d) => {
  roundRect(ctx, -w/2, -d/2, w, d, 2);
  ctx.fill(); ctx.stroke();
  // Light indication
  ctx.beginPath();
  ctx.arc(0, 0, Math.min(w, d) * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = '#fef08a80';
  ctx.fill();
};

export const drawPendantLight: DrawFn = (ctx, w, d) => {
  const r = Math.min(w, d) * 0.4;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Inner glow
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.5, 0, Math.PI * 2);
  ctx.fillStyle = '#fef08a60';
  ctx.fill();
};

export const drawRecessedLight: DrawFn = (ctx, w, d) => {
  const r = Math.min(w, d) * 0.45;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.6, 0, Math.PI * 2);
  ctx.strokeStyle = '#fef08a80';
  ctx.stroke();
};

