/**
 * Bloco de desenho do canvas.
 *
 * Uma fábrica só: recebe o estado de interface e as 8 funções de `DepsDesenho`, e devolve
 * tudo que o componente precisa chamar. As dependências são explícitas de propósito —
 * enquanto essa lista não crescer, o corte entre desenho e interação está de pé.
 */
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { DepsDesenho } from './tipos';
import { criarAdaptadores } from './adaptadores';
import { criarPrevias } from './previas';
import { criarMedicoes } from './medicoes';
import { criarFaseEstrutura } from './faseEstrutura';
import { criarFaseCotas } from './faseCotas';
import { criarFaseElementos } from './faseElementos';
import { criarFaseParedeEmProgresso } from './faseParedeEmProgresso';
import { criarFaseSelecao } from './faseSelecao';
import { criarQuadro } from './quadro';

export type { DepsDesenho, Quadro } from './tipos';

export function criarDesenho(ui: EstadoCanvas, deps: DepsDesenho) {
  const ad = criarAdaptadores(ui, deps);
  const pr = criarPrevias(ui, deps, ad);
  const md = criarMedicoes(ui, deps);

  const fases = {
    ...criarFaseEstrutura(ui, deps, ad, pr, md),
    ...criarFaseCotas(ui, deps, ad, pr, md),
    ...criarFaseElementos(ui, deps, ad, pr, md),
    ...criarFaseParedeEmProgresso(ui, deps, ad, pr, md),
    ...criarFaseSelecao(ui, deps, ad, pr, md),
  };

  const q = criarQuadro(ui, deps, ad, fases);

  return { ...ad, ...pr, ...md, ...q };
}

export type Desenho = ReturnType<typeof criarDesenho>;
