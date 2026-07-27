---
name: canvas-2d
description: Trabalhar no canvas 2D do editor de plantas — desenho, zoom, pan, minimapa, snap, seleção, arrasto, hit-test, coordenadas mundo↔tela, régua e dimensões. Use quando a tarefa envolver FloorPlanCanvas.svelte, canvasRenderer.ts, canvasInteraction.ts, hitTesting.ts, ou qualquer coisa que apareça/se comporte na área de desenho.
---

# Canvas 2D do editor

O canvas é o coração do produto. É **2D puro** (`CanvasRenderingContext2D`) — não há e não haverá
WebGL/Three.js na visualização.

## Mapa de responsabilidades

| Arquivo | Papel | Pode importar store? |
|---|---|---|
| `components/editor/FloorPlanCanvas.svelte` | dono do `<canvas>`, eventos de mouse/touch, orquestra o frame | sim |
| `utils/canvasRenderer.ts` | **desenha** paredes, ambientes, portas, janelas, itens, dimensões, minimapa | **não** |
| `utils/canvasInteraction.ts` | coordenadas, snap, tipos compartilhados (`CanvasState`, `HandleType`) | **não** |
| `utils/hitTesting.ts` | descobre o que está sob o ponto clicado | **não** |
| `utils/furnitureIcons.ts` | símbolo 2D de cada item do catálogo | **não** |

**Regra dura:** os quatro `utils/` são funções puras. Recebem `CanvasState` e dados, devolvem
desenho ou resultado. Não leem store, não mutam nada. Lógica nova vai neles — `FloorPlanCanvas.svelte`
já tem 4083 linhas e **não deve crescer**. Se a tarefa exige código novo no componente, primeiro
pergunte o que dá para extrair.

## Conceitos que você precisa acertar

### Coordenadas

```ts
interface CanvasState { ctx; width; height; zoom; camX; camY }

screenToWorld(cs, sx, sy) → { x: (sx - width/2)/zoom + camX, y: (sy - height/2)/zoom + camY }
worldToScreen(cs, wx, wy) → inverso
```

- **1 unidade de mundo = 1 cm.** Dimensão de catálogo em cm vira pixel multiplicando por `zoom`.
- Toda entrada de ponteiro chega em coordenada de tela → converta **uma vez**, no início do
  handler, e trabalhe em mundo daí em diante. Misturar os dois espaços é a fonte nº 1 de bug aqui.
- Hit-test opera em coordenada de **mundo**, mas várias funções recebem `zoom` para calcular
  tolerância de clique em pixels constantes (ex.: `findWallAt(p, walls, zoom)`). Mantenha esse
  padrão: a área de clique não pode encolher quando o usuário dá zoom out.

### Snap

- `snap(v, enabled, snapToGrid, gridSize)` — grade, `gridSize` vem de `projectSettings` (25 cm).
- `magneticSnap(...)` — atrai para pontos notáveis existentes (`MAGNETIC_SNAP = 15`).
- `angleSnap(start, end, enabled)` — trava ângulo ao arrastar parede.
- Constantes: `GRID = 20`, `SNAP = 10`, `MAGNETIC_SNAP = 15`, `WALL_SNAP_DIST = 30`.

Snap é sempre condicionado a `snapEnabled` (store) — respeite o toggle, o usuário desliga de
propósito para posicionar equipamento fora da grade.

### Desenho de um item

`drawFurnitureItem(cs, item, selected)` já faz: translate para o centro, rotate pelo ângulo,
aplica espelhamento pelo sinal do `scale`, calcula `w`/`d` em pixels, chama `drawFurnitureIcon`,
desenha rótulo, e — se selecionado — a caixa tracejada, 8 alças e a alça de rotação.

Ou seja: para um símbolo novo você **só** escreve o desenho em `furnitureIcons.ts`. Não replique
seleção/rotação. Ver skill `catalogo-equipamentos`.

### Ordem de desenho

Do fundo para a frente: imagem de fundo → grade → piso/ambientes → paredes → portas/janelas →
itens → escadas/colunas → dimensões → anotações → guias → seleção → minimapa/régua.

Inserir uma camada nova = achar o ponto certo nessa sequência em `FloorPlanCanvas.svelte`. Desenhar
fora de ordem produz elemento coberto pelo piso ou dimensão atrás da parede.

### Performance

O frame redesenha tudo. Portanto, dentro do loop de desenho:
- nada de `await`, `fetch`, criação de `Image`, ou leitura de `localStorage`;
- nada de alocar objetos grandes por elemento;
- cache pesado (miniatura, textura) fica fora, em `Map` no módulo.

Ao adicionar desenho, verifique com uma planta grande (muitos ambientes + muitos equipamentos) se
o pan continua fluido.

### Toque / mobile

O editor é responsivo (commit `10f5967`): o `BuildPanel` vira gaveta e o canvas recebe eventos de
toque. Alterações de interação precisam funcionar com **um dedo (arrastar)** e **dois dedos
(pinch para zoom)**. Alça de 5 px é inutilizável no dedo — mantenha as tolerâncias existentes.

## Checklist ao mexer no canvas

```
[ ] nenhum arquivo tocado passou de 400 linhas (skill `refatorar-arquivo-grande`)
[ ] a lógica nova ficou em utils/, não inflou o componente
[ ] nenhuma função de utils/ passou a importar store
[ ] conversão tela↔mundo feita uma vez, sem mistura de espaços
[ ] tolerância de clique escala com zoom
[ ] respeita snapEnabled e projectSettings.gridSize
[ ] respeita projectSettings.units na exibição de medida (formatLength)
[ ] camada inserida na posição certa da ordem de desenho
[ ] testado com zoom mínimo, zoom máximo e pan
[ ] testado no minimapa (drawMinimap desenha os mesmos elementos em escala)
[ ] testado em toque, se mudou interação
[ ] npm run check passa
```
