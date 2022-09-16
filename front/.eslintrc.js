module.exports = {
  env: {
    browser: true,
    es6: true,
    jest: true,
  },
  extends: ['airbnb', 'plugin:react/recommended', 'prettier', 'plugin:import/recommended'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  plugins: ['prettier', 'react', 'babel', 'react-hooks', 'only-warn', 'import'],
  parser: 'babel-eslint',
  rules: {
    'react/prefer-stateless-function': 'off',
    'react/jsx-filename-extension': 'off',
    'no-param-reassign': 'off',
    'no-console': 'off',
    'global-require': 'off',
    'react/forbid-prop-types': 'off',
    'no-named-as-default': 'off',
    'react/jsx-props-no-spreading': 0,
    'react/static-property-placement': 0,
    'import/no-extraneous-dependencies': 0,
    'linebreak-style': ['error', 'unix'],
    'jsx-a11y/click-events-have-key-events': 'off',
    'prettier/prettier': ['warn'],
    'import/no-unresolved': [2, { commonjs: true, amd: true }],
  },
  settings: {
    'import/resolver': {
      node: {
        paths: ['src'],
      },
    },
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      env: { browser: true, es6: true, node: true },
      extends: [
        'plugin:react/recommended',
        'plugin:@typescript-eslint/eslint-recommended',
        'plugin:@typescript-eslint/recommended',
        'plugin:import/recommended',
        'plugin:import/typescript',
      ],
      globals: { Atomics: 'readonly', SharedArrayBuffer: 'readonly' },
      parser: '@typescript-eslint/parser',
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: 2018,
        sourceType: 'module',
        project: './tsconfig.json',
      },
      rules: {
        '@typescript-eslint/explicit-module-boundary-types': 0,
        '@typescript-eslint/space-before-blocks': 0,
        camelcase: 0,
        'no-nonoctal-decimal-escape': 0,
        'no-param-reassign': 0,
        'no-unsafe-optional-chaining': 0,
        'object-curly-newline': 0,
        'react/function-component-definition': 0,
        'react/jsx-props-no-spreading': 0,
        'react/no-array-index-key': 0,
        'react/require-default-props': 0,
        'import/extensions': [
          'error',
          'ignorePackages',
          {
            js: 'never',
            jsx: 'never',
            ts: 'never',
            tsx: 'never',
          },
        ],
        'no-use-before-define': 'off',
        '@typescript-eslint/no-use-before-define': ['error'],
      },
      plugins: ['@typescript-eslint'],
    },
  ],
};
