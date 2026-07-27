/**
 * Preferências do usuário sobre o catálogo (recentes e favoritos), em localStorage.
 *
 * Guarda apenas ids — a definição do item continua vindo do catálogo, então um item
 * removido do catálogo simplesmente some da lista em vez de quebrar o painel.
 */

const CHAVE_RECENTES = 'o3d_recent_furniture';
const CHAVE_FAVORITOS = 'o3d_favorite_furniture';
const MAX_RECENTES = 10;

function ler(chave: string): string[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const bruto = JSON.parse(localStorage.getItem(chave) || '[]');
    return Array.isArray(bruto) ? bruto.filter((v): v is string => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

function gravar(chave: string, ids: string[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(chave, JSON.stringify(ids));
  } catch {
    // Cota estourada: perder a preferência é aceitável, perder o projeto não.
  }
}

export const lerRecentes = () => ler(CHAVE_RECENTES);
export const lerFavoritos = () => ler(CHAVE_FAVORITOS);

/** Move o id para o topo dos recentes e devolve a lista nova. */
export function registrarUso(id: string, recentes: string[]): string[] {
  const atualizada = [id, ...recentes.filter((r) => r !== id)].slice(0, MAX_RECENTES);
  gravar(CHAVE_RECENTES, atualizada);
  return atualizada;
}

/** Alterna o favorito e devolve a lista nova. */
export function alternarFavorito(id: string, favoritos: string[]): string[] {
  const atualizada = favoritos.includes(id)
    ? favoritos.filter((f) => f !== id)
    : [...favoritos, id];
  gravar(CHAVE_FAVORITOS, atualizada);
  return atualizada;
}
