/**
 * Geometria pura de ambientes: limites, reflow de vizinhos e translação.
 *
 * Funções puras sobre Floor/Room — sem store, sem I/O. Usadas pelas operações
 * de ambiente em stores/project/.
 */
import type { Floor, Wall, Room, Point } from '$lib/models/types';

export type RoomBounds = { minX: number; minY: number; maxX: number; maxY: number };
export type RoomDirection = 'top' | 'bottom' | 'left' | 'right';

export function roomBoundsOnFloor(floor: Floor, room: Room): RoomBounds | null {
  const walls = room.walls
    .map((wallId) => floor.walls.find((wall) => wall.id === wallId))
    .filter((wall): wall is Wall => Boolean(wall));
  if (walls.length !== room.walls.length || walls.length === 0) return null;
  const points = walls.flatMap((wall) => [wall.start, wall.end]);
  return {
    minX: Math.min(...points.map((point) => point.x)),
    minY: Math.min(...points.map((point) => point.y)),
    maxX: Math.max(...points.map((point) => point.x)),
    maxY: Math.max(...points.map((point) => point.y)),
  };
}

/**
 * Calculate translations for every connected room on each side of a resized
 * room. Positive deltas push neighbours away; negative deltas pull them in.
 */
export function connectedRoomReflowMoves(
  floor: Floor,
  roomId: string,
  horizontalBoundaryDelta: number,
  verticalBoundaryDelta: number,
): Map<string, Point> {
  const boundsByRoom = new Map<string, RoomBounds>();
  for (const room of floor.rooms) {
    const bounds = roomBoundsOnFloor(floor, room);
    if (bounds) boundsByRoom.set(room.id, bounds);
  }

  const moves = new Map<string, Point>();
  const tolerance = 2;
  const overlapsAxis = (a1: number, a2: number, b1: number, b2: number) =>
    Math.min(a2, b2) - Math.max(a1, b1) > tolerance;
  const touches = (from: RoomBounds, candidate: RoomBounds, direction: RoomDirection) => {
    if (direction === 'top') {
      return Math.abs(candidate.maxY - from.minY) <= tolerance
        && overlapsAxis(from.minX, from.maxX, candidate.minX, candidate.maxX);
    }
    if (direction === 'bottom') {
      return Math.abs(candidate.minY - from.maxY) <= tolerance
        && overlapsAxis(from.minX, from.maxX, candidate.minX, candidate.maxX);
    }
    if (direction === 'left') {
      return Math.abs(candidate.maxX - from.minX) <= tolerance
        && overlapsAxis(from.minY, from.maxY, candidate.minY, candidate.maxY);
    }
    return Math.abs(candidate.minX - from.maxX) <= tolerance
      && overlapsAxis(from.minY, from.maxY, candidate.minY, candidate.maxY);
  };

  const collect = (direction: RoomDirection, boundaryDelta: number) => {
    if (Math.abs(boundaryDelta) <= tolerance) return;
    const visited = new Set<string>([roomId]);
    const queue = [roomId];
    const movement = direction === 'top'
      ? { x: 0, y: -boundaryDelta }
      : direction === 'bottom'
        ? { x: 0, y: boundaryDelta }
        : direction === 'left'
          ? { x: -boundaryDelta, y: 0 }
          : { x: boundaryDelta, y: 0 };

    while (queue.length > 0) {
      const currentBounds = boundsByRoom.get(queue.shift()!);
      if (!currentBounds) continue;
      for (const [candidateId, candidateBounds] of boundsByRoom) {
        if (visited.has(candidateId) || !touches(currentBounds, candidateBounds, direction)) continue;
        visited.add(candidateId);
        const previous = moves.get(candidateId) ?? { x: 0, y: 0 };
        moves.set(candidateId, { x: previous.x + movement.x, y: previous.y + movement.y });
        queue.push(candidateId);
      }
    }
  };

  collect('left', horizontalBoundaryDelta);
  collect('right', horizontalBoundaryDelta);
  collect('top', verticalBoundaryDelta);
  collect('bottom', verticalBoundaryDelta);
  return moves;
}

export function translateSavedRooms(
  floor: Floor,
  moves: ReadonlyMap<string, Point>,
  excludedWallIds: ReadonlySet<string>,
) {
  for (const [roomId, movement] of moves) {
    const room = floor.rooms.find((item) => item.id === roomId);
    if (!room) continue;
    for (const wallId of room.walls) {
      if (excludedWallIds.has(wallId)) continue;
      const wall = floor.walls.find((item) => item.id === wallId);
      if (!wall) continue;
      wall.start = { x: wall.start.x + movement.x, y: wall.start.y + movement.y };
      wall.end = { x: wall.end.x + movement.x, y: wall.end.y + movement.y };
      if (wall.curvePoint) {
        wall.curvePoint = {
          x: wall.curvePoint.x + movement.x,
          y: wall.curvePoint.y + movement.y,
        };
      }
    }
  }
}

/** Update a rectangular room created by the environment form, keeping its centre fixed. */
