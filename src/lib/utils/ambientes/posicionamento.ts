/** Busca de posição livre para um ambiente retangular novo, sem sobrepor os existentes. */
import type { Point, Room, RoomCategory, Wall } from '$lib/models/types';
import type { EnvironmentMatchLog } from './similaridadeNomes';
import { ENVIRONMENT_MATCH_THRESHOLD, environmentNameMatchScore, logEnvironmentPlacement } from './similaridadeNomes';

export interface RectangularEnvironment {
  name: string;
  color: string;
  roomType: RoomCategory;
}

export interface EnvironmentBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export function roomBounds(room: Room, walls: Wall[]): EnvironmentBounds | null {
  const roomWalls = room.walls
    .map((wallId) => walls.find((wall) => wall.id === wallId))
    .filter((wall): wall is Wall => !!wall);
  if (roomWalls.length < 3) return null;
  const points = roomWalls.flatMap((wall) => [wall.start, wall.end]);
  return {
    left: Math.min(...points.map((point) => point.x)),
    right: Math.max(...points.map((point) => point.x)),
    top: Math.min(...points.map((point) => point.y)),
    bottom: Math.max(...points.map((point) => point.y)),
  };
}

/**
 * Places related environments immediately to the right of the strongest name
 * match. Without a match, places the new environment immediately below the
 * most recently created one.
 */
export function findAvailableEnvironmentOrigin(
  preferredOrigin: Point,
  width: number,
  length: number,
  existingWalls: Wall[],
  existingRooms: Room[] = [],
  environmentName = '',
): Point {
  if (existingWalls.length === 0) {
    logEnvironmentPlacement(
      environmentName,
      [],
      'primeiro ambiente, usando o centro atual',
      preferredOrigin,
    );
    return preferredOrigin;
  }

  let occupiedRoomBounds: EnvironmentBounds[] = [];
  const isFree = (origin: Point): boolean => {
    const left = origin.x - width / 2;
    const right = origin.x + width / 2;
    const top = origin.y - length / 2;
    const bottom = origin.y + length / 2;

    const doesNotOverlapRoom = occupiedRoomBounds.every((bounds) =>
      right <= bounds.left ||
      left >= bounds.right ||
      bottom <= bounds.top ||
      top >= bounds.bottom,
    );
    if (!doesNotOverlapRoom) return false;

    return existingWalls.every((wall) => {
      const wallLeft = Math.min(wall.start.x, wall.end.x);
      const wallRight = Math.max(wall.start.x, wall.end.x);
      const wallTop = Math.min(wall.start.y, wall.end.y);
      const wallBottom = Math.max(wall.start.y, wall.end.y);
      return (
        right <= wallLeft ||
        left >= wallRight ||
        bottom <= wallTop ||
        top >= wallBottom
      );
    });
  };

  const roomsWithBounds = existingRooms
    .map((room) => ({ room, bounds: roomBounds(room, existingWalls) }))
    .filter((item): item is { room: Room; bounds: EnvironmentBounds } => !!item.bounds);
  occupiedRoomBounds = roomsWithBounds.map((item) => item.bounds);

  if (roomsWithBounds.length === 0) {
    if (isFree(preferredOrigin)) {
      logEnvironmentPlacement(
        environmentName,
        [],
        'sem ambientes salvos, usando uma área livre',
        preferredOrigin,
      );
      return preferredOrigin;
    }
    const allPoints = existingWalls.flatMap((wall) => [wall.start, wall.end]);
    const left = Math.min(...allPoints.map((point) => point.x));
    const bottom = Math.max(...allPoints.map((point) => point.y));
    const origin = { x: left + width / 2, y: bottom + length / 2 };
    logEnvironmentPlacement(
      environmentName,
      [],
      'sem ambientes salvos, posicionando abaixo das paredes existentes',
      origin,
    );
    return origin;
  }

  let matched = roomsWithBounds[0];
  let highestScore = 0;
  const comparisons: EnvironmentMatchLog[] = [];
  for (const item of roomsWithBounds) {
    const score = environmentNameMatchScore(environmentName, item.room.name);
    comparisons.push({
      ambiente: item.room.name,
      peso: score,
      passouDoLimite: score > ENVIRONMENT_MATCH_THRESHOLD,
    });
    if (score > highestScore) {
      matched = item;
      highestScore = score;
    }
  }

  if (highestScore > ENVIRONMENT_MATCH_THRESHOLD) {
    const alignedY = matched.bounds.top + length / 2;
    let candidate = { x: matched.bounds.right + width / 2, y: alignedY };
    for (let attempt = 0; attempt < 100; attempt++) {
      if (isFree(candidate)) {
        logEnvironmentPlacement(
          environmentName,
          comparisons,
          `à direita de "${matched.room.name}" (maior peso: ${highestScore.toFixed(3)})`,
          candidate,
          attempt,
        );
        return candidate;
      }
      candidate = { x: candidate.x + width, y: alignedY };
    }
  } else {
    const latest = roomsWithBounds[roomsWithBounds.length - 1];
    const alignedX = latest.bounds.left + width / 2;
    let candidate = { x: alignedX, y: latest.bounds.bottom + length / 2 };
    for (let attempt = 0; attempt < 100; attempt++) {
      if (isFree(candidate)) {
        logEnvironmentPlacement(
          environmentName,
          comparisons,
          `abaixo de "${latest.room.name}" (maior peso: ${highestScore.toFixed(3)})`,
          candidate,
          attempt,
        );
        return candidate;
      }
      candidate = { x: alignedX, y: candidate.y + length };
    }
  }

  const furthestRight = Math.max(
    ...existingWalls.flatMap((wall) => [wall.start.x, wall.end.x]),
  );
  const fallbackOrigin = {
    x: furthestRight + width / 2,
    y: preferredOrigin.y,
  };
  logEnvironmentPlacement(
    environmentName,
    comparisons,
    'fallback à direita de todas as paredes',
    fallbackOrigin,
    100,
  );
  return fallbackOrigin;
}

/**
 * Creates a complete rectangular environment and persists its label immediately.
 * Dimensions use the editor's world unit (centimetres).
 */
