# CLAUDE.md

Contexto do projeto para o Claude Code. Leia antes de qualquer alteração.

## 1. O que é este projeto

**Site próprio** onde a pessoa cria uma conta, monta os projetos da própria casa em planta 2D —
ambientes com medidas exatas, portas, janelas e objetos do catálogo — salva e volta depois.

Uso individual: cada usuário vê só os projetos dele. Sem compartilhamento, sem colaboração,
**sem vínculo com nenhum outro projeto ou sistema**.

### O que este projeto NÃO é

- ❌ **Não se integra a nada de fora.** Nenhuma API de terceiro, nenhum app hospedeiro, nenhuma
  sincronização com outro sistema. O que é do usuário fica no Firebase deste projeto.
- ❌ **Não roda dentro de webview.** É um site aberto no navegador, e só.
- ❌ **Não busca o catálogo de lugar nenhum.** O catálogo é uma tabela mantida no repositório,
  atualizada por commit.

### Origem

O repositório nasceu do `open3dFloorplan`, um editor de plantas com renderização 3D. O 3D foi
removido; o que ficou é o editor 2D, traduzido para PT-BR e reorganizado.

⚠️ **Sobra do fork:** `.firebaserc` e `apphosting.yaml` ainda apontam para o projeto Firebase
`openplan3d`, que é do repositório original. Trocar pelo projeto novo quando ele existir.

## 2. Restrições inegociáveis

1. **É 2D. Só 2D.** Não reintroduzir renderização 3D, câmera 3D, walkthrough ou Three.js na
   visualização. O único uso remanescente de Three.js (`furnitureThumbnails.ts`) é legado e sai
   junto com o catálogo de móveis.
2. **Zoom, pan, minimapa e snap são funcionalidades centrais** — o usuário precisa deles para
   achar um equipamento na planta. Não degradar em nome de simplificação.
3. **O backend é o Firebase deste projeto, e nada além dele.** Enquanto ele não existir, tudo
   roda no navegador. Se uma tarefa parece pedir outro servidor ou outra API, o caminho certo é
   perguntar ao usuário — não inventar um endpoint.
4. **Compatibilidade de dados — só a partir do Firebase.** Enquanto o site não foi publicado e
   os únicos dados são testes do autor no navegador, quebrar o esquema é barato: mude o tipo e
   siga. **Depois que houver conta e dado real, a regra inverte** e toda mudança de tipo exige
   migração — ver a skill `modelo-de-dados`.
5. **Português em tudo que for novo.** Identificadores, tipos, comentários, UI e docs em PT-BR.
   O código legado está em inglês; traduza ao tocar no arquivo, não em varreduras separadas.
6. **Máximo de 300–400 linhas por arquivo.** Ver §2.1. Não é meta, é limite.

## 2.1. Clean code e clean architecture

### Limite de tamanho

| Linhas | O que fazer |
|---|---|
| até 300 | ok |
| 300–400 | zona de atenção — só cresça se for coeso de verdade |
| acima de 400 | **quebre antes de adicionar mais qualquer coisa** |

Vale para `.ts` e `.svelte` (contando `<script>` + markup). Arquivo de dados puro (catálogo,
tabela de constantes) pode passar, mas então **divida por domínio** — `catalogo/modulos.ts`,
`catalogo/sensores.ts`, com um `catalogo/index.ts` que agrega.

Se a tarefa é "adicionar X" e o arquivo alvo já passou de 400 linhas, o primeiro passo é
**extrair**, não empilhar. Refatorar e adicionar podem ir no mesmo commit, mas nessa ordem.

### Como quebrar — por responsabilidade, não por tamanho

Cortar um arquivo de 1200 linhas em três de 400 não resolve nada se os três continuarem
acoplados. O corte certo segue a pergunta: **"o que muda junto?"**

Padrões que funcionam neste repo:

- **Componente Svelte grande** → extraia subcomponentes por bloco visual coerente
  (`PropertiesPanel` → `PropriedadesParede.svelte`, `PropriedadesEquipamento.svelte`, …),
  e tire a lógica que não é de apresentação para `utils/` ou store.
- **Módulo de desenho grande** → um arquivo por família de elemento
  (`renderizador/paredes.ts`, `renderizador/aberturas.ts`, `renderizador/dimensoes.ts`),
  com um `index.ts` reexportando.
- **Store grande** → separe estado (writables) de operações, e agrupe as operações por
  agregado (`project/paredes.ts`, `project/equipamentos.ts`, `project/historico.ts`).
- **Handler de evento gigante** → extraia funções puras para `utils/` e deixe no componente só
  o despacho.

### Camadas (dependência sempre para dentro)

```
componentes  →  stores  →  services  →  models
     ↓            ↓                        ↑
    utils (funções puras) ──────────────────┘
```

- `models/` — tipos. Não importa nada do resto.
- `utils/` — funções puras. Recebem dados, devolvem dados. **Não importam store nem service.**
- `services/` — I/O (persistência, API). Escondem o transporte atrás de uma interface.
- `stores/` — estado da aplicação e mutações. Podem usar services e utils.
- `components/` — apresentação e eventos. Chamam stores; não fazem I/O direto.

Seta invertida (util importando store, service importando componente) é bug de arquitetura —
corrija antes de seguir.

### Regras de escrita

- **Uma responsabilidade por arquivo.** O nome do arquivo tem que descrever o que ele faz sem "e".
- **Função até ~40 linhas.** Passou disso, provavelmente são duas funções.
- **Nível de indentação até 3.** Use early return em vez de aninhar.
- **Sem número mágico** no meio da lógica — constante nomeada no topo do módulo.
- **Nome revela intenção**: `equipamentosSemLigacao`, não `lista2`.
- **Comentário explica o porquê**, nunca o quê. Se precisa explicar o quê, renomeie.
- **Sem código morto.** Não comente para "guardar"; o git guarda.

## 3. Comandos

```bash
npm install
npm run dev       # http://localhost:5173
npm run check     # svelte-check + TS
npm test          # Playwright: 56 testes de interface (sobe o dev sozinho)
npm run build
npm run preview
```

**Rode os dois antes de commitar.** `npm run check` valida tipos; `npm test` é o que pega quebra
de reatividade, prop não repassada e desenho que parou de acontecer — coisas que o compilador não
enxerga. A suíte já pegou cinco bugs reais, um deles regressão de refatoração
(`docs/ui/ACHADOS.md`).

Os testes vivem em `tests/e2e/` e geram as capturas de `docs/ui/_evidencias/`, que ilustram a
documentação de interface. Ao mexer na UI, rode `npm test` — as evidências se atualizam sozinhas.
Elas **não são versionadas**: são geradas, e binário que muda a cada ajuste de pixel não pertence
ao histórico.

Deploy: Firebase App Hosting (`apphosting.yaml`), `@sveltejs/adapter-node`. ⚠️ o projeto
configurado ainda é o `openplan3d`, herdado do fork — trocar ao criar o projeto próprio.

## 4. Arquitetura

### Stack

SvelteKit 2 · **Svelte 5 (runes)** · TypeScript · Tailwind CSS v4 (via `@tailwindcss/vite`, sem
`tailwind.config`) · Canvas 2D nativo · jsPDF · dxf-writer · Firebase (previsto para conta e
persistência; hoje inerte, ver §4 Persistência).

### Rotas

- `src/routes/+page.svelte` — tela inicial / lista de projetos (`WelcomeScreen.svelte`)
- `src/routes/editor/+page.svelte` — o editor. Carrega por `?id=<projectId>`, cria projeto novo
  se não achar, e faz **auto-save com debounce de 500 ms** (`editor/+page.svelte:57`)

### Camadas

```
src/lib/
  models/types.ts          # Project → Floor → { walls, rooms, doors, windows, furniture, … }

  stores/
    project/               # estado + TODAS as mutações, um módulo por agregado
      index.ts             #   reexporta tudo — importe sempre de '$lib/stores/project'
      estado.ts            #   currentProject, activeFloor, stores de UI e seleção
      historico.ts         #   undo/redo + mutate  ← todo caminho de escrita passa aqui
      paredes/aberturas/equipamentos/estruturas/ambientes/
      transformacoes/pavimentos/elementos/anotacoes.ts
    settings.ts            # ProjectSettings (unidades, cotas, grade) — localStorage
    saveStatus.ts, versionHistory.ts, theme.ts, onboarding.svelte.ts

  services/
    datastore.ts           # interface DataStore + localStore (localStorage, única impl.)
    arquivoProjeto.ts      # importar / compartilhar projeto em arquivo

  utils/                   # SÓ funções puras — não importam store nem service
    renderizador/          #   desenho do canvas, um módulo por família de elemento
    icones/                #   símbolo 2D de cada item, um módulo por categoria
    texturas/              #   texturas de parede e piso (foto + fallback procedural)
    exportacao/            #   um módulo por formato: png, svg, pdf, json (+ cadExport.ts)
    ambientes/             #   presets, similaridade de nomes, posicionamento, inserção
    canvasInteraction.ts   #   coordenadas mundo↔tela, snap
    hitTesting.ts          #   o que está sob o ponto clicado
    roomDetection.ts, ambientesGeometria.ts, reconciliarAmbientes.ts
    encaixeParede.ts, catalogThumbnails.ts, atalhosTeclado.ts
    furnitureCatalog.ts    #   catálogo de objetos: id, categoria, cor, medidas em cm

  components/
    editor/
      FloorPlanCanvas.svelte  # montagem e fiação — a lógica mora em canvas/
      canvas/
        estadoCanvas.svelte.ts  #   ~105 campos de estado de interface, agrupados
        nucleo.ts               #   coordenadas, encaixe, caixas — quebra o ciclo abaixo
        desenho/                #   o quadro, em 6 fases nomeadas
        interacao/              #   um módulo por gesto: mouse, toque, teclado, drop
        *.svelte                #   sobrepostos: barra de status, camadas, dicas, zoom
    sidebar/
      BuildPanel.svelte + build/       # abas: aberturas, ambientes, objetos
      PropertiesPanel.svelte + propriedades/  # um painel por tipo de elemento
      LayersPanel.svelte, AreaSummaryPanel.svelte
    toolbar/TopBar.svelte + subcomponentes
```

### Pipeline do canvas

`FloorPlanCanvas.svelte` monta o `<canvas>` e faz a fiação, nada mais. A ordem de construção é
o contrato:

```
const ui = new EstadoCanvas();          // estado de interface (~105 campos)
const n  = criarNucleo(ui);             // coordenadas, encaixe, caixas de seleção
const d  = criarDesenho(ui, n);         // o quadro, em 6 fases
const acoes = criarInteracao(ui, n, d); // mouse, toque, teclado, drop, menu
```

O núcleo existe para que **desenho e interação não dependam um do outro** — os dois precisam de
`screenToWorld`, `snap` e das caixas, e sem ele haveria ciclo.

O desenho monta um `CanvasState` (`{ ctx, width, height, zoom, camX, camY }`) e delega:

- **desenhar** → `utils/renderizador/` — um módulo por família: `paredes`, `portas`, `janelas`,
  `equipamentos`, `estruturas`, `ambientes`, `anotacoes`, `grade`, `reguas`, `minimapa`,
  mais `geometria` (comprimento de parede, mundo→tela) compartilhada por todos.
- **ícone 2D de cada item** → `utils/icones/` → `drawFurnitureIcon(ctx, catalogId, w, d, color, stroke)`,
  que despacha por `iconDrawers[catalogId]`. Sem entrada no mapa, cai num retângulo genérico.
- **converter coordenadas / snap** → `utils/canvasInteraction.ts` (`screenToWorld`,
  `worldToScreen`, `snap`, `magneticSnap`, `angleSnap`)
- **descobrir o que foi clicado** → `utils/hitTesting.ts` (`findWallAt`, `findFurnitureAt`,
  `findRoomAt`, `findHandleAt`…)
- **encaixar item na parede** → `utils/encaixeParede.ts`
- **reatar ambientes detectados aos salvos** → `utils/reconciliarAmbientes.ts`

Regra: tudo em `utils/` é **função pura**. Não importa store, não muta estado. Lógica nova de
desenho ou de clique vai lá, não inline no componente.

A **ordem das fases** é responsabilidade de `desenho/quadro.ts`: fundo → estrutura → cotas →
elementos → parede em progresso → seleção → réguas e minimapa. Trocar a ordem muda o que fica
coberto pelo quê; réguas e minimapa vêm por último de propósito.

### Coordenadas e unidades

- **1 unidade de mundo = 1 cm.** Larguras/profundidades/alturas do catálogo são cm.
- Áreas são calculadas e exibidas em m² (`formatArea`).
- Ângulos: `rotation` de itens em **graus**; conversão para radianos no desenho.
- `screenToWorld(cs, sx, sy) = ((s - size/2) / zoom) + cam`.
- Grid visual `GRID = 20`; snap do usuário é `projectSettings.gridSize` (padrão 25 cm).
- Exibição respeita `projectSettings.units` (`metric` | `imperial`) via `formatLength` /
  `formatLengthPrecise` / `formatArea`. **Nunca concatene "cm" na mão na UI.**

### Estado e undo/redo

`stores/project.ts` usa **stores clássicas** (`writable`/`derived`), não runes — runes são usadas
apenas dentro dos componentes (`$state`, `$derived`). Não misture.

Toda mutação passa por `mutate(fn, descrição, coalesceKey?)`, que aplica a função sobre o
`Floor` ativo e tira um snapshot para o histórico. Consequências:

- **Nunca mute `currentProject` direto.** Escreva/reuse uma função exportada em `project.ts`.
- Arrasto contínuo: `beginDrag()` … `commitFurnitureMove()`. Edição por teclado em campo de
  propriedade: passe `coalesceKey` para não gerar uma entrada de undo por tecla.
- Agrupar várias mutações em um undo: `beginUndoGroup()` / `endUndoGroup(descrição)`.

### Persistência — localStorage hoje, Firebase depois

`services/datastore.ts` define a interface `DataStore`
(`save`/`load`/`list`/`delete`/`duplicate`/thumbnails). **É o ponto de extensão**: hoje há uma
implementação (`localStore`, em localStorage), e o `firebaseStore` entra ao lado dela.

Chaves do localStorage: `floorplan_projects`, `floorplan_thumb_<id>`, `o3d_settings`.

**Estado atual:** o projeto no Firebase ainda não existe — o nome está por definir. `firebase.ts`
lê a configuração de variáveis `PUBLIC_FIREBASE_*` (ver `.env.example`) e fica **inerte** sem
elas. O app funciona normalmente assim; nada é enviado para lugar nenhum.

O `localStorage` tem cota de poucos MB — `localStore.save()` já trata `QuotaExceededError`. Até o
Firebase entrar, a exportação em JSON não é conveniência: é a saída de emergência do usuário.

`localStore.load()` já faz migração defensiva (preenche arrays ausentes em `Floor`). **Mantenha
esse ponto como o lugar da migração de esquema.**

### Exportação

`utils/export.ts` (PNG, SVG, PDF, JSON) e `utils/cadExport.ts` (DXF, DWG). Ao adicionar um tipo
novo de elemento, ele precisa aparecer em **todos** os exportadores — é o esquecimento mais comum
neste repo.

## 5. Convenções

- **Nomes novos em PT-BR**: `ambiente`, `parede`, `abertura`, `pavimento`, `adicionarAmbiente`.
- Arquivos: `camelCase.ts` para utils/stores, `PascalCase.svelte` para componentes.
- Sem framework de ícones: SVG inline nos componentes, `canvas` para símbolos da planta.
- Tailwind direto no markup; sem CSS global novo (`src/app.css` só tem reset/scrollbar/tema).
- Mensagens de commit: `feat:` / `fix:` / `ux:` / `docs:` — como no histórico.

## 6. Trabalho pendente

### Firebase — bloqueado até o projeto existir

O usuário ainda vai criar o projeto no Firebase e definir o nome. **Não escreva código de
Firestore ou de autenticação antes disso** — sem projeto real não há como testar, e código não
exercitado envelhece errado.

Quando existir, na ordem:

1. **Autenticação** — cadastro e login próprios (Firebase Auth). O site é de uso individual:
   cada usuário enxerga só os projetos dele.
2. **`services/firebaseStore.ts`** implementando `DataStore`, ao lado de `localStore`.
   A escolha entre os dois é de runtime: sem usuário logado, `localStore`.
3. **Regras de Segurança do Firestore** — quem protege os dados são elas, não o segredo da
   `apiKey`, que é pública por natureza. Projeto só acessível pelo dono.
4. **Modo offline** — `localStore` continua útil como cache e para uso sem conta.

**Não vai haver migração do localStorage para o Firebase.** O site nunca foi publicado e não
tem usuários: o que existe em navegador é dado de teste do próprio autor. Começa do zero.

### Técnico, sem bloqueio

1. **Testes unitários das funções puras de `utils/`** — geometria de parede, detecção de
   ambiente, encaixe e reconciliação. São as mais fáceis de testar e as mais fáceis de quebrar
   numa refatoração. A suíte de interface (§9) cobre o comportamento, não os cálculos.
2. **Catálogo em PT-BR** — as categorias de `utils/furnitureCatalog.ts` (`Living Room`,
   `Electrical`, `Plumbing`…) ainda aparecem em inglês na interface.
3. **Arquivos na zona de atenção (300–400 linhas)** — `houseTemplates`, `PrintLayout`,
   `FloorPlanCanvas`, `roomDetection`, `renderizador/paredes`, `interacao/mouseMove`. Dentro da
   regra, mas quebre antes de crescer.

## 7. Dívida técnica

### Resolvida

- ~~`three` + `static/models/*.glb`~~ — as miniaturas do catálogo agora são geradas pelo próprio
  símbolo 2D (`utils/catalogThumbnails.ts`). Three.js, `@types/three`, `furnitureThumbnails.ts` e
  os 204 arquivos `.glb` foram removidos.
- ~~`stores/aiKeys.ts`, `utils/roomTemplates.ts`~~ — dead code, removidos. Não há mais chave de
  API de terceiro guardada no cliente.
- ~~`MODEL_SOURCES.md`~~ — documentação de modelos 3D, removida.
- ~~`README.md` desatualizado~~ — reescrito para o produto atual.

- ~~Arquivos gigantes~~ — quebrados por responsabilidade:
  `canvasRenderer` 1640 → `renderizador/` (maior: 306) · `project.ts` 1300 → `stores/project/`
  (maior: 217) · `furnitureIcons` 1000 → `icones/` (maior: 167) · `export` 744 → `exportacao/`
  (maior: 281) · `PropertiesPanel` 719 → 78 + `propriedades/` · `textureGenerator` 567 →
  `texturas/` (maior: 227) · `BuildPanel` 504 → 43 + `build/` · `TopBar` 461 → 176 +
  subcomponentes · `roomPresets` 421 → `ambientes/` (maior: 183) · `editor/+page` 321 → 116.

### Aberta

- **Sem testes unitários.** Existe suíte de interface (Playwright, 56 testes), mas as funções
  puras de `utils/` — geometria de parede, detecção de ambiente, encaixe, reconciliação — não têm
  cobertura direta. São as mais fáceis de testar e as mais fáceis de quebrar em refatoração.
- `.firebaserc` e `apphosting.yaml` ainda apontam para `openplan3d`, projeto do fork original.
  Trocar quando o projeto novo existir.
- Ver §6 para o que segue pendente.

## 8. Branches

- `agent/*` — desenvolvimento de cada alteração
- `dev` — QA / homologação (branch atual)
- `main` — versão aprovada

## 9. Testes de interface

`tests/e2e/` (Playwright) é a única rede de segurança do projeto. Um arquivo por área da UI,
espelhando `docs/ui/`.

### Regras que mantêm a suíte confiável

- **Nunca `waitForTimeout` para esperar desenho.** O canvas pinta por `requestAnimationFrame`;
  use `esperarPrimeiroQuadro()` ou `expect.poll`. Espera fixa dá teste que passa na sua máquina
  e falha na do outro.
- **Verifique o desenho, não a classe CSS.** `contarPixeis()` lê o canvas com `getImageData`.
  Um teste que só confere `class="..."` teria passado com o canvas congelado — foi assim que o
  bug 1 de `ACHADOS.md` sobreviveu tanto tempo.
- **O `localStorage` é gravado com debounce de 500 ms.** Ao conferir o projeto salvo, use
  `expect.poll`, nunca leitura direta logo após a ação.
- **Documente o comportamento atual, não o desejado.** Se algo está errado, o teste registra o
  que o produto faz e o achado entra em `docs/ui/ACHADOS.md`. Teste que falha de propósito vira
  ruído e some do radar.
- **Toda captura sai de teste.** `evidenciar(alvo, area, parametro)` grava em
  `docs/ui/_evidencias/<area>/<parametro>.png` — pasta ignorada pelo git, recriada por `npm test`.
  Captura feita à mão envelhece calada.

### Ao corrigir um bug

Escreva primeiro o teste que reproduz, confirme que ele falha, depois corrija. E confira contra
o commit anterior à sua mudança se o bug é **regressão sua** ou **pré-existente** — a distinção
muda quem precisa ser avisado e entra no registro do achado.
