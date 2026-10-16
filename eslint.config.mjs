// @ts-check
import eslint from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

// Run with --no-inline-config (see package.json): eslint-disable comments have no effect.
export default tseslint.config(
  { ignores: ['dist/', 'dist-scripts/', 'coverage/', 'src/generated/', '*.mjs', '*.cjs'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.vitest },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      'no-console': 'error',
    },
  },
  {
    // process.env is read only in src/config/ (validated by zod at boot); everything else injects AppConfig.
    files: ['src/**/*.ts'],
    ignores: ['src/config/**'],
    rules: {
      'no-restricted-properties': [
        'error',
        { object: 'process', property: 'env', message: 'Read configuration through AppConfig (src/config).' },
      ],
    },
  },
  {
    // supertest types response bodies as `any`; tests assert on them directly.
    files: ['test/**/*.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
);
