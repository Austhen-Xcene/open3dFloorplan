# CLAUDE.md

Contexto do projeto para o Claude Code. Leia antes de qualquer alteração.

## 1. O que é este projeto

**Site independente** onde o usuário monta a planta 2D da própria casa, distribui visualmente os
**equipamentos de automação do Studio SHC** dentro de cada ambiente, e enxerga **em qual
equipamento e em qual saída** cada carga está ligada.

### O que este projeto NÃO é

Estas linhas existem porque a premissa já mudou uma vez. Não reintroduza nada disto sem o
usuário pedir explicitamente:

- ❌ **Não conversa com o Studio SHC.** Sem API, sem backend, sem autenticação, sem sincronizar
  a tabela de entradas e saídas do app. O site é desvinculado.
- ❌ **Não roda dentro de webview.** Sem Flutter, sem ponte JS, sem modo embarcado, sem
  `modoIncorporado`. É um site aberto no navegador, e só.
- ❌ **Não busca o catálogo de lugar nenhum.** Os equipamentos são uma tabela **mantida no
  repositório**, atualizada por commit.

Consequência prática: tudo é client-side. O projeto do usuário vive no `localStorage` e sai por
exportação (JSON, PNG, SVG, PDF, DXF, DWG). `services/datastore.ts` continua sendo a interface
de persistência, mas com uma implementação só — `localStore`.

### Origem

O repositório nasceu do `open3dFloorplan` (editor genérico de plantas com catálogo de móveis:
cama, sofá, armário…). Esse catálogo de móveis é **legado a ser substituído** pelo catálogo de
equipamentos SHC. Ver §7.

## 2. Restrições inegociáveis

1. **É 2D. Só 2D.** Não reintroduzir renderização 3D, câmera 3D, walkthrough ou Three.js na
   visualização. O único uso remanescente de Three.js (`furnitureThumbnails.ts`) é legado e sai
   junto com o catálogo de móveis.
2. **Zoom, pan, minimapa e snap são funcionalidades centrais** — o usuário precisa deles para
   achar um equipamento na planta. Não degradar em nome de simplificação.
3. **Tudo roda no navegador.** Sem servidor de dados, sem API, sem sessão. Se uma tarefa parece
   pedir backend, o caminho certo é resolver no cliente ou perguntar ao usuário — não inventar
   um endpoint.
4. **Compatibilidade de dados.** Projetos já salvos no `localStorage` precisam continuar
   abrindo. Toda mudança de tipo exige migração — ver a skill `modelo-de-dados`.
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
npm run check     # svelte-check + TS — rode antes de commitar
npm run build
npm run preview
```

Não há suíte de testes. Validação = `npm run check` + verificação manual no navegador.

Deploy: Firebase App Hosting (`apphosting.yaml`, projeto `openplan3d`), `@sveltejs/adapter-node`.

## 4. Arquitetura

### Stack

SvelteKit 2 · **Svelte 5 (runes)** · TypeScript · Tailwind CSS v4 (via `@tailwindcss/vite`, sem
`tailwind.config`) · Canvas 2D nativo · jsPDF · dxf-writer · Firebase (só Analytics hoje).

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
    furnitureCatalog.ts    #   catálogo atual (vira o catálogo de equipamentos SHC)

  components/
    editor/
      FloorPlanCanvas.svelte  # 3411 linhas — VER §8, ainda acima do limite
      canvas/                 #   overlays e ações extraídas do canvas
    sidebar/
      BuildPanel.svelte + build/       # abas: aberturas, ambientes, objetos
      PropertiesPanel.svelte + propriedades/  # um painel por tipo de elemento
      LayersPanel.svelte, AreaSummaryPanel.svelte
    toolbar/TopBar.svelte + subcomponentes
```

### Pipeline do canvas

`FloorPlanCanvas.svelte` é o único dono do `<canvas>`. Ele monta um `CanvasState`
(`{ ctx, width, height, zoom, camX, camY }`) e delega:

- **desenhar** → `utils/renderizador/` — um módulo por família: `paredes`, `portas`, `janelas`,
  `equipamentos`, `estruturas`, `ambientes`, `anotacoes`, `grade`, `reguas`, `minimapa`,
  mais `geometria` (comprimento de parede, mundo→tela) compartilhada por todos.
- **ícone 2D de cada item** → `utils/icones/` → `drawFurnitureIcon(ctx, catalogId, w, d, color, stroke)`,
  que despacha por `iconDrawers[catalogId]`. Sem entrada no mapa, cai num retângulo genérico.
  **É aqui que entram os símbolos dos equipamentos SHC.**
- **converter coordenadas / snap** → `utils/canvasInteraction.ts` (`screenToWorld`,
  `worldToScreen`, `snap`, `magneticSnap`, `angleSnap`)
- **descobrir o que foi clicado** → `utils/hitTesting.ts` (`findWallAt`, `findFurnitureAt`,
  `findRoomAt`, `findHandleAt`…)
- **encaixar item na parede** → `utils/encaixeParede.ts`
- **reatar ambientes detectados aos salvos** → `utils/reconciliarAmbientes.ts`

Regra: tudo em `utils/` é **função pura**. Não importa store, não muta estado. Lógica nova de
desenho ou de clique vai lá, não inline no componente.

A **ordem de desenho** continua sendo responsabilidade do `FloorPlanCanvas`, não dos módulos —
mudar a posição de uma chamada no frame muda o que fica coberto pelo quê.

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

### Persistência

Tudo no navegador. `services/datastore.ts` define a interface `DataStore`
(`save`/`load`/`list`/`delete`/`duplicate`/thumbnails), com uma implementação: `localStore`
(localStorage). Não há outra e não está previsto haver.

Chaves: `floorplan_projects`, `floorplan_thumb_<id>`, `o3d_settings`.

O `localStorage` tem cota (poucos MB) — `localStore.save()` já trata `QuotaExceededError`. É por
isso que a exportação em JSON não é conveniência, é a saída de emergência do usuário.

`localStore.load()` já faz migração defensiva (preenche arrays ausentes em `Floor`). **Mantenha
esse ponto como o lugar da migração de esquema.**

### Exportação

`utils/export.ts` (PNG, SVG, PDF, JSON) e `utils/cadExport.ts` (DXF, DWG). Ao adicionar um tipo
novo de elemento, ele precisa aparecer em **todos** os exportadores — é o esquecimento mais comum
neste repo.

## 5. Convenções

- **Nomes novos em PT-BR**: `catalogoEquipamentos`, `EquipamentoSHC`, `adicionarEquipamento`,
  `ambiente`, `saida`, `entrada`, `circuito`.
- Arquivos: `camelCase.ts` para utils/stores, `PascalCase.svelte` para componentes.
- Sem framework de ícones: SVG inline nos componentes, `canvas` para símbolos da planta.
- Tailwind direto no markup; sem CSS global novo (`src/app.css` só tem reset/scrollbar/tema).
- Mensagens de commit: `feat:` / `fix:` / `ux:` / `docs:` — como no histórico.

## 6. Entradas, saídas e ligações

É o diferencial do produto e vive **inteiro dentro deste projeto** — não há nada para sincronizar
com o Studio SHC.

Cada equipamento do catálogo declara quantas **entradas** e quantas **saídas** tem. O projeto do
usuário guarda as **ligações**: qual carga (ponto de luz, tomada, motor…) está ligada em qual
saída de qual equipamento.

O que o usuário precisa conseguir fazer:

- posicionar o equipamento no ambiente onde ele fisicamente fica;
- ligar uma carga a uma saída livre e ver isso representado na planta;
- selecionar um equipamento e enxergar tudo que depende dele;
- selecionar uma carga e enxergar de onde ela vem;
- saber quantas saídas ainda estão livres em cada equipamento.

Regras que decorrem disso:

- A ligação é dado do **projeto**, não do catálogo — mora no `Floor`, junto com os elementos.
- Toda alteração de ligação passa por `mutate` como qualquer outra (undo/redo funciona).
- Uma saída não pode receber duas cargas; a validação é responsabilidade da store, não da UI.
- Apagar um equipamento tem que soltar as ligações dele — senão sobra referência órfã que some
  silenciosamente no desenho.

## 7. Evolução planejada (ordem sugerida)

1. **Modelo de equipamento** — novo tipo `EquipamentoSHC` (id, categoria, símbolo, nº de entradas
   e saídas, tensão/carga) e `EquipamentoInstalado` no `Floor`, substituindo `FurnitureItem`.
2. **Catálogo** — trocar `utils/furnitureCatalog.ts` pelo catálogo SHC, mantido no repositório.
   A seção `Electrical` / `Plumbing` do catálogo atual (itens com `symbol: true`) é o modelo mais
   próximo do alvo. Divida por domínio (`catalogo/modulos.ts`, `catalogo/sensores.ts`, …) com um
   `index.ts` que agrega — a tabela inteira estoura o limite de linhas rapidinho.
3. **Símbolos 2D** — desenhar cada equipamento em `utils/icones/` (padrão de símbolo elétrico,
   não desenho de móvel).
4. **Ligações** — estrutura de ligação nos tipos, validação na store e desenho da conexão
   *carga → saída → equipamento* no renderizador, com destaque ao selecionar.
5. **Limpeza final** — remover o catálogo de móveis quando o de equipamentos estiver completo.

## 8. Dívida técnica

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

- ⚠️ **`FloorPlanCanvas.svelte` ainda tem 3411 linhas** — o único arquivo acima do limite.
  Já saíram dele: markup → `editor/canvas/*`, réguas → `renderizador/reguas.ts`, encaixe em
  parede → `utils/encaixeParede.ts`, reconciliação de ambientes →
  `utils/reconciliarAmbientes.ts`, menu de contexto → `editor/canvas/acoesMenuContexto.ts`.

  O que sobrou é **uma máquina de estados de interação**: `draw()` (~620 linhas),
  `onMouseDown` (~400), `onMouseMove` (~270), `onKeyDown` (~250) e ~60 variáveis `$state`
  que todos compartilham. Não dá para fatiar por recorte de texto sem quebrar reatividade.

  **Plano para o próximo passo** (nesta ordem, um por commit, `npm run check` + teste manual
  a cada etapa):
  1. Criar `editor/canvas/estadoCanvas.svelte.ts` com uma classe de runes agrupando as ~60
     variáveis por assunto (câmera, arrasto, seleção, ferramentas, medição).
  2. Trocar as variáveis soltas do componente por essa instância — **só troca de referência,
     zero mudança de lógica**.
  3. Extrair `draw()` para `renderizador/quadro.ts`, recebendo a instância + o `Floor`.
  4. Extrair cada handler (`onMouseDown`, `onMouseMove`, `onMouseUp`, `onKeyDown`) para
     `editor/canvas/interacao/*.ts`, recebendo a mesma instância.

  Não faça os quatro de uma vez. Sem testes, cada etapa precisa ser exercitada no navegador.

- **Sem testes automatizados.** Validação é `npm run check` + verificação manual. Ao criar a
  primeira suíte, comece pelas funções puras de `utils/` — são as mais fáceis, as mais críticas,
  e são o que falta para tornar o passo acima seguro.
- `src/lib/firebase.ts` só carrega o Analytics (importado sob demanda em `+layout.svelte`). O
  Firebase aqui é **destino de deploy** (App Hosting), não backend de dados — não confunda os
  dois nem o use como porta de entrada para armazenar projeto fora do navegador.
- Tudo em §7 ainda por fazer (modelo de equipamento, catálogo, símbolos 2D, ligações).

## 9. Branches

- `agent/*` — desenvolvimento de cada alteração
- `dev` — QA / homologação (branch atual)
- `main` — versão aprovada
