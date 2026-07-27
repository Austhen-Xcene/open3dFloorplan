/**
 * Lista de atalhos do editor — fonte única.
 *
 * O overlay de ajuda e o botão "Copiar tudo" leem daqui. Antes a lista existia duas
 * vezes (um array para o texto e o markup para a tela) e elas saíam de sincronia.
 */

export interface Atalho {
  acao: string;
  tecla: string;
}

export interface GrupoAtalhos {
  titulo: string;
  /** Classes Tailwind literais — o scanner do Tailwind não enxerga classe composta em runtime. */
  corTitulo: string;
  corLinha: string;
  coluna: 'esquerda' | 'direita';
  atalhos: Atalho[];
}

export const gruposAtalhos: GrupoAtalhos[] = [
  {
    titulo: 'Ferramentas',
    corTitulo: 'text-indigo-500',
    corLinha: 'bg-indigo-100',
    coluna: 'esquerda',
    atalhos: [
      { acao: 'Selecionar', tecla: 'V' },
      { acao: 'Porta', tecla: 'D' },
      { acao: 'Mão', tecla: 'H' },
      { acao: 'Medir', tecla: 'M' },
      { acao: 'Anotar', tecla: 'N' },
      { acao: 'Texto', tecla: 'T' },
      { acao: 'Alternar snap', tecla: 'S' },
    ],
  },
  {
    titulo: 'Editar',
    corTitulo: 'text-amber-500',
    corLinha: 'bg-amber-100',
    coluna: 'esquerda',
    atalhos: [
      { acao: 'Desfazer', tecla: 'Ctrl+Z' },
      { acao: 'Refazer', tecla: 'Ctrl+Y' },
      { acao: 'Copiar', tecla: 'Ctrl+C' },
      { acao: 'Colar', tecla: 'Ctrl+V' },
      { acao: 'Selecionar tudo', tecla: 'Ctrl+A' },
      { acao: 'Limpar seleção', tecla: 'Ctrl+D' },
      { acao: 'Salvar projeto', tecla: 'Ctrl+S' },
      { acao: 'Cancelar / desselecionar', tecla: 'Esc' },
    ],
  },
  {
    titulo: 'Elementos',
    corTitulo: 'text-emerald-500',
    corLinha: 'bg-emerald-100',
    coluna: 'direita',
    atalhos: [
      { acao: 'Rotacionar', tecla: 'R' },
      { acao: 'Excluir seleção', tecla: 'Del' },
      { acao: 'Travar / destravar', tecla: 'Ctrl+L' },
      { acao: 'Agrupar', tecla: 'Ctrl+G' },
      { acao: 'Desagrupar', tecla: 'Ctrl+⇧+G' },
    ],
  },
  {
    titulo: 'Visualização',
    corTitulo: 'text-blue-500',
    corLinha: 'bg-blue-100',
    coluna: 'direita',
    atalhos: [
      { acao: 'Enquadrar o projeto', tecla: 'F' },
      { acao: 'Alternar grade', tecla: 'G' },
      { acao: 'Alternar camadas', tecla: 'L' },
      { acao: 'Mostrar atalhos', tecla: '?' },
    ],
  },
  {
    titulo: 'Canvas',
    corTitulo: 'text-purple-500',
    corLinha: 'bg-purple-100',
    coluna: 'direita',
    atalhos: [
      { acao: 'Aproximar / afastar', tecla: 'Scroll' },
      { acao: 'Aproximar / afastar', tecla: '+ / −' },
      { acao: 'Mover a vista', tecla: 'Espaço+arrastar' },
    ],
  },
  {
    titulo: 'Paredes',
    corTitulo: 'text-rose-500',
    corLinha: 'bg-rose-100',
    coluna: 'direita',
    atalhos: [
      { acao: 'Encerrar a sequência', tecla: 'Duplo clique' },
      { acao: 'Fechar o contorno', tecla: 'C' },
    ],
  },
];

/** Versão em texto puro, para a área de transferência. */
export function atalhosComoTexto(): string {
  const linhas = ['ATALHOS DE TECLADO — Studio SHC Planta', ''];
  for (const grupo of gruposAtalhos) {
    linhas.push(`── ${grupo.titulo.toUpperCase()} ──`);
    for (const a of grupo.atalhos) {
      linhas.push(`${a.tecla.padEnd(16)} ${a.acao}`);
    }
    linhas.push('');
  }
  return linhas.join('\n').trimEnd();
}
