<script lang="ts">
  import type { Door, Wall } from '$lib/models/types';
  import type { ProjectSettings } from '$lib/stores/settings';
  import { updateDoor } from '$lib/stores/project';
  import { wallLength } from '$lib/utils/renderizador';
  import { paraExibicao, paraCm, rotuloUnidade, CAMPO, ROTULO, BOTAO_OPCAO, BOTAO_ATIVO, BOTAO_INATIVO } from './unidades';
  import CabecalhoPainel from './CabecalhoPainel.svelte';

  /** A porta nunca encosta na ponta da parede. */
  const POSICAO_MIN = 0.05;
  const POSICAO_MAX = 0.95;

  const tipos: { valor: Door['type']; rotulo: string }[] = [
    { valor: 'single', rotulo: 'Simples' },
    { valor: 'double', rotulo: 'Dupla' },
    { valor: 'sliding', rotulo: 'De correr' },
    { valor: 'french', rotulo: 'Francesa' },
    { valor: 'pocket', rotulo: 'Embutida' },
    { valor: 'bifold', rotulo: 'Camarão' },
    { valor: 'opening', rotulo: 'Vão livre (sem folha)' },
    { valor: 'garage', rotulo: 'Garagem' },
  ];

  let { porta, parede, unidades }: {
    porta: Door;
    parede: Wall | null;
    unidades: ProjectSettings['units'];
  } = $props();

  let comprimento = $derived(parede ? wallLength(parede) : 0);
  let distanciaA = $derived(comprimento ? Math.round(comprimento * porta.position) : 0);
  let distanciaB = $derived(comprimento ? Math.round(comprimento * (1 - porta.position)) : 0);

  /** Reposiciona pela distância digitada até uma das pontas da parede. */
  function moverPor(valor: number, ponta: 'A' | 'B') {
    if (!comprimento) return;
    const bruta = paraCm(valor, unidades) / comprimento;
    const fracao = ponta === 'A' ? bruta : 1 - bruta;
    updateDoor(porta.id, { position: Math.max(POSICAO_MIN, Math.min(POSICAO_MAX, fracao)) });
  }

  let temFolha = $derived(porta.type !== 'opening' && porta.type !== 'garage');
</script>

<CabecalhoPainel icone="🚪" cor="bg-amber-100" titulo="Porta" />

<div class="space-y-3">
  <label class="block">
    <span class={ROTULO}>Largura ({rotuloUnidade(unidades)})</span>
    <input
      type="number" min="1" class={CAMPO}
      value={paraExibicao(porta.width, unidades)}
      oninput={(e) => updateDoor(porta.id, { width: Math.max(1, paraCm(Number(e.currentTarget.value), unidades) || 1) })}
    />
  </label>

  <label class="block">
    <span class={ROTULO}>Distância da ponta A ({rotuloUnidade(unidades)})</span>
    <input type="number" class={CAMPO} value={paraExibicao(distanciaA, unidades)} oninput={(e) => moverPor(Number(e.currentTarget.value), 'A')} />
  </label>

  <label class="block">
    <span class={ROTULO}>Distância da ponta B ({rotuloUnidade(unidades)})</span>
    <input type="number" class={CAMPO} value={paraExibicao(distanciaB, unidades)} oninput={(e) => moverPor(Number(e.currentTarget.value), 'B')} />
  </label>

  <label class="block">
    <span class={ROTULO}>Altura ({rotuloUnidade(unidades)})</span>
    <input
      type="number" class={CAMPO}
      value={paraExibicao(porta.height ?? 210, unidades)}
      oninput={(e) => updateDoor(porta.id, { height: paraCm(Number(e.currentTarget.value), unidades) })}
    />
  </label>

  <label class="block">
    <span class={ROTULO}>Tipo</span>
    <select value={porta.type} class={CAMPO} onchange={(e) => updateDoor(porta.id, { type: e.currentTarget.value as Door['type'] })}>
      {#each tipos as t}<option value={t.valor}>{t.rotulo}</option>{/each}
    </select>
  </label>

  {#if temFolha}
    <label class="block">
      <span class={ROTULO}>Lado da dobradiça</span>
      <div class="flex gap-2">
        <button onclick={() => updateDoor(porta.id, { swingDirection: 'left' })} class="{BOTAO_OPCAO} {porta.swingDirection === 'left' ? BOTAO_ATIVO : BOTAO_INATIVO}">Esquerda</button>
        <button onclick={() => updateDoor(porta.id, { swingDirection: 'right' })} class="{BOTAO_OPCAO} {porta.swingDirection === 'right' ? BOTAO_ATIVO : BOTAO_INATIVO}">Direita</button>
      </div>
    </label>

    <label class="block">
      <span class={ROTULO}>Abre para</span>
      <div class="flex gap-2">
        <button onclick={() => updateDoor(porta.id, { flipSide: false })} class="{BOTAO_OPCAO} {!porta.flipSide ? BOTAO_ATIVO : BOTAO_INATIVO}">Dentro</button>
        <button onclick={() => updateDoor(porta.id, { flipSide: true })} class="{BOTAO_OPCAO} {porta.flipSide ? BOTAO_ATIVO : BOTAO_INATIVO}">Fora</button>
      </div>
    </label>
  {/if}
</div>
