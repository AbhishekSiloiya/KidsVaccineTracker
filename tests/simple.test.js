// Simple test to verify testing setup

describe('Basic Test Setup', () => {
  test('should run basic test', () => {
    expect(1 + 1).toBe(2);
  });

  test('should have localStorage mock', () => {
    expect(localStorage).toBeDefined();
    expect(localStorage.getItem).toBeDefined();
    expect(localStorage.setItem).toBeDefined();
  });

  test('should have document mock', () => {
    expect(document).toBeDefined();
    expect(document.body).toBeDefined();
  });

  test('should have window mock', () => {
    expect(window).toBeDefined();
    expect(window.location).toBeDefined();
  });
});

// Test the actual classes by loading them
describe('Class Loading Test', () => {
  const { VaccinationValidator } = require('../js/validation.js');
  const { VaccinationStorage } = require('../js/storage.js');

  test('should load VaccinationValidator class', () => {
    expect(VaccinationValidator).toBeDefined();
    const validator = new VaccinationValidator();
    expect(validator).toBeInstanceOf(VaccinationValidator);
  });

  test('should load VaccinationStorage class', () => {
    expect(VaccinationStorage).toBeDefined();
    const storage = new VaccinationStorage();
    expect(storage).toBeInstanceOf(VaccinationStorage);
  });

  test('should validate name correctly', () => {
    const validator = new VaccinationValidator();
    expect(validator.validateName('John')).toBe(true);
    expect(validator.validateName('')).toBe(false);
  });

  test('should save child data', () => {
    const storage = new VaccinationStorage();
    const child = { id: 'test', name: 'Test Child', dob: '2023-01-01' };
    
    storage.saveChild(child);
    expect(localStorage.setItem).toHaveBeenCalled();
  });
}); 