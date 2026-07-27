<script lang="ts">
  import { get } from 'svelte/store';
  import type { Project } from '$lib/models/types';
  import { currentProject, createDefaultProject } from '$lib/stores/project';
  import { exportAsPNG, exportAsJSON, exportAsSVG, exportPDF } from '$lib/utils/exportacao';
  import { exportDXF, exportDWG } from '$lib/utils/cadExport';
  import { triggerTip } from '$lib/stores/onboarding.svelte';

  let aberto = $state(false);
  let raiz: HTMLDivElement | undefined = $state();

  /** Executa a exportação com o projeto atual e fecha o menu. */
  function exportar(acao: (projeto: Project) => void) {
    const projeto = get(currentProject);
    if (projeto) acao(projeto);
    aberto = false;
  }

  function exportarPNG() {
    const canvas = document.querySelector('canvas') as HTMLCanvasElement | null;
    if (canvas) exportAsPNG(canvas, get(currentProject) ?? undefined);
    aberto = false;
  }

  function abrirImpressao() {
    aberto = false;
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true }));
  }

  function novoProjeto() {
    if (!confirm('Criar um projeto novo? As alterações não salvas serão perdidas.')) return;
    currentProject.set(createDefaultProject());
    aberto = false;
  }

  $effect(() => {
    if (!aberto) return;
    const foraDoMenu = (e: MouseEvent) => {
      if (raiz && !raiz.contains(e.target as Node)) aberto = false;
    };
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape') aberto = false; };
    document.addEventListener('click', foraDoMenu, true);
    document.addEventListener('keydown', aoTeclar, true);
    return () => {
      document.removeEventListener('click', foraDoMenu, true);
      document.removeEventListener('keydown', aoTeclar, true);
    };
  });

  const ITEM = 'w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center gap-2';
</script>

<div class="relative" bind:this={raiz}>
  <button
    onclick={() => { aberto = !aberto; if (aberto) triggerTip('first-export', 300, 60); }}
    class="px-3 py-1.5 max-md:px-2 text-sm text-white/90 hover:text-white hover:bg-white/10 rounded transition-colors flex items-center gap-1.5"
    title="Exportar"
    aria-label="Exportar"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
    <span class="max-md:hidden">Exportar</span>
  </button>

  {#if aberto}
    <div class="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-48 z-50">
      <button class={ITEM} onclick={abrirImpressao}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
        Layout de impressão
      </button>
      <div class="h-px bg-gray-100 my-1"></div>
      <button class={ITEM} onclick={exportarPNG}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
        Exportar em PNG
      </button>
      <button class={ITEM} onclick={() => exportar(exportAsSVG)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>
        Exportar em SVG
      </button>
      <button class={ITEM} onclick={() => exportar(exportDXF)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 16h2"/><path d="M14 16h2"/></svg>
        Exportar em DXF
      </button>
      <button class={ITEM} onclick={() => exportar(exportDWG)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 16h6"/></svg>
        Exportar em DWG
      </button>
      <button class={ITEM} onclick={() => exportar(exportPDF)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 11v6"/><path d="M8 11v6"/><path d="M12 11v6"/></svg>
        Exportar em PDF
      </button>
      <button class={ITEM} onclick={() => exportar(exportAsJSON)}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
        Baixar JSON
      </button>
      <div class="h-px bg-gray-100 my-1"></div>
      <button class={ITEM} onclick={novoProjeto}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        Novo projeto
      </button>
    </div>
  {/if}
</div>
