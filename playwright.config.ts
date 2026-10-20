import { defineConfig, devices } from '@playwright/test';

// Le test de bout en bout tourne sur le BUILD (vite preview) : sur WSL2, le serveur de
// dev a déjà servi du JS obsolète au navigateur pendant le prototype.
export default defineConfig({
  testDir: 'tests/e2e',
  outputDir: 'test-results',
  fullyParallel: false,
  // Un seul worker : les captures sont numérotées dans l'ordre et ne s'écrasent pas.
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 360, height: 640 },
    screenshot: 'only-on-failure',
  },
  projects: [{
    name: 'chromium',
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 360, height: 640 },
      // WebGL logiciel : sans lui, Chromium headless échoue (« Framebuffer Unsupported »).
      // Autoplay : sans lui, le contexte audio (005) resterait suspendu en headless.
      launchOptions: { args: [
        '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
        '--autoplay-policy=no-user-gesture-required',
      ] },
    },
  }],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
