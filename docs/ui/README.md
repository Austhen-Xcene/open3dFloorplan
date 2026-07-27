# Documentação de UI/UX

Uma pasta por área da interface. Cada uma traz um `documento.md` com os **parâmetros** daquela
área — o que é, de onde vem o dado, o que valida, e o comportamento observado — e aponta para a
captura correspondente em `_evidencias/`.

As capturas **não são feitas à mão**: saem da suíte Playwright em `tests/e2e/`. Rodar os testes
regenera todas. Isso é proposital — documentação que não é gerada do produto envelhece calada.

```bash
npm test                     # roda tudo e regenera as evidências
npx playwright test -g grade # roda só o que casa com "grade"
```

> **`_evidencias/` não é versionado.** São 6,5 MB de PNG que mudariam a cada ajuste de pixel e
> poluiriam o histórico. Se as imagens deste documento aparecerem quebradas, rode `npm test` —
> elas se recriam em segundos. O que vale como documentação é o texto; a captura é ilustração.

## Áreas

| Pasta | Área | Componentes |
|---|---|---|
| [01-abertura](01-abertura/documento.md) | Carga do editor, projeto novo, estado vazio | `routes/editor/+page.svelte` |
| [02-barra-superior](02-barra-superior/documento.md) | Projeto, pavimentos, desfazer, zoom, exportar, salvar | `toolbar/*` |
| [03-ambientes](03-ambientes/documento.md) | Formulário de inserção e posicionamento automático | `sidebar/build/AbaAmbientes.svelte` |
| [04-canvas](04-canvas/documento.md) | Zoom, pan, grade, réguas, minimapa, camadas | `editor/FloorPlanCanvas.svelte`, `editor/canvas/*` |
| [05-propriedades](05-propriedades/documento.md) | Edição do elemento selecionado | `sidebar/propriedades/*` |
| [06-historico](06-historico/documento.md) | Desfazer e refazer | `stores/project/historico.ts` |
| [07-catalogo](07-catalogo/documento.md) | Portas, janelas e catálogo de objetos | `sidebar/build/*` |
| [08-persistencia-exportacao](08-persistencia-exportacao/documento.md) | Auto-save, recarregar, exportar, atalhos | `services/datastore.ts`, `utils/exportacao/*` |
| 09-rotacao | Girar ambiente sem sobrepor vizinhos | `stores/project/transformacoes.ts` |

## Estado da verificação

Última execução: **62 testes, 62 passando**.

Achados e correções estão em [ACHADOS.md](ACHADOS.md).

## Convenções destes documentos

- **Parâmetro** é qualquer coisa que o usuário lê ou ajusta: um campo, um botão de alternância,
  um limite de validação, uma unidade.
- Cada parâmetro registra: valor padrão, faixa aceita, onde é persistido e o que acontece no
  limite (valor inválido, lista vazia, item removido).
- Quando o comportamento observado destoa do esperado, fica marcado com ⚠️ e entra em
  `ACHADOS.md` — o documento descreve **o que o produto faz**, não o que deveria fazer.
