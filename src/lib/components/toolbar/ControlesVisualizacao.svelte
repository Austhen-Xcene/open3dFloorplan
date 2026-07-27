<script lang="ts">
  import { selectedTool, panMode, canvasZoom } from '$lib/stores/project';

  const ZOOM_MIN = 0.1;
  const ZOOM_MAX = 10;
  const ZOOM_PASSO = 1.25;

  const aproximar = () => canvasZoom.update((z) => Math.min(ZOOM_MAX, z * ZOOM_PASSO));
  const afastar = () => canvasZoom.update((z) => Math.max(ZOOM_MIN, z / ZOOM_PASSO));
</script>

<!-- Seleção / mão. No celular o pan é com dois dedos, então some. -->
<div class="flex bg-white/15 rounded-full p-0.5 max-md:hidden">
  <button
    onclick={() => { selectedTool.set('select'); panMode.set(false); }}
    class="px-2 py-1 text-xs font-semibold rounded-full transition-colors {!$panMode ? 'bg-white text-slate-800' : 'text-white/80 hover:text-white'}"
    title="Selecionar (V)"
    aria-label="Selecionar"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>
  </button>
  <button
    onclick={() => { selectedTool.set('select'); panMode.set(true); }}
    class="px-2 py-1 text-xs font-semibold rounded-full transition-colors {$panMode ? 'bg-white text-slate-800' : 'text-white/80 hover:text-white'}"
    title="Mão (H)"
    aria-label="Mão"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v1"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
  </button>
</div>

<div class="h-5 w-px bg-white/20 max-md:hidden"></div>

<div class="flex items-center gap-1 bg-white/15 rounded-full p-0.5 max-md:hidden">
  <button
    onclick={afastar}
    class="w-7 h-7 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors text-sm font-bold"
    title="Afastar (−)"
    aria-label="Afastar"
  >−</button>
  <button
    onclick={() => canvasZoom.set(1)}
    class="px-2 py-1 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors min-w-[3rem] text-center"
    title="Voltar para 100%"
  >{Math.round($canvasZoom * 100)}%</button>
  <button
    onclick={aproximar}
    class="w-7 h-7 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors text-sm font-bold"
    title="Aproximar (+)"
    aria-label="Aproximar"
  >+</button>
</div>
