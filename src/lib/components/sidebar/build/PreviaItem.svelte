<script lang="ts">
  import type { FurnitureDef } from '$lib/utils/furnitureCatalog';
  import { getThumbnail } from '$lib/utils/catalogThumbnails';
  import { coresPorCategoria, COR_CATEGORIA_PADRAO } from './coresCategoria';

  let { item, posicao }: { item: FurnitureDef; posicao: { x: number; y: number } } = $props();
</script>

<div class="fixed z-50 pointer-events-none" style="left: {posicao.x}px; top: {posicao.y}px;">
  <div class="bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden" style="width: 220px;">
    <div class="w-full h-[120px] bg-gray-50 flex items-center justify-center p-3">
      {#if getThumbnail(item.id)}
        <img src={getThumbnail(item.id)} alt={item.name} class="max-w-full max-h-full object-contain" />
      {:else}
        <div class="w-16 h-16 rounded-xl flex items-center justify-center" style="background-color: {item.color}20">
          <div class="w-10 h-10 rounded-md" style="background-color: {item.color}; opacity: 0.7"></div>
        </div>
      {/if}
    </div>
    <div class="p-3 space-y-1.5">
      <div class="flex items-center gap-2">
        <span class="text-sm font-semibold text-gray-800">{item.name}</span>
        <span
          class="px-1.5 py-0.5 rounded-full text-[9px] font-semibold text-white"
          style="background-color: {coresPorCategoria[item.category] ?? COR_CATEGORIA_PADRAO}"
        >{item.category}</span>
      </div>
      <div class="text-xs text-gray-500">
        {item.width} × {item.depth} × {item.height} cm
      </div>
    </div>
  </div>
</div>
