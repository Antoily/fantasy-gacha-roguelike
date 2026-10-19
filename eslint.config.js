import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/', 'node_modules/', 'test-results/', 'playwright-report/'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Le `!` est délibéré quand une invariante du catalogue garantit la présence.
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
  {
    // Constitution V : la logique est pure — ni moteur de jeu, ni API du navigateur.
    files: ['src/logic/**/*.ts', 'src/data/**/*.ts'],
    languageOptions: { globals: {} },
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['phaser'], message: 'src/logic et src/data restent indépendants de Phaser.' },
        { group: ['**/ui/**', '**/scenes/**'], message: "La logique n'importe pas l'affichage." },
      ] }],
      'no-restricted-globals': ['error', 'window', 'document', 'localStorage', 'sessionStorage', 'navigator'],
    },
  },
);
