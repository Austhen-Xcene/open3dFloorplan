<script lang="ts">
  /** Botões flutuantes do canto inferior esquerdo do editor. */
  let { ferramentasAbertas = $bindable(false), camadasVisiveis = $bindable(false), historicoVisivel = $bindable(false), ajudaVisivel = $bindable(false) }: {
    ferramentasAbertas?: boolean;
    camadasVisiveis?: boolean;
    historicoVisivel?: boolean;
    ajudaVisivel?: boolean;
  } = $props();

  const REDONDO = 'fixed bottom-4 rounded-full shadow-lg transition-colors z-50';
</script>

<!-- Gaveta de ferramentas (só no celular) -->
<button
  class="md:hidden fixed bottom-4 left-4 w-12 h-12 rounded-full bg-blue-600 text-white shadow-lg active:bg-blue-700 transition-colors z-40 flex items-center justify-center"
  onclick={() => ferramentasAbertas = !ferramentasAbertas}
  title="Ferramentas"
  aria-label="Abrir ou fechar as ferramentas"
>
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
</button>

<!-- Ajuda: atalhos só fazem sentido com teclado, então some no celular. -->
<button
  class="max-md:hidden {REDONDO} left-4 w-8 h-8 bg-slate-700 text-white text-sm font-bold hover:bg-slate-600"
  onclick={() => ajudaVisivel = !ajudaVisivel}
  title="Atalhos de teclado (?)"
  aria-label="Atalhos de teclado"
>?</button>

<button
  class="max-md:hidden {REDONDO} left-14 w-8 h-8 text-sm hover:bg-slate-600 {camadasVisiveis ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300'}"
  onclick={() => camadasVisiveis = !camadasVisiveis}
  title="Painel de camadas (L)"
  aria-label="Painel de camadas"
>🗂</button>

<button
  class="max-md:hidden {REDONDO} left-24 w-8 h-8 text-sm hover:bg-slate-600 {historicoVisivel ? 'bg-blue-600 text-white' : 'bg-slate-700 text-gray-300'}"
  onclick={() => historicoVisivel = !historicoVisivel}
  title="Histórico de alterações"
  aria-label="Histórico de alterações"
>⟲</button>
