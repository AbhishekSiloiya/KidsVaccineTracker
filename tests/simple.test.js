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
  let VaccinationValidator;
  let VaccinationStorage;

  beforeAll(() => {
    // Load the classes by evaluating the code
    const fs = require('fs');
    const path = require('path');

    // Load validation.js
    const validationCode = fs.readFileSync(path.join(__dirname, '../js/validation.js'), 'utf8');
    eval(validationCode);

    // Load storage.js
    const storageCode = fs.readFileSync(path.join(__dirname, '../js/storage.js'), 'utf8');
    eval(storageCode);

    // Get the classes from global scope
    VaccinationValidator = global.VaccinationValidator;
    VaccinationStorage = global.VaccinationStorage;
  });

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