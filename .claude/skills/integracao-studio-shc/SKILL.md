---
name: integracao-studio-shc
description: Integrar o editor de plantas com o app Studio SHC — WebView Flutter (flutter_inappwebview), modo embarcado vs. site standalone, API REST do Studio SHC, sessão/autenticação, e sincronização da tabela de entradas e saídas. Use quando a tarefa mencionar Studio SHC, webview, app, embarcado, standalone, API, sincronizar, entradas e saídas, ou persistência de projeto fora do localStorage.
---

# Integração com o Studio SHC

> **Estado: nada disso está implementado.** Hoje o repo só tem `localStore` (localStorage).
> Esta skill descreve o alvo e as regras. Não presuma que existe código de bridge ou de API —
> verifique antes de referenciar.

## Os dois modos

| | Embarcado | Standalone |
|---|---|---|
| Host | WebView do app Studio SHC (Flutter, `flutter_inappwebview`) | Navegador, URL própria |
| Sessão | Token/contexto entregue pelo app | Login próprio do site |
| Dados | API REST do Studio SHC | API REST do Studio SHC (ou anônimo em localStorage) |
| Chrome da UI | Sem barra própria de navegação; o app já tem a dele | Completa |

**Um código só.** A diferença é runtime, nunca build. Não crie rota, entrypoint ou bundle
separado para o webview.

## Princípio de arquitetura

Isole tudo que é específico de host atrás de **duas abstrações**, e só elas conhecem o ambiente:

```
src/lib/services/
  datastore.ts        # interface DataStore  ← já existe, é o seam
  localStore.ts       # implementação localStorage (existente) — cache / modo anônimo
  shcStore.ts         # implementação API REST do Studio SHC   [a criar]
  ambiente.ts         # detecção de modo + contexto do host    [a criar]
```

`ambiente.ts` expõe algo como:

```ts
export const modoIncorporado: boolean;      // roda dentro do WebView do Studio SHC?
export const contextoHost: ContextoHost | null;  // usuário, projeto, token, permissões
```

Regra: **`modoIncorporado` só pode ser lido em duas categorias de lugar** — na escolha do
`DataStore` e em ajustes visuais de chrome (esconder barra, ajustar safe area). Se você estiver
prestes a escrever `if (modoIncorporado)` dentro de lógica de canvas, catálogo ou mutação, a
abstração está no lugar errado.

## Detecção e contexto do host (WebView Flutter)

Com `flutter_inappwebview`, o app pode entregar contexto de três jeitas. Prefira nesta ordem:

1. **Query string / fragment na URL carregada** — mais simples, funciona em SSR e em deep link,
   sem depender de timing de injeção. Ex.: `/editor?id=…&host=shc&sessao=…`
2. **`initialUserScripts` / `injectedJavaScriptBeforeContentLoaded`** — o app define
   `window.__SHC__ = { … }` antes do documento carregar. Robusto, mas exige acordo com o time do app.
3. **Handler nomeado** (`addJavaScriptHandler` no Flutter ↔ `window.flutter_inappwebview.callHandler`
   no web) — para ações pontuais: fechar a tela, pedir permissão, abrir tela nativa.

Nunca use `navigator.userAgent` como detecção primária.

**O transporte de dados do projeto é a API REST, não a ponte.** A ponte serve para sessão e
comandos de navegação. Isso é o que dá paridade entre os dois modos.

Ao usar a ponte, sempre com guarda e timeout — no navegador ela não existe:

```ts
const ponte = (globalThis as any).flutter_inappwebview;
if (!ponte?.callHandler) return null;  // standalone: degrade, não quebre
```

## API REST do Studio SHC

Antes de escrever qualquer chamada, **confirme com o usuário**: URL base, formato de
autenticação, e o esquema real dos endpoints. Não invente contrato.

O que a integração precisa cobrir:

- **Ler os equipamentos** do usuário no Studio SHC → alimenta o catálogo do editor.
- **Ler/gravar o projeto** (planta, ambientes, equipamentos instalados, ligações).
- **Sincronizar a tabela de entradas e saídas**: incluir um equipamento no visual, ou religar uma
  carga a outra saída, precisa refletir na tabela do Studio SHC. Este é o requisito de negócio
  central.

Regras de implementação:

- Toda chamada tem tratamento de erro visível ao usuário. Falha de rede **não pode** perder
  trabalho — o auto-save local (debounce de 500 ms em `editor/+page.svelte`) continua como rede
  de segurança.
- Escrita na tabela SHC deve ser **idempotente** e identificada por id estável do equipamento
  instalado, para que um retry não duplique linha.
- Nunca logue token ou payload de sessão no console.
- Não coloque segredo no bundle. `src/lib/firebase.ts` já expõe config pública do Firebase — isso
  é aceitável para Analytics, **não** é precedente para credencial de API.

## Ordem de trabalho sugerida

1. `ambiente.ts` — detecção de modo + leitura de contexto (sem API ainda).
2. Ajustes de chrome no modo embarcado (barra, safe area, gestos).
3. Definir e **confirmar** o contrato da API com o usuário.
4. `shcStore.ts` implementando `DataStore`, com `localStore` como fallback/cache.
5. Catálogo alimentado pela API (ver skill `catalogo-equipamentos`).
6. Sincronização de entradas/saídas + tratamento de conflito.

## Checklist

```
[ ] nenhum arquivo tocado passou de 400 linhas (skill `refatorar-arquivo-grande`)
[ ] o site continua funcionando 100% no navegador, sem o app
[ ] o editor continua funcionando sem rede (localStore como cache)
[ ] modoIncorporado só é lido na escolha do DataStore e em ajustes de chrome
[ ] chamada à ponte tem guarda + timeout e degrada sem quebrar
[ ] nenhum token/segredo em log, URL visível ou bundle
[ ] escrita na tabela de entradas/saídas é idempotente
[ ] erro de API vira mensagem para o usuário, não falha silenciosa
[ ] npm run check passa
```
