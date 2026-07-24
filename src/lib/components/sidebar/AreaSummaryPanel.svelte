<script lang="ts">
  import { currentProject, detectedRoomsStore } from '$lib/stores/project';
  import { projectSettings, formatArea } from '$lib/stores/settings';
  import type { Project, Room } from '$lib/models/types';

  let project = $state<Project | null>(null);
  let detectedRooms: Room[] = $state([]);
  let settings = $state($projectSettings);

  currentProject.subscribe((value) => { project = value; });
  detectedRoomsStore.subscribe((r) => { detectedRooms = r; });
  projectSettings.subscribe((s) => { settings = s; });

  // Summarize the whole project, across every pavimento, while keeping only
  // rooms whose boundary walls still exist. The detector refreshes geometry
  // for the active floor; persisted valid rooms cover the other floors.
  let allRooms = $derived.by(() => {
    if (!project) return [];
    const projectRooms: Room[] = [];

    for (const floor of project.floors) {
      const currentWallIds = new Set(floor.walls.map((wall) => wall.id));
      const isCurrentRoom = (room: Room) =>
        room.walls.length >= 3
        && room.walls.every((wallId) => currentWallIds.has(wallId));
      const floorRooms = new Map<string, Room>();

      for (const room of floor.rooms) {
        if (isCurrentRoom(room)) floorRooms.set(room.id, room);
      }
      if (floor.id === project.activeFloorId) {
        // Current detected geometry/area replaces matching saved metadata only
        // on the open floor. Other floors retain their own saved room data.
        for (const room of detectedRooms) {
          if (isCurrentRoom(room)) floorRooms.set(room.id, room);
        }
      }
      projectRooms.push(...floorRooms.values());
    }
    return projectRooms;
  });

  let totalArea = $derived(allRooms.reduce((sum: number, r: Room) => sum + r.area, 0));

</script>

<div class="space-y-3">
  <!-- Quick Stats -->
  <div class="grid grid-cols-2 gap-2">
    <div class="bg-blue-700 rounded-lg p-3 text-center shadow-sm">
      <div class="text-lg font-bold text-white">{allRooms.length}</div>
      <div class="text-[10px] font-medium text-blue-100">Ambientes</div>
    </div>
    <div class="bg-green-50 border border-green-200 rounded-lg p-3 text-center">
      <div class="text-lg font-bold text-green-700">{formatArea(totalArea, settings.units)}</div>
      <div class="text-[10px] text-green-500">Área total</div>
    </div>
  </div>

  <!-- Per-Room Breakdown -->
  {#if allRooms.length > 0}
    <div>
      <h4 class="text-xs font-semibold text-gray-500 uppercase mb-1.5">Detalhamento dos ambientes</h4>
      <div class="space-y-0.5">
        {#each allRooms as room}
          {@const pct = totalArea > 0 ? (room.area / totalArea * 100) : 0}
          <div class="flex items-center gap-1.5 text-xs px-1 py-1">
            <div class="flex-1 min-w-0">
              <div class="flex items-center justify-between">
                <span class="text-gray-700 truncate">{room.name}</span>
                <span class="text-gray-500 ml-1 shrink-0">{formatArea(room.area, settings.units)}</span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-1 mt-0.5">
                <div class="bg-blue-400 h-1 rounded-full" style="width: {Math.min(pct, 100)}%"></div>
              </div>
            </div>
            <span class="text-[10px] text-gray-400 w-8 text-right shrink-0">{pct.toFixed(0)}%</span>
          </div>
        {/each}
      </div>
    </div>
  {:else}
    <p class="text-xs text-gray-400 text-center py-4">Nenhum ambiente encontrado.<br/>Adicione ambientes para visualizar o resumo.</p>
  {/if}
</div>
