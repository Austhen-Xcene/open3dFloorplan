/**
 * Conversão entre o valor guardado (sempre cm) e o valor mostrado nos campos.
 *
 * Nada na UI escreve "cm" na mão: o rótulo sai de `rotuloUnidade`, porque o usuário
 * pode estar em imperial.
 */
import type { ProjectSettings } from '$lib/stores/settings';

type Unidades = ProjectSettings['units'];

const CM_POR_POLEGADA = 2.54;

/** cm → valor exibido no campo. */
export function paraExibicao(cm: number, unidades: Unidades): number {
  return unidades === 'imperial' ? Math.round((cm / CM_POR_POLEGADA) * 10) / 10 : cm;
}

/** valor digitado no campo → cm. */
export function paraCm(valor: number, unidades: Unidades): number {
  return unidades === 'imperial' ? valor * CM_POR_POLEGADA : valor;
}

export function rotuloUnidade(unidades: Unidades): string {
  return unidades === 'imperial' ? 'in' : 'cm';
}

// ── Ambientes usam metro, não centímetro ──

export function dimensaoParaExibicao(cm: number, unidades: Unidades): number {
  return unidades === 'imperial' ? Math.round((cm / CM_POR_POLEGADA) * 10) / 10 : Math.round(cm) / 100;
}

export function dimensaoParaCm(valor: number, unidades: Unidades): number {
  return unidades === 'imperial' ? valor * CM_POR_POLEGADA : valor * 100;
}

export function rotuloDimensao(unidades: Unidades): string {
  return unidades === 'imperial' ? 'in' : 'm';
}

/** Classe compartilhada pelos campos dos painéis de propriedade. */
export const CAMPO = 'w-full px-2 py-1 border border-gray-200 rounded text-sm';
export const ROTULO = 'text-xs text-gray-500';
export const BOTAO_OPCAO = 'flex-1 px-2 py-1.5 border rounded text-sm transition-colors';
export const BOTAO_ATIVO = 'bg-blue-100 border-blue-400 text-blue-700';
export const BOTAO_INATIVO = 'border-gray-200 hover:bg-gray-50';
