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

  // Girar troca largura por comprimento: a área ocupada muda de forma e pode invadir um
  // ambiente que não compartilha parede — o reflow acima só alcança os conectados. Sem
  // esta resolução final, o ambiente ficava por cima do outro até o usuário clicar nele
  // de novo, porque só o mouseup chamava `resolveRoomOverlap`.
  //
  // Não gera entrada de histórico própria: `resolveRoomOverlap` escreve sem snapshot, então
  // um único desfazer reverte a rotação inteira, reacomodação incluída.
  resolveRoomOverlap(roomId);
  return true;
}

/**
 * Reacomoda os ambientes até nenhum ficar por cima de outro.
 *
 * Resolve a planta INTEIRA, não só `idPrioritario`. Uma operação pode mover vários
 * ambientes de uma vez — girar reacomoda os vizinhos conectados — e o par que acaba
 * sobreposto nem sempre inclui aquele em que o usuário mexeu.
 *
 * `idPrioritario` é o ambiente que o usuário acabou de mover ou girar: ele fica onde
 * está, e quem sai da frente é o outro. Sem isso, o ambiente escaparia debaixo do cursor.
 *
 * Encostar é permitido; sobrepor interior não é. Não cria snapshot próprio — é o passo
 * final de uma operação que já tem o seu.
 */
export function resolveRoomOverlap(idPrioritario?: string): boolean {
  const p = get(currentProject);
  if (!p) return false;
  const floor = p.floors.find((item) => item.id === p.activeFloorId);
  if (!floor) return false;

  /** Sobreposição menor que isto é encoste, não invasão. */
  const EPSILON = 0.01;
  /** Teto de passadas. Cada passada separa um par; o limite evita laço infinito se
   *  a planta estiver numa configuração que não converge. */
  const MAX_PASSADAS = 60;

  const caixas = new Map<string, RoomBounds>();
  for (const ambiente of floor.rooms) {
    const b = roomBoundsOnFloor(floor, ambiente);
    if (b) caixas.set(ambiente.id, { ...b });
  }
  if (caixas.size < 2) return false;

  const invade = (a: RoomBounds, b: RoomBounds) =>
    Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX) > EPSILON
    && Math.min(a.maxY, b.maxY) - Math.max(a.minY, b.minY) > EPSILON;

  const deslocado = (b: RoomBounds, dx: number, dy: number): RoomBounds =>
    ({ minX: b.minX + dx, maxX: b.maxX + dx, minY: b.minY + dy, maxY: b.maxY + dy });

  /** Primeiro par que se invade, ou null. */
  function proximoConflito(): [string, string] | null {
    const ids = [...caixas.keys()];
    for (let i = 0; i < ids.length; i++) {
      for (let j = i + 1; j < ids.length; j++) {
        if (invade(caixas.get(ids[i])!, caixas.get(ids[j])!)) return [ids[i], ids[j]];
      }
    }
    return null;
  }

  const acumulado = new Map<string, Point>();
  let mudou = false;

  for (let passada = 0; passada < MAX_PASSADAS; passada++) {
    const conflito = proximoConflito();
    if (!conflito) break;

    // Quem sai da frente: nunca o ambiente em que o usuário mexeu.
    const [primeiro, segundo] = conflito;
    const move = primeiro === idPrioritario ? segundo : primeiro;
    const fica = move === primeiro ? segundo : primeiro;

    const alvo = caixas.get(move)!;
    const obstaculo = caixas.get(fica)!;

    // Quatro saídas possíveis; sempre existe uma que separa este par.
    const saidas: Point[] = [
      { x: obstaculo.minX - alvo.maxX, y: 0 },
      { x: obstaculo.maxX - alvo.minX, y: 0 },
      { x: 0, y: obstaculo.minY - alvo.maxY },
      { x: 0, y: obstaculo.maxY - alvo.minY },
    ];
    const outros = [...caixas.entries()].filter(([id]) => id !== move);

    // Prefere a saída mais curta que não crie conflito novo; se todas criarem,
    // usa a mais curta mesmo — a próxima passada resolve o que sobrar.
    let escolhida: Point | null = null;
    let menorCusto = Infinity;
    let escolhidaLivre: Point | null = null;
    let menorCustoLivre = Infinity;
    for (const saida of saidas) {
      const custo = saida.x * saida.x + saida.y * saida.y;
      if (custo <= EPSILON) continue;
      const novaCaixa = deslocado(alvo, saida.x, saida.y);
      const livre = !outros.some(([, b]) => invade(novaCaixa, b));
      if (livre && custo < menorCustoLivre) { menorCustoLivre = custo; escolhidaLivre = saida; }
      if (custo < menorCusto) { menorCusto = custo; escolhida = saida; }
    }

    const passo = escolhidaLivre ?? escolhida;
    if (!passo) break;

    caixas.set(move, deslocado(alvo, passo.x, passo.y));
    const antes = acumulado.get(move) ?? { x: 0, y: 0 };
    acumulado.set(move, { x: antes.x + passo.x, y: antes.y + passo.y });
    mudou = true;
  }

  if (!mudou) return false;

  const movimentos = new Map(
    [...acumulado].filter(([, d]) => Math.abs(d.x) > EPSILON || Math.abs(d.y) > EPSILON),
  );
  if (movimentos.size === 0) return false;

  translateSavedRooms(floor, movimentos, new Set());
  p.updatedAt = new Date();
  currentProject.set({ ...p });
  return true;
}
