// eslint.config.ts
import js from '@eslint/js';
import typescript from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';

interface ESLintConfig {
  files?: string[];
  languageOptions?: {
    parser?: unknown;
    parserOptions?: Record<string, unknown>;
    globals?: Record<string, string>;
  };
  plugins?: Record<string, unknown>;
  rules?: Record<string, unknown>;
  ignores?: string[];
}

const config: ESLintConfig[] = [
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        project: './tsconfig.json',
      },
      globals: {
        console: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
        global: 'readonly',
        module: 'readonly',
        require: 'readonly',
        exports: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': typescript,
      prettier: prettier,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...typescript.configs.recommended.rules,
      'prettier/prettier': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
    },
  },
  {
    ignores: ['node_modules/**', 'dist/**', 'build/**', 'eslint.config.ts'],
  },
];

export default config;
