/** Símbolos 2D — decoração. Ver `primitivas.ts` para o contrato de desenho. */
import { roundRect, type DrawFn } from './primitivas';

export const drawRug: DrawFn = (ctx, w, d, color) => {
  roundRect(ctx, -w/2, -d/2, w, d, 4);
  ctx.fill(); ctx.stroke();
  // Border pattern
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  roundRect(ctx, -w/2 + 4, -d/2 + 4, w - 8, d - 8, 3);
  ctx.stroke();
  // Inner pattern lines
  ctx.lineWidth = 0.5;
  for (let i = 1; i <= 3; i++) {
    ctx.beginPath();
    ctx.moveTo(-w/2 + 8, -d/2 + d * i / 4);
    ctx.lineTo(w/2 - 8, -d/2 + d * i / 4);
    ctx.stroke();
  }
};

export const drawRoundRug: DrawFn = (ctx, w, d, color) => {
  ctx.beginPath();
  ctx.ellipse(0, 0, w/2, d/2, 0, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Inner ring
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, 0, w/2 - 6, d/2 - 6, 0, 0, Math.PI * 2);
  ctx.stroke();
};

export const drawPlant: DrawFn = (ctx, w, d, color) => {
  // Pot (trapezoid)
  ctx.fillStyle = '#8B6914';
  ctx.beginPath();
  ctx.moveTo(-w*0.3, d*0.1);
  ctx.lineTo(w*0.3, d*0.1);
  ctx.lineTo(w*0.25, d*0.45);
  ctx.lineTo(-w*0.25, d*0.45);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  // Foliage circle
  ctx.fillStyle = color + '90';
  ctx.beginPath();
  ctx.arc(0, -d*0.1, Math.min(w, d) * 0.4, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
};

export const drawCurtain: DrawFn = (ctx, w, d, color) => {
  roundRect(ctx, -w/2, -d/2, w, d, 1);
  ctx.fill(); ctx.stroke();
  // Vertical fold lines
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  for (let i = 1; i < 5; i++) {
    ctx.beginPath();
    ctx.moveTo(-w/2 + w * i / 5, -d/2 + 2);
    ctx.lineTo(-w/2 + w * i / 5, d/2 - 2);
    ctx.stroke();
  }
};

export const drawWallArt: DrawFn = (ctx, w, d, color) => {
  // Frame
  roundRect(ctx, -w/2, -d/2, w, d, 2);
  ctx.fill(); ctx.stroke();
  // Inner matting
  ctx.fillStyle = '#ffffff80';
  roundRect(ctx, -w/2 + 3, -d/2 + 3, w - 6, d - 6, 1);
  ctx.fill(); ctx.stroke();
  // Simple landscape indication
  ctx.fillStyle = color + '40';
  ctx.fillRect(-w/2 + 5, -d/2 + 5, w - 10, d - 10);
};

export const drawMirror: DrawFn = (ctx, w, d) => {
  roundRect(ctx, -w/2, -d/2, w, d, 2);
  ctx.fillStyle = '#c0d8e880';
  ctx.fill(); ctx.stroke();
  // Reflection lines
  ctx.strokeStyle = '#ffffff60';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(-w*0.2, -d*0.3);
  ctx.lineTo(-w*0.1, d*0.3);
  ctx.stroke();
};

export const drawClock: DrawFn = (ctx, w, d) => {
  const r = Math.min(w, d) * 0.45;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill(); ctx.stroke();
  // Clock hands
  ctx.strokeStyle = '#333';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(0, -r * 0.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(r * 0.4, 0);
  ctx.stroke();
};

// Lighting icons
