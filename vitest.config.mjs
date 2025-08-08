import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      exclude: [
        'src/cli.ts',
        'src/types.ts',
        'dist/**',
        'vitest.config.mjs',
        'eslint.config.mjs',
      ],
    },
  },
});
