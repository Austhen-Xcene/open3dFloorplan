---
name: refatorar-arquivo-grande
description: Quebrar um arquivo que passou de 300-400 linhas em módulos ou componentes menores, seguindo clean code e clean architecture, sem mudar comportamento. Use quando um arquivo estiver grande demais, quando for preciso extrair componente/módulo/função, ou antes de adicionar código a um arquivo que já passou do limite.
---

# Refatorar arquivo grande

Limite do projeto: **300–400 linhas por arquivo**. Acima de 400, quebre **antes** de adicionar
qualquer coisa nova. Refatorar e adicionar podem ir no mesmo commit — nessa ordem.

## Regra zero: não mude comportamento

Extração é movimentação de código, não reescrita. Se durante o corte você vir um bug ou uma
melhoria, **anote e faça depois, em commit separado**. Misturar as duas coisas torna impossível
saber qual mudança quebrou o quê — e aqui não há testes para te salvar.

## Método

### 1. Mapear antes de cortar

Liste os blocos do arquivo e o que cada um toca. Pergunte de cada par de blocos:
**"esses dois mudam pelo mesmo motivo?"**

- Sim → ficam juntos.
- Não → são módulos diferentes.

Cortar por número de linhas ("as 400 primeiras vão para cá") produz módulos acoplados e piora o
código. O corte é por **responsabilidade**.

### 2. Escolher o tipo de extração

| Sintoma | Extração |
|---|---|
| Bloco visual coeso num `.svelte` | Subcomponente `.svelte` |
| Cálculo sem estado nem I/O | Função pura em `utils/` |
| Grupo de operações sobre o mesmo agregado | Módulo em `stores/` |
| Leitura/escrita externa | Módulo em `services/` |
| Família de desenho (paredes, aberturas, cotas) | Um módulo por família + `index.ts` que reexporta |
| Tabela de dados grande | Um arquivo por domínio + `index.ts` que agrega |

### 3. Respeitar a direção das dependências

```
componentes  →  stores  →  services  →  models
     ↓            ↓                        ↑
    utils (funções puras) ──────────────────┘
```

`utils/` **não pode** importar store ou service. Se o código que você quer extrair para `utils/`
lê uma store, o argumento tem que virar parâmetro: passe o dado, não a store.

### 4. Extrair um por vez

Um bloco por passo, rodando `npm run check` a cada passo. Duas extrações grandes de uma vez e
você não sabe qual quebrou.

Ordem que costuma dar menos atrito neste repo:
1. Constantes e tipos (zero risco).
2. Funções puras.
3. Subcomponentes de apresentação.
4. Lógica com estado (o mais arriscado, por último).

### 5. Verificar de verdade

`npm run check` passar **não** significa que funciona — em Svelte, muita coisa quebra só em
runtime (reatividade perdida, prop não repassada, evento não borbulhando). Depois de extrair,
abra o editor e exercite o que você mexeu.

## Armadilhas específicas de Svelte 5 neste repo

- **Reatividade não atravessa a extração sozinha.** Ao mover markup para um subcomponente, o que
  era `$state` local vira `$props()` — e se o filho precisa alterar, use `$bindable()` ou um
  callback, nunca mutação silenciosa do objeto recebido.
- **`$derived` recalcula no escopo em que está declarado.** Movê-lo para outro componente muda
  quando ele roda.
- **Stores clássicas vs. runes**: `stores/*.ts` usa `writable`/`derived`; componentes usam runes.
  Extração não é hora de converter de um para o outro.
- **Subscrição órfã**: `store.subscribe()` dentro de componente precisa ser desfeita. Prefira
  `$store` no markup ou `get(store)` para leitura pontual.
- **Ordem de desenho no canvas**: extrair uma função de desenho não pode mudar a posição da
  chamada no frame. Ver skill `canvas-2d`.

## Checklist

```
[ ] o corte foi por responsabilidade, não por contagem de linhas
[ ] nome do novo arquivo descreve o que ele faz sem usar "e"
[ ] direção das dependências respeitada (utils não importa store/service)
[ ] nenhum comportamento alterado — só código movido
[ ] nenhuma correção de bug ou melhoria embutida no meio da extração
[ ] npm run check passa
[ ] exercitado no navegador o fluxo afetado
[ ] o arquivo original agora está abaixo de 400 linhas
[ ] os arquivos novos também estão abaixo de 400 linhas
```
