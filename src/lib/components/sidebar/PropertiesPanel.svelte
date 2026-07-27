<script lang="ts">
  import type { Floor, Room } from '$lib/models/types';
  import { activeFloor, selectedElementId, selectedRoomId, detectedRoomsStore } from '$lib/stores/project';
  import { projectSettings } from '$lib/stores/settings';
  import PropriedadesParede from './propriedades/PropriedadesParede.svelte';
  import PropriedadesPorta from './propriedades/PropriedadesPorta.svelte';
  import PropriedadesJanela from './propriedades/PropriedadesJanela.svelte';
  import PropriedadesEquipamento from './propriedades/PropriedadesEquipamento.svelte';
  import PropriedadesAmbiente from './propriedades/PropriedadesAmbiente.svelte';
  import PropriedadesEscada from './propriedades/PropriedadesEscada.svelte';
  import PropriedadesColuna from './propriedades/PropriedadesColuna.svelte';
  import PropriedadesTexto from './propriedades/PropriedadesTexto.svelte';
  import PropriedadesImagemFundo from './propriedades/PropriedadesImagemFundo.svelte';

  let { is3D = false }: { is3D?: boolean } = $props();

  let pavimento = $state<Floor | null>(null);
  let idSelecionado = $state<string | null>(null);
  let idAmbiente = $state<string | null>(null);
  let ambientesDetectados = $state<Room[]>([]);

  activeFloor.subscribe((f) => { pavimento = f; });
  selectedElementId.subscribe((id) => { idSelecionado = id; });
  selectedRoomId.subscribe((id) => { idAmbiente = id; });
  detectedRoomsStore.subscribe((rooms) => { ambientesDetectados = rooms; });

  let unidades = $derived($projectSettings.units);

  // Um id só corresponde a um tipo de elemento — o primeiro que casar é o selecionado.
  let parede = $derived(pavimento?.walls?.find((w) => w.id === idSelecionado) ?? null);
  let porta = $derived(pavimento?.doors?.find((d) => d.id === idSelecionado) ?? null);
  let janela = $derived(pavimento?.windows?.find((w) => w.id === idSelecionado) ?? null);
  let equipamento = $derived(pavimento?.furniture?.find((f) => f.id === idSelecionado) ?? null);
  let escada = $derived(pavimento?.stairs?.find((s) => s.id === idSelecionado) ?? null);
  let coluna = $derived(pavimento?.columns?.find((c) => c.id === idSelecionado) ?? null);
  let texto = $derived(pavimento?.textAnnotations?.find((t) => t.id === idSelecionado) ?? null);
  let ambiente = $derived(
    pavimento?.rooms?.find((r) => r.id === idAmbiente) ?? ambientesDetectados.find((r) => r.id === idAmbiente) ?? null,
  );
  let imagemFundo = $derived(pavimento?.backgroundImage ?? null);

  let paredeDaPorta = $derived(porta ? pavimento?.walls?.find((w) => w.id === porta.wallId) ?? null : null);
  let paredeDaJanela = $derived(janela ? pavimento?.walls?.find((w) => w.id === janela.wallId) ?? null : null);

  let temSelecao = $derived(
    !!(parede || porta || janela || equipamento || ambiente || escada || coluna || texto || (!is3D && imagemFundo)),
  );
</script>

<!-- Barra à direita no desktop; gaveta que sobe pela base no celular. -->
<div
  class="{is3D ? 'w-80' : 'w-64'} shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-y-auto p-3 fixed right-0 top-12 bottom-9 z-40 shadow-lg max-md:top-auto max-md:bottom-0 max-md:left-0 max-md:w-full max-md:max-h-[45vh] max-md:border-l-0 max-md:border-t max-md:rounded-t-xl max-md:shadow-2xl"
  class:hidden={!temSelecao}
>
  {#if parede}
    <PropriedadesParede {parede} {unidades} />
  {:else if porta}
    <PropriedadesPorta {porta} parede={paredeDaPorta} {unidades} />
  {:else if janela}
    <PropriedadesJanela {janela} parede={paredeDaJanela} {unidades} />
  {:else if equipamento}
    <PropriedadesEquipamento item={equipamento} {unidades} />
  {:else if ambiente}
    <PropriedadesAmbiente {ambiente} {pavimento} {unidades} />
  {:else if escada}
    <PropriedadesEscada {escada} {unidades} />
  {:else if coluna}
    <PropriedadesColuna {coluna} {unidades} />
  {:else if texto}
    <PropriedadesTexto {texto} />
  {/if}

  {#if imagemFundo}
    <PropriedadesImagemFundo imagem={imagemFundo} />
  {/if}
</div>
