/**
 * Reconciliação entre os ambientes detectados na geometria e os ambientes salvos.
 *
 * O detector devolve faces anônimas ("Room 1", "Room 2") a cada mudança de parede.
 * Esta função reata cada face aos dados que o usuário já gravou (nome, cor, textura),
 * para que renomear um ambiente não se perca ao mover uma parede vizinha.
 *
 * Função pura sobre Floor — sem store, sem canvas.
 */
import type { Floor, Room } from '$lib/models/types';
import { detectRooms, getRoomPolygon } from '$lib/utils/roomDetection';

/** Tolerância para considerar dois retângulos o mesmo ambiente, em cm. */
const TOLERANCIA_CM = 1;

type Limites = { left: number; right: number; top: number; bottom: number };

/**
 * Assinatura da geometria do pavimento. Só vale reconciliar quando ela muda —
 * o id do pavimento entra no hash para que trocar de andar com a mesma planta
 * ainda atualize a lista.
 */
export function assinaturaGeometria(floor: Floor): string {
  return JSON.stringify([floor.id, floor.walls.map((w) => [w.id, w.start, w.end])]);
}

export function reconciliarAmbientes(floor: Floor, detectadosAnteriores: Room[]): Room[] {
  const currentFloor = floor;
  const detectedRooms = detectadosAnteriores;

    const newRooms = detectRooms(currentFloor.walls);
    const savedRooms = currentFloor.rooms || [];
    const usedSavedRoomIds = new Set<string>();
    

    const getLimites = (room: Room): Limites | null => {
      const polygon = getRoomPolygon(room, currentFloor!.walls);
      if (polygon.length < 3) return null;
      return {
        left: Math.min(...polygon.map((point) => point.x)),
        right: Math.max(...polygon.map((point) => point.x)),
        top: Math.min(...polygon.map((point) => point.y)),
        bottom: Math.max(...polygon.map((point) => point.y)),
      };
    };
    const sameLimites = (a: Limites | null, b: Limites | null): boolean =>
      !!a && !!b &&
      Math.abs(a.left - b.left) < TOLERANCIA_CM &&
      Math.abs(a.right - b.right) < TOLERANCIA_CM &&
      Math.abs(a.top - b.top) < TOLERANCIA_CM &&
      Math.abs(a.bottom - b.bottom) < TOLERANCIA_CM;

    const savedLimites = new Map(
      savedRooms.map((room) => [room.id, getLimites(room)]),
    );
    const reconciledRooms: Room[] = [];

    for (const nr of newRooms) {
      const nrWalls = new Set(nr.walls);
      const existing = detectedRooms.find(old => {
        const oldWalls = new Set(old.walls);
        return oldWalls.size === nrWalls.size && [...nrWalls].every(w => oldWalls.has(w));
      });
      let saved = savedRooms.find(sr => {
        if (usedSavedRoomIds.has(sr.id)) return false;
        const srWalls = new Set(sr.walls);
        return srWalls.size === nrWalls.size && [...nrWalls].every(w => srWalls.has(w));
      });
      // Adjacent generated environments have coincident boundary walls. The
      // detector may choose the neighbour's wall ID, so fall back to matching
      // the exact geometric bounds rather than losing the persisted metadata.
      const nrLimites = getLimites(nr);
      if (!saved) {
        saved = savedRooms.find((sr) =>
          !usedSavedRoomIds.has(sr.id) &&
          sameLimites(nrLimites, savedLimites.get(sr.id) ?? null),
        );
      }
      // Once this floor uses persisted environments, only those environments
      // are valid rooms. A temporary gap between rooms must never become an
      // automatic "Room N" made from walls that belong to its neighbours.
      if (savedRooms.length > 0 && !saved) continue;

      // Persisted user data always wins over the detector's temporary "Room N" names.
      const metadata = saved ?? existing;
      if (metadata) {
        nr.id = metadata.id;
        nr.name = metadata.name;
        if (metadata.floorTexture) nr.floorTexture = metadata.floorTexture;
        nr.color = metadata.color;
        nr.roomType = metadata.roomType;
        nr.labelOffset = metadata.labelOffset;
      }
      if (saved) usedSavedRoomIds.add(saved.id);

      // Duplicate coincident edges can make the detector emit the same face
      // more than once. Only render and expose one room for that geometry.
      if (reconciledRooms.some((room) => sameLimites(getLimites(room), nrLimites))) continue;
      reconciledRooms.push(nr);
    }

    // If duplicate shared edges prevented a face from being detected at all,
    // retain the canonical saved room so its name and properties remain usable.
    for (const saved of savedRooms) {
      if (usedSavedRoomIds.has(saved.id)) continue;
      const limites = savedLimites.get(saved.id) ?? null;
      if (!limites) continue;
      if (reconciledRooms.some((room) => sameLimites(getLimites(room), limites))) continue;
      reconciledRooms.push({ ...saved });
    }

  return reconciledRooms;
}
