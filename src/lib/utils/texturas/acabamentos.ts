/** Texturas procedurais de acabamento — painel de madeira e azulejo metrô. */
import { getOrCreate, seededRandom } from './base';

// ── WOOD PANEL ─────────────────────────────────────────────────

export function generateWoodPanelTexture(baseColor: string = '#8B6914'): HTMLCanvasElement {
  const id = `wood-panel-${baseColor}`;
  return getOrCreate(id, 1024, (cx, S) => {
    const rng = seededRandom(73);

    // Background
    cx.fillStyle = '#6b4c1e';
    cx.fillRect(0, 0, S, S);

    const panelW = 128;
    const gap = 4;

    for (let x = 0; x < S; x += panelW) {
      // Panel base — each panel slightly different
      const hue = 25 + rng() * 15;
      const sat = 30 + rng() * 25;
      const lit = 30 + rng() * 20;
      cx.fillStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;
      cx.fillRect(x + gap / 2, 0, panelW - gap, S);

      // Wood grain — many fine horizontal lines with gentle curves
      for (let g = 0; g < 60; g++) {
        const gy = rng() * S;
        const alpha = 0.03 + rng() * 0.1;
        const dark = rng() > 0.4;
        cx.strokeStyle = dark ? `rgba(0,0,0,${alpha})` : `rgba(255,220,180,${alpha * 0.6})`;
        cx.lineWidth = 0.3 + rng() * 1.2;
        cx.beginPath();
        cx.moveTo(x + gap, gy);

        // Gentle wavy grain
        const amp = 1 + rng() * 4;
        const freq = 0.005 + rng() * 0.01;
        for (let gx = 0; gx < panelW - gap; gx += 4) {
          cx.lineTo(x + gap + gx, gy + Math.sin(gx * freq + rng() * 10) * amp);
        }
        cx.stroke();
      }

      // Knots (occasional)
      if (rng() > 0.7) {
        const kx = x + panelW * 0.3 + rng() * panelW * 0.4;
        const ky = rng() * S;
        const kr = 6 + rng() * 12;
        // Concentric rings
        for (let r = kr; r > 0; r -= 2) {
          cx.strokeStyle = `rgba(0,0,0,${0.05 + (kr - r) / kr * 0.15})`;
          cx.lineWidth = 1;
          cx.beginPath();
          cx.ellipse(kx, ky, r, r * (0.7 + rng() * 0.3), rng() * 0.3, 0, Math.PI * 2);
          cx.stroke();
        }
        cx.fillStyle = `rgba(40,20,0,0.3)`;
        cx.beginPath();
        cx.arc(kx, ky, 2 + rng() * 3, 0, Math.PI * 2);
        cx.fill();
      }

      // Panel edge bevels
      cx.fillStyle = 'rgba(255,255,255,0.06)';
      cx.fillRect(x + gap / 2, 0, 2, S);
      cx.fillStyle = 'rgba(0,0,0,0.1)';
      cx.fillRect(x + panelW - gap / 2 - 2, 0, 2, S);

      // Groove shadow
      cx.fillStyle = 'rgba(0,0,0,0.35)';
      cx.fillRect(x, 0, gap / 2, S);
      cx.fillRect(x + panelW - gap / 2, 0, gap / 2, S);
    }
  });
}

// ── SUBWAY TILE ────────────────────────────────────────────────

export function generateSubwayTileTexture(baseColor: string = '#F0F0F0'): HTMLCanvasElement {
  const id = `subway-tile-${baseColor}`;
  return getOrCreate(id, 1024, (cx, S) => {
    const rng = seededRandom(55);

    cx.fillStyle = '#e8e4df'; // grout color
    cx.fillRect(0, 0, S, S);

    // Grout texture
    for (let i = 0; i < 2000; i++) {
      const g = 200 + rng() * 30;
      cx.fillStyle = `rgba(${g},${g},${g - 10},0.2)`;
      cx.fillRect(rng() * S, rng() * S, 1 + rng() * 2, 1 + rng() * 2);
    }

    const tileW = 128, tileH = 64;
    const grout = 4;

    for (let row = 0; row < S / tileH + 1; row++) {
      const y = row * tileH;
      const offset = (row % 2) * (tileW / 2);
      for (let col = -1; col < S / tileW + 2; col++) {
        const x = col * tileW + offset;

        // Tile base — subtle color variation
        const lit = 92 + rng() * 6;
        cx.fillStyle = `hsl(40, 3%, ${lit}%)`;
        const tx = x + grout / 2, ty = y + grout / 2;
        const tw = tileW - grout, th = tileH - grout;

        // Rounded corners
        const cr = 2;
        cx.beginPath();
        cx.moveTo(tx + cr, ty);
        cx.lineTo(tx + tw - cr, ty);
        cx.arcTo(tx + tw, ty, tx + tw, ty + cr, cr);
        cx.lineTo(tx + tw, ty + th - cr);
        cx.arcTo(tx + tw, ty + th, tx + tw - cr, ty + th, cr);
        cx.lineTo(tx + cr, ty + th);
        cx.arcTo(tx, ty + th, tx, ty + th - cr, cr);
        cx.lineTo(tx, ty + cr);
        cx.arcTo(tx, ty, tx + cr, ty, cr);
        cx.closePath();
        cx.fill();

        // Glaze reflection — subtle gradient
        const grad = cx.createLinearGradient(tx, ty, tx, ty + th);
        grad.addColorStop(0, 'rgba(255,255,255,0.12)');
        grad.addColorStop(0.3, 'rgba(255,255,255,0.02)');
        grad.addColorStop(0.7, 'rgba(0,0,0,0.02)');
        grad.addColorStop(1, 'rgba(0,0,0,0.04)');
        cx.fillStyle = grad;
        cx.fill();

        // Slight bevel shadow
        cx.strokeStyle = 'rgba(0,0,0,0.06)';
        cx.lineWidth = 0.5;
        cx.stroke();
      }
    }
  });
}

