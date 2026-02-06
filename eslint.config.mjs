import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.wxt/**',
      '**/.output/**',
      '**/dist/**',
    ],
  },

  js.configs.recommended,

  ...tseslint.configs.recommended,

  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    rules: {
      // Enforce the logging boundary: console usage is allowed only via LogSink.
      'no-console': 'error',
    },
  },

  {
    // The console sink is the only allowed integration point with console.*.
    files: ['src/extension/diagnostics/console-log-sink.ts'],
    rules: {
      'no-console': 'off',
    },
  },

  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Prefer TypeScript-aware unused checks.
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
]
