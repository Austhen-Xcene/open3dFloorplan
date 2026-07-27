<script lang="ts">
  import type { Stair, StairType } from '$lib/models/types';
  import type { ProjectSettings } from '$lib/stores/settings';
  import { updateStair } from '$lib/stores/project';
  import { paraExibicao, paraCm, rotuloUnidade, CAMPO, ROTULO, BOTAO_OPCAO, BOTAO_ATIVO, BOTAO_INATIVO } from './unidades';
  import CabecalhoPainel from './CabecalhoPainel.svelte';

  const tipos: { valor: StairType; rotulo: string }[] = [
    { valor: 'straight', rotulo: 'Reta' },
    { valor: 'l-shaped', rotulo: 'Em L' },
    { valor: 'u-shaped', rotulo: 'Em U' },
    { valor: 'spiral', rotulo: 'Caracol' },
  ];

  let { escada, unidades }: { escada: Stair; unidades: ProjectSettings['units'] } = $props();
</script>

<CabecalhoPainel icone="🪜" cor="bg-gray-200" titulo="Escada" />

<div class="space-y-3">
  <label class="block">
    <span class={ROTULO}>Tipo</span>
    <select value={escada.stairType || 'straight'} class={CAMPO}
      onchange={(e) => updateStair(escada.id, { stairType: e.currentTarget.value as StairType })}>
      {#each tipos as t}<option value={t.valor}>{t.rotulo}</option>{/each}
    </select>
  </label>

  <label class="block">
    <span class={ROTULO}>Largura ({rotuloUnidade(unidades)})</span>
    <input type="number" class={CAMPO} value={paraExibicao(escada.width, unidades)}
      oninput={(e) => updateStair(escada.id, { width: paraCm(Number(e.currentTarget.value), unidades) })} />
  </label>

  <label class="block">
    <span class={ROTULO}>Profundidade ({rotuloUnidade(unidades)})</span>
    <input type="number" class={CAMPO} value={paraExibicao(escada.depth, unidades)}
      oninput={(e) => updateStair(escada.id, { depth: paraCm(Number(e.currentTarget.value), unidades) })} />
  </label>

  <label class="block">
    <span class={ROTULO}>Degraus</span>
    <input type="number" min="3" max="30" class={CAMPO} value={escada.riserCount}
      oninput={(e) => updateStair(escada.id, { riserCount: Number(e.currentTarget.value) })} />
  </label>

  <label class="block">
    <span class={ROTULO}>Sentido</span>
    <div class="flex gap-2">
      <button onclick={() => updateStair(escada.id, { direction: 'up' })} class="{BOTAO_OPCAO} {escada.direction === 'up' ? BOTAO_ATIVO : BOTAO_INATIVO}">Sobe ↑</button>
      <button onclick={() => updateStair(escada.id, { direction: 'down' })} class="{BOTAO_OPCAO} {escada.direction === 'down' ? BOTAO_ATIVO : BOTAO_INATIVO}">Desce ↓</button>
    </div>
  </label>

  <label class="block">
    <span class={ROTULO}>Rotação (graus)</span>
    <input type="number" class={CAMPO} value={escada.rotation}
      oninput={(e) => updateStair(escada.id, { rotation: Number(e.currentTarget.value) })} />
  </label>
</div>
