// Unit tests for validation.js

// Import the validation module
// Note: In a real setup, you'd need to export the class or use a module bundler
// For now, we'll test the global vaccinationValidator instance

describe('VaccinationValidator', () => {
  let validator;

  beforeEach(() => {
    // Create a fresh instance for each test
    validator = new VaccinationValidator();
  });

  describe('validateName', () => {
    test('should return true for valid names', () => {
      const validNames = [
        'John',
        'Mary Jane',
        'O\'Connor',
        'Jean-Pierre',
        // Minimum valid name length is 2 per current validator
        'Ab'
      ];

      validNames.forEach(name => {
        expect(validator.validateName(name)).toBe(true);
        expect(validator.getErrors()).toHaveLength(0);
      });
    });

    test('should return false for empty or null names', () => {
      const invalidNames = ['', '   ', null, undefined];

      invalidNames.forEach(name => {
        expect(validator.validateName(name)).toBe(false);
        expect(validator.getErrors()).toContain('Child name is required');
      });
    });

    test('should return false for names that are too short', () => {
      expect(validator.validateName('A')).toBe(false);
      expect(validator.getErrors()).toContain('Child name must be at least 2 characters long');
    });

    test('should return false for names that are too long', () => {
      const longName = 'A'.repeat(51);
      expect(validator.validateName(longName)).toBe(false);
      expect(validator.getErrors()).toContain('Child name must be less than 50 characters');
    });

    test('should return false for names with invalid characters', () => {
      const invalidNames = [
        'John123',
        'Mary@Jane',
        'Test#Name',
        'Child$Name',
        'Name%Test'
      ];

      invalidNames.forEach(name => {
        expect(validator.validateName(name)).toBe(false);
        expect(validator.getErrors()).toContain('Child name can only contain letters, spaces, hyphens, apostrophes, and dots');
      });
    });

    test('should accept names with valid special characters', () => {
      const validNames = [
        'Mary-Jane',
        'O\'Connor',
        'Jean Pierre',
        'De La Cruz'
      ];

      validNames.forEach(name => {
        expect(validator.validateName(name)).toBe(true);
        expect(validator.getErrors()).toHaveLength(0);
      });
    });
  });

  describe('validateDateOfBirth', () => {
    beforeEach(() => {
      // Mock current date to 2024-01-01
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should return true for valid dates of birth', () => {
      const validDates = [
        '2023-01-01',
        '2020-06-15',
        '2010-12-31',
        '2006-03-20'
      ];

      validDates.forEach(date => {
        expect(validator.validateDateOfBirth(date)).toBe(true);
        expect(validator.getErrors()).toHaveLength(0);
      });
    });

    test('should return false for empty or null dates', () => {
      const invalidDates = ['', null, undefined];

      invalidDates.forEach(date => {
        expect(validator.validateDateOfBirth(date)).toBe(false);
        expect(validator.getErrors()).toContain('Date of birth is required');
      });
    });

    test('should return false for invalid date formats', () => {
      const invalidDates = [
        'invalid-date',
        '2023-13-01',
        '2023-00-01',
        '2023-01-32'
      ];

      invalidDates.forEach(date => {
        expect(validator.validateDateOfBirth(date)).toBe(false);
        expect(validator.getErrors()).toContain('Please enter a valid date of birth');
      });
    });

    test('should return false for future dates', () => {
      const futureDates = [
        '2025-01-01',
        '2024-12-31',
        '2030-06-15'
      ];

      futureDates.forEach(date => {
        expect(validator.validateDateOfBirth(date)).toBe(false);
        expect(validator.getErrors()).toContain('Date of birth cannot be in the future');
      });
    });

    test('should return false for children older than 18 years', () => {
      const oldDates = [
        '2000-01-01',
        '1990-06-15',
        '1980-12-31'
      ];

      oldDates.forEach(date => {
        expect(validator.validateDateOfBirth(date)).toBe(false);
        expect(validator.getErrors()).toContain('This tracker is designed for children under 18 years');
      });
    });

    test('should accept children under 18 years', () => {
      const validDates = [
        '2006-01-01', // 18 years old
        '2010-06-15', // 13 years old
        '2020-12-31'  // 3 years old
      ];

      validDates.forEach(date => {
        expect(validator.validateDateOfBirth(date)).toBe(true);
        expect(validator.getErrors()).toHaveLength(0);
      });
    });
  });

  describe('validateCompletionDate', () => {
    const childDob = '2023-01-01';

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should return true for valid completion dates', () => {
      const validDates = [
        '2023-01-01', // Same as DOB
        '2023-06-15', // After DOB
        '2024-01-01'  // Current date
      ];

      validDates.forEach(date => {
        expect(validator.validateCompletionDate(date, childDob)).toBe(true);
        expect(validator.getErrors()).toHaveLength(0);
      });
    });

    test('should return false for empty or null completion dates', () => {
      const invalidDates = ['', null, undefined];

      invalidDates.forEach(date => {
        expect(validator.validateCompletionDate(date, childDob)).toBe(false);
        expect(validator.getErrors()).toContain('Completion date is required');
      });
    });

    test('should return false for invalid completion date formats', () => {
      const invalidDates = [
        'invalid-date',
        '2023-13-01',
        '2023-00-01'
      ];

      invalidDates.forEach(date => {
        expect(validator.validateCompletionDate(date, childDob)).toBe(false);
        expect(validator.getErrors()).toContain('Please enter a valid completion date');
      });
    });

    test('should return false for completion dates before DOB', () => {
      const earlyDates = [
        '2022-12-31',
        '2022-06-15',
        '2020-01-01'
      ];

      earlyDates.forEach(date => {
        expect(validator.validateCompletionDate(date, childDob)).toBe(false);
        expect(validator.getErrors()).toContain('Completion date cannot be before date of birth');
      });
    });

    test('should return false for future completion dates', () => {
      const futureDates = [
        '2025-01-01',
        '2024-12-31',
        '2030-06-15'
      ];

      futureDates.forEach(date => {
        expect(validator.validateCompletionDate(date, childDob)).toBe(false);
        expect(validator.getErrors()).toContain('Completion date cannot be in the future');
      });
    });
  });

  describe('validateChildData', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should return true for valid child data', () => {
      const validChildData = {
        name: 'John Doe',
        dob: '2023-01-01'
      };

      expect(validator.validateChildData(validChildData)).toBe(true);
      expect(validator.getErrors()).toHaveLength(0);
    });

    test('should return false for invalid child data', () => {
      const invalidChildData = {
        name: '',
        dob: '2025-01-01'
      };

      expect(validator.validateChildData(invalidChildData)).toBe(false);
      expect(validator.getErrors()).toContain('Child name is required');
      expect(validator.getErrors()).toContain('Date of birth cannot be in the future');
    });

    test('should clear previous errors when validating new data', () => {
      // First validation with errors
      const invalidData = { name: '', dob: '' };
      validator.validateChildData(invalidData);
      expect(validator.getErrors()).toHaveLength(2);

      // Second validation with valid data
      const validData = { name: 'John', dob: '2023-01-01' };
      validator.validateChildData(validData);
      expect(validator.getErrors()).toHaveLength(0);
    });
  });

  describe('formatErrorMessage', () => {
    test('should return empty string when no errors', () => {
      expect(validator.formatErrorMessage()).toBe('');
    });

    test('should return single error message', () => {
      validator.validateName('');
      expect(validator.formatErrorMessage()).toBe('Child name is required');
    });

    test('should return formatted multiple error messages', () => {
      validator.validateName('');
      validator.validateDateOfBirth('');
      
      const errorMessage = validator.formatErrorMessage();
      expect(errorMessage).toContain('Please fix the following errors:');
      expect(errorMessage).toContain('Child name is required');
      expect(errorMessage).toContain('Date of birth is required');
    });
  });

  describe('clearErrors', () => {
    test('should clear all errors', () => {
      validator.validateName('');
      expect(validator.getErrors()).toHaveLength(1);
      
      validator.clearErrors();
      expect(validator.getErrors()).toHaveLength(0);
    });
  });
}); 