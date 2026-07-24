<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { currentProject, undo, redo, addFloor, removeFloor, setActiveFloor, updateProjectName, loadProject, createDefaultProject, canvasZoom, panMode, selectedTool, activeFloor, selectedElementId, elevationWallId, elevationPickMode } from '$lib/stores/project';
  import { localStore } from '$lib/services/datastore';
  import { get } from 'svelte/store';
  import type { Floor, Project } from '$lib/models/types';
  import { exportAsPNG, exportAsJSON, exportAsSVG, exportPDF } from '$lib/utils/export';
  import { exportDXF, exportDWG } from '$lib/utils/cadExport';
  import AreaSummaryPanel from '$lib/components/sidebar/AreaSummaryPanel.svelte';
  import { saveState, lastSavedAt, manualSave, initAutoSave } from '$lib/stores/saveStatus';
  import { initVersionHistory } from '$lib/stores/versionHistory';

  let areaOpen = $state(false);

  let projectName = $state('');
  let floors: Floor[] = $state([]);
  let activeFloorId = $state('');
  let editingName = $state(false);
  let exportOpen = $state(false);
  import { triggerTip } from '$lib/stores/onboarding.svelte';
  let exportRef: HTMLDivElement;
  // Mobile (< md) overflow menu for secondary actions
  let moreOpen = $state(false);
  let moreRef: HTMLDivElement | undefined = $state();
  // Elevation code is retained for future use, but the current product is Plan-only.
  const ENABLE_ELEVATION_VIEW = false;

  currentProject.subscribe((p) => {
    if (p) {
      projectName = p.name;
      floors = p.floors;
      activeFloorId = p.activeFloorId;
    }
  });
  /** Switch the 2D canvas area to the integrated elevation view.
   *  With a wall selected it opens that wall; otherwise it stays in Plan and
   *  arms pick mode — the next wall clicked in the canvas opens its elevation.
   */
  function enterElevation() {
    const floor = get(activeFloor);
    const selId = get(selectedElementId);
    const wall = selId ? floor?.walls.find((w) => w.id === selId) : undefined;
    if (wall) {
      elevationPickMode.set(false);
      selectedElementId.set(wall.id);
      elevationWallId.set(wall.id);
    } else {
      // No wall selected — prompt the user to pick one on the plan canvas
      elevationPickMode.update((v) => !v); // pressing again cancels
    }
    moreOpen = false;
  }

  /** Return the 2D canvas area to the plan view */
  function exitElevation() {
    elevationWallId.set(null);
    elevationPickMode.set(false);
    moreOpen = false;
  }

  /** Mobile overflow item: toggle between plan and elevation */
  function toggleElevationView() {
    if (get(elevationWallId)) exitElevation();
    else enterElevation();
  }

  function onNameBlur() {
    editingName = false;
    updateProjectName(projectName);
  }

  function onNameKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
  }

  function onAddFloor() {
    addFloor(`Floor ${floors.length}`);
  }

  function onRemoveFloor(id: string) {
    if (floors.length <= 1) return;
    removeFloor(id);
  }

  async function save() {
    await manualSave();
  }

  // Relative time for tooltip
  let lastSavedText = $state('');
  let lastSavedTime: Date | null = $state(null);
  lastSavedAt.subscribe(v => { lastSavedTime = v; updateLastSavedText(); });

  function updateLastSavedText() {
    if (!lastSavedTime) { lastSavedText = ''; return; }
    const diff = Math.floor((Date.now() - lastSavedTime.getTime()) / 1000);
    if (diff < 5) lastSavedText = 'Last saved: just now';
    else if (diff < 60) lastSavedText = `Last saved: ${diff}s ago`;
    else if (diff < 3600) lastSavedText = `Last saved: ${Math.floor(diff / 60)} min ago`;
    else lastSavedText = `Last saved: ${Math.floor(diff / 3600)}h ago`;
  }

  function onExport2DPNG() {
    const p = get(currentProject);
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    if (canvas) exportAsPNG(canvas, p ?? undefined);
    exportOpen = false;
  }

  function onExportJSON() {
    const p = get(currentProject);
    if (p) exportAsJSON(p);
    exportOpen = false;
  }

  function onExportSVG() {
    const p = get(currentProject);
    if (p) exportAsSVG(p);
    exportOpen = false;
  }

  function onExportDXF() {
    const p = get(currentProject);
    if (p) exportDXF(p);
    exportOpen = false;
  }

  function onExportDWG() {
    const p = get(currentProject);
    if (p) exportDWG(p);
    exportOpen = false;
  }

  function onExportPDF() {
    const p = get(currentProject);
    if (p) exportPDF(p);
    exportOpen = false;
  }

  function onShareProject() {
    const p = get(currentProject);
    if (!p) return;
    const json = JSON.stringify(p, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.name || 'floorplan'}.openplan.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function newProject() {
    if (!confirm('Create a new project? Unsaved changes will be lost.')) return;
    currentProject.set(createDefaultProject());
    exportOpen = false;
  }

  onMount(() => {
    initAutoSave();
    initVersionHistory();

    // Update relative timestamp every 15s
    const interval = setInterval(updateLastSavedText, 15000);

    function handleClickOutside(e: MouseEvent) {
      if (exportOpen && exportRef && !exportRef.contains(e.target as Node)) {
        exportOpen = false;
      }
      if (moreOpen && moreRef && !moreRef.contains(e.target as Node)) {
        moreOpen = false;
      }
    }
    function handleKeydown(e: KeyboardEvent) {
      if (exportOpen) exportOpen = false;
      if (e.key === 'Escape' && moreOpen) moreOpen = false;
      if (e.key === 'Escape' && areaOpen) areaOpen = false;
    }
    document.addEventListener('click', handleClickOutside, true);
    document.addEventListener('keydown', handleKeydown, true);
    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeydown, true);
      clearInterval(interval);
    };
  });

  function onImportProject() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (data.floors && data.id) {
          // Validate project structure
          if (!Array.isArray(data.floors) || data.floors.length === 0) {
            alert('Arquivo de projeto inválido: deve existir pelo menos um pavimento.');
            return;
          }
          for (const fl of data.floors) {
            if (!fl.id || !Array.isArray(fl.walls)) {
              alert('Arquivo de projeto inválido: os dados dos pavimentos estão incompletos.');
              return;
            }
          }
          if (!data.activeFloorId || !data.floors.some((f: any) => f.id === data.activeFloorId)) {
            data.activeFloorId = data.floors[0].id;
          }
          // Revive dates
          if (data.createdAt) data.createdAt = new Date(data.createdAt);
          if (data.updatedAt) data.updatedAt = new Date(data.updatedAt);
          loadProject(data as Project);
        } else {
          alert('Formato não reconhecido. Selecione um projeto JSON exportado por este editor.');
        }
      } catch (e: any) {
        alert('Não foi possível importar o projeto: ' + e.message);
      }
    };
    input.click();
    exportOpen = false;
    moreOpen = false;
  }
</script>

<div class="h-12 bg-gradient-to-r from-slate-800 to-slate-700 flex items-center px-4 gap-3 max-md:px-2 max-md:gap-1 shrink-0 shadow-sm">
  <!-- Back to Projects -->
  <a
    href={base || '/'}
    class="flex items-center gap-1 text-white/70 hover:text-white text-sm transition-colors"
    title="Back to Projects"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
    <span class="hidden sm:inline">Projects</span>
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
      title="Click to rename"
    >{projectName}</button>
  {/if}

  <div class="h-5 w-px bg-white/20 max-md:hidden"></div>

  <!-- Floor selector as buttons (in overflow menu on mobile) -->
  <div class="flex items-center gap-1 max-md:hidden">
    {#each floors as fl}
      <div class="flex items-center rounded transition-colors {fl.id === activeFloorId ? 'bg-white text-slate-800' : 'text-white/80 hover:bg-white/10'}">
        <button
          class="pl-2 pr-1 py-0.5 text-xs {fl.id === activeFloorId ? 'font-semibold' : ''}"
          onclick={() => setActiveFloor(fl.id)}
          title={fl.id === activeFloorId ? 'Active floor' : 'Switch to this floor'}
        >{fl.name}</button>
        {#if floors.length > 1}
          <button
            class="pl-1 pr-1.5 py-0.5 text-xs font-bold opacity-60 hover:opacity-100 hover:text-red-500"
            onclick={() => onRemoveFloor(fl.id)}
            title="Excluir {fl.name}"
            aria-label="Excluir {fl.name}"
          >×</button>
        {/if}
      </div>
    {/each}
    <button
      onclick={onAddFloor}
      class="text-white/80 hover:text-white text-xs hover:bg-white/10 px-1.5 py-0.5 rounded transition-colors"
      title="Add Floor"
      aria-label="Add Floor"
    >+</button>
    <span class="text-white/50 text-[10px] ml-1">
      {floors.length} {floors.length === 1 ? 'Pavimento' : 'Pavimentos'}
    </span>
  </div>

  <div class="flex-1"></div>

  <button onclick={undo} class="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors" title="Undo (Ctrl+Z)" aria-label="Undo">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
  </button>
  <button onclick={redo} class="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors" title="Redo (Ctrl+Y)" aria-label="Redo">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.13-9.36L23 10"/></svg>
  </button>

  <div class="h-5 w-px bg-white/20 max-md:hidden"></div>

  <!-- Select / Pan toggle (mobile pans with two fingers; toggle lives in overflow menu) -->
  <div class="flex bg-white/15 rounded-full p-0.5 max-md:hidden">
    <button
      onclick={() => { selectedTool.set('select'); panMode.set(false); }}
      class="px-2 py-1 text-xs font-semibold rounded-full transition-colors {!$panMode ? 'bg-white text-slate-800' : 'text-white/80 hover:text-white'}"
      title="Select mode (V)"
      aria-label="Select mode"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>
    </button>
    <button
      onclick={() => { selectedTool.set('select'); panMode.set(true); }}
      class="px-2 py-1 text-xs font-semibold rounded-full transition-colors {$panMode ? 'bg-white text-slate-800' : 'text-white/80 hover:text-white'}"
      title="Pan mode (H)"
      aria-label="Pan mode"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0v1"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/></svg>
    </button>
  </div>

  <div class="h-5 w-px bg-white/20 max-md:hidden"></div>

  {#if ENABLE_ELEVATION_VIEW}
    <!-- Disabled for the Plan-only workflow; retained for future reactivation. -->
    <div class="flex bg-white/15 rounded-full p-0.5 max-md:hidden">
      <button
        onclick={exitElevation}
        class="px-3 py-1 text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 {!$elevationWallId ? 'bg-white text-slate-800' : 'text-white/80 hover:text-white'}"
        title="Plan view — top-down floor plan"
        aria-pressed={!$elevationWallId}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 12h8"/><path d="M11 12v9"/><path d="M15 3v6"/></svg>
        <span>Plan</span>
      </button>
      <button
        onclick={enterElevation}
        class="px-3 py-1 text-xs font-semibold rounded-full transition-colors flex items-center gap-1.5 {$elevationWallId ? 'bg-white text-slate-800' : $elevationPickMode ? 'bg-blue-500 text-white' : 'text-white/80 hover:text-white'}"
        title={$elevationPickMode ? 'Pick a wall in the plan to view its elevation — press again or Esc to cancel' : 'Elevation view — the selected wall face-on, or pick one on the plan'}
        aria-pressed={!!$elevationWallId || $elevationPickMode}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9H3z"/><rect x="10" y="14" width="4" height="6"/><rect x="5.5" y="13" width="3" height="3"/></svg>
        <span>Elevation</span>
      </button>
    </div>
  {/if}

  <!-- Zoom controls (Plan only; mobile uses pinch + overflow menu) -->
  <div class="flex items-center gap-1 bg-white/15 rounded-full p-0.5 max-md:hidden">
      <button
        onclick={() => canvasZoom.update(z => Math.max(0.1, z / 1.25))}
        class="w-7 h-7 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors text-sm font-bold"
        title="Zoom Out (−)"
        aria-label="Zoom Out"
      >−</button>
      <button
        onclick={() => canvasZoom.set(1)}
        class="px-2 py-1 text-xs font-medium text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors min-w-[3rem] text-center"
        title="Reset Zoom (100%)"
      >{Math.round($canvasZoom * 100)}%</button>
      <button
        onclick={() => canvasZoom.update(z => Math.min(10, z * 1.25))}
        class="w-7 h-7 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors text-sm font-bold"
        title="Zoom In (+)"
        aria-label="Zoom In"
      >+</button>
  </div>

  <!-- Area summary button -->
  <button
    onclick={() => areaOpen = true}
    class="px-2 py-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors max-md:hidden"
    title="Resumo de áreas"
    aria-label="Resumo de áreas"
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 3v18"/></svg>
  </button>

  <!-- Overflow menu (mobile only): secondary actions hidden from the condensed bar -->
  <div class="relative md:hidden" bind:this={moreRef}>
    <button
      onclick={() => moreOpen = !moreOpen}
      class="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded transition-colors"
      title="More"
      aria-label="More actions"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>
    </button>
    {#if moreOpen}
      <div class="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-56 z-50 max-h-[70vh] overflow-y-auto">
        <div class="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">Floors</div>
        {#each floors as fl}
          <div class="flex items-center hover:bg-gray-100 {fl.id === activeFloorId ? 'text-blue-600 font-semibold' : 'text-gray-700'}">
            <button class="flex-1 px-3 py-2 text-sm text-left" onclick={() => { setActiveFloor(fl.id); moreOpen = false; }}>
              {fl.name}{fl.id === activeFloorId ? ' ✓' : ''}
            </button>
            {#if floors.length > 1}
              <button
                class="px-3 py-2 text-base text-gray-400 hover:text-red-600"
                onclick={() => onRemoveFloor(fl.id)}
                title="Excluir {fl.name}"
                aria-label="Excluir {fl.name}"
              >×</button>
            {/if}
          </div>
        {/each}
        <button class="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left" onclick={() => { onAddFloor(); }}>+ Add Floor</button>
        <div class="h-px bg-gray-100 my-1"></div>
        <div class="px-3 pt-1.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-gray-400">View</div>
        <button class="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left" onclick={() => canvasZoom.update(z => Math.min(10, z * 1.25))}>Zoom In</button>
        <button class="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left" onclick={() => canvasZoom.update(z => Math.max(0.1, z / 1.25))}>Zoom Out</button>
        <button class="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left" onclick={() => canvasZoom.set(1)}>Reset Zoom ({Math.round($canvasZoom * 100)}%)</button>
        <button class="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left" onclick={() => panMode.update(v => !v)}>{$panMode ? '✓ ' : ''}Pan Mode</button>
        <div class="h-px bg-gray-100 my-1"></div>
        {#if ENABLE_ELEVATION_VIEW}
          <!-- Disabled for the Plan-only workflow; retained for future reactivation. -->
          <button class="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left" onclick={toggleElevationView}>{$elevationWallId ? '✓ ' : ''}Elevation View</button>
        {/if}
        <button class="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left" onclick={() => { areaOpen = true; moreOpen = false; }}>Resumo de áreas</button>
      </div>
    {/if}
  </div>

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

  <!-- Export dropdown -->
  <div class="relative" bind:this={exportRef}>
    <button
      onclick={() => { exportOpen = !exportOpen; if (exportOpen) triggerTip('first-export', 300, 60); }}
      class="px-3 py-1.5 max-md:px-2 text-sm text-white/90 hover:text-white hover:bg-white/10 rounded transition-colors flex items-center gap-1.5"
      title="Export"
      aria-label="Export"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
      <span class="max-md:hidden">Export</span>
    </button>
    {#if exportOpen}
      <div class="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-48 z-50">
        <button class="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center gap-2" onclick={() => { exportOpen = false; window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true })); }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          Print Layout
        </button>
        <div class="h-px bg-gray-100 my-1"></div>
        <button class="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center gap-2" onclick={onExport2DPNG}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
          Export 2D as PNG
        </button>
        <button class="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center gap-2" onclick={onExportSVG}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>
          Export as SVG
        </button>
        <button class="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center gap-2" onclick={onExportDXF}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M8 16h2"/><path d="M14 16h2"/></svg>
          Export as DXF
        </button>
        <button class="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center gap-2" onclick={onExportDWG}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 16h6"/></svg>
          Export as DWG
        </button>
        <button class="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center gap-2" onclick={onExportPDF}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 11v6"/><path d="M8 11v6"/><path d="M12 11v6"/></svg>
          Export as PDF
        </button>
        <button class="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center gap-2" onclick={onExportJSON}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/></svg>
          Download JSON
        </button>
        <div class="h-px bg-gray-100 my-1"></div>
        <button class="w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left flex items-center gap-2" onclick={newProject}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Project
        </button>
      </div>
    {/if}
  </div>

  <span
    class="text-[11px] font-medium transition-all duration-300 max-md:hidden {$saveState === 'saved' ? 'text-emerald-400' : $saveState === 'saving' ? 'text-amber-300 animate-pulse' : 'text-white/50'}"
    title={lastSavedText || 'Not saved yet'}
  >
    {#if $saveState === 'saving'}
      Saving…
    {:else if $saveState === 'saved'}
      Saved ✓
    {:else}
      Unsaved •
    {/if}
  </span>
  <button onclick={save} class="px-3 py-1.5 max-md:px-2.5 text-sm bg-white text-slate-800 font-semibold rounded-lg hover:bg-blue-50 transition-colors shadow-sm">
    Save
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
