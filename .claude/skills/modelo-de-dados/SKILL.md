---
name: modelo-de-dados
description: Alterar os tipos do projeto (Project, Floor, Wall, Room, FurnitureItem) ou o estado em stores/project/, com undo/redo correto e compatibilidade dos projetos salvos. Use quando a tarefa envolver models/types.ts, novo campo, novo tipo de elemento, renomear propriedade, migração, compatibilidade, undo, redo ou histórico.
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

## Regra nº 1: compatibilidade — depende de já existir dado real

**Hoje não existe.** O site não foi publicado, não há contas, e o que está no `localStorage` é
teste do próprio autor. Mudar o esquema é barato: mude o tipo e siga. Não gaste esforço
preservando dado de teste.

**Isso inverte no dia em que o Firebase entrar e houver conta de gente de verdade.** A partir
daí, todo projeto salvo precisa continuar abrindo, e quebrar o esquema é perder trabalho alheio.

Ponto único de migração: `localStore.load()` em `src/lib/services/datastore.ts` — ele já preenche
arrays ausentes em `Floor`. Quando a regra virar, estenda ali; não espalhe `?? []` pelo código.

| Mudança | O que fazer |
|---|---|
| Campo novo opcional | Nada, ou default na migração |
| Campo novo obrigatório | Preencher com default em `load()` |
| Renomear campo | Ler o nome antigo em `load()` e converter; manter por pelo menos um ciclo |
| Renomear `catalogId` de item | Mapa de alias em `load()` — senão o item **some sem aviso** (`drawFurnitureItem` faz `if (!cat) return;`) |
| Remover campo | Ignorar na leitura; não jogar erro |

Quando a regra virar e a primeira migração não trivial aparecer, adicione um campo de versão de
esquema ao `Project` e migre por versão — é mais barato do que descobrir isso na terceira
migração implícita.

Exportação JSON (`exportAsJSON`) e importação usam o mesmo formato: um arquivo exportado ontem
tem que importar hoje.

## Regra nº 2: toda mutação passa por `mutate`

`src/lib/stores/project/` concentra estado **e** mutações, um módulo por agregado.
`historico.ts` é o caminho obrigatório de escrita.

```ts
mutate(fn: (floor: Floor) => void, descrição?: string, coalesceKey?: string)
```

Aplica `fn` sobre o `Floor` ativo e tira snapshot para o histórico.

- **Nunca** faça `currentProject.update(...)` fora de `stores/project/`. Componentes chamam
  funções exportadas (`addFurniture`, `updateWall`, `moveColumn`, …).
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
[ ] models/types.ts — interface
[ ] stores/project/estado.ts — createDefaultFloor() inclui o array
[ ] stores/project/<agregado>.ts — adicionar / atualizar / remover
[ ] stores/project/elementos.ts — removeElement() reconhece o id
[ ] utils/renderizador/ — módulo de desenho da família
[ ] editor/canvas/desenho/quadro.ts — chamada na fase certa (a ordem é o contrato)
[ ] utils/hitTesting.ts — função findXxxAt
[ ] sidebar/propriedades/ — painel de edição do tipo novo
[ ] sidebar/LayersPanel.svelte — visibilidade/listagem
[ ] utils/exportacao/ — PNG, SVG, PDF, JSON
[ ] utils/cadExport.ts — DXF, DWG
[ ] editor/PrintLayout.svelte — impressão
[ ] npm run check e npm test passam
```

SVG, PDF, DXF e DWG têm desenho **próprio**, independente do canvas. É o item mais esquecido
neste repo: o elemento aparece na tela e não sai no arquivo exportado.

## Stores: clássicas, não runes

`stores/project/` e `stores/settings.ts` usam `writable`/`derived` do Svelte. Runes (`$state`,
`$derived`, `$props`) são usadas **dentro dos componentes** e em `canvas/estadoCanvas.svelte.ts`.
Não converta store para runes nem misture os dois modelos no mesmo arquivo.

`EstadoCanvas` é a exceção que confirma a regra: é estado de **interface** (o que está sendo
arrastado, o zoom, qual camada está visível), não dado do projeto. Nada dali é persistido.
