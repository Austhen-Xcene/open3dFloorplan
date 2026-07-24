# open3dFloorplan

Editor web de plantas 2D focado na criação rápida de ambientes com medidas exatas.

Os projetos ficam salvos no navegador e podem ser exportados ou importados em JSON.

## Funcionalidades

- Criação de ambientes retangulares por nome, largura e comprimento.
- Edição posterior do nome e das dimensões em `Room Properties`.
- Posicionamento automático por similaridade entre nomes.
- Movimentação, rotação e redimensionamento sem sobreposição.
- Preservação das paredes independentes entre ambientes vizinhos.
- Organização do projeto em múltiplos pavimentos.
- Biblioteca de portas, janelas e objetos.
- Resumo de quantidade e área dos ambientes atuais.
- Exportação em PNG, SVG, DXF, DWG, PDF e JSON.
- Importação de projetos JSON gerados pelo editor.
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
npm run check
npm run build
npm run preview
```

## Atalhos

| Atalho | Ação |
|---|---|
| `V` | Ponteiro de seleção e movimentação |
| `H` | Ferramenta de mão |
| `D` | Inserir porta |
| `Delete` / `Backspace` | Excluir a seleção |
| `Escape` | Cancelar ou limpar a seleção |
| `Ctrl+Z` | Desfazer |
| `Ctrl+Shift+Z` / `Ctrl+Y` | Refazer |
| `Ctrl+S` | Salvar |

## Tecnologias

- SvelteKit
- TypeScript
- Tailwind CSS
- Three.js, utilizado para gerar miniaturas dos objetos
- jsPDF
- dxf-writer

## Fluxo de branches

- `agent/*`: desenvolvimento de cada alteração.
- `dev`: QA e homologação.
- `main`: versão aprovada.

## Licença

Este projeto mantém a licença [MIT](LICENSE) do projeto original.
