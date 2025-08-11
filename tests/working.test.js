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
    // Ensure localStorage functions are jest mocks
    expect(jest.isMockFunction(localStorage.setItem)).toBe(true);
    expect(jest.isMockFunction(localStorage.getItem)).toBe(true);

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

    // Our jsdom body.appendChild is mocked in setup to a jest.fn, so length/text may not change.
    // Instead, verify that appendChild was called.
    expect(document.body.appendChild).toHaveBeenCalled();
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

// (Validation logic is covered in validation.test.js)

// (Storage logic is covered in storage.test.js)

// (Schedule logic covered via integration tests)

// (Calendar export covered in integration tests)