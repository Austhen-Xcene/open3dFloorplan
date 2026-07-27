# Editor de plantas 2D

Editor **2D** onde o usuário monta a planta da própria casa: cria ambientes com medidas exatas,
posiciona portas, janelas e objetos, e exporta o resultado.

Cada pessoa cria a própria conta e vê só os projetos dela. Sem compartilhamento e sem vínculo
com nenhum outro sistema.

**Persistência:** hoje os projetos ficam no `localStorage` do navegador. O destino é o Firebase
(conta e banco), que ainda vai ser criado — enquanto isso, exporte em JSON para não depender só
do navegador.

## Funcionalidades

- Criação de ambientes retangulares por nome, largura e comprimento, com medidas exatas.
- Posicionamento automático por similaridade entre nomes de ambientes.
- Movimentação, rotação e redimensionamento sem sobreposição.
- Preservação das paredes independentes entre ambientes vizinhos.
- Organização do projeto em múltiplos pavimentos.
- Biblioteca de portas, janelas e objetos, com símbolo 2D próprio.
- Zoom, pan, minimapa, grade e snap magnético.
- Resumo de quantidade e área dos ambientes.
- Exportação em PNG, SVG, DXF, DWG, PDF e JSON; importação de JSON do editor.
- Histórico de desfazer/refazer e salvamento automático.

## Desenvolvimento

```bash
git clone https://github.com/Austhen-Xcene/open3dFloorplan.git
cd open3dFloorplan
npm install
npm run dev
```

Abra [http://localhost:5173](http://localhost:5173).

## Validação e build

```bash
npm run check     # svelte-check + TypeScript — obrigatório antes de commitar
npm run build
npm run preview
```

## Atalhos

| Atalho | Ação |
|---|---|
| `V` | Ponteiro de seleção e movimentação |
| `H` | Ferramenta de mão |
| `D` | Inserir porta |
| `M` | Medir |
| `N` | Anotar |
| `T` | Texto |
| `S` | Alternar snap |
| `F` | Enquadrar o projeto |
| `G` | Alternar grade |
| `L` | Painel de camadas |
| `R` | Rotacionar elemento |
| `Delete` / `Backspace` | Excluir a seleção |
| `Escape` | Cancelar ou limpar a seleção |
| `Ctrl+Z` | Desfazer |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Refazer |
| `Ctrl+S` | Salvar |
| `Ctrl+K` / `/` | Paleta de comandos |
| `?` | Lista de atalhos |

## Tecnologias

- SvelteKit 2 + Svelte 5 (runes)
- TypeScript
- Tailwind CSS v4
- Canvas 2D nativo (sem WebGL — o editor é 2D por decisão de produto)
- jsPDF, dxf-writer

## Firebase

`src/lib/firebase.ts` lê a configuração de variáveis `PUBLIC_FIREBASE_*` e fica inerte sem elas —
o app funciona normalmente, salvando no navegador. Ao criar o projeto, copie `.env.example` para
`.env` e preencha.

## Convenções

- Código, tipos, UI e documentação novos em **português (PT-BR)**.
- Limite de **300–400 linhas por arquivo**; acima disso, quebre por responsabilidade.
- Detalhes de arquitetura e regras do projeto: [`CLAUDE.md`](CLAUDE.md).

## Fluxo de branches

- `agent/*`: desenvolvimento de cada alteração.
- `dev`: QA e homologação.
- `main`: versão aprovada.

## Licença

Este projeto mantém a licença [MIT](LICENSE) do projeto original
([open3dFloorplan](https://github.com/Austhen-Xcene/open3dFloorplan)).
