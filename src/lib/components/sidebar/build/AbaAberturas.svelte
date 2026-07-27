<script lang="ts">
  import type { Door, Window as Win } from '$lib/models/types';
  import { selectedTool, placingFurnitureId, placingDoorType, placingWindowType } from '$lib/stores/project';

  const portas: { type: Door['type']; name: string; desc: string; icon: string }[] = [
    { type: 'single', name: 'Simples', desc: 'giro 90 cm', icon: 'M6 3h12v18H6z' },
    { type: 'double', name: 'Dupla', desc: 'giro 150 cm', icon: 'M3 3h8v18H3zM13 3h8v18h-8z' },
    { type: 'sliding', name: 'Correr', desc: '180 cm', icon: 'M3 6h18v12H3z' },
    { type: 'french', name: 'Francesa', desc: 'vidro 150 cm', icon: 'M3 3h8v18H3zM13 3h8v18h-8z' },
    { type: 'pocket', name: 'Embutida', desc: '90 cm', icon: 'M6 3h12v18H6z' },
    { type: 'bifold', name: 'Camarão', desc: '180 cm', icon: 'M3 3h5v18H3zM9 3h6v18H9zM16 3h5v18h-5z' },
    { type: 'opening', name: 'Vão livre', desc: '100 cm', icon: 'M6 3h2v18H6zM16 3h2v18h-2z' },
    { type: 'garage', name: 'Garagem', desc: 'basculante 240 cm', icon: 'M3 5h18v14H3zM5 9h14M5 13h14M5 17h14' },
  ];

  const janelas: { type: Win['type']; name: string; desc: string }[] = [
    { type: 'standard', name: 'Padrão', desc: '120×120 cm' },
    { type: 'fixed', name: 'Fixa', desc: '100×100 cm' },
    { type: 'casement', name: 'Maxim-ar', desc: '80×130 cm' },
    { type: 'sliding', name: 'Correr', desc: '180×120 cm' },
    { type: 'bay', name: 'Sacada', desc: '200×150 cm' },
  ];

  let { ferramentaAtual }: { ferramentaAtual: string } = $props();

  let aberto = $state(true);
  let portaSelecionada = $state<Door['type']>('single');
  let janelaSelecionada = $state<Win['type']>('standard');

  function escolherPorta(tipo: Door['type']) {
    portaSelecionada = tipo;
    placingDoorType.set(tipo);
    placingFurnitureId.set(null);
    selectedTool.set('door');
  }

  function escolherJanela(tipo: Win['type']) {
    janelaSelecionada = tipo;
    placingWindowType.set(tipo);
    placingFurnitureId.set(null);
    selectedTool.set('window');
  }

  const CARTAO = 'flex flex-col items-center gap-1 p-2.5 rounded-lg border-2 transition-colors cursor-grab active:cursor-grabbing';

  function arrastar(e: DragEvent, tipo: string, id: string) {
    e.dataTransfer?.setData('application/o3d-type', tipo);
    e.dataTransfer?.setData('application/o3d-id', id);
  }
</script>

<div class="space-y-1">
  <button class="w-full flex items-center justify-between px-1 py-2" onclick={() => aberto = !aberto}>
    <h3 class="text-xs font-semibold text-gray-400 uppercase">Portas</h3>
    <span class="text-gray-400 text-xs">{aberto ? '▼' : '▶'}</span>
  </button>

  {#if aberto}
    <div class="grid grid-cols-2 gap-2 mb-3">
      {#each portas as p}
        <button
          class="{CARTAO} {ferramentaAtual === 'door' && portaSelecionada === p.type ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}"
          onclick={() => escolherPorta(p.type)}
          draggable="true"
          ondragstart={(e) => arrastar(e, 'door', p.type)}
        >
          <div class="w-9 h-9 rounded-lg bg-amber-50 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d={p.icon}/></svg>
          </div>
          <span class="text-xs font-medium text-gray-600">{p.name}</span>
          <span class="text-[10px] text-gray-400">{p.desc}</span>
        </button>
      {/each}
    </div>

    <h3 class="text-xs font-semibold text-gray-400 uppercase mb-2">Janelas</h3>
    <div class="grid grid-cols-2 gap-2">
      {#each janelas as j}
        <button
          class="{CARTAO} {ferramentaAtual === 'window' && janelaSelecionada === j.type ? 'border-blue-400 bg-blue-50' : 'border-gray-100 hover:border-gray-200'}"
          onclick={() => escolherJanela(j.type)}
          draggable="true"
          ondragstart={(e) => arrastar(e, 'window', j.type)}
        >
          <div class="w-9 h-9 rounded-lg bg-cyan-50 flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0e7490" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="1"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="3" y1="12" x2="21" y2="12"/></svg>
          </div>
          <span class="text-xs font-medium text-gray-600">{j.name}</span>
          <span class="text-[10px] text-gray-400">{j.desc}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
