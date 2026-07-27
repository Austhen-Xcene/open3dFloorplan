<script lang="ts">
  import { selectedTool, placingFurnitureId } from '$lib/stores/project';
  import AbaAberturas from './build/AbaAberturas.svelte';
  import AbaAmbientes from './build/AbaAmbientes.svelte';
  import AbaObjetos from './build/AbaObjetos.svelte';

  type Aba = 'aberturas' | 'ambientes' | 'objetos';

  const abas: { id: Aba; rotulo: string }[] = [
    { id: 'aberturas', rotulo: 'Construir' },
    { id: 'ambientes', rotulo: 'Ambientes' },
    { id: 'objetos', rotulo: 'Objetos' },
  ];

  let abaAtiva = $state<Aba>('ambientes');

  let ferramentaAtual = $state<string>('select');
  selectedTool.subscribe((t) => { ferramentaAtual = t; });

  let emColocacao = $state<string | null>(null);
  placingFurnitureId.subscribe((id) => { emColocacao = id; });
</script>

<div class="w-64 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
  <div class="flex border-b border-gray-200">
    {#each abas as aba}
      <button
        class="flex-1 py-2.5 text-xs font-semibold uppercase tracking-wide {abaAtiva === aba.id ? 'text-slate-800 border-b-2 border-blue-500 bg-blue-50' : 'text-gray-500 hover:text-gray-700'}"
        onclick={() => abaAtiva = aba.id}
      >{aba.rotulo}</button>
    {/each}
  </div>

  <div class="flex-1 overflow-y-auto p-3">
    {#if abaAtiva === 'aberturas'}
      <AbaAberturas {ferramentaAtual} />
    {:else if abaAtiva === 'ambientes'}
      <AbaAmbientes />
    {:else}
      <AbaObjetos {emColocacao} />
    {/if}
  </div>
</div>
