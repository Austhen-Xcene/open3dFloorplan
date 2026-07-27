/** Inserção de um ambiente retangular: acha o lugar, cria as 4 paredes e o ambiente. */
import type { Point, Room, Wall } from '$lib/models/types';
import { addRoom, addWall, beginUndoGroup, endUndoGroup } from '$lib/stores/project';
import type { RectangularEnvironment } from './posicionamento';
import { findAvailableEnvironmentOrigin } from './posicionamento';
import { roomPresets } from './presets';

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
