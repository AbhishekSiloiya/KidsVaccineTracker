// Jest setup file for VaccinationTracker tests

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
};

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  key: jest.fn(),
  length: 0
};

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');
global.URL.revokeObjectURL = jest.fn();

// Mock document.createElement for anchor tag
const mockAnchor = {
  href: '',
  download: '',
  click: jest.fn()
};

// Only mock document.createElement if document exists (jsdom environment)
if (typeof document !== 'undefined') {
  const originalCreateElement = document.createElement;
  document.createElement = jest.fn((tagName) => {
    if (tagName === 'a') {
      return mockAnchor;
    }
    return originalCreateElement.call(document, tagName);
  });
}

// Mock document.body methods (only if document exists)
if (typeof document !== 'undefined') {
  document.body.appendChild = jest.fn();
  document.body.removeChild = jest.fn();
}

// Set up global mocks
if (typeof global !== 'undefined') {
  global.localStorage = localStorageMock;
  global.sessionStorage = sessionStorageMock;
}

// Ensure window-scoped storage also uses our mocks
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
  Object.defineProperty(window, 'sessionStorage', { value: sessionStorageMock, writable: true });
}

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

// Mock alert
global.alert = jest.fn();

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:8000',
    origin: 'http://localhost:8000',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
});

// Mock service worker
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn().mockResolvedValue({
      scope: 'http://localhost:8000/',
      updateViaCache: 'all'
    })
  },
  writable: true
});

// Helper function to reset all mocks
global.resetMocks = () => {
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
  localStorageMock.clear.mockClear();
  
  sessionStorageMock.getItem.mockClear();
  sessionStorageMock.setItem.mockClear();
  sessionStorageMock.removeItem.mockClear();
  sessionStorageMock.clear.mockClear();
  
  global.URL.createObjectURL.mockClear();
  global.URL.revokeObjectURL.mockClear();
  
  document.body.appendChild.mockClear();
  document.body.removeChild.mockClear();
  
  global.console.log.mockClear();
  global.console.warn.mockClear();
  global.console.error.mockClear();
  
  global.alert.mockClear();
  
  mockAnchor.click.mockClear();
};

// Helper function to create a mock DOM element
global.createMockElement = (tagName, attributes = {}) => {
  const element = document.createElement(tagName);
  Object.keys(attributes).forEach(key => {
    element[key] = attributes[key];
  });
  return element;
};

// Helper function to simulate DOM events
global.simulateEvent = (element, eventType, options = {}) => {
  const event = new Event(eventType, { bubbles: true, ...options });
  element.dispatchEvent(event);
  return event;
};

// Helper function to wait for async operations
global.waitFor = (ms = 0) => new Promise(resolve => setTimeout(resolve, ms));

// Set up test environment
beforeEach(() => {
  // Reset all mocks before each test
  global.resetMocks();
  
  // Clear any existing DOM
  document.body.innerHTML = '';
  
  // Reset localStorage mock data
  localStorageMock.getItem.mockImplementation((key) => {
    return null;
  });
  
  localStorageMock.setItem.mockImplementation((key, value) => {
    // Store in memory for testing
    localStorageMock[`_${key}`] = value;
  });
  
  localStorageMock.getItem.mockImplementation((key) => {
    return localStorageMock[`_${key}`] || null;
  });
  
  localStorageMock.removeItem.mockImplementation((key) => {
    delete localStorageMock[`_${key}`];
  });
  
  localStorageMock.clear.mockImplementation(() => {
    Object.keys(localStorageMock).forEach(key => {
      if (key.startsWith('_')) {
        delete localStorageMock[key];
      }
    });
  });
});

// Clean up after tests
afterEach(() => {
  // Clean up any remaining timers
  jest.clearAllTimers();
  
  // Reset fetch mock if used
  if (global.fetch) {
    global.fetch.mockClear();
  }
});

// Global test utilities
global.testUtils = {
  createMockChild: (name = 'Test Child', dob = '2023-01-01') => ({
    id: 'test-child-1',
    name,
    dob,
    createdAt: new Date().toISOString()
  }),
  
  createMockVaccinationData: () => ({
    completions: {
      'Birth': {
        'BCG': '2023-01-01',
        'OPV 0': '2023-01-01'
      }
    }
  }),
  
  mockDate: (dateString) => {
    const mockDate = new Date(dateString);
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate);
    return mockDate;
  }
};

// Load the actual classes for testing
const fs = require('fs');
const path = require('path');

// Load modules via require so Jest can instrument coverage
const { VaccinationValidator } = require('../js/validation.js');
const { VaccinationStorage } = require('../js/storage.js');
const { VaccinationTracker } = require('../js/app.js');

// Make classes available globally for tests
global.VaccinationValidator = VaccinationValidator;
global.VaccinationStorage = VaccinationStorage;
global.VaccinationTracker = VaccinationTracker;