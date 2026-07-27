<script lang="ts">
  import type { Floor, Room, Wall } from '$lib/models/types';
  import type { ProjectSettings } from '$lib/stores/settings';
  import { formatArea } from '$lib/stores/settings';
  import { updateRoom, updateRectangularRoom, detectedRoomsStore } from '$lib/stores/project';
  import { dimensaoParaExibicao, dimensaoParaCm, rotuloDimensao, CAMPO, ROTULO } from './unidades';
  import CabecalhoPainel from './CabecalhoPainel.svelte';

  /** Limites de redimensionamento, em cm. */
  const MIN_CM = 50;
  const MAX_CM = 5000;

  let { ambiente, pavimento, unidades }: {
    ambiente: Room;
    pavimento: Floor | null;
    unidades: ProjectSettings['units'];
  } = $props();

  let erro = $state('');

  /** Só ambientes retangulares (4 paredes) podem ser redimensionados pelo painel. */
  let dimensoes = $derived.by(() => {
    if (!pavimento || ambiente.walls.length !== 4) return null;
    const paredes = ambiente.walls
      .map((id) => pavimento.walls.find((w) => w.id === id))
      .filter((w): w is Wall => !!w);
    if (paredes.length !== 4) return null;
    const pontos = paredes.flatMap((w) => [w.start, w.end]);
    const xs = pontos.map((p) => p.x);
    const ys = pontos.map((p) => p.y);
    return { width: Math.max(...xs) - Math.min(...xs), length: Math.max(...ys) - Math.min(...ys) };
  });

  function renomear(nome: string) {
    updateRoom(ambiente.id, { name: nome });
    detectedRoomsStore.update((rooms) => rooms.map((r) => (r.id === ambiente.id ? { ...r, name: nome } : r)));
  }

  function redimensionar(valor: number, eixo: 'width' | 'length') {
    const atuais = dimensoes;
    const cm = dimensaoParaCm(valor, unidades);
    if (!atuais || !Number.isFinite(cm) || cm < MIN_CM || cm > MAX_CM) {
      erro = 'Use medidas entre 0,50 m e 50 m.';
      return;
    }
    const largura = eixo === 'width' ? cm : atuais.width;
    const comprimento = eixo === 'length' ? cm : atuais.length;
    if (!updateRectangularRoom(ambiente.id, ambiente.name, largura, comprimento)) {
      erro = 'Este ambiente não pode ser redimensionado.';
      return;
    }
    erro = '';
  }

  let imperial = $derived(unidades === 'imperial');
</script>

<CabecalhoPainel icone="⬜" cor="bg-green-100" titulo="Ambiente" />

<div class="space-y-3">
  <label class="block">
    <span class={ROTULO}>Nome do ambiente</span>
    <input type="text" class={CAMPO} value={ambiente.name} oninput={(e) => renomear(e.currentTarget.value)} />
  </label>

  {#if dimensoes}
    <div class="grid grid-cols-2 gap-2">
      <label class="block">
        <span class={ROTULO}>Largura ({rotuloDimensao(unidades)})</span>
        <input
          type="number" class={CAMPO}
          value={dimensaoParaExibicao(dimensoes.width, unidades)}
          min={imperial ? 19.7 : 0.5}
          max={imperial ? 1968.5 : 50}
          step={imperial ? 1 : 0.1}
          onchange={(e) => redimensionar(Number(e.currentTarget.value), 'width')}
        />
      </label>
      <label class="block">
        <span class={ROTULO}>Comprimento ({rotuloDimensao(unidades)})</span>
        <input
          type="number" class={CAMPO}
          value={dimensaoParaExibicao(dimensoes.length, unidades)}
          min={imperial ? 19.7 : 0.5}
          max={imperial ? 1968.5 : 50}
          step={imperial ? 1 : 0.1}
          onchange={(e) => redimensionar(Number(e.currentTarget.value), 'length')}
        />
      </label>
    </div>
    {#if erro}
      <p class="text-xs text-red-600" role="alert">{erro}</p>
    {/if}
  {/if}

  <div>
    <span class={ROTULO}>Área</span>
    <p class="text-sm text-gray-700">{formatArea(ambiente.area, unidades)}</p>
  </div>
</div>
