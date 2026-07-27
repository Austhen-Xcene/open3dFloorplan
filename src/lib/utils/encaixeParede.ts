/**
 * Encaixe magnético de um item do catálogo na parede mais próxima.
 *
 * Devolve a posição com a "traseira" do item encostada na face da parede e a rotação
 * alinhada a ela, ou null se nenhuma parede estiver dentro do limite.
 * Função pura: recebe o pavimento e a função de arredondamento, não lê store.
 */
import type { Floor, Point } from '$lib/models/types';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';

export interface EncaixeEmParede {
  position: Point;
  rotation: number;
  wallId: string;
  side: 'normal' | 'anti';
  wallAngle: number;
}

export function encaixarNaParede(
  floor: Floor,
  pos: Point,
  catalogId: string,
  distanciaMaxima: number,
  arredondar: (v: number) => number,
): EncaixeEmParede | null {
  const cat = getCatalogItem(catalogId);
  if (!cat) return null;

  const halfDepth = cat.depth / 2;
  let bestDist = distanciaMaxima;
  let bestResult: EncaixeEmParede | null = null;

  for (const wall of floor.walls) {
      const wx = wall.end.x - wall.start.x;
      const wy = wall.end.y - wall.start.y;
      const wLen = Math.hypot(wx, wy);
      if (wLen < 1) continue;

      // Unit vectors along wall and perpendicular (normal)
      const ux = wx / wLen, uy = wy / wLen;
      const nx = -uy, ny = ux; // normal pointing "left" of wall direction

      // Project furniture center onto wall line
      const dx = pos.x - wall.start.x;
      const dy = pos.y - wall.start.y;
      const along = dx * ux + dy * uy; // projection along wall
      const perp = dx * nx + dy * ny;  // signed distance from wall center-line

      // Check if projection falls within wall segment (with some margin)
      if (along < -cat.width / 2 || along > wLen + cat.width / 2) continue;

      const wallHalfThickness = wall.thickness / 2;
      // Distance from furniture center to wall surface on the side the furniture is on
      const absDist = Math.abs(perp) - wallHalfThickness;

      // We want the furniture edge to touch the wall, so target distance = halfDepth
      const snapDist = Math.abs(absDist - halfDepth);

      if (snapDist < bestDist) {
        bestDist = snapDist;
        const side: 'normal' | 'anti' = perp >= 0 ? 'normal' : 'anti';
        const sign = perp >= 0 ? 1 : -1;
        // Position: push center so edge is flush with wall surface
        const targetPerp = sign * (wallHalfThickness + halfDepth);
        const clampedAlong = Math.max(cat.width / 2, Math.min(wLen - cat.width / 2, along));
        const newX = wall.start.x + ux * clampedAlong + nx * targetPerp;
        const newY = wall.start.y + uy * clampedAlong + ny * targetPerp;
        // Align rotation: furniture "front" faces away from wall
        const wallAngle = Math.atan2(wy, wx) * 180 / Math.PI;
        // Furniture at 0° has depth along Y axis, so align perpendicular
        const targetRotation = perp >= 0 ? wallAngle : wallAngle + 180;

        bestResult = {
          position: { x: arredondar(newX), y: arredondar(newY) },
          rotation: ((targetRotation % 360) + 360) % 360,
          wallId: wall.id,
          side,
          wallAngle: wallAngle
        };
      }
    }
  return bestResult;
}
