# Achados da verificação automatizada

Levantados rodando a suíte Playwright contra o editor. Cada um foi confirmado contra o commit
`162c79e` (anterior à refatoração) para separar **regressão** de **bug pré-existente**.

## Corrigidos

### 1. Alternar grade, réguas, minimapa ou camada não repintava a planta
**Origem:** pré-existente · **Gravidade:** alta (parece que o botão não funciona)

O laço de desenho só repinta quando `canvasDirty` está marcado, e nenhum desses botões marcava.
A mudança só aparecia no próximo movimento do mouse sobre o canvas.

**Correção:** `$effect` em `FloorPlanCanvas.svelte` que observa as flags de visualização e chama
`markDirty()`.
**Teste:** `04-canvas.spec.ts` → "alterna grade e o desenho muda", "alterna réguas".

### 2. Painel de camadas inclicável com um ambiente selecionado
**Origem:** pré-existente · **Gravidade:** média

O painel de propriedades (`z-40`, fixo à direita) cobria o painel de camadas (`z-20`). O painel
abria, mas os cliques nos checkboxes iam para o painel de propriedades.

**Correção:** painel de camadas passou para `z-50`.
**Teste:** `04-canvas.spec.ts` → "painel de camadas abre e desliga uma camada".

### 3. Um clique simples criava entrada de histórico fantasma
**Origem:** pré-existente · **Gravidade:** alta (Ctrl+Z "não faz nada")

Clicar num ambiente chamava `startRoomDrag`, e o `mouseup` chamava `commitFurnitureMove()` sem
verificar se houve deslocamento — gerando um `snapshot()` de um movimento que não aconteceu.
Resultado: depois de clicar num ambiente, o usuário precisava apertar Ctrl+Z **duas vezes** para
desfazer a inserção.

**Correção:** `EstadoCanvas.arrastouDeVerdade`, marcado em `onMouseMove` só quando o ponteiro
percorre ≥ 3 px de tela com o botão pressionado. O `mouseup` só registra no histórico se o gesto
foi arrasto de verdade.
**Teste:** `06-historico.spec.ts` → "Ctrl+Z e Ctrl+Y funcionam pelo teclado".

### 4. Sair ou recarregar perdia até 500 ms de trabalho
**Origem:** pré-existente · **Gravidade:** alta (perda de dados)

O auto-save é debounced em 500 ms e não havia flush ao sair. Como não existe backend, o
`localStorage` é o único lugar onde o projeto existe: inserir um ambiente e recarregar em
seguida perdia o ambiente inteiro. Reproduzido: projeto salvo com `0 paredes / 0 ambientes`
logo após a inserção.

**Correção:** `beforeunload`, `pagehide` e `visibilitychange` gravam o pendente na hora, e a
limpeza do `onMount` também.
**Teste:** `08-persistencia-exportacao.spec.ts` → "recarregar a página mantém o projeto".

### 5. Esc não fechava a lista de atalhos
**Origem:** ⚠️ **regressão introduzida na refatoração** · **Gravidade:** baixa

Ao reescrever `routes/editor/+page.svelte`, o tratamento de `Escape` para o overlay de ajuda foi
perdido (existia na linha 73 do original). O overlay tem `onkeydown` próprio, mas só dispara com
foco dentro dele — e ele não recebe foco sozinho. O rodapé do próprio overlay promete "Esc para
fechar".

**Correção:** `Escape` voltou ao tratador de teclado da página.
**Teste:** `08-persistencia-exportacao.spec.ts` → "a lista de atalhos abre com ? e fecha com Esc".

### 6. Botão "Girar ambiente" só aparecia após clicar no ambiente na planta
**Origem:** pré-existente · **Gravidade:** baixa (inconsistência)

Inserir pelo formulário define `selectedRoomId` — o painel de propriedades abre — mas não monta a
seleção das 4 paredes. O botão era condicionado a `getMultiSelectBBox()`, que exige
`currentSelectedIds.size >= 2`, então não aparecia.

**Correção:** `bboxDoAmbienteSelecionado()` calcula a caixa a partir do polígono do ambiente,
sem depender da seleção múltipla.
**Teste:** `05-propriedades.spec.ts` → "botão de girar aparece assim que o ambiente é inserido".

### 7. Textos de interface em inglês
**Origem:** pré-existente · **Gravidade:** baixa

**Correção:** `Untitled Project` → `Projeto sem nome`, `Ground Floor` → `Térreo`,
`Floor N` → `Pavimento N`, e o campo da paleta de comandos → `Buscar objetos, ferramentas, ações…`.

Restam as **categorias do catálogo** (`Living Room`, `Electrical`, `Plumbing`), que saem direto de
`furnitureCatalog.ts` — ver `CLAUDE.md` §6, item 2.

## Abertos

Nenhum.
