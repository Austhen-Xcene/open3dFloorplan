<script lang="ts">
  const ZOOM_MIN = 0.1;
  const ZOOM_MAX = 10;

  let { zoom = $bindable(), onEnquadrar }: { zoom: number; onEnquadrar: () => void } = $props();

  const BOTAO = 'w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-600 hover:text-gray-800 font-bold text-lg';
</script>

<div class="absolute bottom-3 left-3 z-20 flex items-center gap-1 bg-white rounded-lg shadow-lg border border-gray-200 px-1 py-0.5">
  <button class={BOTAO} title="Afastar (−)" aria-label="Afastar" onclick={() => zoom = Math.max(ZOOM_MIN, zoom * 0.8)}>−</button>
  <button
    class="min-w-[3.5rem] h-7 flex items-center justify-center rounded hover:bg-gray-100 text-xs font-medium text-gray-600 hover:text-gray-800 tabular-nums"
    title="Voltar para 100%"
    aria-label="Voltar para 100%"
    onclick={() => zoom = 1}
  >{Math.round(zoom * 100)}%</button>
  <button class={BOTAO} title="Aproximar (+)" aria-label="Aproximar" onclick={() => zoom = Math.min(ZOOM_MAX, zoom * 1.25)}>+</button>

  <div class="w-px h-5 bg-gray-200"></div>

  <button
    class="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 text-sm"
    title="Enquadrar o projeto (F)"
    aria-label="Enquadrar o projeto"
    onclick={onEnquadrar}
  >⊞</button>
</div>
