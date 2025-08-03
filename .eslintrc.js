module.exports = {
  env: {
    browser: true,
    es2021: true,
    node: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    // Error handling
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-alert': 'warn',
    
    // Code quality
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    'no-undef': 'error',
    'no-redeclare': 'error',
    'no-unreachable': 'error',
    
    // Best practices
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error',
    'no-script-url': 'error',
    
    // Variables
    'no-var': 'error',
    'prefer-const': 'error',
    'no-use-before-define': 'error',
    
    // Functions
    'no-empty-function': 'warn',
    'no-return-assign': 'error',
    'no-self-compare': 'error',
    
    // Objects and arrays
    'no-array-constructor': 'error',
    'no-new-object': 'error',
    'object-shorthand': 'error',
    
    // Strings
    'no-new-wrappers': 'error',
    'prefer-template': 'error',
    
    // Control flow
    'no-else-return': 'warn',
    'no-empty': 'warn',
    'no-lonely-if': 'warn',
    
    // Spacing and formatting
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
    
    // Naming conventions
    'camelcase': ['error', { 'properties': 'never' }],
    'new-cap': 'error',
    
    // Comments
    'spaced-comment': ['error', 'always'],
    
    // ES6 features
    'arrow-spacing': 'error',
    'no-duplicate-imports': 'error',
    'prefer-arrow-callback': 'error',
    'prefer-destructuring': 'warn',
    
    // Accessibility
    'jsx-a11y/alt-text': 'off', // Not using JSX
    'jsx-a11y/anchor-has-content': 'off', // Not using JSX
    'jsx-a11y/anchor-is-valid': 'off', // Not using JSX
    
    // Project-specific rules
    'max-len': ['warn', { 'code': 120 }],
    'complexity': ['warn', 10],
    'max-depth': ['warn', 4],
    'max-lines-per-function': ['warn', 50],
    'max-params': ['warn', 4]
  },
  globals: {
    // Browser globals
    'window': 'readonly',
    'document': 'readonly',
    'navigator': 'readonly',
    'localStorage': 'readonly',
    'sessionStorage': 'readonly',
    'URL': 'readonly',
    
    // Test globals
    'describe': 'readonly',
    'test': 'readonly',
    'it': 'readonly',
    'expect': 'readonly',
    'beforeEach': 'readonly',
    'afterEach': 'readonly',
    'beforeAll': 'readonly',
    'afterAll': 'readonly',
    'jest': 'readonly'
  },
  overrides: [
    {
      // Test files
      files: ['**/*.test.js', '**/tests/**/*.js'],
      env: {
        jest: true
      },
      rules: {
        'no-console': 'off',
        'max-lines-per-function': 'off'
      }
    },
    {
      // Setup files
      files: ['tests/setup.js'],
      rules: {
        'no-console': 'off',
        'no-undef': 'off'
      }
    }
  ]
}; 