<script lang="ts">
  import type { Window as Win, Wall } from '$lib/models/types';
  import type { ProjectSettings } from '$lib/stores/settings';
  import { updateWindow } from '$lib/stores/project';
  import { wallLength } from '$lib/utils/renderizador';
  import { paraExibicao, paraCm, rotuloUnidade, CAMPO, ROTULO } from './unidades';
  import CabecalhoPainel from './CabecalhoPainel.svelte';

  /** A janela nunca encosta na ponta da parede. */
  const POSICAO_MIN = 0.05;
  const POSICAO_MAX = 0.95;

  const tipos: { valor: Win['type']; rotulo: string }[] = [
    { valor: 'standard', rotulo: 'Padrão' },
    { valor: 'fixed', rotulo: 'Fixa' },
    { valor: 'casement', rotulo: 'Maxim-ar' },
    { valor: 'sliding', rotulo: 'De correr' },
    { valor: 'bay', rotulo: 'Sacada' },
  ];

  let { janela, parede, unidades }: {
    janela: Win;
    parede: Wall | null;
    unidades: ProjectSettings['units'];
  } = $props();

  let comprimento = $derived(parede ? wallLength(parede) : 0);
  let distanciaA = $derived(comprimento ? Math.round(comprimento * janela.position) : 0);
  let distanciaB = $derived(comprimento ? Math.round(comprimento * (1 - janela.position)) : 0);

  function moverPor(valor: number, ponta: 'A' | 'B') {
    if (!comprimento) return;
    const bruta = paraCm(valor, unidades) / comprimento;
    const fracao = ponta === 'A' ? bruta : 1 - bruta;
    updateWindow(janela.id, { position: Math.max(POSICAO_MIN, Math.min(POSICAO_MAX, fracao)) });
  }
</script>

<CabecalhoPainel icone="🪟" cor="bg-cyan-100" titulo="Janela" />

<div class="space-y-3">
  <label class="block">
    <span class={ROTULO}>Tipo</span>
    <select value={janela.type ?? 'standard'} class={CAMPO} onchange={(e) => updateWindow(janela.id, { type: e.currentTarget.value as Win['type'] })}>
      {#each tipos as t}<option value={t.valor}>{t.rotulo}</option>{/each}
    </select>
  </label>

  <label class="block">
    <span class={ROTULO}>Largura ({rotuloUnidade(unidades)})</span>
    <input
      type="number" min="1" class={CAMPO}
      value={paraExibicao(janela.width, unidades)}
      oninput={(e) => updateWindow(janela.id, { width: Math.max(1, paraCm(Number(e.currentTarget.value), unidades) || 1) })}
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
      value={paraExibicao(janela.height, unidades)}
      oninput={(e) => updateWindow(janela.id, { height: paraCm(Number(e.currentTarget.value), unidades) })}
    />
  </label>

  <label class="block">
    <span class={ROTULO}>Altura do peitoril ({rotuloUnidade(unidades)})</span>
    <input
      type="number" class={CAMPO}
      value={paraExibicao(janela.sillHeight, unidades)}
      oninput={(e) => updateWindow(janela.id, { sillHeight: paraCm(Number(e.currentTarget.value), unidades) })}
    />
  </label>
</div>
