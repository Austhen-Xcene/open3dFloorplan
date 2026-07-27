<script lang="ts">
  import { get } from 'svelte/store';
  import { activeFloor, canvasCamX, canvasCamY, selectedRoomId, selectedTool } from '$lib/stores/project';
  import { placeRectangularEnvironment } from '$lib/utils/ambientes';

  /** Limites do formulário, em metros. */
  const MIN_M = 0.5;
  const MAX_M = 50;

  let nome = $state('');
  let largura = $state(4);
  let comprimento = $state(3);
  let erro = $state('');
  let confirmacao = $state('');

  function adicionar() {
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      erro = 'Informe o nome do ambiente.';
      confirmacao = '';
      return;
    }
    const medidasValidas = [largura, comprimento].every(
      (v) => Number.isFinite(v) && v >= MIN_M && v <= MAX_M,
    );
    if (!medidasValidas) {
      erro = `Use medidas entre ${MIN_M.toFixed(2).replace('.', ',')} m e ${MAX_M} m.`;
      confirmacao = '';
      return;
    }

    const pavimento = get(activeFloor);
    const roomId = placeRectangularEnvironment(
      { name: nomeLimpo, color: '#dbeafe', roomType: 'indoor' },
      { x: get(canvasCamX), y: get(canvasCamY) },
      Math.round(largura * 100),
      Math.round(comprimento * 100),
      pavimento?.walls ?? [],
      pavimento?.rooms ?? [],
    );

    selectedRoomId.set(roomId);
    selectedTool.set('select');
    erro = '';
    confirmacao = `${nomeLimpo} inserido: ${largura.toFixed(2)} × ${comprimento.toFixed(2)} m`;
    nome = '';
    largura = 4;
    comprimento = 3;
  }

  const CAMPO = 'w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm text-gray-800 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100';
  const ROTULO = 'block text-[11px] font-medium text-gray-600 mb-1';
</script>

<div class="rounded-xl border border-gray-200 bg-gray-50 p-3 space-y-3">
  <div>
    <h3 class="text-sm font-semibold text-gray-800">Adicionar ambiente</h3>
    <p class="mt-0.5 text-xs text-gray-400">Informe o nome e as medidas do retângulo.</p>
  </div>

  <label class="block">
    <span class={ROTULO}>Nome do ambiente</span>
    <input
      type="text"
      maxlength="60"
      placeholder="Ex.: Quarto menino"
      bind:value={nome}
      onkeydown={(e) => { if (e.key === 'Enter') adicionar(); }}
      class="{CAMPO} placeholder:text-gray-400"
    />
  </label>

  <div class="grid grid-cols-2 gap-2">
    <label class="block">
      <span class={ROTULO}>Largura (m)</span>
      <input type="number" min={MIN_M} max={MAX_M} step="0.1" bind:value={largura} class={CAMPO} />
    </label>
    <label class="block">
      <span class={ROTULO}>Comprimento (m)</span>
      <input type="number" min={MIN_M} max={MAX_M} step="0.1" bind:value={comprimento} class={CAMPO} />
    </label>
  </div>

  <div class="flex items-center justify-between text-[11px] text-gray-500">
    <span>Área</span>
    <strong class="text-gray-700">{(largura * comprimento).toFixed(2)} m²</strong>
  </div>

  <button
    class="w-full rounded-lg bg-blue-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 active:bg-blue-800"
    onclick={adicionar}
  >
    Adicionar ambiente
  </button>

  {#if erro}
    <p class="text-xs text-red-600" role="alert">{erro}</p>
  {:else if confirmacao}
    <p class="text-xs text-emerald-700" role="status">{confirmacao}</p>
  {/if}
</div>
