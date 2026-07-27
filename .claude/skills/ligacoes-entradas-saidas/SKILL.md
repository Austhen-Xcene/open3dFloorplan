---
name: ligacoes-entradas-saidas
description: Modelar, validar e desenhar as ligações entre cargas e as saídas dos equipamentos SHC — quantas entradas/saídas cada equipamento tem, o que está ligado onde, quantas saídas sobram. Use quando a tarefa mencionar ligação, entrada, saída, carga, circuito, conexão, "onde está ligado", ou o painel de ocupação de um equipamento.
---

# Ligações entre cargas e saídas

O diferencial do produto: o usuário precisa olhar a planta e saber **em qual equipamento e em
qual saída** cada carga está ligada.

> Tudo isto vive **dentro deste projeto**. Não existe API do Studio SHC, não existe tabela
> externa para sincronizar. Se você está prestes a escrever um `fetch`, parou no lugar errado —
> ver `CLAUDE.md` §1.

## Onde cada coisa mora

| Dado | Onde | Por quê |
|---|---|---|
| Quantas entradas/saídas o modelo tem | catálogo (`utils/catalogo*`) | é característica do produto, igual para todo mundo |
| Qual equipamento está em qual ambiente | `Floor` do projeto | é escolha do usuário |
| Qual carga está em qual saída | `Floor` do projeto | é escolha do usuário |

Regra: **contagem no catálogo, ligação no projeto**. Guardar a ligação no catálogo faz o projeto
de um usuário vazar para o outro; guardar a contagem no projeto impede corrigir um erro do
catálogo por commit.

## Modelo

Ao criar os tipos (ver skill `modelo-de-dados`), algo nesta forma:

```ts
/** Uma carga ligada a uma saída específica de um equipamento instalado. */
export interface Ligacao {
  id: string;
  /** Id do EquipamentoInstalado que alimenta. */
  equipamentoId: string;
  /** Índice da saída nesse equipamento, base 0. */
  saida: number;
  /** Id do elemento alimentado (ponto de luz, tomada, motor…). */
  cargaId: string;
}
```

`Ligacao[]` entra no `Floor`, ao lado de `walls`, `rooms` etc. — e portanto entra em **toda** a
lista de lugares do checklist da skill `modelo-de-dados`, incluindo os exportadores.

## Invariantes — validar na store, nunca só na UI

A UI pode esconder um botão; ela não pode ser a única guardiã da consistência, porque importação
de JSON e desfazer/refazer não passam por ela.

```
[ ] uma saída recebe no máximo uma carga
[ ] `saida` está dentro do intervalo declarado pelo catálogo daquele equipamento
[ ] equipamentoId e cargaId existem no mesmo Floor
[ ] apagar um equipamento apaga as ligações dele
[ ] apagar uma carga apaga a ligação dela
[ ] trocar o modelo de um equipamento por outro com menos saídas resolve as ligações órfãs
    (recusar a troca ou soltar as ligações — decida e documente, mas não deixe apontando pro nada)
```

O item de remoção é o que mais escapa: sem ele sobra referência órfã, e o desenho da conexão
some sem aviso — o mesmo modo de falha de `drawFurnitureItem`, que faz `if (!cat) return;`.

Remoção em cascata precisa ser **um único passo de undo**: `beginUndoGroup()` … `endUndoGroup()`.

## Desenho na planta

Vai em `utils/renderizador/` (módulo próprio, ex. `ligacoes.ts`), seguindo as regras da skill
`canvas-2d`: função pura, recebe `CanvasState` + dados, sem store.

- A ligação é informação de projeto elétrico, não decoração: linha fina, tracejada, distinta de
  parede e de cota.
- Desenhar **todas** as ligações o tempo todo vira macarrão. O padrão que funciona: discretas por
  padrão, **realçadas ao selecionar** um dos dois lados.
- Ordem de desenho: acima do piso e das paredes, abaixo dos símbolos dos equipamentos — a linha
  não pode cobrir o símbolo que ela conecta.
- Rotule com a saída (`S3`, `4`) perto da carga; a zoom baixo, omita o rótulo em vez de deixá-lo
  ilegível.

## Ocupação

O usuário precisa saber quanto ainda cabe. Onde mostrar:

- no painel de propriedades do equipamento: lista de saídas, cada uma com o que está ligada ou
  "livre";
- no catálogo/painel lateral: quantas saídas livres restam no total, por modelo;
- na planta: um indicador discreto no símbolo quando o equipamento está lotado.

Calcule a ocupação com uma função pura em `utils/` a partir de `Floor` — não espalhe `filter`
sobre `ligacoes` por dentro dos componentes.

## Checklist

```
[ ] nenhum arquivo tocado passou de 400 linhas (skill `refatorar-arquivo-grande`)
[ ] contagem de entradas/saídas veio do catálogo, ligação veio do projeto
[ ] invariantes validados na store, não só na UI
[ ] remoção em cascata funciona e é um único passo de undo
[ ] importar um JSON com ligação inválida não quebra o editor
[ ] a ligação aparece em SVG, PDF, DXF e DWG
[ ] desenho legível com zoom baixo e em tema claro e escuro
[ ] npm run check passa
```
