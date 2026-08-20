import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Samma `@/`-alias som tsconfig paths, annars kan bara moduler med rent
  // relativa importer testas.
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('.', import.meta.url)),
    },
  },
  test: {
    include: ['lib/**/*.test.ts'],
    environment: 'node',
  },
});
