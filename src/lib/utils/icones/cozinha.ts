/** Símbolos 2D — cozinha. Ver `primitivas.ts` para o contrato de desenho. */
import { roundRect, type DrawFn } from './primitivas';

export const drawStove: DrawFn = (ctx, w, d) => {
  roundRect(ctx, -w/2, -d/2, w, d, 2);
  ctx.fill(); ctx.stroke();
  // 4 burners
  const positions = [[-1,-1],[1,-1],[-1,1],[1,1]];
  const br = Math.min(w, d) * 0.16;
  for (const [px, py] of positions) {
    ctx.beginPath();
    ctx.arc(px * w * 0.2, py * d * 0.2, br, 0, Math.PI*2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(px * w * 0.2, py * d * 0.2, br * 0.5, 0, Math.PI*2);
    ctx.stroke();
  }
};

export const drawFridge: DrawFn = (ctx, w, d) => {
  roundRect(ctx, -w/2, -d/2, w, d, 2);
  ctx.fill(); ctx.stroke();
  // Door line
  ctx.beginPath();
  ctx.moveTo(-w/2 + 2, -d*0.1);
  ctx.lineTo(w/2 - 2, -d*0.1);
  ctx.stroke();
  // Handle
  ctx.beginPath();
  ctx.moveTo(w*0.3, -d*0.35);
  ctx.lineTo(w*0.3, -d*0.15);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(w*0.3, d*0.05);
  ctx.lineTo(w*0.3, d*0.35);
  ctx.stroke();
};

export const drawCounter: DrawFn = (ctx, w, d) => {
  roundRect(ctx, -w/2, -d/2, w, d, 1);
  ctx.fill(); ctx.stroke();
};

export const drawDishwasher: DrawFn = (ctx, w, d) => {
  roundRect(ctx, -w/2, -d/2, w, d, 2);
  ctx.fill(); ctx.stroke();
  // Handle
  ctx.beginPath();
  ctx.moveTo(-w*0.25, -d*0.3);
  ctx.lineTo(w*0.25, -d*0.3);
  ctx.lineWidth = 1.5;
  ctx.stroke();
};

export const drawOven: DrawFn = (ctx, w, d) => {
  roundRect(ctx, -w/2, -d/2, w, d, 2);
  ctx.fill(); ctx.stroke();
  // Oven door window
  ctx.fillStyle = '#00000020';
  roundRect(ctx, -w*0.3, -d*0.2, w*0.6, d*0.5, 2);
  ctx.fill(); ctx.stroke();
  // Handle
  ctx.beginPath();
  ctx.moveTo(-w*0.25, -d*0.3);
  ctx.lineTo(w*0.25, -d*0.3);
  ctx.lineWidth = 1.5;
  ctx.stroke();
};

