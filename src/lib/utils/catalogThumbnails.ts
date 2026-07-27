/**
 * Miniaturas 2D do catálogo.
 *
 * Renderiza o MESMO símbolo que aparece na planta (`drawFurnitureIcon`) num canvas
 * offscreen e devolve um data URL. Síncrono, cacheado, sem rede e sem WebGL — o que o
 * usuário vê no painel é exatamente o que ele vai ver desenhado no projeto.
 */
import { drawFurnitureIcon } from '$lib/utils/icones';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';

/** Lado do bitmap gerado, em px (densidade 2x para telas retina). */
const LADO = 96;
const DENSIDADE = 2;
/** Respiro interno para o traço do símbolo não encostar na borda. */
const MARGEM = 6;

const cache = new Map<string, string>();

/**
 * Data URL da miniatura do item de catálogo, ou `null` se o id não existir
 * (ou se estiver rodando em SSR, onde não há canvas).
 */
export function getThumbnail(catalogId: string): string | null {
  const emCache = cache.get(catalogId);
  if (emCache !== undefined) return emCache || null;

  if (typeof document === 'undefined') return null;

  const def = getCatalogItem(catalogId);
  if (!def) {
    cache.set(catalogId, '');
    return null;
  }

  const canvas = document.createElement('canvas');
  canvas.width = LADO * DENSIDADE;
  canvas.height = LADO * DENSIDADE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.scale(DENSIDADE, DENSIDADE);

  // Escala para caber no quadro preservando a proporção real do item.
  const disponivel = LADO - MARGEM * 2;
  const escala = disponivel / Math.max(def.width, def.depth);
  const largura = def.width * escala;
  const profundidade = def.depth * escala;

  ctx.translate(LADO / 2, LADO / 2);
  drawFurnitureIcon(ctx, def.id, largura, profundidade, def.color, def.color);

  const dataUrl = canvas.toDataURL('image/png');
  cache.set(catalogId, dataUrl);
  return dataUrl;
}

/** Invalida o cache — chame se o catálogo for recarregado em runtime. */
export function limparCacheMiniaturas(): void {
  cache.clear();
}
