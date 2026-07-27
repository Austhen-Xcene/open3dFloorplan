/** Símbolos 2D — banheiro. Ver `primitivas.ts` para o contrato de desenho. */
import { roundRect, type DrawFn } from './primitivas';

export const drawToilet: DrawFn = (ctx, w, d, color) => {
  // Tank (back rectangle)
  const tankD = d * 0.3;
  roundRect(ctx, -w/2 + w*0.1, -d/2, w*0.8, tankD, 2);
  ctx.fill(); ctx.stroke();
  // Bowl (ellipse)
  ctx.beginPath();
  const bowlCy = -d/2 + tankD + (d - tankD) * 0.5;
  const bowlRx = w * 0.42;
  const bowlRy = (d - tankD) * 0.48;
  ctx.ellipse(0, bowlCy, bowlRx, bowlRy, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff90';
  ctx.fill(); ctx.stroke();
  // Seat opening
  ctx.beginPath();
  ctx.ellipse(0, bowlCy + bowlRy*0.05, bowlRx*0.7, bowlRy*0.7, 0, 0, Math.PI * 2);
  ctx.stroke();
};

export const drawBathtub: DrawFn = (ctx, w, d, color) => {
  // Outer
  roundRect(ctx, -w/2, -d/2, w, d, 6);
  ctx.fill(); ctx.stroke();
  // Inner
  ctx.fillStyle = '#ffffff60';
  roundRect(ctx, -w/2 + 3, -d/2 + 3, w - 6, d - 6, 4);
  ctx.fill(); ctx.stroke();
  // Drain
  ctx.beginPath();
  ctx.arc(w*0.3, 0, 2, 0, Math.PI*2);
  ctx.fill(); ctx.stroke();
  // Faucet
  ctx.beginPath();
  ctx.arc(-w*0.35, 0, 3, 0, Math.PI*2);
  ctx.stroke();
};

export const drawShower: DrawFn = (ctx, w, d) => {
  // Floor tray
  roundRect(ctx, -w/2, -d/2, w, d, 4);
  ctx.fill(); ctx.stroke();
  // Drain
  ctx.beginPath();
  ctx.arc(0, 0, 3, 0, Math.PI*2);
  ctx.stroke();
  // Showerhead indicator (corner)
  ctx.beginPath();
  ctx.arc(-w/2 + 8, -d/2 + 8, 4, 0, Math.PI*2);
  ctx.stroke();
  // Water dots
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.arc(-w/2 + 8 + (i+1)*3, -d/2 + 8 + (i+1)*3, 1, 0, Math.PI*2);
    ctx.fill();
  }
};

export const drawSink: DrawFn = (ctx, w, d) => {
  // Counter
  roundRect(ctx, -w/2, -d/2, w, d, 3);
  ctx.fill(); ctx.stroke();
  // Basin (ellipse)
  ctx.beginPath();
  ctx.ellipse(0, d*0.05, w*0.35, d*0.35, 0, 0, Math.PI*2);
  ctx.fillStyle = '#ffffff80';
  ctx.fill(); ctx.stroke();
  // Faucet
  ctx.beginPath();
  ctx.arc(0, -d*0.3, 2, 0, Math.PI*2);
  ctx.fill();
};

export const drawWasherDryer: DrawFn = (ctx, w, d) => {
  roundRect(ctx, -w/2, -d/2, w, d, 2);
  ctx.fill(); ctx.stroke();
  // Drum circle
  ctx.beginPath();
  const r = Math.min(w, d) * 0.3;
  ctx.arc(0, d*0.05, r, 0, Math.PI*2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, d*0.05, r*0.6, 0, Math.PI*2);
  ctx.stroke();
  // Control panel area
  ctx.beginPath();
  ctx.moveTo(-w*0.4, -d*0.3);
  ctx.lineTo(w*0.4, -d*0.3);
  ctx.stroke();
};

