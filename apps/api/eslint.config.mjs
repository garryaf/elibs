// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      "prettier/prettier": ["error", { endOfLine: "auto" }],
    },
  },
  // eslint-plugin-boundaries configuration
  {
    plugins: {
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'common', pattern: 'src/common' },
        { type: 'config', pattern: 'src/config' },
        { type: 'auth', pattern: 'src/auth' },
        { type: 'users', pattern: 'src/users' },
        { type: 'master-data', pattern: 'src/master-data' },
        { type: 'settings', pattern: 'src/settings' },
        { type: 'laboratory', pattern: 'src/laboratory' },
        { type: 'health', pattern: 'src/health' },
        { type: 'approval', pattern: 'src/approval' },
      ],
      'boundaries/legacy-warnings': false,
    },
    rules: {
      'boundaries/dependencies': ['error', {
        default: 'disallow',
        policies: [
          {
            from: [{ element: { type: 'common' } }],
            allow: [{ element: { type: 'common' } }, { element: { type: 'config' } }],
          },
          {
            from: [{ element: { type: 'config' } }],
            allow: [{ element: { type: 'common' } }, { element: { type: 'config' } }],
          },
          {
            from: [{ element: { type: 'auth' } }],
            allow: [{ element: { type: 'common' } }, { element: { type: 'config' } }, { element: { type: 'users' } }],
          },
          {
            from: [{ element: { type: 'users' } }],
            allow: [{ element: { type: 'common' } }, { element: { type: 'config' } }],
          },
          {
            from: [{ element: { type: 'master-data' } }],
            allow: [{ element: { type: 'common' } }, { element: { type: 'config' } }],
          },
          {
            from: [{ element: { type: 'settings' } }],
            allow: [{ element: { type: 'common' } }, { element: { type: 'config' } }, { element: { type: 'laboratory' } }],
          },
          {
            from: [{ element: { type: 'laboratory' } }],
            allow: [{ element: { type: 'common' } }, { element: { type: 'config' } }, { element: { type: 'master-data' } }],
          },
          {
            from: [{ element: { type: 'health' } }],
            allow: [{ element: { type: 'common' } }, { element: { type: 'config' } }],
          },
          {
            from: [{ element: { type: 'approval' } }],
            allow: [{ element: { type: 'common' } }, { element: { type: 'config' } }, { element: { type: 'users' } }],
          },
        ],
      }],
    },
  },
);
