/**
 * Orquestra um quadro de desenho.
 *
 * A ORDEM DAS FASES É O CONTRATO: fundo → estrutura → cotas → elementos → parede em
 * progresso → seleção → sobreposições fixas. Trocar a ordem muda o que fica coberto
 * pelo quê; réguas e minimapa vêm por último de propósito.
 */
import type { EstadoCanvas } from '../estadoCanvas.svelte';
import type { DepsDesenho, Quadro } from './tipos';
import type { Adaptadores } from './adaptadores';

/** Interações que exigem repintar continuamente enquanto acontecem. */
function emInteracao(ui: EstadoCanvas): boolean {
  return !!(ui.wallStart || ui.draggingFurnitureId || ui.draggingDoorId || ui.draggingWindowId
    || ui.draggingStairId || ui.draggingColumnId || ui.draggingWallEndpoint || ui.draggingWallParallel
    || ui.draggingCurveHandle || ui.draggingHandle || ui.draggingMultiSelect || ui.draggingRoomId
    || ui.draggingRoomLabelId || ui.draggingTextAnnotationId || ui.draggingGuideId
    || ui.measuring || ui.annotating || ui.currentPlacingId || ui.isPlacingStair
    || ui.isPlacingColumn || ui.marqueeStart || ui.isPanning);
}

export function criarQuadro(
  ui: EstadoCanvas,
  deps: DepsDesenho,
  ad: Adaptadores,
  fases: {
    desenharEstrutura(q: Quadro): void;
    desenharCotasDeObjeto(q: Quadro): void;
    desenharElementos(q: Quadro): void;
    desenharParedeEmProgresso(q: Quadro): void;
    desenharSelecaoEAnotacoes(q: Quadro): void;
  },
) {
  function scheduleDraw() {
    deps.markDirty();
  }

  function draw() {
    if (!ui.ctx) return;
    if (!ui.canvasDirty) { requestAnimationFrame(draw); return; }
    ui.canvasDirty = false;

    ui.ctx.clearRect(0, 0, ui.width, ui.height);
    ui.ctx.fillStyle = '#f8f9fa';
    ui.ctx.fillRect(0, 0, ui.width, ui.height);
    ad.drawGrid();
    if (ui.layerVis.guides) ad.drawGuides();
    ad.drawBackgroundImage();

    const floor = ui.currentFloor;
    if (!floor) { requestAnimationFrame(draw); return; }
    if (emInteracao(ui)) ui.canvasDirty = true;

    ad.updateDetectedRooms();
    const q: Quadro = { floor, selId: ui.currentSelectedId, multiIds: ui.currentSelectedIds };

    fases.desenharEstrutura(q);
    fases.desenharCotasDeObjeto(q);
    fases.desenharElementos(q);
    fases.desenharParedeEmProgresso(q);
    fases.desenharSelecaoEAnotacoes(q);

    ad.drawRulers();
    ad.drawMinimap();

    requestAnimationFrame(draw);
  }

  return { draw, scheduleDraw };
}
