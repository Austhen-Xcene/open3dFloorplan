<script lang="ts">
  import { selectedTool, placingFurnitureId } from '$lib/stores/project';
  import { furnitureCatalog, furnitureCategories } from '$lib/utils/furnitureCatalog';
  import type { FurnitureDef } from '$lib/utils/furnitureCatalog';
  import { lerRecentes, lerFavoritos, registrarUso, alternarFavorito } from '$lib/utils/preferenciasCatalogo';
  import { coresPorCategoria } from './coresCategoria';
  import CartaoCatalogo from './CartaoCatalogo.svelte';
  import PreviaItem from './PreviaItem.svelte';

  /** Atraso antes de abrir a prévia flutuante, para não piscar ao passar o mouse. */
  const ATRASO_PREVIA = 300;

  let { emColocacao }: { emColocacao: string | null } = $props();

  let busca = $state('');
  let categoria = $state('Todos');
  let recentes = $state<string[]>(lerRecentes());
  let favoritos = $state<string[]>(lerFavoritos());

  let itensRecentes = $derived(
    recentes.map((id) => furnitureCatalog.find((f) => f.id === id)).filter(Boolean) as FurnitureDef[],
  );
  let itensFavoritos = $derived(
    favoritos.map((id) => furnitureCatalog.find((f) => f.id === id)).filter(Boolean) as FurnitureDef[],
  );

  let filtrados = $derived.by(() => {
    const termo = busca.toLowerCase();
    const base = categoria === 'Favoritos'
      ? itensFavoritos
      : furnitureCatalog.filter((f) => categoria === 'Todos' || f.category === categoria);
    return termo ? base.filter((f) => f.name.toLowerCase().includes(termo)) : base;
  });

  let mostrarRecentes = $derived(!busca && categoria === 'Todos' && itensRecentes.length > 0);

  function escolher(item: FurnitureDef) {
    selectedTool.set('furniture');
    placingFurnitureId.set(item.id);
    recentes = registrarUso(item.id, recentes);
  }

  const favoritar = (id: string) => { favoritos = alternarFavorito(id, favoritos); };

  // ── Prévia flutuante ──
  let itemSobMouse = $state<FurnitureDef | null>(null);
  let mostrarPrevia = $state(false);
  let posicaoPrevia = $state({ x: 0, y: 0 });
  let temporizador: ReturnType<typeof setTimeout> | null = null;

  function aoEntrar(e: MouseEvent, item: FurnitureDef) {
    if (temporizador) clearTimeout(temporizador);
    itemSobMouse = item;
    aoMover(e);
    temporizador = setTimeout(() => { mostrarPrevia = true; }, ATRASO_PREVIA);
  }

  function aoMover(e: MouseEvent) {
    const larguraBarra = 256; // w-64
    const larguraPrevia = 220;
    const cabeAoLado = larguraBarra + larguraPrevia + 8 < window.innerWidth;
    posicaoPrevia = {
      x: cabeAoLado ? larguraBarra + 8 : -larguraPrevia - 8,
      y: Math.min(Math.max(e.clientY - 40, 8), window.innerHeight - 200),
    };
  }

  function aoSair() {
    if (temporizador) clearTimeout(temporizador);
    temporizador = null;
    mostrarPrevia = false;
    itemSobMouse = null;
  }

  const PILULA = 'px-2 py-0.5 rounded-full text-[10px] font-medium';
</script>

<div class="space-y-2">
  <div class="relative">
    <input
      type="text"
      placeholder="Buscar no catálogo…"
      class="w-full px-3 py-2 pr-8 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-200 focus:border-blue-400 outline-none"
      bind:value={busca}
    />
    {#if busca}
      <button
        class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 w-5 h-5 flex items-center justify-center rounded-full hover:bg-gray-100"
        onclick={() => busca = ''}
        title="Limpar busca"
        aria-label="Limpar busca"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    {/if}
  </div>

  {#if busca}
    <div class="text-[10px] text-gray-400 px-1">
      {filtrados.length} {filtrados.length === 1 ? 'resultado' : 'resultados'} para "{busca}"
    </div>
  {/if}

  <div class="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
    <button
      class="{PILULA} {categoria === 'Todos' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
      onclick={() => categoria = 'Todos'}
    >Todos</button>
    <button
      class="{PILULA} {categoria === 'Favoritos' ? 'bg-pink-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}"
      onclick={() => categoria = 'Favoritos'}
    >♥ Favoritos{favoritos.length ? ` (${favoritos.length})` : ''}</button>
    {#each furnitureCategories as cat}
      <button
        class="{PILULA} {categoria === cat ? 'text-white' : 'text-gray-600 hover:bg-gray-200'}"
        style={categoria === cat ? `background-color: ${coresPorCategoria[cat] ?? '#6b7280'}` : 'background-color: #f3f4f6'}
        onclick={() => categoria = cat}
      >{cat}</button>
    {/each}
  </div>

  {#if mostrarRecentes}
    <div class="mt-1">
      <h4 class="text-[10px] font-semibold text-gray-400 uppercase mb-1.5">Recentes</h4>
      <div class="grid grid-cols-2 gap-2">
        {#each itensRecentes as item}
          <CartaoCatalogo
            {item}
            compacto
            selecionado={emColocacao === item.id}
            favorito={favoritos.includes(item.id)}
            onEscolher={escolher}
            onAlternarFavorito={favoritar}
            onEntrar={aoEntrar}
            onMover={aoMover}
            onSair={aoSair}
          />
        {/each}
      </div>
    </div>
    <hr class="border-gray-100" />
  {/if}

  <div class="grid grid-cols-2 gap-2 mt-2">
    {#each filtrados as item}
      <CartaoCatalogo
        {item}
        {busca}
        selecionado={emColocacao === item.id}
        favorito={favoritos.includes(item.id)}
        onEscolher={escolher}
        onAlternarFavorito={favoritar}
        onEntrar={aoEntrar}
        onMover={aoMover}
        onSair={aoSair}
      />
    {/each}
  </div>
</div>

{#if mostrarPrevia && itemSobMouse}
  <PreviaItem item={itemSobMouse} posicao={posicaoPrevia} />
{/if}
