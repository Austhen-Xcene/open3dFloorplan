---
name: catalogo-objetos
description: Adicionar, editar ou remover um item do catálogo do editor de plantas — inclui o registro no catálogo, o símbolo 2D desenhado no canvas, as propriedades editáveis e a exportação. Use sempre que a tarefa mencionar catálogo, item, objeto, símbolo, miniatura, categoria, ou o painel lateral de objetos.
---

# Catálogo de objetos

Um item do catálogo tem **quatro pontos de contato**. Esquecer qualquer um gera bug silencioso
(item invisível, sem propriedades, ou some ao exportar). Percorra os quatro.

## Antes de começar

Leia, nessa ordem:
1. `src/lib/utils/furnitureCatalog.ts` — o registro. A seção `Electrical Symbols (2D only)` no
   final é o padrão dos itens que são **símbolo de projeto** em vez de volume físico:
   `symbol: true`, medidas pequenas em cm, `height: 0`.
2. `src/lib/utils/icones/` — um módulo por categoria, mais o mapa `iconDrawers` e
   `drawFurnitureIcon` em `index.ts`.
3. `src/lib/components/sidebar/build/AbaObjetos.svelte` — como o catálogo vira UI.

## Os quatro pontos de contato

### 1. Registro no catálogo

Arquivo: `src/lib/utils/furnitureCatalog.ts`.

Campos: `id`, `name`, `category`, `icon` (emoji da lista), `color`, `width`/`depth`/`height` em
**cm**, `symbol?: boolean`.

**O `id` é chave de persistência.** Projetos salvos guardam `catalogId`. Renomear um `id` quebra
projetos existentes — se precisar, adicione um mapa de alias na migração
(skill `modelo-de-dados`).

Se a tabela passar de 400 linhas, divida por domínio (`catalogo/sala.ts`, `catalogo/eletrica.ts`,
…) com um `catalogo/index.ts` que agrega — ver skill `refatorar-arquivo-grande`.

### 2. Símbolo 2D no canvas

Arquivo: o módulo da categoria em `src/lib/utils/icones/`.

Escreva `desenharXxx(ctx, w, d, cor)` e registre no mapa `iconDrawers` de `icones/index.ts` com a
mesma chave do `id`. Sem registro, o item cai no retângulo genérico do fallback.

Regras do desenho:
- O `ctx` **já chega transladado para o centro do item e rotacionado**. Desenhe em torno de
  `(0, 0)`, de `-w/2` a `w/2` e de `-d/2` a `d/2`.
- `w` e `d` vêm **em pixels** (`cm * zoom`). Não multiplique por zoom de novo.
- Não chame `ctx.save()`/`restore()` desbalanceados — `drawFurnitureItem` já envolve a chamada.
- Legível a zoom baixo, em tema claro e escuro. Para símbolo de projeto, prefira formas
  geométricas (círculo, cruz, arco) a desenho pictórico.
- Nada de `await`, imagem externa ou fonte customizada — a função roda a cada quadro.

A **miniatura do painel lateral sai deste mesmo desenho** (`utils/catalogThumbnails.ts`), então
um símbolo bem-feito resolve os dois lugares de uma vez.

### 3. Propriedades editáveis

Arquivo: `src/lib/components/sidebar/propriedades/PropriedadesEquipamento.svelte`.

Toda edição chama a função exportada em `stores/project` (`updateFurniture`) — **nunca** mute a
store direto.

Em campos de texto/número, passe `coalesceKey` na mutação para que a digitação vire **uma**
entrada de undo, não uma por tecla.

Ao exibir medida, use `propriedades/unidades.ts`. Nunca escreva "cm" fixo na UI — o usuário pode
estar em imperial.

### 4. Exportação

Arquivos: `src/lib/utils/exportacao/` (PNG, SVG, PDF, JSON) e `src/lib/utils/cadExport.ts`
(DXF, DWG).

PNG e o `PrintLayout` reaproveitam o renderizador do canvas — costumam funcionar de graça.
**SVG, PDF, DXF e DWG têm desenho próprio** e precisam de tratamento explícito para símbolo novo,
senão o item simplesmente não sai no arquivo exportado.

## Checklist de verificação

```
[ ] nenhum arquivo tocado passou de 400 linhas (skill `refatorar-arquivo-grande`)
[ ] id novo é único e não colide com id já publicado
[ ] entrada registrada no mapa iconDrawers (chave == id)
[ ] símbolo legível com zoom baixo, em tema claro e escuro
[ ] aparece e é filtrável no painel de objetos (categoria existe na lista)
[ ] clique/seleção funciona (findFurnitureAt usa width/depth do catálogo)
[ ] propriedades editam e geram 1 entrada de undo por edição
[ ] aparece em SVG, PDF, DXF e DWG
[ ] npm run check e npm test passam
```

## Remoção de item do catálogo

Nunca apague um `id` sem cuidar dos projetos salvos que o referenciam. Ou mantenha o `id` marcado
como descontinuado, ou adicione mapeamento na migração. Item sem catálogo é **silenciosamente
ignorado** em `drawFurnitureItem` (`if (!cat) return;`) — o objeto some da planta sem aviso.
