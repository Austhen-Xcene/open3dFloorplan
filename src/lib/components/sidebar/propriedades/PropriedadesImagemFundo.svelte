<script lang="ts">
  import type { BackgroundImage } from '$lib/models/types';
  import { updateBackgroundImage, setBackgroundImage, calibrationMode, calibrationPoints } from '$lib/stores/project';
  import { CAMPO, ROTULO } from './unidades';
  import CabecalhoPainel from './CabecalhoPainel.svelte';

  let { imagem }: { imagem: BackgroundImage } = $props();

  function iniciarCalibragem() {
    calibrationPoints.set([]);
    calibrationMode.set(true);
  }
</script>

<div class="mt-4 pt-3 border-t border-gray-200">
  <CabecalhoPainel icone="🖼️" cor="bg-blue-100" titulo="Imagem de fundo" />

  <div class="space-y-3">
    <label class="block">
      <span class={ROTULO}>Opacidade</span>
      <input type="range" min="0.05" max="1" step="0.05" class="w-full" value={imagem.opacity}
        oninput={(e) => updateBackgroundImage({ opacity: Number(e.currentTarget.value) })} />
    </label>

    <label class="block">
      <span class={ROTULO}>Escala</span>
      <input type="range" min="0.1" max="5" step="0.05" class="w-full" value={imagem.scale}
        oninput={(e) => updateBackgroundImage({ scale: Number(e.currentTarget.value) })} />
    </label>

    <label class="block">
      <span class={ROTULO}>Rotação</span>
      <input type="number" class={CAMPO} value={imagem.rotation}
        oninput={(e) => updateBackgroundImage({ rotation: Number(e.currentTarget.value) })} />
    </label>

    <div class="flex gap-2">
      <button
        onclick={() => updateBackgroundImage({ locked: !imagem.locked })}
        class="flex-1 px-2 py-1.5 border rounded text-sm {imagem.locked ? 'bg-amber-100 border-amber-400 text-amber-700' : 'border-gray-200 hover:bg-gray-50'}"
      >{imagem.locked ? '🔒 Travada' : '🔓 Livre'}</button>
      <button
        onclick={iniciarCalibragem}
        class="flex-1 px-2 py-1.5 border rounded text-sm border-gray-200 hover:bg-gray-50"
      >📏 Definir escala</button>
    </div>

    <button
      onclick={() => setBackgroundImage(undefined)}
      class="w-full px-2 py-1.5 border border-red-300 rounded text-sm text-red-600 hover:bg-red-50"
    >Remover imagem</button>
  </div>
</div>
