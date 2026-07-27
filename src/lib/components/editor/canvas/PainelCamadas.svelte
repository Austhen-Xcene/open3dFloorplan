<script lang="ts">
  import { layerVisibility } from '$lib/stores/project';

  const CAMADAS: [string, string][] = [
    ['walls', 'Paredes'],
    ['doors', 'Portas'],
    ['windows', 'Janelas'],
    ['furniture', 'Objetos'],
    ['stairs', 'Escadas'],
    ['columns', 'Colunas'],
    ['guides', 'Guias'],
    ['measurements', 'Medições'],
  ];

  let { visibilidade, rotulosAmbiente = $bindable(), cotas = $bindable() }: {
    visibilidade: Record<string, boolean>;
    rotulosAmbiente: boolean;
    cotas: boolean;
  } = $props();

  const LINHA = 'flex items-center gap-2 py-0.5 cursor-pointer hover:bg-gray-50 rounded px-1';
</script>

<div class="absolute bottom-12 right-2 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-xs min-w-[160px]">
  <div class="font-semibold text-gray-700 mb-2">Camadas</div>

  {#each CAMADAS as [chave, rotulo]}
    <label class={LINHA}>
      <input
        type="checkbox"
        checked={visibilidade[chave]}
        onchange={() => layerVisibility.update((v) => ({ ...v, [chave]: !(v as Record<string, boolean>)[chave] }))}
        class="accent-blue-500"
      />
      <span>{rotulo}</span>
    </label>
  {/each}

  <hr class="my-1 border-gray-100" />

  <label class={LINHA}>
    <input type="checkbox" bind:checked={rotulosAmbiente} class="accent-blue-500" />
    <span>Nomes dos ambientes</span>
  </label>
  <label class={LINHA}>
    <input type="checkbox" bind:checked={cotas} class="accent-blue-500" />
    <span>Cotas</span>
  </label>
</div>
