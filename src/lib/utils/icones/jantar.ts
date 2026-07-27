/** Símbolos 2D — sala de jantar. Ver `primitivas.ts` para o contrato de desenho. */
import { roundRect, type DrawFn } from './primitivas';

export const drawDiningTable: DrawFn = (ctx, w, d) => {
  roundRect(ctx, -w/2, -d/2, w, d, 4);
  ctx.fill(); ctx.stroke();
};

export const drawDiningChair: DrawFn = (ctx, w, d, color) => {
  // Seat
  roundRect(ctx, -w/2, -d/2 + d*0.2, w, d*0.8, 2);
  ctx.fillStyle = color + '40';
  ctx.fill(); ctx.stroke();
  // Back
  ctx.fillStyle = color + '80';
  roundRect(ctx, -w/2, -d/2, w, d*0.2, 2);
  ctx.fill(); ctx.stroke();
};

