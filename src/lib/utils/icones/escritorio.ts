/** Símbolos 2D — escritório. Ver `primitivas.ts` para o contrato de desenho. */
import { roundRect, type DrawFn } from './primitivas';

export const drawDesk: DrawFn = (ctx, w, d) => {
  // Desktop
  roundRect(ctx, -w/2, -d/2, w, d, 2);
  ctx.fill(); ctx.stroke();
  // Keyboard area indication
  ctx.strokeStyle = ctx.strokeStyle + '60';
  roundRect(ctx, -w*0.25, -d*0.05, w*0.5, d*0.2, 1);
  ctx.stroke();
};

export const drawOfficeChair: DrawFn = (ctx, w, d) => {
  // Base (circle)
  ctx.beginPath();
  ctx.arc(0, 0, Math.min(w, d) * 0.45, 0, Math.PI*2);
  ctx.fill(); ctx.stroke();
  // Backrest
  ctx.beginPath();
  ctx.arc(0, -d*0.25, w*0.3, Math.PI*1.2, Math.PI*1.8);
  ctx.lineWidth = 2;
  ctx.stroke();
};

