<script lang="ts">
  /** Faixa de instrução no topo do canvas, uma por modo ativo. */
  let { ferramenta, desenhandoParede, idEmColocacao, rotacaoEmColocacao, medindo, anotandoTexto, anotandoCota, primeiroPontoCota }: {
    ferramenta: string;
    desenhandoParede: boolean;
    idEmColocacao: string | null;
    rotacaoEmColocacao: number;
    medindo: boolean;
    anotandoTexto: boolean;
    anotandoCota: boolean;
    primeiroPontoCota: boolean;
  } = $props();

  const FAIXA = 'absolute top-2 left-1/2 -translate-x-1/2 text-white px-3 py-1 rounded-full text-xs shadow';
</script>

{#if ferramenta === 'wall' && desenhandoParede}
  <div class="{FAIXA} bg-blue-600">
    Clique para adicionar um trecho · Duplo clique encerra · C fecha o contorno · Esc cancela
  </div>
{/if}

{#if idEmColocacao && ferramenta === 'furniture'}
  <div class="{FAIXA} bg-purple-600">
    Clique para posicionar · Scroll ou R para girar ({rotacaoEmColocacao}°) · Esc cancela
  </div>
{/if}

{#if medindo}
  <div class="{FAIXA} bg-red-600">
    Clique com o botão direito em dois pontos para medir · M sai · Esc cancela
  </div>
{/if}

{#if anotandoTexto}
  <div class="{FAIXA} bg-emerald-600">Clique para posicionar o texto · Esc cancela</div>
{/if}

{#if anotandoCota}
  <div class="{FAIXA} bg-indigo-600">
    {primeiroPontoCota ? 'Clique no segundo ponto da cota' : 'Clique no primeiro ponto'} · N sai · Esc cancela
  </div>
{/if}
