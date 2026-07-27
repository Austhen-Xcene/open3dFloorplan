<script lang="ts">
  import type { Snippet } from 'svelte';

  let { icone, cor, titulo, acao }: {
    icone: string;
    /** Classe Tailwind literal do fundo do ícone (ex.: 'bg-amber-100'). */
    cor: string;
    titulo: string;
    acao?: Snippet;
  } = $props();
</script>

<h3 class="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
  <span class="w-6 h-6 {cor} rounded flex items-center justify-center text-xs">{icone}</span>
  {titulo}
  {#if acao}{@render acao()}{/if}
</h3>
