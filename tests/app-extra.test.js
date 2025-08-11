// Additional targeted tests to raise coverage for app.js utility logic

// These tests exercise internal helper methods that weren't fully covered by integration tests.

describe('VaccinationTracker Additional Coverage', () => {
  let tracker;

  // Build a full DOM skeleton so event bindings don't throw
  const buildDom = () => {
    document.body.innerHTML = `
      <div id="inputCard"></div>
      <div id="editableView"></div>
      <div id="readOnlyView" class="hidden"></div>
      <input id="nameInput" />
      <input id="dobInput" />
      <button id="generateBtn"></button>
      <button id="cancelEditBtn"></button>
      <button id="downloadCalendarBtn"></button>
      <div id="errorMsg" class="hidden"></div>
      <div id="scheduleOutput"></div>
      <span id="childNameDisplay"></span>
      <span id="childDobDisplay"></span>
      <button id="editBtn"></button>
      <div id="loadingSpinner" class="hidden"></div>
      <div id="profilesDashboard" class="hidden"></div>
      <div id="profilesList"></div>
      <button id="manageProfilesBtn"></button>
      <button id="backToScheduleBtn"></button>
      <button id="addChildBtn"></button>
      <div id="statTotal"></div>
      <div id="statCompleted"></div>
      <div id="statOverdue"></div>
      <div id="statUpcoming"></div>
    `;
  };

  beforeEach(() => {
    buildDom();
    // Provide a basic storage mock BEFORE constructing tracker to satisfy loadSavedData()
    global.vaccinationStorage = {
      getAllChildren: () => [],
      getVaccinationData: () => ({ completions: {} })
    };
    // Fresh instance each test (storage & validator already set up in global by setup.js)
    tracker = new (require('../js/app.js').VaccinationTracker)();
  });

  test('calcDate handles weeks, months, years and ranges', () => {
    const base = new Date('2023-01-01');
    const sixWeeks = tracker.calcDate(base, '6 Weeks');
    const sixMonths = tracker.calcDate(base, '6 Months');
    const fourYears = tracker.calcDate(base, '4 Years');
    const rangeMonths = tracker.calcDate(base, '6-9 Months');

    expect(Math.round((sixWeeks - base) / (1000*60*60*24))).toBe(42); // 6*7
    expect(sixMonths.getMonth()).toBe(6); // July (0-indexed)
    expect(fourYears.getFullYear()).toBe(2027);
    // Range should take first number (6 months)
    expect(rangeMonths.getMonth()).toBe(6);
  });

  test('formatAgeString for <1 year, exact year, and year+months', () => {
    const dob = new Date('2023-01-01');
    expect(tracker.formatAgeString(dob, new Date('2023-03-01'))).toContain('2 months');
    expect(tracker.formatAgeString(dob, new Date('2024-01-01'))).toBe('1 year old');
    expect(tracker.formatAgeString(dob, new Date('2025-04-01'))).toBe('2y 3m old');
  });

  test('computeScheduleStats counts completed, overdue, due soon, upcoming', () => {
    const dob = new Date('2023-01-01');
    const today = new Date('2023-03-01'); // So 6 Weeks (~Feb 12) is overdue, 10 Weeks (~Mar 12) upcoming & due soon

    // Mark all Birth vaccines complete
    const birthVaccines = ['BCG', 'OPV 0', 'Hepatitis B-1'];
    const completions = { Birth: {} };
    birthVaccines.forEach(v => { completions.Birth[v] = '2023-01-01'; });

    const stats = tracker.computeScheduleStats(dob, completions, today);
    expect(stats.milestonesCompleted).toBeGreaterThanOrEqual(1);
    expect(stats.overdueCount).toBeGreaterThanOrEqual(1); // 6 Weeks
    expect(stats.dueSoonCount).toBeGreaterThanOrEqual(1); // 10 Weeks within 30 days
    expect(stats.upcomingCount).toBeGreaterThan(stats.dueSoonCount); // Includes later milestones
    expect(stats.nextDueLabel).toBeDefined();
  });

  test('showDashboard and hideDashboard toggle visibility', () => {
    tracker.showDashboard();
    expect(document.getElementById('profilesDashboard').classList.contains('hidden')).toBe(false);
    tracker.hideDashboard();
    // After hiding, either readOnlyView or editableView becomes visible
    const readOnlyHidden = document.getElementById('readOnlyView').classList.contains('hidden');
    const editableHidden = document.getElementById('editableView').classList.contains('hidden');
    expect(readOnlyHidden || editableHidden).toBe(true);
  });

  test('generateIcsString outputs VCALENDAR with events', () => {
    const childName = 'Test Child';
    const dob = new Date('2023-01-01');
    const ics = tracker.generateIcsString(childName, dob);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('SUMMARY:Test Child -');
  });

  test('updateCompletionUI updates classes and text correctly', () => {
    // Prepare a minimal card DOM similar to createScheduleCard output
    const card = document.createElement('div');
    card.innerHTML = `
      <p class="due-date"></p>
      <p class="completed-date hidden"></p>
      <span class="status-upcoming">Upcoming</span>
      <p class="detail-due hidden"></p>
    `;
    const form = document.createElement('div');
    form.className = 'complete-form';
    card.appendChild(form);

    tracker.updateCompletionUI(card, form, '2023-02-01', new Date('2023-06-01'));
    expect(card.querySelector('.due-date').classList.contains('hidden')).toBe(true);
    expect(card.querySelector('.completed-date').textContent).toContain('Completed:');
    expect(card.querySelector('.status-completed')).toBeTruthy();
  });

  test('calcDate handles invalid inputs gracefully', () => {
    const base = new Date('2023-01-01');
    expect(tracker.calcDate(base, '') instanceof Date).toBe(true);
    expect(tracker.calcDate(base, null) instanceof Date).toBe(true);
  });

  test('handleSaveCompletion validates completion date error path', () => {
    // Create a schedule card mimicking structure for first milestone
    const card = document.createElement('div');
    card.innerHTML = `
      <p class="due-date"></p>
      <p class="completed-date hidden"></p>
      <span class="status-upcoming">Upcoming</span>
      <p class="detail-due hidden"></p>
      <div class="complete-form">
        <input class="comp-date" type="date" value="" />
        <button class="save-btn"></button>
        <p class="error-text hidden"></p>
      </div>
    `;

    // Mock current child and storage so save won't throw
    tracker.currentChild = { id: 'child-x', dob: '2023-01-01' };
    global.vaccinationStorage = {
      saveVaccinationCompletion: jest.fn(),
      getVaccinationData: () => ({ completions: {} })
    };

    // Force validator to fail by passing empty completion date
    global.vaccinationValidator.clearErrors();
    const originalValidate = global.vaccinationValidator.validateCompletionDate.bind(global.vaccinationValidator);
    jest.spyOn(global.vaccinationValidator, 'validateCompletionDate').mockImplementation(() => {
      global.vaccinationValidator.errors.push('Completion date is required');
      return false;
    });

    tracker.handleSaveCompletion(card, card.querySelector('.complete-form'), new Date('2023-01-01'), { age: 'Birth', vaccines: ['BCG'] });
    expect(card.querySelector('.error-text').classList.contains('hidden')).toBe(false);
    global.vaccinationValidator.validateCompletionDate.mockRestore();
  });

  test('downloadCalendar shows error when no child', () => {
  tracker.currentChild = null; // ensure no child
    const spy = jest.spyOn(tracker, 'showError');
    tracker.downloadCalendar();
    expect(spy).toHaveBeenCalledWith('Please generate a schedule first.');
  });
});
