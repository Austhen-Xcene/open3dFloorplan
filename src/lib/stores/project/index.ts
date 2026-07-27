/**
 * Estado do editor e todas as operações sobre o projeto.
 *
 * Um módulo por agregado. Regra do repo: NENHUM componente altera `currentProject`
 * direto — todo mundo chama uma função exportada aqui, que por sua vez passa por
 * `mutate` (./historico) para que o undo/redo funcione.
 */
export * from './estado';
export * from './historico';
export * from './paredes';
export * from './aberturas';
export * from './equipamentos';
export * from './estruturas';
export * from './ambientes';
export * from './transformacoes';
export * from './pavimentos';
export * from './elementos';
export * from './anotacoes';
