import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // TypeScript handles unused vars
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Allow explicit any in some cases
      '@typescript-eslint/no-explicit-any': 'warn',
      // Allow empty interfaces (used for type clarity in component props)
      '@typescript-eslint/no-empty-object-type': 'off',
      // Controlled/uncontrolled sync pattern requires setState in effects
      'react-hooks/set-state-in-effect': 'off',
      // Refs during render - warn but don't block (useHistory uses this intentionally)
      'react-hooks/refs': 'warn',
    },
  }
)
