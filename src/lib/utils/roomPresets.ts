import type { Point, Room, RoomCategory, Wall } from '$lib/models/types';
import { addRoom, addWall, beginUndoGroup, endUndoGroup } from '$lib/stores/project';

export interface RoomPreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  getWalls: (w: number, h: number) => { start: Point; end: Point }[];
}

export const roomPresets: RoomPreset[] = [
  {
    id: 'rectangle',
    name: 'Rectangle',
    icon: '▭',
    description: 'Simple rectangular room',
    getWalls: (w, h) => [
      { start: { x: 0, y: 0 }, end: { x: w, y: 0 } },
      { start: { x: w, y: 0 }, end: { x: w, y: h } },
      { start: { x: w, y: h }, end: { x: 0, y: h } },
      { start: { x: 0, y: h }, end: { x: 0, y: 0 } },
    ],
  },
  {
    id: 'l-shape',
    name: 'L-Shape',
    icon: '⌐',
    description: 'L-shaped room',
    getWalls: (w, h) => {
      const hw = w / 2, hh = h / 2;
      return [
        { start: { x: 0, y: 0 }, end: { x: w, y: 0 } },
        { start: { x: w, y: 0 }, end: { x: w, y: hh } },
        { start: { x: w, y: hh }, end: { x: hw, y: hh } },
        { start: { x: hw, y: hh }, end: { x: hw, y: h } },
        { start: { x: hw, y: h }, end: { x: 0, y: h } },
        { start: { x: 0, y: h }, end: { x: 0, y: 0 } },
      ];
    },
  },
  {
    id: 't-shape',
    name: 'T-Shape',
    icon: '⊤',
    description: 'T-shaped room',
    getWalls: (w, h) => {
      const qw = w / 4, hh = h / 2;
      return [
        { start: { x: 0, y: 0 }, end: { x: w, y: 0 } },
        { start: { x: w, y: 0 }, end: { x: w, y: hh } },
        { start: { x: w, y: hh }, end: { x: w - qw, y: hh } },
        { start: { x: w - qw, y: hh }, end: { x: w - qw, y: h } },
        { start: { x: w - qw, y: h }, end: { x: qw, y: h } },
        { start: { x: qw, y: h }, end: { x: qw, y: hh } },
        { start: { x: qw, y: hh }, end: { x: 0, y: hh } },
        { start: { x: 0, y: hh }, end: { x: 0, y: 0 } },
      ];
    },
  },
  {
    id: 'u-shape',
    name: 'U-Shape',
    icon: '⊔',
    description: 'U-shaped room',
    getWalls: (w, h) => {
      const qw = w / 4, hh = h / 2;
      return [
        { start: { x: 0, y: 0 }, end: { x: qw, y: 0 } },
        { start: { x: qw, y: 0 }, end: { x: qw, y: hh } },
        { start: { x: qw, y: hh }, end: { x: w - qw, y: hh } },
        { start: { x: w - qw, y: hh }, end: { x: w - qw, y: 0 } },
        { start: { x: w - qw, y: 0 }, end: { x: w, y: 0 } },
        { start: { x: w, y: 0 }, end: { x: w, y: h } },
        { start: { x: w, y: h }, end: { x: 0, y: h } },
        { start: { x: 0, y: h }, end: { x: 0, y: 0 } },
      ];
    },
  },
];

export function placePreset(preset: RoomPreset, origin: Point, w = 400, h = 300): void {
  const walls = preset.getWalls(w, h);
  // Compute bounding box center so preset is centered on drop point
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const wall of walls) {
    for (const pt of [wall.start, wall.end]) {
      if (pt.x < minX) minX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y > maxY) maxY = pt.y;
    }
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  beginUndoGroup();
  for (const wall of walls) {
    addWall(
      { x: origin.x + wall.start.x - cx, y: origin.y + wall.start.y - cy },
      { x: origin.x + wall.end.x - cx, y: origin.y + wall.end.y - cy }
    );
  }
  endUndoGroup();
}

export interface RectangularEnvironment {
  name: string;
  color: string;
  roomType: RoomCategory;
}

interface EnvironmentBounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

const ENVIRONMENT_MATCH_THRESHOLD = 0.7;

interface EnvironmentMatchLog {
  ambiente: string;
  peso: number;
  passouDoLimite: boolean;
}

function logEnvironmentPlacement(
  environmentName: string,
  comparisons: EnvironmentMatchLog[],
  decision: string,
  origin: Point,
  attempts = 0,
) {
  console.groupCollapsed(`[Room Match] "${environmentName}" → ${decision}`);
  if (comparisons.length > 0) {
    console.table(comparisons);
  } else {
    console.info('Nenhum ambiente disponível para comparação.');
  }
  console.info('Limite para posicionar à direita:', ENVIRONMENT_MATCH_THRESHOLD);
  console.info('Decisão:', decision);
  console.info('Posição final:', { x: origin.x, y: origin.y });
  console.info('Posições ocupadas ignoradas:', attempts);
  console.groupEnd();
}

function normalizeEnvironmentName(name: string): string[] {
  const ignoredWords = new Set(['a', 'as', 'da', 'das', 'de', 'do', 'dos', 'e', 'o', 'os']);
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 1 && !ignoredWords.has(word));
}

/** Damerau-Levenshtein distance also treats adjacent transposed letters as one typo. */
function wordEditDistance(a: string, b: string): number {
  const distances = Array.from(
    { length: a.length + 1 },
    () => Array<number>(b.length + 1).fill(0),
  );
  for (let i = 0; i <= a.length; i++) distances[i][0] = i;
  for (let j = 0; j <= b.length; j++) distances[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const substitutionCost = a[i - 1] === b[j - 1] ? 0 : 1;
      distances[i][j] = Math.min(
        distances[i - 1][j] + 1,
        distances[i][j - 1] + 1,
        distances[i - 1][j - 1] + substitutionCost,
      );
      if (
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        distances[i][j] = Math.min(
          distances[i][j],
          distances[i - 2][j - 2] + substitutionCost,
        );
      }
    }
  }
  return distances[a.length][b.length];
}

function wordSimilarity(a: string, b: string): number {
  const longestLength = Math.max(a.length, b.length);
  if (longestLength === 0) return 1;
  return Math.max(0, 1 - wordEditDistance(a, b) / longestLength);
}

/**
 * Returns a fuzzy score from 0 to 1 using the strongest meaningful word pair.
 * This lets "qaurto menino" match "quarto casal" despite the transposed letters.
 */
export function environmentNameMatchScore(candidateName: string, existingName: string): number {
  const candidateWords = normalizeEnvironmentName(candidateName);
  const existingWords = normalizeEnvironmentName(existingName);
  if (candidateWords.length === 0 || existingWords.length === 0) return 0;

  let score = 0;
  for (const candidate of candidateWords) {
    for (const existing of existingWords) {
      score = Math.max(score, wordSimilarity(candidate, existing));
    }
  }
  return Math.round(score * 1000) / 1000;
}

function roomBounds(room: Room, walls: Wall[]): EnvironmentBounds | null {
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
export function placeRectangularEnvironment(
  environment: RectangularEnvironment,
  origin: Point,
  width: number,
  length: number,
  existingWalls: Wall[] = [],
  existingRooms: Room[] = [],
): string {
  const preset = roomPresets[0];
  const walls = preset.getWalls(width, length);
  const availableOrigin = findAvailableEnvironmentOrigin(
    origin,
    width,
    length,
    existingWalls,
    existingRooms,
    environment.name,
  );
  const cx = width / 2;
  const cy = length / 2;

  beginUndoGroup();
  const wallIds = walls.map((wall) =>
    addWall(
      { x: availableOrigin.x + wall.start.x - cx, y: availableOrigin.y + wall.start.y - cy },
      { x: availableOrigin.x + wall.end.x - cx, y: availableOrigin.y + wall.end.y - cy },
      false,
    ),
  );
  const roomId = addRoom({
    name: environment.name,
    walls: wallIds,
    floorTexture: 'hardwood',
    area: Math.round((width * length) / 100) / 100,
    color: environment.color,
    roomType: environment.roomType,
  });
  endUndoGroup(`Added ${environment.name}`);
  return roomId;
}
