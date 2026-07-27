/**
 * Réguas horizontal e vertical do canvas.
 *
 * O passo entre marcações é escolhido pelo zoom, a partir de uma lista de valores
 * "redondos" (1 m, 50 cm, 1 ft…) — assim o rótulo nunca vira 37,4 cm.
 */
import { screenToWorld, worldToScreen, type CanvasState } from '$lib/utils/canvasInteraction';
import type { ProjectSettings } from '$lib/stores/settings';

const CM_POR_POLEGADA = 2.54;

/** Rótulo da marcação, na unidade e na precisão adequadas ao passo. */
export function rotuloRegua(worldCm: number, tickStep: number, isImperial: boolean): string {
    if (isImperial) {
      const inches = worldCm / CM_POR_POLEGADA;
      const ft = inches / 12;
      if (tickStep / CM_POR_POLEGADA >= 12) {
        // Show feet
        return `${ft % 1 === 0 ? ft.toFixed(0) : ft.toFixed(1)}'`;
      }
      return `${Math.round(inches)}"`;
    }
    // Metric
    if (tickStep >= 100) {
      const m = worldCm / 100;
      return `${worldCm % 100 === 0 ? m.toFixed(0) : m.toFixed(1)}m`;
    }
    return `${Math.round(worldCm)}`;
  }

/**
 * Desenha as duas réguas e o quadrado do canto.
 * `mousePos` posiciona o indicador da posição do cursor; passe null para não mostrar.
 */
export function drawRulers(
  cs: CanvasState,
  dimSettings: ProjectSettings,
  RULER_SIZE: number,
  mousePos: { x: number; y: number } | null,
): void {
  const { ctx, width, height, zoom, camX, camY } = cs;
    const R = RULER_SIZE;
    const fontSize = 9;
    const isImperial = dimSettings.units === 'imperial';
    ctx.save();

    // Determine tick spacing based on zoom
    // For imperial: use inch-friendly steps (in cm equivalents)
    // For metric: use cm-friendly steps
    let tickStep: number;
    let minorDiv: number;
    let minorStep: number;

    if (isImperial) {
      // Nice steps in inches, stored as cm: 1in, 2in, 6in, 1ft, 2ft, 5ft, 10ft, 20ft, 50ft, 100ft
      const inchCm = 2.54;
      const niceInchSteps = [1, 2, 6, 12, 24, 60, 120, 240, 600, 1200, 2400];
      const niceStepsCm = niceInchSteps.map(i => i * inchCm);
      tickStep = niceStepsCm[niceStepsCm.length - 1];
      for (const s of niceStepsCm) {
        if (s * zoom >= 40) { tickStep = s; break; }
      }
      const tickInches = tickStep / inchCm;
      // Minor divisions: if >= 1ft, divide by 6 (every 2in); else divide by 2
      minorDiv = tickInches >= 12 ? 6 : tickInches >= 6 ? 3 : 2;
      minorStep = tickStep / minorDiv;
    } else {
      const niceSteps = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
      tickStep = niceSteps[niceSteps.length - 1];
      for (const s of niceSteps) {
        if (s * zoom >= 40) { tickStep = s; break; }
      }
      minorDiv = tickStep >= 100 ? 5 : tickStep >= 10 ? 5 : 2;
      minorStep = tickStep / minorDiv;
    }

    // --- Horizontal ruler (top) ---
    ctx.fillStyle = '#f1f3f5';
    ctx.fillRect(R, 0, width - R, R);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(R, R); ctx.lineTo(width, R); ctx.stroke();

    // Ticks
    const worldLeft = screenToWorld(cs, R, 0).x;
    const worldRight = screenToWorld(cs, width, 0).x;
    const startTick = Math.floor(worldLeft / minorStep) * minorStep;

    ctx.fillStyle = '#6b7280';
    ctx.font = `${fontSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (let wx = startTick; wx <= worldRight; wx += minorStep) {
      const sx = worldToScreen(cs, wx, 0).x;
      if (sx < R) continue;
      const isMajor = Math.abs(wx % tickStep) < 0.01;
      const isMid = !isMajor && Math.abs(wx % (tickStep / 2)) < 0.01 && minorDiv >= 4;
      const tickH = isMajor ? R * 0.7 : isMid ? R * 0.45 : R * 0.25;

      // Highlight origin tick
      const isOrigin = Math.abs(wx) < 0.01;
      ctx.strokeStyle = isOrigin ? '#ef4444' : isMajor ? '#9ca3af' : '#d1d5db';
      ctx.lineWidth = isOrigin ? 1.5 : isMajor ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(sx, R);
      ctx.lineTo(sx, R - tickH);
      ctx.stroke();

      if (isMajor) {
        ctx.fillStyle = isOrigin ? '#ef4444' : '#6b7280';
        const label = isOrigin ? '0' : rotuloRegua(wx, tickStep, isImperial);
        ctx.fillText(label, sx, 2);
        ctx.fillStyle = '#6b7280';
      }
    }

    // --- Vertical ruler (left) ---
    ctx.fillStyle = '#f1f3f5';
    ctx.fillRect(0, R, R, height - R);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(R, R); ctx.lineTo(R, height); ctx.stroke();

    const worldTop = screenToWorld(cs, 0, R).y;
    const worldBottom = screenToWorld(cs, 0, height).y;
    const startTickY = Math.floor(worldTop / minorStep) * minorStep;

    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let wy = startTickY; wy <= worldBottom; wy += minorStep) {
      const sy = worldToScreen(cs, 0, wy).y;
      if (sy < R) continue;
      const isMajor = Math.abs(wy % tickStep) < 0.01;
      const isMid = !isMajor && Math.abs(wy % (tickStep / 2)) < 0.01 && minorDiv >= 4;
      const tickH = isMajor ? R * 0.7 : isMid ? R * 0.45 : R * 0.25;

      const isOrigin = Math.abs(wy) < 0.01;
      ctx.strokeStyle = isOrigin ? '#ef4444' : isMajor ? '#9ca3af' : '#d1d5db';
      ctx.lineWidth = isOrigin ? 1.5 : isMajor ? 1 : 0.5;
      ctx.beginPath();
      ctx.moveTo(R, sy);
      ctx.lineTo(R - tickH, sy);
      ctx.stroke();

      if (isMajor) {
        const label = isOrigin ? '0' : rotuloRegua(wy, tickStep, isImperial);
        ctx.save();
        ctx.translate(R - 3, sy);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = isOrigin ? '#ef4444' : '#6b7280';
        ctx.font = `${fontSize}px sans-serif`;
        ctx.fillText(label, 0, 0);
        ctx.restore();
      }
    }

    // Corner square with origin marker
    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, R, R);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.strokeRect(0, 0, R, R);
    // Origin crosshair in corner
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1;
    const cx = R / 2, cy = R / 2;
    ctx.beginPath();
    ctx.moveTo(cx - 4, cy); ctx.lineTo(cx + 4, cy);
    ctx.moveTo(cx, cy - 4); ctx.lineTo(cx, cy + 4);
    ctx.stroke();

    // Indicador da posição do cursor nas réguas — linha fina + triângulo
    if (!mousePos) { ctx.restore(); return; }
    const mScreen = worldToScreen(cs, mousePos.x, mousePos.y);

    // Horizontal: thin tracking line spanning ruler height
    if (mScreen.x > R) {
      ctx.strokeStyle = 'rgba(59,130,246,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mScreen.x, 0);
      ctx.lineTo(mScreen.x, R);
      ctx.stroke();
      // Triangle indicator
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(mScreen.x, R);
      ctx.lineTo(mScreen.x - 3, R - 6);
      ctx.lineTo(mScreen.x + 3, R - 6);
      ctx.closePath();
      ctx.fill();
    }

    // Vertical: thin tracking line spanning ruler width
    if (mScreen.y > R) {
      ctx.strokeStyle = 'rgba(59,130,246,0.5)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, mScreen.y);
      ctx.lineTo(R, mScreen.y);
      ctx.stroke();
      // Triangle indicator
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.moveTo(R, mScreen.y);
      ctx.lineTo(R - 6, mScreen.y - 3);
      ctx.lineTo(R - 6, mScreen.y + 3);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }
