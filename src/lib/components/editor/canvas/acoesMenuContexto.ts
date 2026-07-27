/**
 * Ações do menu de contexto do canvas.
 *
 * Recebe tudo de que precisa por `ContextoMenu` — nenhuma leitura de estado do
 * componente. Ação desconhecida é ignorada de propósito: o menu e este despachante
 * evoluem separados, e uma ação nova não pode derrubar o editor.
 */
import type { Floor, Room, Wall } from '$lib/models/types';
import {
  selectedElementId, selectedElementIds, selectedRoomId, selectedTool,
  duplicateFurniture, rotateFurniture, scaleFurniture, splitWall, updateWall,
  removeElement, toggleFurnitureLock, createGroup, ungroupElements,
  beginUndoGroup, endUndoGroup,
} from '$lib/stores/project';

/** Afastamento do ponto de controle ao ligar a curvatura de uma parede, em cm. */
const CURVATURA_PADRAO = 50;

export interface ContextoMenu {
  pavimento: Floor;
  /** Id do elemento sob o cursor quando o menu abriu. */
  idAlvo: string | null;
  parede: Wall | null;
  ambiente: Room | null;
  idsSelecionados: Set<string>;
  enquadrar: () => void;
}

export function executarAcaoMenuContexto(acao: string, ctx: ContextoMenu): void {
  const { pavimento: currentFloor, idAlvo: id, parede: ctxMenuWall, ambiente: ctxMenuRoom, idsSelecionados: currentSelectedIds } = ctx;
  const zoomToFit = ctx.enquadrar;

  switch (acao) {
      // Furniture actions
      case 'duplicate-furniture':
        if (id) { const newId = duplicateFurniture(id); if (newId) selectedElementId.set(newId); }
        break;
      case 'rotate-furniture-90':
        if (id) rotateFurniture(id, 90);
        break;
      case 'flip-horizontal':
        if (id) {
          const fi = currentFloor.furniture.find(f => f.id === id);
          if (fi) scaleFurniture(id, { x: -(fi.scale?.x ?? 1), y: fi.scale?.y ?? 1 });
        }
        break;
      case 'bring-to-front':
        if (id) {
          const idx = currentFloor.furniture.findIndex(f => f.id === id);
          if (idx >= 0) {
            const [item] = currentFloor.furniture.splice(idx, 1);
            currentFloor.furniture.push(item);
          }
        }
        break;
      case 'send-to-back':
        if (id) {
          const idx = currentFloor.furniture.findIndex(f => f.id === id);
          if (idx >= 0) {
            const [item] = currentFloor.furniture.splice(idx, 1);
            currentFloor.furniture.unshift(item);
          }
        }
        break;

      // Wall actions
      case 'split-wall':
        if (id) { const newId = splitWall(id, 0.5); if (newId) selectedElementId.set(null); }
        break;
      case 'toggle-curve':
        if (id && ctxMenuWall) {
          if (ctxMenuWall.curvePoint) {
            updateWall(id, { curvePoint: undefined } as any);
          } else {
            const mx = (ctxMenuWall.start.x + ctxMenuWall.end.x) / 2;
            const my = (ctxMenuWall.start.y + ctxMenuWall.end.y) / 2;
            const dx = ctxMenuWall.end.x - ctxMenuWall.start.x;
            const dy = ctxMenuWall.end.y - ctxMenuWall.start.y;
            const len = Math.hypot(dx, dy) || 1;
            updateWall(id, { curvePoint: { x: mx + (-dy / len) * 50, y: my + (dx / len) * 50 } });
          }
        }
        break;

      // Room actions
      case 'change-floor-texture':
        // Select the room so PropertiesPanel shows it
        if (ctxMenuRoom) selectedRoomId.set(ctxMenuRoom.id);
        break;
      case 'delete-room':
        if (ctxMenuRoom) {
          // Only a persisted room owns walls and may delete them. Detector-only
          // faces can borrow walls from multiple neighbouring environments.
          const savedRoom = currentFloor?.rooms.find((room) => room.id === ctxMenuRoom?.id);
          if (savedRoom) {
            beginUndoGroup();
            for (const wid of savedRoom.walls) removeElement(wid);
            endUndoGroup();
          }
          selectedRoomId.set(null);
          selectedElementIds.set(new Set());
          selectedElementId.set(null);
        }
        break;

      // Canvas actions
      case 'paste':
        // Trigger paste via synthetic keyboard event
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', ctrlKey: true, metaKey: true }));
        break;
      case 'select-all':
        if (currentFloor) {
          const allIds = new Set<string>();
          currentFloor.walls.forEach(w => allIds.add(w.id));
          currentFloor.furniture.forEach(f => allIds.add(f.id));
          currentFloor.doors.forEach(d => allIds.add(d.id));
          currentFloor.windows.forEach(w => allIds.add(w.id));
          if (currentFloor.stairs) currentFloor.stairs.forEach(s => allIds.add(s.id));
          if (currentFloor.columns) currentFloor.columns.forEach(c => allIds.add(c.id));
          selectedElementIds.set(allIds);
        }
        break;
      case 'add-wall':
        selectedTool.set('wall');
        break;
      case 'zoom-to-fit':
        zoomToFit();
        break;

      // Lock/Unlock
      case 'toggle-lock':
        if (id) toggleFurnitureLock(id);
        break;

      // Group/Ungroup
      case 'group':
        if (currentFloor && currentSelectedIds.size >= 2) {
          createGroup([...currentSelectedIds]);
        }
        break;
      case 'ungroup':
        if (currentFloor) {
          const idsToUngroup = currentSelectedIds.size > 0 ? [...currentSelectedIds] : (id ? [id] : []);
          if (idsToUngroup.length > 0) ungroupElements(idsToUngroup);
        }
        break;

      // Shared actions
      case 'delete':
        if (id) { removeElement(id); selectedElementId.set(null); }
        break;
      case 'properties':
        // Select element so PropertiesPanel shows it
        if (id) selectedElementId.set(id);
        break;
    }
}
