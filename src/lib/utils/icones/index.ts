/**
 * Registro de símbolos 2D do catálogo.
 *
 * `drawFurnitureIcon` é o único ponto de entrada usado pelo renderizador e pelas
 * miniaturas. Para adicionar um símbolo: escreva o desenhista no módulo da categoria
 * e registre-o em `iconDrawers` com a MESMA chave do id no catálogo.
 */
import { drawSofa, drawLoveseat, drawChair, drawTable, drawBookshelf, drawSideTable, drawTvStand, drawFireplace, drawTelevision, drawStorage, drawGenericTable } from './sala';
import { drawBed, drawNightstand, drawDresser, drawWardrobe } from './quarto';
import { drawToilet, drawBathtub, drawShower, drawSink, drawWasherDryer } from './banheiro';
import { drawStove, drawFridge, drawCounter, drawDishwasher, drawOven } from './cozinha';
import { drawDesk, drawOfficeChair } from './escritorio';
import { drawDiningTable, drawDiningChair } from './jantar';
import { drawRug, drawRoundRug, drawPlant, drawCurtain, drawWallArt, drawMirror, drawClock } from './decoracao';
import { drawCeilingLight, drawChandelier, drawFloorLamp, drawTableLamp, drawWallSconce, drawPendantLight, drawRecessedLight } from './iluminacao';
import { drawSymOutlet, drawSymSwitch, drawSymCeilingLight, drawSymRecessedLight, drawSymPendant, drawSymCeilingFan, drawSymJunction, drawSymSmoke } from './eletrica';
import { drawSymWaterSupply, drawSymDrain, drawSymWaterHeater, drawSymWasherHookup, drawSymGasLine } from './hidraulica';
import { roundRect, type DrawFn } from './primitivas';

/** Registry mapping catalogId → custom draw function */
const iconDrawers: Record<string, DrawFn> = {
  sofa: drawSofa,
  loveseat: drawLoveseat,
  chair: drawChair,
  coffee_table: drawTable,
  tv_stand: drawTvStand,
  bookshelf: drawBookshelf,
  side_table: drawSideTable,
  bed_queen: drawBed,
  bed_twin: drawBed,
  nightstand: drawNightstand,
  dresser: drawDresser,
  wardrobe: drawWardrobe,
  stove: drawStove,
  fridge: drawFridge,
  sink_k: drawSink,
  counter: drawCounter,
  dishwasher: drawDishwasher,
  oven: drawOven,
  toilet: drawToilet,
  bathtub: drawBathtub,
  shower: drawShower,
  sink_b: drawSink,
  washer_dryer: drawWasherDryer,
  desk: drawDesk,
  office_chair: drawOfficeChair,
  dining_table: drawDiningTable,
  dining_chair: drawDiningChair,
  fireplace: drawFireplace,
  television: drawTelevision,
  storage: drawStorage,
  table: drawGenericTable,
  // Decor
  rug: drawRug,
  round_rug: drawRoundRug,
  runner_rug: drawRug,
  potted_plant: drawPlant,
  floor_plant: drawPlant,
  hanging_plant: drawPlant,
  curtain: drawCurtain,
  sheer_curtain: drawCurtain,
  wall_art: drawWallArt,
  mirror: drawMirror,
  clock: drawClock,
  // Lighting
  ceiling_light: drawCeilingLight,
  chandelier: drawChandelier,
  recessed_light: drawRecessedLight,
  floor_lamp: drawFloorLamp,
  table_lamp: drawTableLamp,
  wall_sconce: drawWallSconce,
  pendant_light: drawPendantLight,
  // Electrical symbols
  sym_outlet: drawSymOutlet,
  sym_switch: drawSymSwitch,
  sym_ceiling_light: drawSymCeilingLight,
  sym_recessed_light: drawSymRecessedLight,
  sym_pendant: drawSymPendant,
  sym_ceiling_fan: drawSymCeilingFan,
  sym_junction: drawSymJunction,
  sym_smoke: drawSymSmoke,
  // Plumbing symbols
  sym_water_supply: drawSymWaterSupply,
  sym_drain: drawSymDrain,
  sym_water_heater: drawSymWaterHeater,
  sym_washer_hookup: drawSymWasherHookup,
  sym_gas_line: drawSymGasLine,
};

/**
 * Draw an architectural top-down icon for the given furniture item.
 * Context should already be translated to center and rotated.
 * @param w - pixel width (catalogWidth * zoom)
 * @param d - pixel depth (catalogDepth * zoom)
 */
export function drawFurnitureIcon(
  ctx: CanvasRenderingContext2D,
  catalogId: string,
  w: number,
  d: number,
  color: string,
  strokeColor: string
) {
  ctx.fillStyle = color + '60';
  ctx.strokeStyle = strokeColor;
  ctx.lineWidth = 1;

  const drawer = iconDrawers[catalogId];
  if (drawer) {
    drawer(ctx, w, d, color);
  } else {
    // Fallback: simple rect
    roundRect(ctx, -w/2, -d/2, w, d, 2);
    ctx.fill();
    ctx.stroke();
  }
}
