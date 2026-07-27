/** Símbolos 2D — sala de estar. Ver `primitivas.ts` para o contrato de desenho. */
import { roundRect, type DrawFn } from './primitivas';

export const drawSofa: DrawFn = (ctx, w, d, color) => {
  const armW = w * 0.12;
  const backD = d * 0.25;
  // Back
  roundRect(ctx, -w/2, -d/2, w, backD, 3);
  ctx.fill(); ctx.stroke();
  // Seat
  roundRect(ctx, -w/2 + armW, -d/2 + backD, w - armW*2, d - backD, 2);
  ctx.fillStyle = color + '40';
  ctx.fill(); ctx.stroke();
  // Arms
  ctx.fillStyle = color + '80';
  roundRect(ctx, -w/2, -d/2 + backD, armW, d - backD, 2);
  ctx.fill(); ctx.stroke();
  roundRect(ctx, w/2 - armW, -d/2 + backD, armW, d - backD, 2);
  ctx.fill(); ctx.stroke();
  // Cushion lines
  ctx.beginPath();
  const cushions = 3;
  for (let i = 1; i < cushions; i++) {
    const x = -w/2 + armW + (w - armW*2) * i / cushions;
    ctx.moveTo(x, -d/2 + backD + 2);
    ctx.lineTo(x, d/2 - 2);
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.stroke();
};

export const drawLoveseat: DrawFn = (ctx, w, d, color) => {
  // Same as sofa but 2 cushions
  const armW = w * 0.14;
  const backD = d * 0.25;
  roundRect(ctx, -w/2, -d/2, w, backD, 3);
  ctx.fill(); ctx.stroke();
  roundRect(ctx, -w/2 + armW, -d/2 + backD, w - armW*2, d - backD, 2);
  ctx.fillStyle = color + '40';
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = color + '80';
  roundRect(ctx, -w/2, -d/2 + backD, armW, d - backD, 2);
  ctx.fill(); ctx.stroke();
  roundRect(ctx, w/2 - armW, -d/2 + backD, armW, d - backD, 2);
  ctx.fill(); ctx.stroke();
  // One cushion line
  ctx.beginPath();
  ctx.moveTo(0, -d/2 + backD + 2);
  ctx.lineTo(0, d/2 - 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.5;
  ctx.stroke();
};

export const drawChair: DrawFn = (ctx, w, d, color) => {
  const backD = d * 0.2;
  const armW = w * 0.15;
  // Back
  roundRect(ctx, -w/2, -d/2, w, backD, 3);
  ctx.fill(); ctx.stroke();
  // Seat
  roundRect(ctx, -w/2 + armW, -d/2 + backD, w - armW*2, d - backD, 2);
  ctx.fillStyle = color + '40';
  ctx.fill(); ctx.stroke();
  // Arms
  ctx.fillStyle = color + '80';
  roundRect(ctx, -w/2, -d/2 + backD, armW, d - backD - d*0.1, 2);
  ctx.fill(); ctx.stroke();
  roundRect(ctx, w/2 - armW, -d/2 + backD, armW, d - backD - d*0.1, 2);
  ctx.fill(); ctx.stroke();
};

export const drawTable: DrawFn = (ctx, w, d) => {
  // Simple rectangle with slightly rounded corners
  roundRect(ctx, -w/2, -d/2, w, d, 3);
  ctx.fill(); ctx.stroke();
};

export const drawBookshelf: DrawFn = (ctx, w, d) => {
  roundRect(ctx, -w/2, -d/2, w, d, 1);
  ctx.fill(); ctx.stroke();
  // Shelf lines
  const shelves = 4;
  for (let i = 1; i < shelves; i++) {
    const x = -w/2 + w * i / shelves;
    ctx.beginPath();
    ctx.moveTo(x, -d/2 + 2);
    ctx.lineTo(x, d/2 - 2);
    ctx.stroke();
  }
};

export const drawSideTable: DrawFn = (ctx, w, d) => {
  roundRect(ctx, -w/2, -d/2, w, d, 3);
  ctx.fill(); ctx.stroke();
};

export const drawTvStand: DrawFn = (ctx, w, d) => {
  roundRect(ctx, -w/2, -d/2, w, d, 2);
  ctx.fill(); ctx.stroke();
  // TV line at back
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-w*0.4, -d*0.35);
  ctx.lineTo(w*0.4, -d*0.35);
  ctx.stroke();
};

// Decor icons
export const drawFireplace: DrawFn = (ctx, w, d, color) => {
  // Mantel/surround
  roundRect(ctx, -w/2, -d/2, w, d, 3);
  ctx.fill(); ctx.stroke();
  // Firebox opening
  ctx.fillStyle = '#1a1a1a40';
  roundRect(ctx, -w*0.35, -d*0.1, w*0.7, d*0.5, 2);
  ctx.fill(); ctx.stroke();
  // Flame hint
  ctx.fillStyle = '#f59e0b60';
  ctx.beginPath();
  ctx.moveTo(-w*0.1, d*0.3);
  ctx.quadraticCurveTo(0, -d*0.05, w*0.1, d*0.3);
  ctx.fill();
};

export const drawTelevision: DrawFn = (ctx, w, d) => {
  // Thin rectangle (flat panel)
  roundRect(ctx, -w/2, -d/2, w, d, 1);
  ctx.fill(); ctx.stroke();
  // Screen
  ctx.fillStyle = '#00000030';
  roundRect(ctx, -w*0.45, -d*0.3, w*0.9, d*0.6, 1);
  ctx.fill();
  // Stand
  ctx.beginPath();
  ctx.moveTo(-w*0.15, d*0.4);
  ctx.lineTo(w*0.15, d*0.4);
  ctx.lineWidth = 2;
  ctx.stroke();
};

export const drawStorage: DrawFn = (ctx, w, d) => {
  roundRect(ctx, -w/2, -d/2, w, d, 2);
  ctx.fill(); ctx.stroke();
  // Two doors
  ctx.beginPath();
  ctx.moveTo(0, -d/2 + 2);
  ctx.lineTo(0, d/2 - 2);
  ctx.stroke();
  // Shelf line
  ctx.beginPath();
  ctx.moveTo(-w/2 + 2, 0);
  ctx.lineTo(w/2 - 2, 0);
  ctx.stroke();
  // Knobs
  ctx.beginPath();
  ctx.arc(-w*0.1, -d*0.25, 1.5, 0, Math.PI*2);
  ctx.arc(w*0.1, -d*0.25, 1.5, 0, Math.PI*2);
  ctx.fill();
};

export const drawGenericTable: DrawFn = (ctx, w, d) => {
  roundRect(ctx, -w/2, -d/2, w, d, 3);
  ctx.fill(); ctx.stroke();
};

