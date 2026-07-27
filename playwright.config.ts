import { defineConfig, devices } from '@playwright/test';

/**
 * Testes de interface do editor.
 *
 * O projeto não tem suíte unitária: estes testes são a única rede de segurança para
 * refatoração. Eles sobem o `vite dev` sozinhos e guardam capturas em
 * `docs/ui/_evidencias/`, que servem de documentação viva da interface.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'tests/.saida',
  fullyParallel: false,          // o editor guarda projeto no localStorage — um de cada vez
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'tests/.saida/resultado.json' }]],

  use: {
    baseURL: 'http://localhost:5178',
    viewport: { width: 1440, height: 900 },
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    locale: 'pt-BR',
  },

  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],

  webServer: {
    command: 'npm run dev -- --port 5178',
    url: 'http://localhost:5178',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
