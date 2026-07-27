/**
 * Ponto de entrada do renderizador do canvas 2D.
 *
 * Um módulo por família de elemento. Todas as funções são puras: recebem o CanvasState
 * e os dados, desenham, e não leem store nem mutam estado.
 *
 * A ORDEM DE DESENHO é responsabilidade do chamador (FloorPlanCanvas), não daqui.
 */
export * from './geometria';
export * from './grade';
export * from './paredes';
export * from './portas';
export * from './janelas';
export * from './equipamentos';
export * from './estruturas';
export * from './anotacoes';
export * from './ambientes';
export * from './minimapa';
export * from './reguas';
