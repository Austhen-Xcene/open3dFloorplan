---
name: modelo-de-dados
description: Alterar os tipos do projeto (Project, Floor, Wall, Room, FurnitureItem, equipamentos, ligações) ou o estado em stores/project.ts, com migração dos projetos já salvos e undo/redo correto. Use quando a tarefa envolver models/types.ts, novo campo, novo tipo de elemento, renomear propriedade, migração, compatibilidade, undo, redo ou histórico.
---

# Modelo de dados e mutações

## Estrutura

```
Project { id, name, floors[], activeFloorId, createdAt, updatedAt }
  Floor { id, name, level,
          walls[], rooms[], doors[], windows[], furniture[], stairs[], columns[],
          guides[], measurements[], annotations[], textAnnotations[], groups[],
          backgroundImage? }
```

`src/lib/models/types.ts` é o arquivo único de tipos. Medidas em **cm**, ângulos em **graus**.

## Regra nº 1: compatibilidade

Projetos vivem no `localStorage` do navegador do usuário (chave `floorplan_projects`) e em
arquivos JSON que ele exportou. Não há servidor: se a migração quebrar, o trabalho dele
**sumiu de vez**. **Todo projeto já salvo precisa continuar abrindo.**

Ponto único de migração: `localStore.load()` em `src/lib/services/datastore.ts` — ele já preenche
arrays ausentes em `Floor`. Estenda ali, não espalhe `?? []` pelo código.

| Mudança | O que fazer |
|---|---|
| Campo novo opcional | Nada, ou default na migração |
| Campo novo obrigatório | Preencher com default em `load()` |
| Renomear campo | Ler o nome antigo em `load()` e converter; manter por pelo menos um ciclo |
| Renomear `catalogId` de item | Mapa de alias em `load()` — senão o item **some sem aviso** (`drawFurnitureItem` faz `if (!cat) return;`) |
| Remover campo | Ignorar na leitura; não jogar erro |

Ao introduzir migração não trivial, adicione um campo de versão de esquema ao `Project` e migre
por versão — é mais barato agora que na terceira migração implícita.

Exportação JSON (`exportAsJSON`) e importação usam o mesmo formato: um arquivo exportado ontem
tem que importar hoje.

## Regra nº 2: toda mutação passa por `mutate`

`src/lib/stores/project.ts` (1300 linhas) concentra estado **e** mutações.

```ts
mutate(fn: (floor: Floor) => void, descrição?: string, coalesceKey?: string)
```

Aplica `fn` sobre o `Floor` ativo e tira snapshot para o histórico.

- **Nunca** faça `currentProject.update(...)` fora de `project.ts`. Componentes chamam funções
  exportadas (`addFurniture`, `updateWall`, `moveColumn`, …).
- Ao criar um tipo novo de elemento, exporte o trio `adicionar` / `atualizar` / `remover` no mesmo
  padrão das existentes, e inclua o novo array em `createDefaultFloor()`.
- `removeElement(id)` faz a remoção genérica por id — inclua o novo array nele também.

### Undo/redo — os três padrões

| Situação | Padrão |
|---|---|
| Ação atômica (adicionar, deletar) | `mutate(fn, 'Descrição')` |
| Arrasto contínuo | `beginDrag('Moveu equipamento')` no início, mutações durante, `commitFurnitureMove()` no fim |
| Digitação em campo de propriedade | `mutate(fn, 'Alterou largura', coalesceKey)` — junta as teclas numa entrada só |
| Várias mutações = 1 undo | `beginUndoGroup()` … `endUndoGroup('Descrição')` |

Sintoma de erro: 40 entradas no histórico ao arrastar um item uma vez, ou ao digitar um número.

Descrições aparecem no `UndoHistoryPanel` — escreva em PT-BR, no passado, e específicas
("Adicionou módulo relé 4 canais", não "Alterou projeto").

## Regra nº 3: elemento novo tem que existir em todo lugar

Ao adicionar um tipo de elemento ao `Floor`, verifique a lista inteira:

```
[ ] nenhum arquivo tocado passou de 400 linhas (skill `refatorar-arquivo-grande`)
[ ] types.ts — interface
[ ] project.ts — createDefaultFloor() inclui o array
[ ] project.ts — adicionar / atualizar / remover
[ ] project.ts — removeElement() reconhece o id
[ ] datastore.ts load() — migração preenche o array em projetos antigos
[ ] canvasRenderer.ts — função de desenho
[ ] FloorPlanCanvas.svelte — chamada no frame, na posição certa da ordem de desenho
[ ] hitTesting.ts — função findXxxAt
[ ] PropertiesPanel.svelte — edição
[ ] LayersPanel.svelte — visibilidade/listagem
[ ] export.ts — PNG, SVG, PDF, JSON
[ ] cadExport.ts — DXF, DWG
[ ] PrintLayout.svelte — impressão
[ ] npm run check passa
```

SVG, PDF, DXF e DWG têm desenho **próprio**, independente do canvas. É o item mais esquecido
neste repo: o elemento aparece na tela e não sai no arquivo exportado.

## Stores: clássicas, não runes

`stores/project.ts` e `stores/settings.ts` usam `writable`/`derived` do Svelte. Runes (`$state`,
`$derived`, `$props`) são usadas **dentro dos componentes**. Não converta store para runes nem
misture os dois modelos no mesmo arquivo.
