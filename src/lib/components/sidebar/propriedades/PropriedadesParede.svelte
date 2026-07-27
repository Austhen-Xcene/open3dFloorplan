<script lang="ts">
  import type { Wall } from '$lib/models/types';
  import type { ProjectSettings } from '$lib/stores/settings';
  import { updateWall } from '$lib/stores/project';
  import { paraExibicao, paraCm, rotuloUnidade, CAMPO, ROTULO } from './unidades';
  import CabecalhoPainel from './CabecalhoPainel.svelte';

  /** Afastamento do ponto de controle ao ligar a curvatura, em cm. */
  const CURVATURA_PADRAO = 60;

  let { parede, unidades }: { parede: Wall; unidades: ProjectSettings['units'] } = $props();

  function alternarCurvatura() {
    if (parede.curvePoint) {
      updateWall(parede.id, { curvePoint: undefined });
      return;
    }
    const mx = (parede.start.x + parede.end.x) / 2;
    const my = (parede.start.y + parede.end.y) / 2;
    const dx = parede.end.x - parede.start.x;
    const dy = parede.end.y - parede.start.y;
    const comprimento = Math.hypot(dx, dy) || 1;
    updateWall(parede.id, {
      curvePoint: {
        x: mx + (-dy / comprimento) * CURVATURA_PADRAO,
        y: my + (dx / comprimento) * CURVATURA_PADRAO,
      },
    });
  }
</script>

<CabecalhoPainel icone="▭" cor="bg-gray-200" titulo="Parede" />

<div class="space-y-3">
  <label class="block">
    <span class={ROTULO}>Espessura ({rotuloUnidade(unidades)})</span>
    <input
      type="number"
      value={paraExibicao(parede.thickness, unidades)}
      oninput={(e) => updateWall(parede.id, { thickness: paraCm(Number(e.currentTarget.value), unidades) })}
      class={CAMPO}
    />
  </label>

  <div class="flex items-center gap-2">
    <span class={ROTULO}>Curva</span>
    <button
      class="px-2 py-0.5 text-xs rounded {parede.curvePoint ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-gray-100 text-gray-500 border border-gray-200'}"
      onclick={alternarCurvatura}
    >{parede.curvePoint ? '◆ Ligada' : '◇ Desligada'}</button>
  </div>
</div>
