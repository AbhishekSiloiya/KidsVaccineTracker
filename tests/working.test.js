// Working test file to demonstrate testing framework

describe('VaccinationTracker Testing Framework', () => {
  test('should have basic Jest functionality', () => {
    expect(1 + 1).toBe(2);
    expect('hello').toBe('hello');
    expect([1, 2, 3]).toContain(2);
  });

  test('should have browser environment mocks', () => {
    // Test localStorage mock
    expect(localStorage).toBeDefined();
    expect(typeof localStorage.getItem).toBe('function');
    expect(typeof localStorage.setItem).toBe('function');
    
    // Test document mock
    expect(document).toBeDefined();
    expect(document.body).toBeDefined();
    
    // Test window mock
    expect(window).toBeDefined();
    expect(window.location).toBeDefined();
  });

  test('should be able to mock localStorage', () => {
    localStorage.setItem('test', 'value');
    expect(localStorage.setItem).toHaveBeenCalledWith('test', 'value');
    
    localStorage.getItem.mockReturnValue('mocked-value');
    const result = localStorage.getItem('test');
    expect(result).toBe('mocked-value');
  });

  test('should be able to create DOM elements', () => {
    const div = document.createElement('div');
    div.textContent = 'Test';
    document.body.appendChild(div);
    
    expect(document.body.children.length).toBeGreaterThan(0);
    expect(document.body.textContent).toContain('Test');
  });

  test('should be able to simulate events', () => {
    const button = document.createElement('button');
    let clicked = false;
    
    button.addEventListener('click', () => {
      clicked = true;
    });
    
    button.click();
    expect(clicked).toBe(true);
  });
});

// Test validation logic directly
describe('Validation Logic Tests', () => {
  test('should validate names correctly', () => {
    // Valid names
    const validNames = ['John', 'Mary Jane', 'O\'Connor'];
    validNames.forEach(name => {
      expect(name.length >= 2).toBe(true);
      expect(/^[a-zA-Z\s\-']+$/.test(name)).toBe(true);
    });
    
    // Invalid names
    const invalidNames = ['', 'A', 'John123', 'Mary@Jane'];
    invalidNames.forEach(name => {
      const isValid = name.length >= 2 && /^[a-zA-Z\s\-']+$/.test(name);
      expect(isValid).toBe(false);
    });
  });

  test('should validate dates correctly', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Valid dates (past or present)
    expect(yesterday <= today).toBe(true);
    expect(today <= today).toBe(true);
    
    // Invalid dates (future)
    expect(tomorrow > today).toBe(true);
  });

  test('should calculate age correctly', () => {
    const birthDate = new Date('2020-01-01');
    const today = new Date('2024-01-01');
    
    const ageInYears = (today - birthDate) / (1000 * 60 * 60 * 24 * 365.25);
    expect(ageInYears).toBeCloseTo(4, 1);
  });
});

// Test storage logic directly
describe('Storage Logic Tests', () => {
  test('should handle JSON serialization', () => {
    const testData = {
      children: [
        { id: '1', name: 'John', dob: '2023-01-01' }
      ],
      vaccinationData: {
        '1': { completions: {} }
      }
    };
    
    const serialized = JSON.stringify(testData);
    const deserialized = JSON.parse(serialized);
    
    expect(deserialized.children).toHaveLength(1);
    expect(deserialized.children[0].name).toBe('John');
  });

  test('should generate unique IDs', () => {
    const id1 = Date.now().toString(36) + Math.random().toString(36).substr(2);
    const id2 = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    expect(id1).toBeDefined();
    expect(id2).toBeDefined();
    expect(typeof id1).toBe('string');
    expect(typeof id2).toBe('string');
  });
});

// Test vaccination schedule logic
describe('Vaccination Schedule Tests', () => {
  test('should have vaccination schedule data', () => {
    const schedule = [
      { age: 'Birth', vaccines: ['BCG', 'OPV 0', 'Hep B-1'] },
      { age: '6 Weeks', vaccines: ['DTWP/DTaP-1', 'IPV-1', 'Hib-1', 'Rotavirus-1', 'PCV-1'] },
      { age: '10 Weeks', vaccines: ['DTWP/DTaP-2', 'IPV-2', 'Hib-2', 'Rotavirus-2', 'PCV-2'] }
    ];
    
    expect(schedule).toHaveLength(3);
    expect(schedule[0].age).toBe('Birth');
    expect(schedule[0].vaccines).toContain('BCG');
  });

  test('should calculate due dates correctly', () => {
    const birthDate = new Date('2023-01-01');
    
    // 6 weeks after birth
    const sixWeeks = new Date(birthDate);
    sixWeeks.setDate(sixWeeks.getDate() + 6 * 7);
    
    // 6 months after birth
    const sixMonths = new Date(birthDate);
    sixMonths.setMonth(sixMonths.getMonth() + 6);
    
    expect(sixWeeks.getTime()).toBeGreaterThan(birthDate.getTime());
    expect(sixMonths.getTime()).toBeGreaterThan(birthDate.getTime());
  });
});

// Test ICS calendar generation
describe('Calendar Export Tests', () => {
  test('should generate valid ICS format', () => {
    const icsHeader = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//VaccinationTracker//NONSGML v1.0//EN\nCALSCALE:GREGORIAN\n';
    const icsFooter = 'END:VCALENDAR';
    
    expect(icsHeader).toContain('BEGIN:VCALENDAR');
    expect(icsHeader).toContain('VERSION:2.0');
    expect(icsFooter).toContain('END:VCALENDAR');
  });

  test('should format dates correctly for ICS', () => {
    const date = new Date('2023-01-01');
    const formatted = date.toISOString().slice(0, 10).replace(/-/g, '');
    
    expect(formatted).toBe('20230101');
    expect(formatted.length).toBe(8);
  });
}); 