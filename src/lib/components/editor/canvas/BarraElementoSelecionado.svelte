<script lang="ts">
  import type { Floor, Point } from '$lib/models/types';
  import {
    selectedElementId, selectedElementIds, updateDoor, removeElement, splitWall,
    duplicateDoor, duplicateWindow, duplicateFurniture, duplicateWall,
    beginUndoGroup, endUndoGroup,
  } from '$lib/stores/project';

  let { pavimento, idSelecionado, idsSelecionados, paraTela }: {
    pavimento: Floor;
    idSelecionado: string | null;
    idsSelecionados: Set<string>;
    paraTela: (x: number, y: number) => { x: number; y: number };
  } = $props();

  /** Descobre o tipo do elemento selecionado e onde ancorar a barra na tela. */
  let alvo = $derived.by(() => {
    if (!idSelecionado) return null;

    const parede = pavimento.walls.find((w) => w.id === idSelecionado);
    if (parede) {
      return { tipo: 'wall' as const, pos: meio(parede.start, parede.end) };
    }

    const porta = pavimento.doors.find((d) => d.id === idSelecionado);
    if (porta) {
      const p = pavimento.walls.find((w) => w.id === porta.wallId);
      if (p) return { tipo: 'door' as const, pos: aoLongo(p.start, p.end, porta.position), porta };
    }

    const janela = pavimento.windows.find((w) => w.id === idSelecionado);
    if (janela) {
      const p = pavimento.walls.find((w) => w.id === janela.wallId);
      if (p) return { tipo: 'window' as const, pos: aoLongo(p.start, p.end, janela.position) };
    }

    const item = pavimento.furniture.find((f) => f.id === idSelecionado);
    if (item) return { tipo: 'furniture' as const, pos: paraTela(item.position.x, item.position.y) };

    return null;
  });

  const meio = (a: Point, b: Point) => paraTela((a.x + b.x) / 2, (a.y + b.y) / 2);
  const aoLongo = (a: Point, b: Point, t: number) => paraTela(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);

  function duplicar() {
    if (!idSelecionado || !alvo) return;
    const novo =
      alvo.tipo === 'door' ? duplicateDoor(idSelecionado)
      : alvo.tipo === 'window' ? duplicateWindow(idSelecionado)
      : alvo.tipo === 'furniture' ? duplicateFurniture(idSelecionado)
      : duplicateWall(idSelecionado);
    if (novo) selectedElementId.set(novo);
  }

  function excluir() {
    if (idsSelecionados.size > 0) {
      beginUndoGroup();
      for (const id of idsSelecionados) removeElement(id);
      endUndoGroup();
      selectedElementIds.set(new Set());
      selectedElementId.set(null);
      return;
    }
    if (idSelecionado) {
      removeElement(idSelecionado);
      selectedElementId.set(null);
    }
  }

  const BOTAO = 'w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700';
</script>

{#if alvo}
  <div
    class="absolute z-40 flex items-center gap-0.5 bg-white rounded-lg shadow-lg border border-gray-200 px-1 py-0.5"
    style="left: {alvo.pos.x}px; top: {alvo.pos.y - 44}px; transform: translateX(-50%);"
  >
    <button class={BOTAO} title="Duplicar" aria-label="Duplicar" onclick={duplicar}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
    </button>

    {#if alvo.tipo === 'door' && alvo.porta}
      {@const porta = alvo.porta}
      <button
        class={BOTAO}
        title="Inverter o lado da dobradiça"
        aria-label="Inverter o lado da dobradiça"
        onclick={() => updateDoor(porta.id, { swingDirection: porta.swingDirection === 'left' ? 'right' : 'left' })}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4"/></svg>
      </button>
    {/if}

    {#if alvo.tipo === 'wall' && idSelecionado && idsSelecionados.size === 0}
      <button
        class={BOTAO}
        title="Dividir a parede ao meio"
        aria-label="Dividir a parede ao meio"
        onclick={() => { if (splitWall(idSelecionado, 0.5)) selectedElementId.set(null); }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M4 12h4M16 12h4"/></svg>
      </button>
    {/if}

    <div class="w-px h-5 bg-gray-200 mx-0.5"></div>

    <button
      class="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
      title="Excluir"
      aria-label="Excluir"
      onclick={excluir}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14"/></svg>
    </button>
  </div>
{/if}
