/**
 * Contrato entre o bloco de desenho e o componente.
 *
 * Estas 8 funções são tudo que o desenho precisa do FloorPlanCanvas. Deixar isso
 * explícito é o ponto: se a lista crescer, o acoplamento cresceu e vale rever o corte.
 */
import type { Point } from '$lib/models/types';
import type { CanvasState } from '$lib/utils/canvasInteraction';
import type { EncaixeEmParede } from '$lib/utils/encaixeParede';

export interface DepsDesenho {
  /** Marca o canvas para repintar no próximo quadro. */
  markDirty(): void;
  /** Recorte atual da câmera. */
  getCS(): CanvasState;
  /** Caixa da seleção múltipla, ou null com menos de 2 elementos. */
  getMultiSelectBBox(): { minX: number; minY: number; maxX: number; maxY: number } | null;
  /** Encaixe do item na parede mais próxima, para a pré-visualização. */
  snapFurnitureToWall(pos: Point, catalogId: string, rotacaoAtual: number): EncaixeEmParede | null;
  worldToScreen(wx: number, wy: number): { x: number; y: number };
  /** Ponta da parede em desenho, já com encaixe aplicado. */
  snapWallEndPoint(raw: Point): Point;
  /** Comprimento digitado durante o desenho de parede, em cm, ou null. */
  typedWallLengthCm(): number | null;
  /** Aplica o comprimento digitado ao ponto final. */
  applyTypedWallLength(endPt: Point): Point;
}

/** Dados fixos durante um quadro, calculados uma vez no início do `draw()`. */
export interface Quadro {
  floor: import('$lib/models/types').Floor;
  selId: string | null;
  multiIds: Set<string>;
}

/** Espessura das réguas, em px de tela. */
export const RULER_SIZE = 24;
/** Passo da grade de fundo, em unidades de mundo (cm). */
export const GRID = 20;

/** Um elemento está selecionado se é a seleção única ou faz parte da múltipla. */
export function selecionado(q: Quadro, id: string): boolean {
  return id === q.selId || q.multiIds.has(id);
}
