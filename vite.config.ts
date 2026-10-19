import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Chemins relatifs : le build doit pouvoir être servi depuis n'importe quel sous-dossier.
  base: './',
  build: { outDir: 'dist', chunkSizeWarningLimit: 2000 },
  test: { include: ['src/**/*.test.ts'] },
});
