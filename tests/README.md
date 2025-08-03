# Testing Documentation

This document provides comprehensive information about the testing setup for the VaccinationTracker project.

## Overview

The VaccinationTracker project uses a comprehensive testing strategy with:
- **Unit Tests**: Testing individual functions and classes
- **Integration Tests**: Testing component interactions
- **Code Coverage**: Ensuring >80% test coverage
- **Automated CI/CD**: Running tests on every commit

## Test Structure

```
tests/
├── setup.js              # Jest configuration and mocks
├── validation.test.js    # Unit tests for validation module
├── storage.test.js       # Unit tests for storage module
├── integration.test.js   # Integration tests
├── run-tests.js          # Test runner script
└── README.md            # This file
```

## Running Tests

### Prerequisites

1. **Node.js**: Version 16.x or higher
2. **npm**: Package manager
3. **Dependencies**: Run `npm install` to install testing dependencies

### Available Commands

```bash
# Run all tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with coverage report
npm run test:coverage

# Run tests for CI/CD
npm run test:ci

# Run linting
npm run lint

# Run validation (linting + tests)
npm run validate

# Custom test runner
node tests/run-tests.js [options]
```

### Test Runner Options

```bash
# Run all tests
node tests/run-tests.js

# Run only unit tests
node tests/run-tests.js --unit

# Run only integration tests
node tests/run-tests.js --integration

# Run with coverage
node tests/run-tests.js --coverage

# Run only linting
node tests/run-tests.js --lint

# Show help
node tests/run-tests.js --help
```

## Test Categories

### 1. Unit Tests

Unit tests focus on testing individual functions and classes in isolation.

#### Validation Tests (`validation.test.js`)

Tests for the `VaccinationValidator` class:

- **Name Validation**: Tests for valid/invalid child names
- **Date Validation**: Tests for date of birth validation
- **Completion Date Validation**: Tests for vaccination completion dates
- **Error Handling**: Tests for error message formatting

**Key Test Cases:**
```javascript
// Valid names
'John', 'Mary Jane', 'O\'Connor', 'Jean-Pierre'

// Invalid names
'', 'John123', 'Mary@Jane', 'A' (too short)

// Valid dates
'2023-01-01', '2020-06-15'

// Invalid dates
'2025-01-01' (future), 'invalid-date', '' (empty)
```

#### Storage Tests (`storage.test.js`)

Tests for the `VaccinationStorage` class:

- **Child Management**: Save, retrieve, update, delete children
- **Vaccination Data**: Save and retrieve vaccination completion data
- **Data Export/Import**: Export and import functionality
- **Error Handling**: Handle localStorage errors gracefully

**Key Test Cases:**
```javascript
// Save child
storage.saveChild({ id: 'child-1', name: 'John', dob: '2023-01-01' });

// Get all children
const children = storage.getAllChildren();

// Save vaccination completion
storage.saveVaccinationCompletion('child-1', 'Birth', 'BCG', '2023-01-01');

// Export/Import data
const exported = storage.exportData();
const success = storage.importData(exported);
```

### 2. Integration Tests

Integration tests verify that different components work together correctly.

#### Application Integration (`integration.test.js`)

Tests for the complete application workflow:

- **Child Profile Management**: Create, edit, load child profiles
- **Schedule Generation**: Generate vaccination schedules
- **Completion Tracking**: Mark vaccinations as completed
- **Calendar Export**: Generate ICS calendar files
- **Data Persistence**: Save and restore data across sessions
- **Error Handling**: Handle various error scenarios

**Key Test Scenarios:**
```javascript
// Complete workflow test
1. Enter child information
2. Generate schedule
3. Mark vaccinations as complete
4. Export calendar
5. Verify data persistence
```

## Test Configuration

### Jest Configuration

Located in `package.json`:

```json
{
  "jest": {
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/tests/setup.js"],
    "collectCoverageFrom": [
      "js/**/*.js",
      "!js/**/*.test.js",
      "!tests/**/*.js"
    ],
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 80,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

### Coverage Thresholds

- **Statements**: 80%
- **Branches**: 80%
- **Functions**: 80%
- **Lines**: 80%

### Test Environment

- **Environment**: jsdom (simulates browser environment)
- **Setup**: `tests/setup.js` (mocks and global configuration)
- **Timeout**: 5000ms per test

## Mocking Strategy

### Browser APIs

The test setup mocks common browser APIs:

```javascript
// localStorage mock
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

// URL API mock
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Document API mock
document.createElement = jest.fn();
document.body.appendChild = jest.fn();
document.body.removeChild = jest.fn();
```

### Date Mocking

For consistent date-based tests:

```javascript
// Mock current date
jest.useFakeTimers();
jest.setSystemTime(new Date('2024-01-01'));

// Run tests...

// Restore real timers
jest.useRealTimers();
```

## Writing New Tests

### Unit Test Template

```javascript
describe('ClassName', () => {
  let instance;

  beforeEach(() => {
    instance = new ClassName();
  });

  describe('methodName', () => {
    test('should do something when condition', () => {
      // Arrange
      const input = 'test';
      
      // Act
      const result = instance.methodName(input);
      
      // Assert
      expect(result).toBe('expected');
    });

    test('should handle error case', () => {
      // Arrange
      const invalidInput = null;
      
      // Act & Assert
      expect(() => {
        instance.methodName(invalidInput);
      }).toThrow('Expected error message');
    });
  });
});
```

### Integration Test Template

```javascript
describe('Feature Integration', () => {
  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <input id="testInput" />
      <button id="testButton">Test</button>
    `;
    
    // Initialize components
    this.component = new Component();
  });

  test('should work end-to-end', () => {
    // Arrange
    const input = document.getElementById('testInput');
    const button = document.getElementById('testButton');
    
    // Act
    input.value = 'test';
    button.click();
    
    // Assert
    expect(document.body.textContent).toContain('expected result');
  });
});
```

## Best Practices

### 1. Test Organization

- Group related tests using `describe` blocks
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)

### 2. Test Data

- Use consistent test data
- Create helper functions for common test data
- Use meaningful variable names

### 3. Mocking

- Mock external dependencies
- Use realistic mock data
- Reset mocks between tests

### 4. Assertions

- Use specific assertions
- Test both success and failure cases
- Verify error messages

### 5. Coverage

- Aim for >80% coverage
- Focus on critical business logic
- Test edge cases and error conditions

## Debugging Tests

### Common Issues

1. **Async Tests**: Use `async/await` or `done` callback
2. **DOM Tests**: Ensure proper DOM setup in `beforeEach`
3. **Mock Issues**: Reset mocks in `afterEach`
4. **Date Issues**: Use `jest.useFakeTimers()`

### Debug Commands

```bash
# Run specific test file
npm test -- validation.test.js

# Run specific test
npm test -- --testNamePattern="should validate name"

# Debug mode
node --inspect-brk node_modules/.bin/jest --runInBand

# Watch mode with verbose output
npm test -- --watch --verbose
```

## CI/CD Integration

### GitHub Actions

The project includes automated CI/CD pipeline:

1. **Test Job**: Runs tests on multiple Node.js versions
2. **Security Job**: Runs security audits
3. **Build Job**: Creates release artifacts
4. **Deploy Job**: Deploys to GitHub Pages

### Pre-commit Hooks

Consider adding pre-commit hooks:

```json
{
  "husky": {
    "hooks": {
      "pre-commit": "npm run validate",
      "pre-push": "npm run test:coverage"
    }
  }
}
```

## Performance Testing

### Test Performance

- Unit tests: < 1 second per test
- Integration tests: < 5 seconds per test
- Full test suite: < 30 seconds

### Memory Usage

- Monitor memory usage in long-running tests
- Clean up resources in `afterEach`
- Use `--max-old-space-size` for large test suites

## Reporting

### Coverage Reports

Coverage reports are generated in multiple formats:

- **HTML**: `coverage/lcov-report/index.html`
- **LCOV**: `coverage/lcov.info`
- **Console**: Summary in terminal output

### Test Results

Test results include:

- Pass/fail status
- Test duration
- Error details
- Coverage summary

## Maintenance

### Regular Tasks

1. **Update Dependencies**: Keep testing libraries updated
2. **Review Coverage**: Ensure coverage thresholds are met
3. **Refactor Tests**: Remove redundant or outdated tests
4. **Update Mocks**: Keep mocks in sync with actual APIs

### Test Review Checklist

- [ ] All new features have tests
- [ ] Edge cases are covered
- [ ] Error conditions are tested
- [ ] Tests are readable and maintainable
- [ ] Coverage thresholds are met
- [ ] No flaky tests

## Support

For questions about testing:

1. Check this documentation
2. Review existing test examples
3. Check Jest documentation
4. Create an issue for complex problems

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [jsdom Documentation](https://github.com/jsdom/jsdom)
- [GitHub Actions Documentation](https://docs.github.com/en/actions) 