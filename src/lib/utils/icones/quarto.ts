/** Símbolos 2D — quarto. Ver `primitivas.ts` para o contrato de desenho. */
import { roundRect, type DrawFn } from './primitivas';

export const drawBed: DrawFn = (ctx, w, d, color) => {
  // Mattress
  roundRect(ctx, -w/2, -d/2, w, d, 3);
  ctx.fill(); ctx.stroke();
  // Headboard (top)
  ctx.fillStyle = color;
  roundRect(ctx, -w/2, -d/2, w, d * 0.08, 2);
  ctx.fill(); ctx.stroke();
  // Pillows
  ctx.fillStyle = '#ffffff90';
  const pw = w * 0.38;
  const ph = d * 0.15;
  const py = -d/2 + d * 0.1;
  roundRect(ctx, -w/2 + w*0.06, py, pw, ph, 3);
  ctx.fill(); ctx.stroke();
  roundRect(ctx, w/2 - w*0.06 - pw, py, pw, ph, 3);
  ctx.fill(); ctx.stroke();
  // Blanket line
  ctx.beginPath();
  ctx.moveTo(-w/2 + 3, d * 0.05);
  ctx.lineTo(w/2 - 3, d * 0.05);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.stroke();
};

export const drawNightstand: DrawFn = (ctx, w, d) => {
  roundRect(ctx, -w/2, -d/2, w, d, 2);
  ctx.fill(); ctx.stroke();
  // Drawer line
  ctx.beginPath();
  ctx.moveTo(-w/2 + 3, 0);
  ctx.lineTo(w/2 - 3, 0);
  ctx.stroke();
  // Knob
  ctx.beginPath();
  ctx.arc(0, -d*0.25, Math.min(w, d) * 0.06, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, d*0.25, Math.min(w, d) * 0.06, 0, Math.PI * 2);
  ctx.stroke();
};

export const drawDresser: DrawFn = (ctx, w, d) => {
  roundRect(ctx, -w/2, -d/2, w, d, 2);
  ctx.fill(); ctx.stroke();
  // Drawer lines
  const drawers = 4;
  for (let i = 1; i < drawers; i++) {
    const y = -d/2 + (d * i / drawers);
    ctx.beginPath();
    ctx.moveTo(-w/2 + 2, y);
    ctx.lineTo(w/2 - 2, y);
    ctx.stroke();
  }
  // Knobs
  for (let i = 0; i < drawers; i++) {
    const y = -d/2 + d * (i + 0.5) / drawers;
    ctx.beginPath();
    ctx.arc(0, y, Math.min(w, d) * 0.04, 0, Math.PI * 2);
    ctx.fill();
  }
};

export const drawWardrobe: DrawFn = (ctx, w, d) => {
  roundRect(ctx, -w/2, -d/2, w, d, 2);
  ctx.fill(); ctx.stroke();
  // Center line (doors)
  ctx.beginPath();
  ctx.moveTo(0, -d/2 + 2);
  ctx.lineTo(0, d/2 - 2);
  ctx.stroke();
  // Knobs
  ctx.beginPath();
  ctx.arc(-3, 0, 2, 0, Math.PI * 2);
  ctx.arc(3, 0, 2, 0, Math.PI * 2);
  ctx.fill();
};

