/**
 * Entrada e saída de projeto por arquivo local (importar / compartilhar).
 *
 * Fica em services/ porque toca I/O do navegador. A validação do JSON importado
 * mora aqui: um arquivo inválido nunca deve chegar até a store.
 */
import type { Project } from '$lib/models/types';

/** Baixa o projeto atual como `.openplan.json`. */
export function compartilharProjeto(projeto: Project): void {
  const json = JSON.stringify(projeto, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${projeto.name || 'floorplan'}.openplan.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/** Erro de validação, com mensagem já pronta para o usuário. */
type ResultadoValidacao = { ok: true; projeto: Project } | { ok: false; erro: string };

/**
 * Valida a estrutura mínima de um projeto exportado por este editor e revive as datas.
 * Não confia no arquivo: pavimento sem `id` ou sem `walls` reprova.
 */
export function validarProjetoImportado(dados: unknown): ResultadoValidacao {
  const d = dados as Partial<Project> & Record<string, unknown>;

  if (!d || !d.floors || !d.id) {
    return { ok: false, erro: 'Formato não reconhecido. Selecione um projeto JSON exportado por este editor.' };
  }
  if (!Array.isArray(d.floors) || d.floors.length === 0) {
    return { ok: false, erro: 'Arquivo de projeto inválido: deve existir pelo menos um pavimento.' };
  }
  for (const pavimento of d.floors) {
    if (!pavimento.id || !Array.isArray(pavimento.walls)) {
      return { ok: false, erro: 'Arquivo de projeto inválido: os dados dos pavimentos estão incompletos.' };
    }
  }
  if (!d.activeFloorId || !d.floors.some((f) => f.id === d.activeFloorId)) {
    d.activeFloorId = d.floors[0].id;
  }
  if (d.createdAt) d.createdAt = new Date(d.createdAt as unknown as string);
  if (d.updatedAt) d.updatedAt = new Date(d.updatedAt as unknown as string);

  return { ok: true, projeto: d as Project };
}

/**
 * Abre o seletor de arquivos e entrega o projeto validado a `aoCarregar`.
 * Erros viram `alert` — o usuário precisa saber por que a importação não aconteceu.
 */
export function importarProjetoDeArquivo(aoCarregar: (projeto: Project) => void): void {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json,application/json';
  input.onchange = async () => {
    const arquivo = input.files?.[0];
    if (!arquivo) return;
    try {
      const resultado = validarProjetoImportado(JSON.parse(await arquivo.text()));
      if (!resultado.ok) {
        alert(resultado.erro);
        return;
      }
      aoCarregar(resultado.projeto);
    } catch (e) {
      alert('Não foi possível importar o projeto: ' + (e as Error).message);
    }
  };
  input.click();
}
