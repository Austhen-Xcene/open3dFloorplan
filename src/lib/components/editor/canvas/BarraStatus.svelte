<script lang="ts">
  import type { Floor, Room } from '$lib/models/types';
  import { projectSettings, formatArea } from '$lib/stores/settings';
  import { layerVisibility } from '$lib/stores/project';

  let {
    pavimento, ambientesDetectados, zoom, qtdSelecionada,
    grade = $bindable(), reguas = $bindable(), minimapa = $bindable(), painelCamadas = $bindable(),
    mostrarEquipamentos, encaixeNaGrade, onEnquadrar,
  }: {
    pavimento: Floor | null;
    ambientesDetectados: Room[];
    zoom: number;
    qtdSelecionada: number;
    grade: boolean;
    reguas: boolean;
    minimapa: boolean;
    painelCamadas: boolean;
    mostrarEquipamentos: boolean;
    encaixeNaGrade: boolean;
    onEnquadrar: () => void;
  } = $props();

  let areaTotal = $derived(ambientesDetectados.reduce((soma, r) => soma + r.area, 0));

  const BOTAO = 'hover:text-gray-700';
  const plural = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`;
</script>

<div class="absolute bottom-2 right-2 bg-white/80 rounded px-2 py-1 text-xs text-gray-500 flex gap-3">
  {#if ambientesDetectados.length > 0}
    <span>{plural(ambientesDetectados.length, 'ambiente', 'ambientes')}</span>
    <span>{formatArea(areaTotal, $projectSettings.units)}</span>
    <span class="text-gray-300">|</span>
  {/if}

  {#if pavimento}
    <span>{plural(pavimento.walls.length, 'parede', 'paredes')}</span>
    {#if pavimento.doors.length > 0}<span>{plural(pavimento.doors.length, 'porta', 'portas')}</span>{/if}
    {#if pavimento.windows.length > 0}<span>{plural(pavimento.windows.length, 'janela', 'janelas')}</span>{/if}
    {#if pavimento.furniture.length > 0}<span>{plural(pavimento.furniture.length, 'objeto', 'objetos')}</span>{/if}
    <span class="text-gray-300">|</span>
  {/if}

  {#if qtdSelecionada > 1}
    <span class="text-blue-600 font-medium">{qtdSelecionada} selecionados</span>
    <span class="text-gray-300">|</span>
  {/if}

  <span>Zoom: {Math.round(zoom * 100)}%</span>
  <button class={BOTAO} onclick={onEnquadrar} title="Enquadrar o projeto (F)">⊞ Enquadrar</button>
  <button class={BOTAO} onclick={() => grade = !grade} title="Alternar grade (G)">{grade ? '▦' : '▢'} Grade</button>
  <button
    class={BOTAO}
    onclick={() => projectSettings.update((s) => ({ ...s, snapToGrid: !s.snapToGrid }))}
    title="Alternar encaixe na grade (S)"
  >{encaixeNaGrade ? '🧲' : '↔'} Encaixe</button>
  <button
    class={BOTAO}
    onclick={() => layerVisibility.update((v) => ({ ...v, furniture: !v.furniture }))}
    title="Alternar objetos"
  >{mostrarEquipamentos ? '🪑' : '👻'} Objetos</button>
  <button class={BOTAO} onclick={() => painelCamadas = !painelCamadas} title="Camadas">🗂 Camadas</button>
  <button class={BOTAO} onclick={() => reguas = !reguas} title="Alternar réguas">{reguas ? '📏' : '📐'} Réguas</button>
  <button class={BOTAO} onclick={() => minimapa = !minimapa} title="Alternar minimapa">🗺 Mapa</button>
</div>
