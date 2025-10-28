// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock navigator object for tests
Object.defineProperty(global, 'navigator', {
  value: {
    onLine: true,
    userAgent: 'test'
  },
  writable: true
});

// Mock window object for tests
Object.defineProperty(global, 'window', {
  value: {
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
    location: {
      href: 'http://localhost:3000'
    }
  },
  writable: true
});

// Mock document object for tests
Object.defineProperty(global, 'document', {
  value: {
    createElement: jest.fn(() => ({
      addEventListener: jest.fn(),
      removeEventListener: jest.fn()
    })),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    body: {
      appendChild: jest.fn(),
      removeChild: jest.fn()
    }
  },
  writable: true
});

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // uncomment to ignore a specific log level
  // log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};