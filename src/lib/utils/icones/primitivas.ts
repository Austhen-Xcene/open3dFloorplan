/**
 * Primitivas compartilhadas pelos desenhistas de símbolo.
 *
 * Cada desenhista recebe um contexto JÁ transladado para o centro do item e rotacionado,
 * e desenha dentro do retângulo (-w/2, -d/2) → (w/2, d/2), onde `w` e `d` já estão em
 * pixels (medida do catálogo em cm × zoom).
 */

export type DrawFn = (ctx: CanvasRenderingContext2D, w: number, d: number, color: string) => void;

/** Retângulo de cantos arredondados, com raio limitado à metade do menor lado. */
export function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
