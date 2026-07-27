<script lang="ts">
  import type { Column } from '$lib/models/types';
  import type { ProjectSettings } from '$lib/stores/settings';
  import { updateColumn } from '$lib/stores/project';
  import { paraExibicao, paraCm, rotuloUnidade, CAMPO, ROTULO, BOTAO_OPCAO, BOTAO_ATIVO, BOTAO_INATIVO } from './unidades';
  import CabecalhoPainel from './CabecalhoPainel.svelte';

  const CORES = [
    { nome: 'Branco', cor: '#ffffff' },
    { nome: 'Cinza claro', cor: '#d1d5db' },
    { nome: 'Concreto', cor: '#999999' },
    { nome: 'Grafite', cor: '#374151' },
    { nome: 'Preto', cor: '#000000' },
    { nome: 'Creme', cor: '#fffdd0' },
    { nome: 'Madeira', cor: '#8B6914' },
    { nome: 'Bronze', cor: '#cd7f32' },
    { nome: 'Prata', cor: '#c0c0c0' },
    { nome: 'Azul-marinho', cor: '#1e3a8a' },
  ];

  let { coluna, unidades }: { coluna: Column; unidades: ProjectSettings['units'] } = $props();
</script>

<CabecalhoPainel icone="🏛️" cor="bg-gray-200" titulo="Coluna" />

<div class="space-y-3">
  <label class="block">
    <span class={ROTULO}>Formato</span>
    <div class="flex gap-2">
      <button onclick={() => updateColumn(coluna.id, { shape: 'round' })} class="{BOTAO_OPCAO} {coluna.shape === 'round' ? BOTAO_ATIVO : BOTAO_INATIVO}">⭕ Redonda</button>
      <button onclick={() => updateColumn(coluna.id, { shape: 'square' })} class="{BOTAO_OPCAO} {coluna.shape === 'square' ? BOTAO_ATIVO : BOTAO_INATIVO}">⬜ Quadrada</button>
    </div>
  </label>

  <label class="block">
    <span class={ROTULO}>{coluna.shape === 'round' ? 'Diâmetro' : 'Lado'} ({rotuloUnidade(unidades)})</span>
    <input type="number" min="10" max="200" class={CAMPO} value={paraExibicao(coluna.diameter, unidades)}
      oninput={(e) => updateColumn(coluna.id, { diameter: paraCm(Number(e.currentTarget.value), unidades) })} />
  </label>

  <label class="block">
    <span class={ROTULO}>Altura ({rotuloUnidade(unidades)})</span>
    <input type="number" min="50" max="1000" class={CAMPO} value={paraExibicao(coluna.height, unidades)}
      oninput={(e) => updateColumn(coluna.id, { height: paraCm(Number(e.currentTarget.value), unidades) })} />
  </label>

  <div>
    <span class="{ROTULO} mb-1.5 block">Cor</span>
    <div class="grid grid-cols-5 gap-1.5 mb-2">
      {#each CORES as preset}
        <button
          class="w-7 h-7 rounded-md border-2 hover:border-gray-300 transition-colors {coluna.color === preset.cor ? 'border-blue-500 ring-1 ring-blue-200' : 'border-gray-200'}"
          style="background-color: {preset.cor}"
          title={preset.nome}
          aria-label={preset.nome}
          onclick={() => updateColumn(coluna.id, { color: preset.cor })}
        ></button>
      {/each}
    </div>
    <div class="flex items-center gap-2">
      <span class={ROTULO}>Personalizada:</span>
      <input type="color" value={coluna.color} class="w-8 h-6 rounded border border-gray-200 cursor-pointer"
        aria-label="Cor personalizada"
        oninput={(e) => updateColumn(coluna.id, { color: e.currentTarget.value })} />
    </div>
  </div>

  {#if coluna.shape === 'square'}
    <label class="block">
      <span class={ROTULO}>Rotação (graus)</span>
      <input type="number" class={CAMPO} value={coluna.rotation}
        oninput={(e) => updateColumn(coluna.id, { rotation: Number(e.currentTarget.value) })} />
    </label>
  {/if}
</div>
