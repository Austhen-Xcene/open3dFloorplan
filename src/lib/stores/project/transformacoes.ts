/** Rotação de ambiente e resolução de sobreposição entre ambientes. */
import { get } from 'svelte/store';
import type { Wall, Point, Room } from '$lib/models/types';
import { currentProject } from './estado';
import { mutate, snapshot } from './historico';
import { roomBoundsOnFloor, translateSavedRooms, type RoomBounds } from '$lib/utils/ambientesGeometria';

export function rotateRoom90(roomId: string): boolean {
  const p = get(currentProject);
  if (!p) return false;
  const floor = p.floors.find((f) => f.id === p.activeFloorId);
  const room = floor?.rooms.find((item) => item.id === roomId);
  if (!floor || !room || room.walls.length === 0) return false;

  type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
  const boundsForRoom = (candidate: Room): Bounds | null => {
    const ownedWalls = candidate.walls
      .map((wallId) => floor.walls.find((wall) => wall.id === wallId))
      .filter((wall): wall is Wall => Boolean(wall));
    if (ownedWalls.length !== candidate.walls.length || ownedWalls.length === 0) return null;
    const ownedPoints = ownedWalls.flatMap((wall) => [wall.start, wall.end]);
    return {
      minX: Math.min(...ownedPoints.map((point) => point.x)),
      minY: Math.min(...ownedPoints.map((point) => point.y)),
      maxX: Math.max(...ownedPoints.map((point) => point.x)),
      maxY: Math.max(...ownedPoints.map((point) => point.y)),
    };
  };

  const roomBounds = new Map<string, Bounds>();
  for (const candidate of floor.rooms) {
    const bounds = boundsForRoom(candidate);
    if (bounds) roomBounds.set(candidate.id, bounds);
  }
  const targetBounds = roomBounds.get(roomId);
  if (!targetBounds) return false;

  const oldWidth = targetBounds.maxX - targetBounds.minX;
  const oldHeight = targetBounds.maxY - targetBounds.minY;
  const cx = (targetBounds.minX + targetBounds.maxX) / 2;
  const cy = (targetBounds.minY + targetBounds.maxY) / 2;
  const rotatePoint = (point: Point): Point => ({
    x: cx - (point.y - cy),
    y: cy + (point.x - cx),
  });

  type Direction = 'top' | 'bottom' | 'left' | 'right';
  const neighbourMoves = new Map<string, Point>();
  const TOUCH_TOLERANCE = 2;
  const overlaps = (a1: number, a2: number, b1: number, b2: number) =>
    Math.min(a2, b2) - Math.max(a1, b1) > TOUCH_TOLERANCE;
  const touchesOutward = (from: Bounds, candidate: Bounds, direction: Direction) => {
    if (direction === 'top') {
      return Math.abs(candidate.maxY - from.minY) <= TOUCH_TOLERANCE
        && overlaps(from.minX, from.maxX, candidate.minX, candidate.maxX);
    }
    if (direction === 'bottom') {
      return Math.abs(candidate.minY - from.maxY) <= TOUCH_TOLERANCE
        && overlaps(from.minX, from.maxX, candidate.minX, candidate.maxX);
    }
    if (direction === 'left') {
      return Math.abs(candidate.maxX - from.minX) <= TOUCH_TOLERANCE
        && overlaps(from.minY, from.maxY, candidate.minY, candidate.maxY);
    }
    return Math.abs(candidate.minX - from.maxX) <= TOUCH_TOLERANCE
      && overlaps(from.minY, from.maxY, candidate.minY, candidate.maxY);
  };

  // Move the whole connected row/column, not just the immediate neighbour.
  // A positive boundary delta pushes the chain out; a negative delta pulls it
  // in so the shared walls remain touching after the room becomes narrower.
  const collectOutwardChain = (direction: Direction, boundaryDelta: number) => {
    if (Math.abs(boundaryDelta) <= TOUCH_TOLERANCE) return;
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
      const currentId = queue.shift()!;
      const currentBounds = roomBounds.get(currentId);
      if (!currentBounds) continue;
      for (const [candidateId, candidateBounds] of roomBounds) {
        if (visited.has(candidateId) || !touchesOutward(currentBounds, candidateBounds, direction)) continue;
        visited.add(candidateId);
        const previousMovement = neighbourMoves.get(candidateId) ?? { x: 0, y: 0 };
        neighbourMoves.set(candidateId, {
          x: previousMovement.x + movement.x,
          y: previousMovement.y + movement.y,
        });
        queue.push(candidateId);
      }
    }
  };

  const horizontalBoundaryDelta = (oldHeight - oldWidth) / 2;
  const verticalBoundaryDelta = (oldWidth - oldHeight) / 2;
  collectOutwardChain('left', horizontalBoundaryDelta);
  collectOutwardChain('right', horizontalBoundaryDelta);
  collectOutwardChain('top', verticalBoundaryDelta);
  collectOutwardChain('bottom', verticalBoundaryDelta);

  mutate((active) => {
    const savedRoom = active.rooms.find((item) => item.id === roomId);
    if (!savedRoom) return;
    for (const wallId of savedRoom.walls) {
      const wall = active.walls.find((item) => item.id === wallId);
      if (!wall) continue;
      wall.start = rotatePoint(wall.start);
      wall.end = rotatePoint(wall.end);
      if (wall.curvePoint) wall.curvePoint = rotatePoint(wall.curvePoint);
    }
    if (savedRoom.labelOffset) {
      savedRoom.labelOffset = {
        x: -savedRoom.labelOffset.y,
        y: savedRoom.labelOffset.x,
      };
    }

    const rotatedWallIds = new Set(savedRoom.walls);
    for (const [neighbourId, movement] of neighbourMoves) {
      const neighbour = active.rooms.find((item) => item.id === neighbourId);
      if (!neighbour) continue;
      for (const wallId of neighbour.walls) {
        // Generated environments own independent divider walls. This guard
        // avoids translating a legacy shared wall after it has been rotated.
        if (rotatedWallIds.has(wallId)) continue;
        const wall = active.walls.find((item) => item.id === wallId);
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
      if (neighbour.labelOffset) {
        // The label offset is local to the room and therefore stays unchanged.
        neighbour.labelOffset = { ...neighbour.labelOffset };
      }
    }
  }, `Rotated ${room.name}`);
  return true;
}

/**
 * If a moved room overlaps another room, place it against the nearest free
 * boundary. Touching edges are allowed; intersecting interiors are not.
 * This intentionally does not create its own undo snapshot because it is the
 * final step of the room drag already in progress.
 */
export function resolveRoomOverlap(roomId: string): boolean {
  const p = get(currentProject);
  if (!p) return false;
  const floor = p.floors.find((item) => item.id === p.activeFloorId);
  const room = floor?.rooms.find((item) => item.id === roomId);
  if (!floor || !room) return false;

  const target = roomBoundsOnFloor(floor, room);
  if (!target) return false;
  const obstacles = floor.rooms
    .filter((item) => item.id !== roomId)
    .map((item) => roomBoundsOnFloor(floor, item))
    .filter((bounds): bounds is RoomBounds => Boolean(bounds));
  if (obstacles.length === 0) return false;

  const epsilon = 0.01;
  const intersects = (a: RoomBounds, b: RoomBounds) =>
    Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > epsilon
    && Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) > epsilon;
  if (!obstacles.some((bounds) => intersects(target, bounds))) return false;

  const xCandidates = new Set<number>([0]);
  const yCandidates = new Set<number>([0]);
  for (const obstacle of obstacles) {
    xCandidates.add(obstacle.minX - target.maxX);
    xCandidates.add(obstacle.maxX - target.minX);
    yCandidates.add(obstacle.minY - target.maxY);
    yCandidates.add(obstacle.maxY - target.minY);
  }

  let best: Point | null = null;
  let bestCost = Infinity;
  let bestAxes = Infinity;
  for (const dx of xCandidates) {
    for (const dy of yCandidates) {
      if (Math.abs(dx) <= epsilon && Math.abs(dy) <= epsilon) continue;
      const moved = {
        minX: target.minX + dx,
        maxX: target.maxX + dx,
        minY: target.minY + dy,
        maxY: target.maxY + dy,
      };
      if (obstacles.some((bounds) => intersects(moved, bounds))) continue;
      const cost = dx * dx + dy * dy;
      const axes = Number(Math.abs(dx) > epsilon) + Number(Math.abs(dy) > epsilon);
      if (cost < bestCost - epsilon || (Math.abs(cost - bestCost) <= epsilon && axes < bestAxes)) {
        best = { x: dx, y: dy };
        bestCost = cost;
        bestAxes = axes;
      }
    }
  }
  if (!best) return false;

  translateSavedRooms(floor, new Map([[roomId, best]]), new Set());
  p.updatedAt = new Date();
  currentProject.set({ ...p });
  return true;
}

