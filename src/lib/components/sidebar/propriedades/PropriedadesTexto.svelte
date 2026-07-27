<script lang="ts">
  import type { TextAnnotation } from '$lib/models/types';
  import { updateTextAnnotation } from '$lib/stores/project';
  import { CAMPO, ROTULO } from './unidades';
  import CabecalhoPainel from './CabecalhoPainel.svelte';

  let { texto }: { texto: TextAnnotation } = $props();

  const numero = (e: Event & { currentTarget: HTMLInputElement }) => Number(e.currentTarget.value);
</script>

<CabecalhoPainel icone="🏷️" cor="bg-emerald-100" titulo="Texto" />

<div class="space-y-3">
  <label class="block">
    <span class={ROTULO}>Conteúdo</span>
    <input type="text" class={CAMPO} value={texto.text}
      oninput={(e) => updateTextAnnotation(texto.id, { text: e.currentTarget.value })} />
  </label>

  <label class="block">
    <span class={ROTULO}>Tamanho da fonte</span>
    <input type="number" min="8" max="72" class={CAMPO} value={texto.fontSize}
      oninput={(e) => updateTextAnnotation(texto.id, { fontSize: numero(e) })} />
  </label>

  <label class="block">
    <span class={ROTULO}>Cor</span>
    <div class="flex items-center gap-2">
      <input type="color" value={texto.color} class="w-8 h-6 rounded border border-gray-200 cursor-pointer"
        oninput={(e) => updateTextAnnotation(texto.id, { color: e.currentTarget.value })} />
      <span class="text-xs text-gray-400">{texto.color}</span>
    </div>
  </label>

  <label class="block">
    <span class={ROTULO}>Rotação (°)</span>
    <input type="number" class={CAMPO} value={texto.rotation}
      oninput={(e) => updateTextAnnotation(texto.id, { rotation: numero(e) })} />
  </label>

  <div class="grid grid-cols-2 gap-2">
    <label class="block">
      <span class={ROTULO}>X</span>
      <input type="number" class={CAMPO} value={Math.round(texto.x)}
        oninput={(e) => updateTextAnnotation(texto.id, { x: numero(e) })} />
    </label>
    <label class="block">
      <span class={ROTULO}>Y</span>
      <input type="number" class={CAMPO} value={Math.round(texto.y)}
        oninput={(e) => updateTextAnnotation(texto.id, { y: numero(e) })} />
    </label>
  </div>
</div>
