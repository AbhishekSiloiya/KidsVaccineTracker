#!/usr/bin/env node

/**
 * Test Runner for VaccinationTracker
 * 
 * This script runs all tests and provides detailed reporting
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  log('\n' + '='.repeat(60), 'cyan');
  log(`  ${message}`, 'bright');
  log('='.repeat(60), 'cyan');
}

function logSection(message) {
  log('\n' + '-'.repeat(40), 'yellow');
  log(`  ${message}`, 'yellow');
  log('-'.repeat(40), 'yellow');
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green');
}

function logError(message) {
  log(`❌ ${message}`, 'red');
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue');
}

// Test configuration
const testConfig = {
  unitTests: [
    'tests/validation.test.js',
    'tests/storage.test.js'
  ],
  integrationTests: [
    'tests/integration.test.js'
  ],
  coverageThreshold: {
    statements: 80,
    branches: 80,
    functions: 80,
    lines: 80
  }
};

// Check if required files exist
function checkPrerequisites() {
  logHeader('Checking Prerequisites');
  
  const requiredFiles = [
    'package.json',
    'js/validation.js',
    'js/storage.js',
    'js/app.js',
    'tests/setup.js'
  ];

  let allFilesExist = true;
  
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      logSuccess(`${file} found`);
    } else {
      logError(`${file} not found`);
      allFilesExist = false;
    }
  });

  return allFilesExist;
}

// Install dependencies if needed
function installDependencies() {
  logHeader('Installing Dependencies');
  
  try {
    if (!fs.existsSync('node_modules')) {
      logInfo('Installing npm dependencies...');
      execSync('npm install', { stdio: 'inherit' });
      logSuccess('Dependencies installed successfully');
    } else {
      logSuccess('Dependencies already installed');
    }
  } catch (error) {
    logError('Failed to install dependencies');
    logError(error.message);
    return false;
  }
  
  return true;
}

// Run linting
function runLinting() {
  logHeader('Running Code Linting');
  
  try {
    logInfo('Running ESLint...');
    execSync('npm run lint', { stdio: 'inherit' });
    logSuccess('Linting passed');
    return true;
  } catch (error) {
    logError('Linting failed');
    return false;
  }
}

// Run unit tests
function runUnitTests() {
  logHeader('Running Unit Tests');
  
  let allTestsPassed = true;
  
  testConfig.unitTests.forEach(testFile => {
    logSection(`Running ${testFile}`);
    
    try {
      execSync(`npx jest ${testFile} --verbose`, { stdio: 'inherit' });
      logSuccess(`${testFile} passed`);
    } catch (error) {
      logError(`${testFile} failed`);
      allTestsPassed = false;
    }
  });
  
  return allTestsPassed;
}

// Run integration tests
function runIntegrationTests() {
  logHeader('Running Integration Tests');
  
  let allTestsPassed = true;
  
  testConfig.integrationTests.forEach(testFile => {
    logSection(`Running ${testFile}`);
    
    try {
      execSync(`npx jest ${testFile} --verbose`, { stdio: 'inherit' });
      logSuccess(`${testFile} passed`);
    } catch (error) {
      logError(`${testFile} failed`);
      allTestsPassed = false;
    }
  });
  
  return allTestsPassed;
}

// Run all tests with coverage
function runTestsWithCoverage() {
  logHeader('Running Tests with Coverage');
  
  try {
    execSync('npm run test:coverage', { stdio: 'inherit' });
    logSuccess('Coverage report generated');
    return true;
  } catch (error) {
    logError('Coverage test failed');
    return false;
  }
}

// Generate test report
function generateTestReport(results) {
  logHeader('Test Results Summary');
  
  const totalTests = results.unit + results.integration;
  const passedTests = results.unitPassed + results.integrationPassed;
  const failedTests = totalTests - passedTests;
  
  log(`Total Tests: ${totalTests}`, 'bright');
  log(`Passed: ${passedTests}`, 'green');
  log(`Failed: ${failedTests}`, failedTests > 0 ? 'red' : 'green');
  
  if (results.linting) {
    logSuccess('Code linting passed');
  } else {
    logError('Code linting failed');
  }
  
  if (results.coverage) {
    logSuccess('Coverage requirements met');
  } else {
    logWarning('Coverage requirements not met');
  }
  
  // Overall result
  const overallSuccess = results.unit && results.integration && results.linting;
  
  if (overallSuccess) {
    log('\n🎉 All tests passed!', 'green');
  } else {
    log('\n💥 Some tests failed!', 'red');
  }
  
  return overallSuccess;
}

// Main test runner
async function runTests() {
  logHeader('VaccinationTracker Test Suite');
  logInfo('Starting comprehensive test run...');
  
  const results = {
    unit: false,
    unitPassed: 0,
    integration: false,
    integrationPassed: 0,
    linting: false,
    coverage: false
  };
  
  // Check prerequisites
  if (!checkPrerequisites()) {
    logError('Prerequisites check failed. Exiting.');
    process.exit(1);
  }
  
  // Install dependencies
  if (!installDependencies()) {
    logError('Failed to install dependencies. Exiting.');
    process.exit(1);
  }
  
  // Run linting
  results.linting = runLinting();
  
  // Run unit tests
  results.unit = runUnitTests();
  if (results.unit) {
    results.unitPassed = testConfig.unitTests.length;
  }
  
  // Run integration tests
  results.integration = runIntegrationTests();
  if (results.integration) {
    results.integrationPassed = testConfig.integrationTests.length;
  }
  
  // Run coverage tests
  results.coverage = runTestsWithCoverage();
  
  // Generate final report
  const overallSuccess = generateTestReport(results);
  
  // Exit with appropriate code
  process.exit(overallSuccess ? 0 : 1);
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  logHeader('Test Runner Help');
  log('Usage: node tests/run-tests.js [options]', 'bright');
  log('\nOptions:', 'yellow');
  log('  --help, -h     Show this help message');
  log('  --unit         Run only unit tests');
  log('  --integration  Run only integration tests');
  log('  --coverage     Run tests with coverage');
  log('  --lint         Run only linting');
  log('\nExamples:', 'yellow');
  log('  node tests/run-tests.js              # Run all tests');
  log('  node tests/run-tests.js --unit       # Run only unit tests');
  log('  node tests/run-tests.js --coverage   # Run with coverage');
  process.exit(0);
}

// Run specific test types based on arguments
if (args.includes('--unit')) {
  logHeader('Running Unit Tests Only');
  runUnitTests();
} else if (args.includes('--integration')) {
  logHeader('Running Integration Tests Only');
  runIntegrationTests();
} else if (args.includes('--coverage')) {
  logHeader('Running Tests with Coverage');
  runTestsWithCoverage();
} else if (args.includes('--lint')) {
  logHeader('Running Linting Only');
  runLinting();
} else {
  // Run all tests
  runTests();
} 