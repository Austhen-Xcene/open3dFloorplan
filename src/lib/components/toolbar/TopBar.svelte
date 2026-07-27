<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { get } from 'svelte/store';
  import type { Floor } from '$lib/models/types';
  import { currentProject, undo, redo, addFloor, removeFloor, updateProjectName, loadProject } from '$lib/stores/project';
  import { saveState, lastSavedAt, manualSave, initAutoSave } from '$lib/stores/saveStatus';
  import { initVersionHistory } from '$lib/stores/versionHistory';
  import { importarProjetoDeArquivo } from '$lib/services/arquivoProjeto';
  import AreaSummaryPanel from '$lib/components/sidebar/AreaSummaryPanel.svelte';
  import SeletorPavimento from './SeletorPavimento.svelte';
  import ControlesVisualizacao from './ControlesVisualizacao.svelte';
  import MenuExportar from './MenuExportar.svelte';
  import MenuOverflow from './MenuOverflow.svelte';

  let areaOpen = $state(false);
  let projectName = $state('');
  let floors: Floor[] = $state([]);
  let activeFloorId = $state('');
  let editingName = $state(false);

  currentProject.subscribe((p) => {
    if (p) {
      projectName = p.name;
      floors = p.floors;
      activeFloorId = p.activeFloorId;
    }
  });

  function onNameBlur() {
    editingName = false;
    updateProjectName(projectName);
  }

  function onNameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
  }

  const onAddFloor = () => addFloor(`Pavimento ${floors.length}`);
  const onRemoveFloor = (id: string) => { if (floors.length > 1) removeFloor(id); };
  const onImportProject = () => importarProjetoDeArquivo(loadProject);

  // Texto relativo do último salvamento, usado só no tooltip.
  let lastSavedText = $state('');
  let lastSavedTime: Date | null = $state(null);
  lastSavedAt.subscribe((v) => { lastSavedTime = v; updateLastSavedText(); });

  function updateLastSavedText() {
    if (!lastSavedTime) { lastSavedText = ''; return; }
    const diff = Math.floor((Date.now() - lastSavedTime.getTime()) / 1000);
    if (diff < 5) lastSavedText = 'Salvo agora mesmo';
    else if (diff < 60) lastSavedText = `Salvo há ${diff}s`;
    else if (diff < 3600) lastSavedText = `Salvo há ${Math.floor(diff / 60)} min`;
    else lastSavedText = `Salvo há ${Math.floor(diff / 3600)}h`;
  }

  onMount(() => {
    initAutoSave();
    initVersionHistory();

    const intervalo = setInterval(updateLastSavedText, 15000);
    const aoTeclar = (e: KeyboardEvent) => { if (e.key === 'Escape' && areaOpen) areaOpen = false; };
    document.addEventListener('keydown', aoTeclar, true);
    return () => {
      document.removeEventListener('keydown', aoTeclar, true);
      clearInterval(intervalo);
    };
  });
</script>

<div class="h-12 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center px-4 gap-3 max-md:px-2 max-md:gap-1 shrink-0 shadow-sm">
  <a
    href={base || '/'}
    class="flex items-center gap-1 text-white/70 hover:text-white text-sm transition-colors"
    title="Voltar para os projetos"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
    <span class="hidden sm:inline">Projetos</span>
  </a>

  <div class="h-5 w-px bg-white/20 max-md:hidden"></div>

  {#if editingName}
    <input
      type="text"
      bind:value={projectName}
      onblur={onNameBlur}
      onkeydown={onNameKeydown}
      class="bg-white/20 text-white font-semibold px-2 py-0.5 rounded border border-white/30 outline-none text-sm w-40"
    />
  {:else}
    <button
      class="font-semibold text-white text-sm hover:bg-white/10 px-2 py-0.5 rounded transition-colors max-w-[12rem] truncate max-md:max-w-[4rem]"
      onclick={() => editingName = true}
      title="Clique para renomear"
    >{projectName}</button>
  {/if}

  <div class="h-5 w-px bg-white/20 max-md:hidden"></div>

  <SeletorPavimento {floors} {activeFloorId} onAdd={onAddFloor} onRemove={onRemoveFloor} />

  <div class="flex-1"></div>

  <button onclick={undo} class="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors" title="Desfazer (Ctrl+Z)" aria-label="Desfazer">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
  </button>
  <button onclick={redo} class="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors" title="Refazer (Ctrl+Y)" aria-label="Refazer">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>
  </button>

  <div class="h-5 w-px bg-white/20 max-md:hidden"></div>

  <ControlesVisualizacao />

  <button
    onclick={() => areaOpen = true}
    class="px-2 py-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors max-md:hidden"
    title="Resumo de áreas"
    aria-label="Resumo de áreas"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 3v18"/></svg>
  </button>

  <MenuOverflow {floors} {activeFloorId} onAdd={onAddFloor} onRemove={onRemoveFloor} onAbrirAreas={() => areaOpen = true} />

  <div class="h-5 w-px bg-white/20 max-md:hidden"></div>

  <button
    onclick={onImportProject}
    class="px-3 py-1.5 max-md:px-2 text-sm text-white/90 hover:text-white hover:bg-white/10 rounded transition-colors flex items-center gap-1.5"
    title="Importar projeto"
    aria-label="Importar projeto"
  >
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
      <polyline points="17 8 12 3 7 8"/>
      <line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
    <span class="max-md:hidden">Importar</span>
  </button>

  <MenuExportar />

  <span
    class="text-[11px] font-medium transition-all duration-300 max-md:hidden {$saveState === 'saved' ? 'text-emerald-400' : $saveState === 'saving' ? 'text-amber-300 animate-pulse' : 'text-white/50'}"
    title={lastSavedText || 'Ainda não salvo'}
  >
    {#if $saveState === 'saving'}
      Salvando…
    {:else if $saveState === 'saved'}
      Salvo ✓
    {:else}
      Não salvo •
    {/if}
  </span>
  <button onclick={() => manualSave()} class="px-3 py-1.5 max-md:px-2.5 text-sm bg-white text-slate-800 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-sm">
    Salvar
  </button>
</div>

{#if areaOpen}
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onclick={() => areaOpen = false} onkeydown={(e) => { if (e.key === 'Escape') areaOpen = false; }}>
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="bg-white rounded-xl shadow-2xl w-[420px] max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-hidden" onclick={(e) => e.stopPropagation()}>
      <div class="flex items-center justify-between px-5 py-3 border-b border-gray-200">
        <h2 class="text-base font-semibold text-gray-800">📐 Resumo de áreas</h2>
        <button onclick={() => areaOpen = false} class="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
      </div>
      <div class="overflow-y-auto max-h-[calc(80vh-52px)] p-1">
        <AreaSummaryPanel />
      </div>
    </div>
  </div>
{/if}
