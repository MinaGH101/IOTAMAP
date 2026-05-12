import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint' // جایگزین جدید برای سازگاری با تایپ‌اسکریپت

export default tseslint.config(
  { ignores: ['dist'] }, // جایگزین جدید globalIgnores
  {
    // ۱. اضافه کردن فرمت‌های ts و tsx
    files: ['**/*.{ts,tsx,js,jsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommended, // اضافه کردن قوانین تایپ‌اسکریپت
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      // ۲. اضافه کردن پارسر تایپ‌اسکریپت برای فهمیدن کدها
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
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
      // ۳. خاموش کردن برخی سخت‌گیری‌های تایپ‌اسکریپت در صورت نیاز
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'warn'
    },
  },
)