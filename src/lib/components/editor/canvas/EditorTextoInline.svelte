<script lang="ts">
  import type { Floor } from '$lib/models/types';
  import { updateTextAnnotation, removeTextAnnotation, selectedElementId } from '$lib/stores/project';

  /** Texto que o canvas cria ao inserir uma anotação nova, antes de o usuário digitar. */
  const TEXTO_PADRAO = 'Text';

  let { id = $bindable(), valor = $bindable(), posicao, pavimento, onEncerrar }: {
    id: string | null;
    valor: string;
    posicao: { x: number; y: number };
    pavimento: Floor | null;
    onEncerrar: () => void;
  } = $props();

  /** Grava o texto digitado; vazio significa remover a anotação. */
  function confirmar() {
    if (!id) return;
    if (valor.trim()) {
      updateTextAnnotation(id, { text: valor });
    } else {
      descartar(id);
    }
    id = null;
    onEncerrar();
  }

  /** Esc numa anotação recém-criada e ainda vazia a remove em vez de deixar "Text" solto. */
  function cancelar() {
    if (!id) return;
    const anotacao = pavimento?.textAnnotations?.find((t) => t.id === id);
    if (anotacao && anotacao.text === TEXTO_PADRAO && !valor.trim()) descartar(id);
    id = null;
    onEncerrar();
  }

  function descartar(alvo: string) {
    removeTextAnnotation(alvo);
    selectedElementId.set(null);
  }
</script>

{#if id}
  <!-- svelte-ignore a11y_autofocus -->
  <input
    type="text"
    class="absolute bg-white border-2 border-blue-500 rounded px-2 py-1 text-sm text-center shadow-lg outline-none"
    style="left: {posicao.x}px; top: {posicao.y}px; transform: translate(-50%, -50%); z-index: 20; min-width: 120px;"
    bind:value={valor}
    onkeydown={(e) => {
      e.stopPropagation();
      if (e.key === 'Enter') confirmar();
      else if (e.key === 'Escape') cancelar();
    }}
    onblur={confirmar}
    autofocus
  />
{/if}
