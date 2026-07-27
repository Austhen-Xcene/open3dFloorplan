<script lang="ts">
  import { onMount } from 'svelte';
  import type { Project } from '$lib/models/types';
  import { currentProject, createDefaultProject, selectedTool, placingFurnitureId } from '$lib/stores/project';
  import { localStore } from '$lib/services/datastore';
  import TopBar from '$lib/components/toolbar/TopBar.svelte';
  import BuildPanel from '$lib/components/sidebar/BuildPanel.svelte';
  import PropertiesPanel from '$lib/components/sidebar/PropertiesPanel.svelte';
  import LayersPanel from '$lib/components/sidebar/LayersPanel.svelte';
  import FloorPlanCanvas from '$lib/components/editor/FloorPlanCanvas.svelte';
  import AlignmentToolbar from '$lib/components/editor/AlignmentToolbar.svelte';
  import UndoHistoryPanel from '$lib/components/editor/UndoHistoryPanel.svelte';
  import CommandPalette from '$lib/components/editor/CommandPalette.svelte';
  import PrintLayout from '$lib/components/editor/PrintLayout.svelte';
  import AtalhosOverlay from '$lib/components/editor/AtalhosOverlay.svelte';
  import BotoesFlutuantes from '$lib/components/editor/BotoesFlutuantes.svelte';
  import OnboardingTooltip from '$lib/components/OnboardingTooltip.svelte';

  /** Intervalo do auto-save, em ms. Curto o bastante para não perder trabalho. */
  const DEBOUNCE_SALVAR = 500;

  let pronto = $state(false);
  let camadasVisiveis = $state(false);
  let historicoVisivel = $state(false);
  let ajudaVisivel = $state(false);
  let paletaAberta = $state(false);
  let impressaoAberta = $state(false);

  // No celular o BuildPanel vira gaveta, aberta pelo botão de ferramentas.
  let ferramentasAbertas = $state(false);
  selectedTool.subscribe(() => { if (ferramentasAbertas) ferramentasAbertas = false; });
  placingFurnitureId.subscribe((id) => { if (id && ferramentasAbertas) ferramentasAbertas = false; });

  /** Carrega o projeto de `?id=`, ou cria um novo e corrige a URL. */
  async function carregarProjeto() {
    const id = new URL(window.location.href).searchParams.get('id');
    if (id) {
      const projeto = await localStore.load(id);
      if (projeto) {
        currentProject.set(projeto);
        return;
      }
    }
    const novo = createDefaultProject();
    currentProject.set(novo);
    await localStore.save(novo);
    history.replaceState(null, '', `/editor?id=${novo.id}`);
  }

  onMount(() => {
    carregarProjeto().then(() => { pronto = true; });

    let timeout: ReturnType<typeof setTimeout>;
    let pendente: Project | null = null;

    const unsub = currentProject.subscribe((p) => {
      if (!p) return;
      pendente = p;
      clearTimeout(timeout);
      timeout = setTimeout(() => { localStore.save(p); pendente = null; }, DEBOUNCE_SALVAR);
    });

    /**
     * Sem backend, o localStorage é o único lugar onde o projeto existe. Sair antes do
     * debounce disparar perdia até meio segundo de trabalho — aqui grava na hora.
     */
    function gravarPendente() {
      if (!pendente) return;
      clearTimeout(timeout);
      localStore.save(pendente);
      pendente = null;
    }
    const aoEsconder = () => { if (document.visibilityState === 'hidden') gravarPendente(); };

    window.addEventListener('beforeunload', gravarPendente);
    window.addEventListener('pagehide', gravarPendente);
    document.addEventListener('visibilitychange', aoEsconder);

    return () => {
      unsub();
      clearTimeout(timeout);
      window.removeEventListener('beforeunload', gravarPendente);
      window.removeEventListener('pagehide', gravarPendente);
      document.removeEventListener('visibilitychange', aoEsconder);
      gravarPendente();
    };
  });

  function aoTeclar(e: KeyboardEvent) {
    const alvo = e.target as HTMLElement | null;
    const emCampo = alvo?.tagName === 'INPUT' || alvo?.tagName === 'TEXTAREA' || alvo?.tagName === 'SELECT' || alvo?.isContentEditable;
    const comModificador = e.ctrlKey || e.metaKey;

    if (e.key === 'p' && comModificador) { e.preventDefault(); impressaoAberta = true; }
    if (e.key === 'k' && comModificador) { e.preventDefault(); paletaAberta = !paletaAberta; }

    // Esc fecha a ajuda venha de onde vier o foco — o overlay não fica focado sozinho.
    if (e.key === 'Escape' && ajudaVisivel) { ajudaVisivel = false; return; }

    if (emCampo || comModificador) return;

    if (e.key === '/') { e.preventDefault(); paletaAberta = !paletaAberta; }
    if (e.key === '?') { e.preventDefault(); ajudaVisivel = !ajudaVisivel; }
    if (e.key === 'l' && !e.altKey) camadasVisiveis = !camadasVisiveis;
  }
</script>

<svelte:window on:keydown={aoTeclar} />

{#if pronto}
  <div class="h-screen flex flex-col overflow-hidden">
    <TopBar />
    <div class="flex flex-1 overflow-hidden">
      <!-- Painel de construção: barra fixa no desktop, gaveta no celular. -->
      {#if ferramentasAbertas}
        <div
          class="md:hidden fixed inset-x-0 top-12 bottom-0 bg-black/40 z-40"
          onclick={() => ferramentasAbertas = false}
          aria-hidden="true"
        ></div>
      {/if}
      <div class="h-full max-md:fixed max-md:left-0 max-md:top-12 max-md:bottom-0 max-md:h-auto max-md:z-50 max-md:shadow-2xl max-md:transition-transform max-md:duration-200 {ferramentasAbertas ? '' : 'max-md:-translate-x-full'}">
        <BuildPanel />
      </div>

      <div class="flex-1 min-w-0 relative">
        <FloorPlanCanvas />
        <AlignmentToolbar />
      </div>

      {#if camadasVisiveis}
        <LayersPanel />
      {/if}
      <PropertiesPanel />
    </div>
  </div>

  <BotoesFlutuantes bind:ferramentasAbertas bind:camadasVisiveis bind:historicoVisivel bind:ajudaVisivel />
  <UndoHistoryPanel bind:visible={historicoVisivel} />
  <AtalhosOverlay bind:visible={ajudaVisivel} />
  <CommandPalette bind:open={paletaAberta} />
  <PrintLayout bind:open={impressaoAberta} />
  <OnboardingTooltip />
{:else}
  <div class="h-screen flex flex-col items-center justify-center gap-3">
    <p class="text-gray-400">Carregando…</p>
  </div>
{/if}
