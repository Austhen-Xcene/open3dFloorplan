<script lang="ts">
  import type { Floor } from '$lib/models/types';
  import { setActiveFloor, canvasZoom, panMode } from '$lib/stores/project';

  let { floors, activeFloorId, onAdd, onRemove, onAbrirAreas }: {
    floors: Floor[];
    activeFloorId: string;
    onAdd: () => void;
    onRemove: (id: string) => void;
    onAbrirAreas: () => void;
  } = $props();

  const ZOOM_MIN = 0.1;
  const ZOOM_MAX = 10;
  const ZOOM_PASSO = 1.25;

  let aberto = $state(false);
  let raiz: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (!aberto) return;
    const foraDoMenu = (e: MouseEvent) => {
      if (raiz && !raiz.contains(e.target as Node)) aberto = false;
    };
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') aberto = false; };
    document.addEventListener('click', foraDoMenu, true);
    document.addEventListener('keydown', aoTeclar, true);
    return () => {
      document.removeEventListener('click', foraDoMenu, true);
      document.removeEventListener('keydown', aoTeclar, true);
    };
  });

  const ITEM = 'w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left';
  const TITULO = 'px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400';
</script>

<!-- Só no celular: ações secundárias que não cabem na barra condensada. -->
<div class="relative md:hidden" bind:this={raiz}>
  <button
    onclick={() => aberto = !aberto}
    class="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
    title="Mais ações"
    aria-label="Mais ações"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
  </button>

  {#if aberto}
    <div class="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-56 z-50 max-h-[70vh] overflow-y-auto">
      <div class={TITULO}>Pavimentos</div>
      {#each floors as fl}
        <div class="flex items-center hover:bg-gray-100 {fl.id === activeFloorId ? 'text-blue-600 font-semibold' : 'text-gray-700'}">
          <button class="flex-1 px-3 py-2 text-sm text-left" onclick={() => { setActiveFloor(fl.id); aberto = false; }}>
            {fl.name}{fl.id === activeFloorId ? ' ✓' : ''}
          </button>
          {#if floors.length > 1}
            <button
              class="px-3 py-2 text-base text-gray-400 hover:text-red-600"
              onclick={() => onRemove(fl.id)}
              title="Excluir {fl.name}"
              aria-label="Excluir {fl.name}"
            >×</button>
          {/if}
        </div>
      {/each}
      <button class={ITEM} onclick={onAdd}>+ Adicionar pavimento</button>

      <div class="h-px bg-gray-100 my-1"></div>
      <div class={TITULO}>Visualização</div>
      <button class={ITEM} onclick={() => canvasZoom.update(z => Math.min(ZOOM_MAX, z * ZOOM_PASSO))}>Aproximar</button>
      <button class={ITEM} onclick={() => canvasZoom.update(z => Math.max(ZOOM_MIN, z / ZOOM_PASSO))}>Afastar</button>
      <button class={ITEM} onclick={() => canvasZoom.set(1)}>Voltar para 100% ({Math.round($canvasZoom * 100)}%)</button>
      <button class={ITEM} onclick={() => panMode.update(v => !v)}>{$panMode ? '✓ ' : ''}Modo mão</button>

      <div class="h-px bg-gray-100 my-1"></div>
      <button class={ITEM} onclick={() => { onAbrirAreas(); aberto = false; }}>Resumo de áreas</button>
    </div>
  {/if}
</div>
