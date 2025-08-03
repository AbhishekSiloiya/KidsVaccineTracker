// Integration tests for VaccinationTracker

describe('VaccinationTracker Integration Tests', () => {
  let tracker;
  let storage;
  let validator;

  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = `
      <div id="inputCard">
        <div id="editableView">
          <input id="nameInput" type="text" />
          <input id="dobInput" type="date" />
          <button id="generateBtn">Generate Schedule</button>
          <p id="errorMsg" class="hidden"></p>
        </div>
        <div id="readOnlyView" class="hidden">
          <span id="childNameDisplay"></span>
          <span id="childDobDisplay"></span>
          <button id="downloadCalendarBtn">Download Calendar</button>
          <button id="editBtn">Edit</button>
        </div>
      </div>
      <div id="scheduleOutput"></div>
      <div id="loadingSpinner" class="hidden"></div>
    `;

    // Initialize modules
    storage = new VaccinationStorage();
    validator = new VaccinationValidator();
    tracker = new VaccinationTracker();
  });

  afterEach(() => {
    localStorage.clear();
    jest.clearAllTimers();
  });

  describe('Child Profile Management', () => {
    test('should create and save child profile successfully', () => {
      const nameInput = document.getElementById('nameInput');
      const dobInput = document.getElementById('dobInput');
      const generateBtn = document.getElementById('generateBtn');

      // Set up test data
      nameInput.value = 'Test Child';
      dobInput.value = '2023-01-01';

      // Mock current date
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01'));

      // Trigger generation
      generateBtn.click();

      // Verify child was saved
      const children = storage.getAllChildren();
      expect(children).toHaveLength(1);
      expect(children[0].name).toBe('Test Child');
      expect(children[0].dob).toBe('2023-01-01');

      jest.useRealTimers();
    });

    test('should show error for invalid child data', () => {
      const nameInput = document.getElementById('nameInput');
      const dobInput = document.getElementById('dobInput');
      const generateBtn = document.getElementById('generateBtn');
      const errorMsg = document.getElementById('errorMsg');

      // Set up invalid data
      nameInput.value = '';
      dobInput.value = '2025-01-01'; // Future date

      // Mock current date
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01'));

      // Trigger generation
      generateBtn.click();

      // Verify error is shown
      expect(errorMsg.classList.contains('hidden')).toBe(false);
      expect(errorMsg.textContent).toContain('Child name is required');
      expect(errorMsg.textContent).toContain('Date of birth cannot be in the future');

      jest.useRealTimers();
    });

    test('should load existing child data on page load', () => {
      // Pre-populate storage with child data
      const existingChild = {
        id: 'existing-child',
        name: 'Existing Child',
        dob: '2023-01-01',
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      storage.saveChild(existingChild);

      // Create new tracker instance (simulates page reload)
      const newTracker = new VaccinationTracker();

      // Verify child data is loaded
      const childNameDisplay = document.getElementById('childNameDisplay');
      const childDobDisplay = document.getElementById('childDobDisplay');

      expect(childNameDisplay.textContent).toBe('Existing Child');
      expect(childDobDisplay.textContent).toBe('1/1/2023');
    });
  });

  describe('Vaccination Schedule Generation', () => {
    test('should generate complete vaccination schedule', () => {
      const nameInput = document.getElementById('nameInput');
      const dobInput = document.getElementById('dobInput');
      const generateBtn = document.getElementById('generateBtn');
      const scheduleOutput = document.getElementById('scheduleOutput');

      // Set up test data
      nameInput.value = 'Test Child';
      dobInput.value = '2023-01-01';

      // Mock current date
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01'));

      // Trigger generation
      generateBtn.click();

      // Verify schedule is generated
      expect(scheduleOutput.children.length).toBeGreaterThan(0);

      // Check for specific vaccination milestones
      const scheduleText = scheduleOutput.textContent;
      expect(scheduleText).toContain('Birth');
      expect(scheduleText).toContain('6 Weeks');
      expect(scheduleText).toContain('BCG');
      expect(scheduleText).toContain('OPV 0');

      jest.useRealTimers();
    });

    test('should calculate correct due dates', () => {
      const nameInput = document.getElementById('nameInput');
      const dobInput = document.getElementById('dobInput');
      const generateBtn = document.getElementById('generateBtn');
      const scheduleOutput = document.getElementById('scheduleOutput');

      // Set up test data
      nameInput.value = 'Test Child';
      dobInput.value = '2023-01-01';

      // Mock current date
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01'));

      // Trigger generation
      generateBtn.click();

      // Verify due dates are calculated correctly
      const scheduleText = scheduleOutput.textContent;
      
      // Birth vaccinations should be due on birth date
      expect(scheduleText).toContain('Due: 1/1/2023');
      
      // 6 weeks should be approximately 6 weeks after birth
      expect(scheduleText).toContain('6 Weeks');

      jest.useRealTimers();
    });
  });

  describe('Vaccination Completion Tracking', () => {
    test('should mark vaccination as completed', () => {
      // Set up child and schedule
      const nameInput = document.getElementById('nameInput');
      const dobInput = document.getElementById('dobInput');
      const generateBtn = document.getElementById('generateBtn');

      nameInput.value = 'Test Child';
      dobInput.value = '2023-01-01';

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01'));

      generateBtn.click();

      const scheduleOutput = document.getElementById('scheduleOutput');
      const firstCard = scheduleOutput.firstElementChild;
      
      // Find and click the "Mark as Complete" button
      const markBtn = firstCard.querySelector('.mark-btn');
      markBtn.click();

      // Find the completion form
      const completeForm = firstCard.querySelector('.complete-form');
      expect(completeForm.classList.contains('hidden')).toBe(false);

      // Set completion date
      const dateInput = completeForm.querySelector('.comp-date');
      dateInput.value = '2023-01-01';

      // Save completion
      const saveBtn = completeForm.querySelector('.save-btn');
      saveBtn.click();

      // Verify completion is saved
      const completedDate = firstCard.querySelector('.completed-date');
      expect(completedDate.classList.contains('hidden')).toBe(false);
      expect(completedDate.textContent).toContain('Completed: 1/1/2023');

      // Verify status badge is updated
      const badge = firstCard.querySelector('.status-completed');
      expect(badge).toBeTruthy();
      expect(badge.textContent).toBe('Completed');

      jest.useRealTimers();
    });

    test('should validate completion date', () => {
      // Set up child and schedule
      const nameInput = document.getElementById('nameInput');
      const dobInput = document.getElementById('dobInput');
      const generateBtn = document.getElementById('generateBtn');

      nameInput.value = 'Test Child';
      dobInput.value = '2023-01-01';

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01'));

      generateBtn.click();

      const scheduleOutput = document.getElementById('scheduleOutput');
      const firstCard = scheduleOutput.firstElementChild;
      
      // Find and click the "Mark as Complete" button
      const markBtn = firstCard.querySelector('.mark-btn');
      markBtn.click();

      // Find the completion form
      const completeForm = firstCard.querySelector('.complete-form');
      const saveBtn = completeForm.querySelector('.save-btn');
      const errorText = completeForm.querySelector('.error-text');

      // Try to save without date
      saveBtn.click();

      // Verify error is shown
      expect(errorText.classList.contains('hidden')).toBe(false);
      expect(errorText.textContent).toContain('Completion date is required');

      jest.useRealTimers();
    });
  });

  describe('Calendar Export', () => {
    test('should generate ICS calendar file', () => {
      // Set up child and schedule
      const nameInput = document.getElementById('nameInput');
      const dobInput = document.getElementById('dobInput');
      const generateBtn = document.getElementById('generateBtn');
      const downloadBtn = document.getElementById('downloadCalendarBtn');

      nameInput.value = 'Test Child';
      dobInput.value = '2023-01-01';

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01'));

      generateBtn.click();

      // Trigger calendar download
      downloadBtn.click();

      // Verify ICS content is generated
      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(document.createElement).toHaveBeenCalledWith('a');

      jest.useRealTimers();
    });

    test('should show error when no schedule exists', () => {
      const downloadBtn = document.getElementById('downloadCalendarBtn');

      // Try to download without generating schedule
      downloadBtn.click();

      // Verify alert is shown
      expect(alert).toHaveBeenCalledWith('Please generate a schedule first.');
    });
  });

  describe('Data Persistence', () => {
    test('should persist data across sessions', () => {
      // Create child and mark vaccinations as complete
      const nameInput = document.getElementById('nameInput');
      const dobInput = document.getElementById('dobInput');
      const generateBtn = document.getElementById('generateBtn');

      nameInput.value = 'Test Child';
      dobInput.value = '2023-01-01';

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01'));

      generateBtn.click();

      // Mark a vaccination as complete
      const scheduleOutput = document.getElementById('scheduleOutput');
      const firstCard = scheduleOutput.firstElementChild;
      const markBtn = firstCard.querySelector('.mark-btn');
      markBtn.click();

      const completeForm = firstCard.querySelector('.complete-form');
      const dateInput = completeForm.querySelector('.comp-date');
      const saveBtn = completeForm.querySelector('.save-btn');

      dateInput.value = '2023-01-01';
      saveBtn.click();

      // Verify data is saved to localStorage
      const children = storage.getAllChildren();
      expect(children).toHaveLength(1);

      const vaccinationData = storage.getVaccinationData(children[0].id);
      expect(vaccinationData.completions).toBeDefined();

      jest.useRealTimers();
    });

    test('should export and import data correctly', () => {
      // Create test data
      const child = {
        id: 'test-child',
        name: 'Test Child',
        dob: '2023-01-01'
      };

      storage.saveChild(child);
      storage.saveVaccinationCompletion('test-child', 'Birth', 'BCG', '2023-01-01');

      // Export data
      const exportedData = storage.exportData();

      // Clear storage
      storage.clearAllData();

      // Import data
      const importResult = storage.importData(exportedData);

      // Verify import was successful
      expect(importResult).toBe(true);

      // Verify data is restored
      const children = storage.getAllChildren();
      expect(children).toHaveLength(1);
      expect(children[0].name).toBe('Test Child');

      const vaccinationData = storage.getVaccinationData('test-child');
      expect(vaccinationData.completions['Birth']['BCG']).toBe('2023-01-01');
    });
  });

  describe('Error Handling', () => {
    test('should handle localStorage errors gracefully', () => {
      // Mock localStorage to throw error
      localStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const nameInput = document.getElementById('nameInput');
      const dobInput = document.getElementById('dobInput');
      const generateBtn = document.getElementById('generateBtn');

      nameInput.value = 'Test Child';
      dobInput.value = '2023-01-01';

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01'));

      // Should not throw error
      expect(() => {
        generateBtn.click();
      }).not.toThrow();

      jest.useRealTimers();
    });

    test('should handle invalid date calculations', () => {
      const nameInput = document.getElementById('nameInput');
      const dobInput = document.getElementById('dobInput');
      const generateBtn = document.getElementById('generateBtn');

      nameInput.value = 'Test Child';
      dobInput.value = 'invalid-date';

      jest.useFakeTimers();
      jest.setSystemTime(new Date('2024-01-01'));

      generateBtn.click();

      // Should show validation error
      const errorMsg = document.getElementById('errorMsg');
      expect(errorMsg.classList.contains('hidden')).toBe(false);

      jest.useRealTimers();
    });
  });
}); 