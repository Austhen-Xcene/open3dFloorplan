<script lang="ts">
  import { gruposAtalhos, atalhosComoTexto } from '$lib/utils/atalhosTeclado';

  let { visible = $bindable(false) }: { visible?: boolean } = $props();

  const esquerda = gruposAtalhos.filter((g) => g.coluna === 'esquerda');
  const direita = gruposAtalhos.filter((g) => g.coluna === 'direita');

  const KBD = 'px-1.5 py-0.5 bg-gray-100 rounded text-xs font-mono text-slate-700 border border-gray-200';
</script>

{#snippet grupo(g: (typeof gruposAtalhos)[number])}
  <div class="flex items-center gap-2 mb-2">
    <span class="text-xs font-bold uppercase tracking-wider {g.corTitulo}">{g.titulo}</span>
    <div class="flex-1 h-px {g.corLinha}"></div>
  </div>
  <div class="space-y-1.5 mb-5">
    {#each g.atalhos as a}
      <div class="flex justify-between gap-3">
        <span class="text-gray-600">{a.acao}</span>
        <kbd class={KBD}>{a.tecla}</kbd>
      </div>
    {/each}
  </div>
{/snippet}

{#if visible}
  <div
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
    onclick={() => visible = false}
    onkeydown={(e) => { if (e.key === 'Escape') visible = false; }}
    role="dialog"
    tabindex="-1"
    aria-label="Atalhos de teclado"
  >
    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
    <div
      class="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[85vh] flex flex-col"
      onclick={(e) => e.stopPropagation()}
      onkeydown={(e) => e.stopPropagation()}
      role="document"
    >
      <div class="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
        <div class="flex items-center gap-2">
          <svg class="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"/></svg>
          <h2 class="text-lg font-bold text-slate-800">Atalhos de teclado</h2>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-colors flex items-center gap-1.5"
            onclick={() => navigator.clipboard.writeText(atalhosComoTexto())}
            aria-label="Copiar todos os atalhos"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/></svg>
            Copiar tudo
          </button>
          <button class="text-gray-400 hover:text-gray-600 text-xl leading-none" onclick={() => visible = false} aria-label="Fechar atalhos">✕</button>
        </div>
      </div>

      <div class="overflow-y-auto px-6 py-4">
        <div class="grid grid-cols-2 gap-x-8 gap-y-0 text-sm">
          <div>{#each esquerda as g}{@render grupo(g)}{/each}</div>
          <div>{#each direita as g}{@render grupo(g)}{/each}</div>
        </div>
      </div>

      <div class="px-6 py-3 border-t border-gray-100 text-center">
        <p class="text-xs text-gray-400">
          Pressione <kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono border border-gray-200">?</kbd>
          ou <kbd class="px-1 py-0.5 bg-gray-100 rounded text-xs font-mono border border-gray-200">Esc</kbd> para fechar
        </p>
      </div>
    </div>
  </div>
{/if}
