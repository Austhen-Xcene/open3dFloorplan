/** Texturas procedurais de alvenaria — tijolo, pedra e concreto. */
import { getOrCreate, seededRandom } from './base';

// ── BRICK ──────────────────────────────────────────────────────

export function generateBrickTexture(baseColor: string = '#8B4513', variant: 'standard' | 'exposed' = 'standard'): HTMLCanvasElement {
  const id = `brick-${baseColor}-${variant}`;
  return getOrCreate(id, 1024, (cx, S) => {
    const rng = seededRandom(42);
    // Parse base color to HSL-ish values
    cx.fillStyle = '#d4c4a8'; // mortar base
    cx.fillRect(0, 0, S, S);

    // Mortar texture — fine noise
    for (let i = 0; i < 2000; i++) {
      const g = 180 + rng() * 40;
      cx.fillStyle = `rgba(${g},${g - 10},${g - 20},0.3)`;
      cx.fillRect(rng() * S, rng() * S, 1 + rng() * 3, 1 + rng() * 3);
    }

    const brickH = 32;
    const brickW = 80;
    const mortarW = 3;

    for (let row = 0; row < S / brickH + 1; row++) {
      const y = row * brickH;
      const offset = (row % 2) * (brickW / 2);
      for (let col = -1; col < S / brickW + 2; col++) {
        const x = col * brickW + offset;

        // Per-brick color variation
        const hue = 8 + rng() * 16;
        const sat = variant === 'exposed' ? 35 + rng() * 30 : 40 + rng() * 25;
        const lit = variant === 'exposed' ? 28 + rng() * 22 : 32 + rng() * 18;
        cx.fillStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;
        cx.fillRect(x + mortarW / 2, y + mortarW / 2, brickW - mortarW, brickH - mortarW);

        // Surface variation — subtle darker/lighter patches
        for (let p = 0; p < 5; p++) {
          const px = x + mortarW + rng() * (brickW - mortarW * 2);
          const py = y + mortarW + rng() * (brickH - mortarW * 2);
          const ps = 8 + rng() * 20;
          const alpha = 0.05 + rng() * 0.12;
          cx.fillStyle = rng() > 0.5 ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha * 0.7})`;
          cx.beginPath();
          cx.ellipse(px, py, ps / 2, ps / 3, rng() * Math.PI, 0, Math.PI * 2);
          cx.fill();
        }

        // Subtle edge highlight (top-left) and shadow (bottom-right)
        cx.fillStyle = 'rgba(255,255,255,0.08)';
        cx.fillRect(x + mortarW / 2, y + mortarW / 2, brickW - mortarW, 2);
        cx.fillRect(x + mortarW / 2, y + mortarW / 2, 2, brickH - mortarW);
        cx.fillStyle = 'rgba(0,0,0,0.1)';
        cx.fillRect(x + mortarW / 2, y + brickH - mortarW / 2 - 2, brickW - mortarW, 2);
        cx.fillRect(x + brickW - mortarW / 2 - 2, y + mortarW / 2, 2, brickH - mortarW);

        // Fine surface cracks (occasional)
        if (rng() > 0.85) {
          cx.strokeStyle = `rgba(0,0,0,${0.1 + rng() * 0.1})`;
          cx.lineWidth = 0.5;
          cx.beginPath();
          const cx1 = x + mortarW + rng() * (brickW - mortarW * 3);
          const cy1 = y + mortarW + rng() * (brickH - mortarW * 3);
          cx.moveTo(cx1, cy1);
          cx.lineTo(cx1 + (rng() - 0.5) * 25, cy1 + (rng() - 0.5) * 15);
          cx.stroke();
        }
      }
    }
  });
}

// ── STONE ──────────────────────────────────────────────────────

export function generateStoneTexture(baseColor: string = '#808080'): HTMLCanvasElement {
  const id = `stone-${baseColor}`;
  return getOrCreate(id, 1024, (cx, S) => {
    const rng = seededRandom(137);

    // Base mortar fill
    cx.fillStyle = '#b0a899';
    cx.fillRect(0, 0, S, S);

    // Mortar texture noise
    for (let i = 0; i < 3000; i++) {
      const g = 160 + rng() * 40;
      cx.fillStyle = `rgba(${g},${g - 5},${g - 10},0.25)`;
      cx.fillRect(rng() * S, rng() * S, 1 + rng() * 2, 1 + rng() * 2);
    }

    // Generate irregular stone shapes using a grid with random offsets
    const cols = 6, rows = 8;
    const cellW = S / cols, cellH = S / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cx1 = c * cellW + cellW * 0.1 + rng() * cellW * 0.15;
        const cy1 = r * cellH + cellH * 0.1 + rng() * cellH * 0.15;
        const sw = cellW * (0.65 + rng() * 0.25);
        const sh = cellH * (0.6 + rng() * 0.3);

        // Stone base color with variation
        const hue = 30 + rng() * 30;
        const sat = 5 + rng() * 15;
        const lit = 45 + rng() * 25;

        // Irregular polygon (6-8 points)
        const pts = 6 + Math.floor(rng() * 3);
        const path = new Path2D();
        const stonePoints: { x: number; y: number }[] = [];
        for (let i = 0; i < pts; i++) {
          const angle = (i / pts) * Math.PI * 2 - Math.PI / 2;
          const r1 = 0.35 + rng() * 0.15;
          const px = cx1 + sw / 2 + Math.cos(angle) * sw * r1;
          const py = cy1 + sh / 2 + Math.sin(angle) * sh * r1;
          stonePoints.push({ x: px, y: py });
          if (i === 0) path.moveTo(px, py);
          else path.lineTo(px, py);
        }
        path.closePath();

        cx.fillStyle = `hsl(${hue}, ${sat}%, ${lit}%)`;
        cx.fill(path);

        // Internal variation — subtle patches
        cx.save();
        cx.clip(path);
        for (let p = 0; p < 8; p++) {
          const px = cx1 + rng() * sw;
          const py = cy1 + rng() * sh;
          const pr = 10 + rng() * 25;
          cx.fillStyle = rng() > 0.5 ? `rgba(0,0,0,${0.03 + rng() * 0.08})` : `rgba(255,255,255,${0.03 + rng() * 0.06})`;
          cx.beginPath();
          cx.ellipse(px, py, pr, pr * (0.6 + rng() * 0.4), rng() * Math.PI, 0, Math.PI * 2);
          cx.fill();
        }
        // Veining
        if (rng() > 0.5) {
          cx.strokeStyle = `rgba(255,255,255,${0.06 + rng() * 0.08})`;
          cx.lineWidth = 0.5 + rng();
          cx.beginPath();
          const vx = cx1 + rng() * sw;
          const vy = cy1 + rng() * sh;
          cx.moveTo(vx, vy);
          for (let v = 0; v < 3; v++) {
            cx.lineTo(vx + (rng() - 0.5) * 40, vy + (rng() - 0.5) * 30);
          }
          cx.stroke();
        }
        cx.restore();

        // Edge shadow/highlight
        cx.strokeStyle = 'rgba(0,0,0,0.2)';
        cx.lineWidth = 1.5;
        cx.stroke(path);
        // Inner highlight edge
        cx.strokeStyle = 'rgba(255,255,255,0.08)';
        cx.lineWidth = 0.5;
        cx.stroke(path);
      }
    }
  });
}

// ── CONCRETE ───────────────────────────────────────────────────

export function generateConcreteTexture(baseColor: string = '#999999'): HTMLCanvasElement {
  const id = `concrete-${baseColor}`;
  return getOrCreate(id, 1024, (cx, S) => {
    const rng = seededRandom(99);

    // Base color
    cx.fillStyle = '#a0a0a0';
    cx.fillRect(0, 0, S, S);

    // Large-scale tonal variation
    for (let i = 0; i < 20; i++) {
      const x = rng() * S, y = rng() * S;
      const r = 80 + rng() * 200;
      const g = 140 + rng() * 60;
      cx.fillStyle = `rgba(${g},${g},${g},0.15)`;
      cx.beginPath();
      cx.ellipse(x, y, r, r * (0.5 + rng() * 0.5), rng() * Math.PI, 0, Math.PI * 2);
      cx.fill();
    }

    // Medium noise
    for (let i = 0; i < 5000; i++) {
      const g = 100 + rng() * 120;
      cx.fillStyle = `rgba(${g},${g},${g},0.15)`;
      const s = 1 + rng() * 5;
      cx.fillRect(rng() * S, rng() * S, s, s);
    }

    // Fine speckles
    for (let i = 0; i < 8000; i++) {
      const g = rng() > 0.5 ? 60 + rng() * 40 : 180 + rng() * 50;
      cx.fillStyle = `rgba(${g},${g},${g},0.08)`;
      cx.fillRect(rng() * S, rng() * S, 1, 1);
    }

    // Hairline cracks
    for (let i = 0; i < 5; i++) {
      cx.strokeStyle = `rgba(0,0,0,${0.05 + rng() * 0.1})`;
      cx.lineWidth = 0.3 + rng() * 0.5;
      cx.beginPath();
      let px = rng() * S, py = rng() * S;
      cx.moveTo(px, py);
      for (let s = 0; s < 6; s++) {
        px += (rng() - 0.5) * 80;
        py += (rng() - 0.5) * 60;
        cx.lineTo(px, py);
      }
      cx.stroke();
    }

    // Slight pitting
    for (let i = 0; i < 30; i++) {
      cx.fillStyle = `rgba(0,0,0,${0.03 + rng() * 0.06})`;
      cx.beginPath();
      cx.arc(rng() * S, rng() * S, 1 + rng() * 4, 0, Math.PI * 2);
      cx.fill();
    }
  });
}

