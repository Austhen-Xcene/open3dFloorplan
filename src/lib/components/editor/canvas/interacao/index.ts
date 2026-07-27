/**
 * Tratadores de evento do canvas.
 *
 * Uma fábrica só: recebe o estado de interface, o núcleo (coordenadas e encaixe) e o
 * bloco de desenho, e devolve os handlers que o markup pendura no `<canvas>`.
 *
 * A ordem de construção importa: núcleo → desenho → interação. O núcleo existe
 * justamente para que desenho e interação não precisem um do outro.
 */
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { Nucleo } from '../nucleo';
import type { Desenho } from '../desenho';
import { criarLocalizadores } from './localizar';
import { criarEnquadramento } from './enquadrar';
import { criarMouseDown } from './mouseDown';
import { criarMouseMove } from './mouseMove';
import { criarMouseUp } from './mouseUp';
import { criarGestos } from './gestos';
import { criarTeclado } from './teclado';
import { criarArrastarSoltar } from './arrastarSoltar';
import { criarMenuContexto } from './menuContexto';

export function criarInteracao(ui: EstadoCanvas, n: Nucleo, d: Desenho) {
  const loc = criarLocalizadores(ui, n, d);
  return {
    ...loc,
    ...criarEnquadramento(ui, n, d),
    ...criarMouseDown(ui, n, d, loc),
    ...criarMouseMove(ui, n, d, loc),
    ...criarMouseUp(ui, n, d, loc),
    ...criarGestos(ui, n, d, loc),
    ...criarTeclado(ui, n, d, loc),
    ...criarArrastarSoltar(ui, n, d, loc),
    ...criarMenuContexto(ui, n, d, loc),
  };
}

export type Interacao = ReturnType<typeof criarInteracao>;
