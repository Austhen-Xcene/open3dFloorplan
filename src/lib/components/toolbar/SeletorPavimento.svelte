<script lang="ts">
  import type { Floor } from '$lib/models/types';
  import { setActiveFloor } from '$lib/stores/project';

  let { floors, activeFloorId, onAdd, onRemove }: {
    floors: Floor[];
    activeFloorId: string;
    onAdd: () => void;
    onRemove: (id: string) => void;
  } = $props();
</script>

<div class="flex items-center gap-1 max-md:hidden">
  {#each floors as fl}
    <div class="flex items-center rounded transition-colors {fl.id === activeFloorId ? 'bg-white text-slate-800' : 'text-white/80 hover:bg-white/10'}">
      <button
        class="pl-2 pr-1 py-0.5 text-xs {fl.id === activeFloorId ? 'font-semibold' : ''}"
        onclick={() => setActiveFloor(fl.id)}
        title={fl.id === activeFloorId ? 'Pavimento ativo' : 'Ir para este pavimento'}
      >{fl.name}</button>
      {#if floors.length > 1}
        <button
          class="pl-1 pr-1.5 py-0.5 text-xs font-bold opacity-60 hover:opacity-100 hover:text-red-500"
          onclick={() => onRemove(fl.id)}
          title="Excluir {fl.name}"
          aria-label="Excluir {fl.name}"
        >×</button>
      {/if}
    </div>
  {/each}
  <button
    onclick={onAdd}
    class="text-white/80 hover:text-white text-xs hover:bg-white/10 px-1.5 py-0.5 rounded transition-colors"
    title="Adicionar pavimento"
    aria-label="Adicionar pavimento"
  >+</button>
  <span class="text-white/50 text-[10px] ml-1">
    {floors.length} {floors.length === 1 ? 'Pavimento' : 'Pavimentos'}
  </span>
</div>
