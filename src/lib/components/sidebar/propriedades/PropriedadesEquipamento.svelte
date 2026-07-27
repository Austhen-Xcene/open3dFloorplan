<script lang="ts">
  import type { FurnitureItem } from '$lib/models/types';
  import type { ProjectSettings } from '$lib/stores/settings';
  import { updateFurniture, toggleFurnitureLock } from '$lib/stores/project';
  import { getCatalogItem } from '$lib/utils/furnitureCatalog';
  import { paraExibicao, paraCm, rotuloUnidade, CAMPO, ROTULO } from './unidades';
  import CabecalhoPainel from './CabecalhoPainel.svelte';

  const CORES = ['#ffffff', '#f5f5dc', '#d2b48c', '#daa520', '#8b4513', '#696969', '#191970', '#000000', '#dc143c', '#228b22'];
  const MATERIAIS = ['Madeira', 'Metal', 'Tecido', 'Couro', 'Vidro', 'Plástico', 'Pedra', 'Cerâmica'];

  let { item, unidades }: { item: FurnitureItem; unidades: ProjectSettings['units'] } = $props();

  let definicao = $derived(getCatalogItem(item.catalogId));
  let corAtual = $derived(item.color ?? definicao?.color ?? '#888888');

  /** Grava uma medida em cm, nunca abaixo de 1. */
  function medida(campo: 'width' | 'depth' | 'height', valor: number) {
    updateFurniture(item.id, { [campo]: Math.max(1, paraCm(valor, unidades) || 1) });
  }

  function girar(graus: number) {
    updateFurniture(item.id, { rotation: item.rotation + graus });
  }

  function espelhar(eixo: 'x' | 'y') {
    const s = item.scale;
    updateFurniture(item.id, { scale: { ...s, [eixo]: s[eixo] * -1 } });
  }

  function restaurarPadroes() {
    updateFurniture(item.id, {
      color: undefined, width: undefined, depth: undefined, height: undefined, material: undefined,
    });
  }

  const BOTAO = 'flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm hover:bg-gray-50 transition-colors';
</script>

<CabecalhoPainel icone={definicao?.icon ?? '🪑'} cor="bg-purple-100" titulo={definicao?.name ?? 'Equipamento'}>
  {#snippet acao()}
    <button
      onclick={() => toggleFurnitureLock(item.id)}
      class="ml-auto px-1.5 py-0.5 rounded text-xs border transition-colors {item.locked ? 'bg-amber-100 border-amber-400 text-amber-700' : 'border-gray-200 hover:bg-gray-50 text-gray-500'}"
      title={item.locked ? 'Destravar (Ctrl+L)' : 'Travar (Ctrl+L)'}
    >{item.locked ? '🔒 Travado' : '🔓'}</button>
  {/snippet}
</CabecalhoPainel>

<div class="space-y-3">
  <div>
    <span class="{ROTULO} block mb-2">Cor</span>
    <div class="grid grid-cols-5 gap-1.5 mb-2">
      {#each CORES as cor}
        <button
          class="w-6 h-6 rounded border-2 hover:border-gray-300 transition-colors {corAtual === cor ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'}"
          style="background-color: {cor}"
          title={cor}
          aria-label="Cor {cor}"
          onclick={() => updateFurniture(item.id, { color: cor })}
        ></button>
      {/each}
    </div>
    <div class="flex items-center gap-2">
      <span class={ROTULO}>Personalizada:</span>
      <input
        type="color" value={corAtual}
        oninput={(e) => updateFurniture(item.id, { color: e.currentTarget.value })}
        class="w-8 h-6 rounded border border-gray-200 cursor-pointer"
        aria-label="Cor personalizada"
      />
    </div>
  </div>

  <label class="block">
    <span class={ROTULO}>Largura ({rotuloUnidade(unidades)})</span>
    <input type="number" min="1" class={CAMPO}
      value={paraExibicao(item.width ?? definicao?.width ?? 100, unidades)}
      oninput={(e) => medida('width', Number(e.currentTarget.value))} />
  </label>

  <label class="block">
    <span class={ROTULO}>Profundidade ({rotuloUnidade(unidades)})</span>
    <input type="number" min="1" class={CAMPO}
      value={paraExibicao(item.depth ?? definicao?.depth ?? 80, unidades)}
      oninput={(e) => medida('depth', Number(e.currentTarget.value))} />
  </label>

  <label class="block">
    <span class={ROTULO}>Altura ({rotuloUnidade(unidades)})</span>
    <input type="number" min="1" class={CAMPO}
      value={paraExibicao(item.height ?? definicao?.height ?? 80, unidades)}
      oninput={(e) => medida('height', Number(e.currentTarget.value))} />
  </label>

  <label class="block">
    <span class={ROTULO}>Material</span>
    <select value={item.material ?? MATERIAIS[0]} class={CAMPO}
      onchange={(e) => updateFurniture(item.id, { material: e.currentTarget.value })}>
      {#each MATERIAIS as m}<option value={m}>{m}</option>{/each}
    </select>
  </label>

  <label class="block">
    <span class={ROTULO}>Rotação (graus)</span>
    <input type="number" class={CAMPO}
      value={Math.round(item.rotation * 100) / 100}
      oninput={(e) => updateFurniture(item.id, { rotation: Number(e.currentTarget.value) })} />
  </label>

  <div class="flex gap-1">
    <button onclick={() => girar(-90)} class={BOTAO} title="Girar 90° à esquerda">↺ 90°</button>
    <button onclick={() => girar(90)} class={BOTAO} title="Girar 90° à direita">↻ 90°</button>
  </div>

  <div class="flex gap-1">
    <button onclick={() => espelhar('x')} class={BOTAO} title="Espelhar na horizontal">↔ Espelhar</button>
    <button onclick={() => espelhar('y')} class={BOTAO} title="Espelhar na vertical">↕ Espelhar</button>
  </div>

  <button
    onclick={restaurarPadroes}
    class="w-full px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-600 hover:bg-gray-50 transition-colors"
  >Restaurar padrões do catálogo</button>
</div>
