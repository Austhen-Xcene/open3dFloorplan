# Studio SHC — Planta de Equipamentos

Editor **2D** de plantas onde o usuário monta o projeto da própria casa e distribui visualmente
os **equipamentos de automação do Studio SHC** dentro de cada ambiente — enxergando em qual
equipamento e em qual saída cada carga está ligada.

É um **site independente**, aberto no navegador: sem backend, sem API e sem vínculo em tempo de
execução com o app Studio SHC. O catálogo de equipamentos é mantido neste repositório, e o
projeto do usuário fica salvo no próprio navegador, podendo ser exportado e importado.

## Funcionalidades

- Criação de ambientes retangulares por nome, largura e comprimento, com medidas exatas.
- Posicionamento automático por similaridade entre nomes de ambientes.
- Movimentação, rotação e redimensionamento sem sobreposição.
- Preservação das paredes independentes entre ambientes vizinhos.
- Organização do projeto em múltiplos pavimentos.
- Biblioteca de portas, janelas e equipamentos, com símbolo 2D próprio.
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
