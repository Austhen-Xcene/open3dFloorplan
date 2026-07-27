<script lang="ts">
  import type { FurnitureDef } from '$lib/utils/furnitureCatalog';
  import { getThumbnail } from '$lib/utils/catalogThumbnails';

  let { item, selecionado, favorito, compacto = false, busca = '', onEscolher, onAlternarFavorito, onEntrar, onMover, onSair }: {
    item: FurnitureDef;
    selecionado: boolean;
    favorito: boolean;
    compacto?: boolean;
    busca?: string;
    onEscolher: (item: FurnitureDef) => void;
    onAlternarFavorito: (id: string) => void;
    onEntrar: (e: MouseEvent, item: FurnitureDef) => void;
    onMover: (e: MouseEvent) => void;
    onSair: () => void;
  } = $props();

  /** Posição do trecho buscado no nome, para o destaque. Negativa = sem destaque. */
  let inicioDestaque = $derived(
    busca ? item.name.toLowerCase().indexOf(busca.toLowerCase()) : -1,
  );

  const tamanhoImagem = $derived(compacto ? 'w-10 h-10' : 'w-12 h-12');
  const tamanhoVazio = $derived(compacto ? 'w-8 h-8' : 'w-10 h-10');
  const tamanhoMiolo = $derived(compacto ? 'w-4 h-4' : 'w-5 h-5');
</script>

<button
  class="relative flex flex-col items-center gap-1 {compacto ? 'p-2.5' : 'p-3'} rounded-lg border-2 transition-colors cursor-grab active:cursor-grabbing {selecionado ? 'border-blue-400 bg-blue-50 ring-1 ring-blue-300' : 'border-gray-100 hover:border-blue-300 hover:bg-blue-50'}"
  onclick={() => onEscolher(item)}
  draggable="true"
  ondragstart={(e) => {
    e.dataTransfer?.setData('application/o3d-type', 'furniture');
    e.dataTransfer?.setData('application/o3d-id', item.id);
  }}
  onmouseenter={(e) => onEntrar(e, item)}
  onmousemove={onMover}
  onmouseleave={onSair}
>
  <!-- svelte-ignore node_invalid_placement -->
  <span
    role="button"
    tabindex="0"
    class="absolute top-1 right-1 text-[12px] leading-none cursor-pointer {favorito ? 'text-pink-500' : 'text-gray-300 hover:text-pink-400'}"
    onclick={(e: MouseEvent) => { e.stopPropagation(); e.preventDefault(); onAlternarFavorito(item.id); }}
    onkeydown={(e: KeyboardEvent) => { if (e.key === 'Enter') { e.stopPropagation(); onAlternarFavorito(item.id); } }}
    title={favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
  >{favorito ? '♥' : '♡'}</span>

  {#if getThumbnail(item.id)}
    <img src={getThumbnail(item.id)} alt={item.name} class="{tamanhoImagem} object-contain" />
  {:else}
    <div class="{tamanhoVazio} rounded-lg flex items-center justify-center" style="background-color: {item.color}20">
      <div class="{tamanhoMiolo} rounded-sm" style="background-color: {item.color}; opacity: 0.7"></div>
    </div>
  {/if}

  {#if inicioDestaque >= 0}
    <span class="text-xs font-medium text-gray-600">
      {item.name.slice(0, inicioDestaque)}<mark class="bg-yellow-200 text-gray-800 rounded-sm px-0.5">{item.name.slice(inicioDestaque, inicioDestaque + busca.length)}</mark>{item.name.slice(inicioDestaque + busca.length)}
    </span>
  {:else}
    <span class="{compacto ? 'text-[10px] leading-tight text-center' : 'text-xs'} font-medium text-gray-600">{item.name}</span>
  {/if}

  {#if !compacto}
    <span class="text-[10px] text-gray-400">{item.width}×{item.depth}cm</span>
  {/if}
</button>
