/**
 * Fase 2 do quadro: cotas de distância entre o objeto selecionado e as paredes do ambiente.
 */
import type { Point, Wall } from '$lib/models/types';
import type { Room } from '$lib/models/types';
import { getRoomPolygon } from '$lib/utils/roomDetection';
import { getCatalogItem } from '$lib/utils/furnitureCatalog';
import { formatLength } from '$lib/stores/settings';
import { pointInPolygon } from '$lib/utils/hitTesting';
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { DepsDesenho, Quadro } from './tipos';
import type { Adaptadores } from './adaptadores';
import type { Previas } from './previas';
import type { Medicoes } from './medicoes';

export function criarFaseCotas(ui: EstadoCanvas, deps: DepsDesenho, ad: Adaptadores, pr: Previas, md: Medicoes) {
  const { getCS, getMultiSelectBBox, worldToScreen, snapWallEndPoint, typedWallLengthCm, applyTypedWallLength } = deps;
  const { drawRooms, drawWall, drawWallJoints, drawSnapPoints, drawDoorOnWall, drawWindowOnWall,
    drawDoorDistanceDimensions, drawWindowDistanceDimensions, drawFurniture, drawStair, drawColumn,
    drawPersistedMeasurements, drawAnnotations, drawTextAnnotations, wallLength, wallPointAt,
    wallTangentAt, wallThicknessScreen } = ad;

  function desenharCotasDeObjeto(q: Quadro) {
    const floor = q.floor; const selId = q.selId; const multiIds = q.multiIds;
    // Object distance dimensions (from selected furniture to room boundaries)
    if (ui.showDimensions && ui.dimSettings.showObjectDistance && ui.currentSelectedId && ui.showFurniture) {
      const selFurniture = floor.furniture.find(f => f.id === ui.currentSelectedId);
      if (selFurniture) {
        const cat = getCatalogItem(selFurniture.catalogId);
        if (cat) {
          const fw = (selFurniture.width ?? cat.width) * Math.abs(selFurniture.scale?.x ?? 1);
          const fd = (selFurniture.depth ?? cat.depth) * Math.abs(selFurniture.scale?.y ?? 1);
          const fx = selFurniture.position.x;
          const fy = selFurniture.position.y;
          // AABB edges of the furniture (ignoring rotation for simplicity)
          const fLeft = fx - fw / 2;
          const fRight = fx + fw / 2;
          const fTop = fy - fd / 2;
          const fBottom = fy + fd / 2;
          
          // Find which room the furniture is in
          let furnitureRoom: Room | null = null;
          for (const room of ui.detectedRooms) {
            const poly = getRoomPolygon(room, floor.walls);
            if (pointInPolygon(selFurniture.position, poly)) {
              furnitureRoom = room;
              break;
            }
          }
          
          // Collect all dimension lines (wall + furniture distances)
          type DimLine = { label: string; from: Point; to: Point; color: string; dir: 'left' | 'right' | 'top' | 'bottom' };
          const allDimensions: DimLine[] = [];
          
          // --- Wall distances ---
          if (furnitureRoom) {
            const poly = getRoomPolygon(furnitureRoom, floor.walls);
            let rMinX = Infinity, rMaxX = -Infinity, rMinY = Infinity, rMaxY = -Infinity;
            for (const pt of poly) {
              if (pt.x < rMinX) rMinX = pt.x;
              if (pt.x > rMaxX) rMaxX = pt.x;
              if (pt.y < rMinY) rMinY = pt.y;
              if (pt.y > rMaxY) rMaxY = pt.y;
            }
            allDimensions.push(
              { label: formatLength(fLeft - rMinX, ui.dimSettings.units), from: { x: fLeft, y: fy }, to: { x: rMinX, y: fy }, color: '#f97316', dir: 'left' },
              { label: formatLength(rMaxX - fRight, ui.dimSettings.units), from: { x: fRight, y: fy }, to: { x: rMaxX, y: fy }, color: '#f97316', dir: 'right' },
              { label: formatLength(fTop - rMinY, ui.dimSettings.units), from: { x: fx, y: fTop }, to: { x: fx, y: rMinY }, color: '#f97316', dir: 'top' },
              { label: formatLength(rMaxY - fBottom, ui.dimSettings.units), from: { x: fx, y: fBottom }, to: { x: fx, y: rMaxY }, color: '#f97316', dir: 'bottom' },
            );
          }
          
          // --- Furniture-to-furniture distances ---
          // For each direction, find the nearest other furniture edge
          const otherFurniture = floor.furniture.filter(f => f.id !== selFurniture.id);
          // Track closest furniture per direction
          const closestFurn: Record<string, { dist: number; dim: DimLine }> = {};
          
          for (const other of otherFurniture) {
            const oCat = getCatalogItem(other.catalogId);
            if (!oCat) continue;
            const ow = (other.width ?? oCat.width) * Math.abs(other.scale?.x ?? 1);
            const od = (other.depth ?? oCat.depth) * Math.abs(other.scale?.y ?? 1);
            const ox = other.position.x;
            const oy = other.position.y;
            const oLeft = ox - ow / 2;
            const oRight = ox + ow / 2;
            const oTop = oy - od / 2;
            const oBottom = oy + od / 2;
            
            // Check vertical overlap (needed for left/right distances)
            const vOverlap = fBottom > oTop && fTop < oBottom;
            // Check horizontal overlap (needed for top/bottom distances)
            const hOverlap = fRight > oLeft && fLeft < oRight;
            
            const midY = Math.max(fTop, oTop) / 2 + Math.min(fBottom, oBottom) / 2;
            const midX = Math.max(fLeft, oLeft) / 2 + Math.min(fRight, oRight) / 2;
            
            // Left: other is to the left of selected
            if (vOverlap && oRight <= fLeft) {
              const gap = fLeft - oRight;
              if (!closestFurn['left'] || gap < closestFurn['left'].dist) {
                closestFurn['left'] = { dist: gap, dim: { label: formatLength(gap, ui.dimSettings.units), from: { x: fLeft, y: midY }, to: { x: oRight, y: midY }, color: '#ef4444', dir: 'left' } };
              }
            }
            // Right: other is to the right
            if (vOverlap && oLeft >= fRight) {
              const gap = oLeft - fRight;
              if (!closestFurn['right'] || gap < closestFurn['right'].dist) {
                closestFurn['right'] = { dist: gap, dim: { label: formatLength(gap, ui.dimSettings.units), from: { x: fRight, y: midY }, to: { x: oLeft, y: midY }, color: '#ef4444', dir: 'right' } };
              }
            }
            // Top: other is above
            if (hOverlap && oBottom <= fTop) {
              const gap = fTop - oBottom;
              if (!closestFurn['top'] || gap < closestFurn['top'].dist) {
                closestFurn['top'] = { dist: gap, dim: { label: formatLength(gap, ui.dimSettings.units), from: { x: midX, y: fTop }, to: { x: midX, y: oBottom }, color: '#ef4444', dir: 'top' } };
              }
            }
            // Bottom: other is below
            if (hOverlap && oTop >= fBottom) {
              const gap = oTop - fBottom;
              if (!closestFurn['bottom'] || gap < closestFurn['bottom'].dist) {
                closestFurn['bottom'] = { dist: gap, dim: { label: formatLength(gap, ui.dimSettings.units), from: { x: midX, y: fBottom }, to: { x: midX, y: oTop }, color: '#ef4444', dir: 'bottom' } };
              }
            }
          }
          
          // For each direction, use furniture-to-furniture if closer than wall, otherwise wall
          const finalDimensions: DimLine[] = [];
          const dirs: Array<'left' | 'right' | 'top' | 'bottom'> = ['left', 'right', 'top', 'bottom'];
          for (const dir of dirs) {
            const wallDim = allDimensions.find(d => d.dir === dir);
            const furnDim = closestFurn[dir];
            if (furnDim && wallDim) {
              // Show whichever is closer (furniture-to-furniture usually wins)
              const wallDist = Math.hypot(wallDim.to.x - wallDim.from.x, wallDim.to.y - wallDim.from.y);
              if (furnDim.dist < wallDist) {
                finalDimensions.push(furnDim.dim);
              } else {
                finalDimensions.push(wallDim);
              }
            } else if (furnDim) {
              finalDimensions.push(furnDim.dim);
            } else if (wallDim) {
              finalDimensions.push(wallDim);
            }
          }
          
          // --- Draw all dimension lines ---
          const fontSize = Math.max(9, 10 * ui.zoom);
          ui.ctx.font = `${fontSize}px sans-serif`;
          ui.ctx.textAlign = 'center';
          ui.ctx.textBaseline = 'middle';
          
          for (const d of finalDimensions) {
            const fromS = worldToScreen(d.from.x, d.from.y);
            const toS = worldToScreen(d.to.x, d.to.y);
            const dist = Math.hypot(d.to.x - d.from.x, d.to.y - d.from.y);
            if (dist < 1) continue;
            
            // Dashed line
            ui.ctx.strokeStyle = d.color;
            ui.ctx.lineWidth = 1;
            ui.ctx.setLineDash([3, 3]);
            ui.ctx.beginPath();
            ui.ctx.moveTo(fromS.x, fromS.y);
            ui.ctx.lineTo(toS.x, toS.y);
            ui.ctx.stroke();
            ui.ctx.setLineDash([]);
            
            // Small end caps (perpendicular ticks)
            const dx = toS.x - fromS.x;
            const dy = toS.y - fromS.y;
            const len = Math.hypot(dx, dy);
            if (len > 0) {
              const nx = -dy / len;
              const ny = dx / len;
              const tickLen = 4;
              ui.ctx.strokeStyle = d.color;
              ui.ctx.lineWidth = 1;
              ui.ctx.setLineDash([]);
              for (const pt of [fromS, toS]) {
                ui.ctx.beginPath();
                ui.ctx.moveTo(pt.x - nx * tickLen, pt.y - ny * tickLen);
                ui.ctx.lineTo(pt.x + nx * tickLen, pt.y + ny * tickLen);
                ui.ctx.stroke();
              }
            }
            
            // Dimension pill at midpoint
            const mx = (fromS.x + toS.x) / 2;
            const my = (fromS.y + toS.y) / 2;
            const tw = ui.ctx.measureText(d.label).width;
            const pw = tw + 8;
            const ph = fontSize + 4;
            ui.ctx.fillStyle = d.color;
            ui.ctx.beginPath();
            ui.ctx.roundRect(mx - pw / 2, my - ph / 2, pw, ph, ph / 2);
            ui.ctx.fill();
            ui.ctx.fillStyle = '#ffffff';
            ui.ctx.fillText(d.label, mx, my);
          }
        }
      }
    }

  }
  return { desenharCotasDeObjeto };
}
