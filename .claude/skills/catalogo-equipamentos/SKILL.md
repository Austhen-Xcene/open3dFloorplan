---
name: catalogo-equipamentos
description: Adicionar, editar ou remover um equipamento do catálogo SHC no editor de plantas — inclui o registro no catálogo, o símbolo 2D desenhado no canvas, as propriedades editáveis, as entradas/saídas e a exportação. Use sempre que a tarefa mencionar equipamento, catálogo, símbolo, módulo, relé, dimmer, sensor, carga, entrada, saída, ou substituir os móveis (cama/sofá/armário) por equipamentos SHC.
---

# Catálogo de equipamentos SHC

Um equipamento no editor tem **cinco pontos de contato**. Esquecer qualquer um gera bug silencioso
(item invisível, sem propriedades, ou some ao exportar). Percorra os cinco.

## Antes de começar

Leia, nessa ordem:
1. `src/lib/utils/furnitureCatalog.ts` — a seção `Electrical Symbols (2D only)` (final do arquivo)
   é o padrão mais próximo do alvo: itens com `symbol: true`, dimensões pequenas em cm, `height: 0`.
2. `src/lib/utils/furnitureIcons.ts` — mapa `iconDrawers` e `drawFurnitureIcon` (linha ~979).
3. `src/lib/components/sidebar/BuildPanel.svelte` — como o catálogo vira UI.

## Os cinco pontos de contato

### 1. Registro no catálogo

Arquivo: `src/lib/utils/furnitureCatalog.ts` (alvo: renomear para `catalogoEquipamentos.ts`).

Campos mínimos do modelo atual: `id`, `name`, `category`, `icon` (emoji da lista), `color`,
`width`/`depth`/`height` em **cm**, `symbol?: boolean`.

Campos do domínio SHC a acrescentar ao evoluir o tipo — em português:

```ts
export interface EquipamentoDef {
  id: string;               // slug estável — NUNCA mude depois de publicado (§ compatibilidade)
  nome: string;
  categoria: string;        // 'Módulos' | 'Iluminação' | 'Sensores' | 'Acionamentos' | ...
  cor: string;
  largura: number;          // cm
  profundidade: number;     // cm
  simbolo: boolean;         // true = símbolo de projeto elétrico, não volume físico
  entradas: number;         // nº de entradas do equipamento
  saidas: number;           // nº de saídas
  disponibilidade?: 'possuido' | 'catalogo';  // deixa aberta a decisão de escopo do catálogo
}
```

**O `id` é chave de persistência.** Projetos salvos guardam `catalogId`. Renomear um `id`
quebra projetos existentes — se precisar, adicione um mapa de alias na migração
(skill `modelo-de-dados`).

### 2. Símbolo 2D no canvas

Arquivo: `src/lib/utils/furnitureIcons.ts`.

Escreva uma função `desenharSimboloXxx(ctx, w, d, cor)` e registre no mapa `iconDrawers` com a
mesma chave do `id` do catálogo. Sem registro, o item cai no retângulo genérico do fallback.

Regras do desenho:
- O `ctx` **já chega transladado para o centro do item e rotacionado**. Desenhe em torno de
  `(0, 0)`, de `-w/2` a `w/2` e de `-d/2` a `d/2`.
- `w` e `d` vêm **em pixels** (`cm * zoom`). Não multiplique por zoom de novo.
- Não chame `ctx.save()`/`restore()` desbalanceados — `drawFurnitureItem` já envolve a chamada.
- Símbolo elétrico: traço limpo, contraste em fundo claro e escuro, legível a zoom baixo.
  Prefira formas geométricas (círculo, cruz, arco) a desenho pictórico.
- Nada de `await`, imagem externa ou fonte customizada aqui — a função roda a cada frame.

### 3. Propriedades editáveis

Arquivo: `src/lib/components/sidebar/PropertiesPanel.svelte`.

Toda edição chama a função exportada correspondente em `stores/project.ts`
(`updateFurniture` / futura `atualizarEquipamento`) — **nunca** mute a store direto.

Em campos de texto/número, passe `coalesceKey` na mutação para que a digitação vire **uma** entrada
de undo, não uma por tecla (padrão já usado; ver `mutate` em `stores/project.ts:191`).

Ao exibir medida, use `formatLength`/`formatLengthPrecise` de `stores/settings.ts`. Nunca escreva
"cm" fixo na UI — o usuário pode estar em imperial.

### 4. Entradas e saídas

É o diferencial do produto: o usuário precisa ver **em qual equipamento e em qual saída** cada
carga está ligada. Detalhes na skill `ligacoes-entradas-saidas`.

Do lado do catálogo, ao criar/alterar um equipamento garanta que:
- a contagem de `entradas`/`saidas` bata com o modelo real do produto — é essa contagem que
  limita quantas cargas cabem;
- **reduzir** a contagem de um equipamento já publicado é mudança de compatibilidade: projetos
  salvos podem ter ligações em saídas que deixaram de existir. Trate na migração
  (skill `modelo-de-dados`), não só no catálogo.

### 5. Exportação

Arquivos: `src/lib/utils/export.ts` (PNG, SVG, PDF, JSON) e `src/lib/utils/cadExport.ts` (DXF, DWG).

PNG e o `PrintLayout` reaproveitam o renderer do canvas — costumam funcionar de graça. **SVG, PDF,
DXF e DWG têm desenho próprio** e precisam de tratamento explícito para símbolo novo, senão o
equipamento simplesmente não sai no arquivo exportado.

## Checklist de verificação

```
[ ] nenhum arquivo tocado passou de 400 linhas (skill `refatorar-arquivo-grande`)
[ ] id novo é único e não colide com id já publicado
[ ] entrada registrada no mapa iconDrawers (chave == id)
[ ] símbolo legível com zoom baixo, em tema claro e escuro
[ ] aparece e é filtrável no BuildPanel (categoria existe na lista de categorias)
[ ] clique/seleção funciona (findFurnitureAt usa width/depth do catálogo)
[ ] propriedades editam e geram 1 entrada de undo por edição
[ ] entradas/saídas conferem com o modelo real do Studio SHC
[ ] aparece em SVG, PDF, DXF e DWG
[ ] npm run check passa
```

## Remoção de equipamento do catálogo

Nunca apague um `id` sem cuidar dos projetos salvos que o referenciam. Ou mantenha o `id` marcado
como descontinuado, ou adicione mapeamento na migração. Item sem catálogo é **silenciosamente
ignorado** em `drawFurnitureItem` (`if (!cat) return;`) — o equipamento some da planta sem aviso.
