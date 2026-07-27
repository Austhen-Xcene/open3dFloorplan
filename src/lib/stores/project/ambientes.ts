/** Criação e edição de ambientes retangulares. */
import { get } from 'svelte/store';
import type { Point, Room } from '$lib/models/types';
import { currentProject, uid, detectedRoomsStore } from './estado';
import { mutate, coalesceKeyFor } from './historico';
import { connectedRoomReflowMoves, translateSavedRooms } from '$lib/utils/ambientesGeometria';

export function updateRoom(id: string, updates: Partial<{ name: string; floorTexture: string; color: string; roomType: import('$lib/models/types').RoomCategory; labelOffset: import('$lib/models/types').Point | undefined }>) {
  mutate((f) => {
    let r = f.rooms.find((r) => r.id === id);
    if (r) {
      Object.assign(r, updates);
    } else {
      // Room not in floor.rooms yet (dynamically detected) — add it so changes persist on save
      const detected = get(detectedRoomsStore).find((r) => r.id === id);
      if (detected) {
        const newRoom = { ...detected, ...updates };
        f.rooms.push(newRoom);
      }
    }
  }, undefined, coalesceKeyFor('room', id, updates));
}

/** Persist a room created from a predefined environment before canvas detection runs. */
export function addRoom(room: Omit<import('$lib/models/types').Room, 'id'>): string {
  const id = uid();
  mutate((f) => {
    f.rooms.push({ id, ...room });
  }, `Added ${room.name}`);
  return id;
}

export function updateRectangularRoom(roomId: string, name: string, width: number, length: number): boolean {
  const p = get(currentProject);
  if (!p) return false;
  const floor = p.floors.find((f) => f.id === p.activeFloorId);
  const room = floor?.rooms.find((r) => r.id === roomId);
  if (!floor || !room || room.walls.length !== 4) return false;

  const walls = room.walls.map((id) => floor.walls.find((wall) => wall.id === id));
  if (walls.some((wall) => !wall)) return false;

  const points = walls.flatMap((wall) => [wall!.start, wall!.end]);
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  const oldWidth = maxX - minX;
  const oldLength = maxY - minY;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const left = cx - width / 2;
  const right = cx + width / 2;
  const top = cy - length / 2;
  const bottom = cy + length / 2;
  const rectangle = [
    { start: { x: left, y: top }, end: { x: right, y: top } },
    { start: { x: right, y: top }, end: { x: right, y: bottom } },
    { start: { x: right, y: bottom }, end: { x: left, y: bottom } },
    { start: { x: left, y: bottom }, end: { x: left, y: top } },
  ];
  const neighbourMoves = connectedRoomReflowMoves(
    floor,
    roomId,
    (width - oldWidth) / 2,
    (length - oldLength) / 2,
  );

  mutate((active) => {
    const savedRoom = active.rooms.find((item) => item.id === roomId);
    if (!savedRoom) return;
    savedRoom.name = name;
    savedRoom.area = Math.round((width * length) / 100) / 100;
    savedRoom.walls.forEach((wallId, index) => {
      const wall = active.walls.find((item) => item.id === wallId);
      if (wall) {
        wall.start = rectangle[index].start;
        wall.end = rectangle[index].end;
      }
    });
    translateSavedRooms(active, neighbourMoves, new Set(savedRoom.walls));
  }, `Updated ${name}`);

  detectedRoomsStore.update((rooms) =>
    rooms.map((item) =>
      item.id === roomId
        ? { ...item, name, area: Math.round((width * length) / 100) / 100 }
        : item,
    ),
  );
  return true;
}

/**
 * Rotate a saved room clockwise by 90 degrees around its centre. When the
 * rotated room grows on one axis, move the touching neighbours (and the
 * connected rooms behind them) so shared boundaries stay touching and rooms
 * never overlap.
 */
