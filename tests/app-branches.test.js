// Additional branch/function coverage tests for app.js

describe('VaccinationTracker Branch Coverage', () => {
  let tracker;
  const buildDom = () => {
    document.body.innerHTML = `
      <div id="inputCard"></div>
      <div id="editableView"></div>
      <div id="readOnlyView" class="hidden"></div>
      <input id="nameInput" />
      <input id="dobInput" />
      <button id="generateBtn"></button>
      <button id="cancelEditBtn" class="hidden"></button>
      <button id="downloadCalendarBtn"></button>
      <button id="editBtn"></button>
      <div id="errorMsg" class="hidden"></div>
      <div id="scheduleOutput"></div>
      <span id="childNameDisplay"></span>
      <span id="childDobDisplay"></span>
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
    // Provide storage mock with a pre-existing child to exercise loadSavedData path
    global.vaccinationStorage = {
      _children: [
        { id: 'c1', name: 'Alpha', dob: '2023-01-01', createdAt: '2023-01-01T00:00:00.000Z' }
      ],
      getAllChildren() { return this._children.slice(); },
      getVaccinationData: () => ({ completions: { Birth: { 'BCG': '2023-01-01', 'OPV 0': '2023-01-01', 'Hepatitis B-1': '2023-01-01' } } }),
      saveChild(child) { const i = this._children.findIndex(c => c.id === child.id); if (i>=0) this._children[i]=child; else this._children.push(child); },
      saveVaccinationCompletion: jest.fn(),
      deleteChild(id) { this._children = this._children.filter(c => c.id !== id); },
      getVaccinationDataRaw: () => ({})
    };
    global.vaccinationValidator = global.vaccinationValidator || new (require('../js/validation.js').VaccinationValidator)();
    tracker = new (require('../js/app.js').VaccinationTracker)();
  });

  test('showError / hideError and loading toggles', () => {
    tracker.showError('Err');
    expect(document.getElementById('errorMsg').classList.contains('hidden')).toBe(false);
    tracker.hideError();
    expect(document.getElementById('errorMsg').classList.contains('hidden')).toBe(true);
    tracker.showLoading();
    expect(document.getElementById('loadingSpinner').classList.contains('hidden')).toBe(false);
    tracker.hideLoading();
    expect(document.getElementById('loadingSpinner').classList.contains('hidden')).toBe(true);
  });

  test('editChild and cancelEdit toggle views and populate inputs', () => {
    tracker.editChild();
    expect(document.getElementById('editableView').classList.contains('hidden')).toBe(false);
    expect(document.getElementById('nameInput').value).toBe('Alpha');
    tracker.cancelEdit();
    expect(document.getElementById('readOnlyView').classList.contains('hidden')).toBe(false);
  });

  test('showDashboard and delete profile flow', () => {
    // Mock confirm to accept deletion
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    tracker.showDashboard();
    const list = document.getElementById('profilesList');
    expect(list.children.length).toBeGreaterThan(0);
    // Click delete on first profile
    const deleteBtn = list.querySelector('.delete-btn');
    deleteBtn.click();
    expect(global.vaccinationStorage.getAllChildren().length).toBe(0);
  });

  test('updateDashboardStatsTotals directly', () => {
    tracker.updateDashboardStatsTotals({ completed: 5, overdue: 2, upcoming: 7 }, {
      completedEl: document.getElementById('statCompleted'),
      overdueEl: document.getElementById('statOverdue'),
      upcomingEl: document.getElementById('statUpcoming')
    });
    expect(document.getElementById('statCompleted').textContent).toBe('5');
    expect(document.getElementById('statOverdue').textContent).toBe('2');
  });

  test('generateId returns unique-ish string', () => {
    const id1 = tracker.generateId();
    const id2 = tracker.generateId();
    expect(id1).not.toBe(id2);
  });

  test('computeScheduleStats branch for dueSoon and nextDue replacement', () => {
    const dob = new Date('2023-01-01');
  // Complete nothing so Birth is pending and will be overdue once today passes it
  const completions = {};
  const earlyToday = new Date('2023-01-02'); // Birth still upcoming? Actually Birth due 1 Jan so now overdue branch executes
  const statsEarly = tracker.computeScheduleStats(dob, completions, earlyToday);
  expect(statsEarly.overdueCount).toBeGreaterThanOrEqual(1);

  // Choose a today just before 6 Weeks to make it dueSoon (<=30 days)
  const nearSixWeeks = new Date('2023-01-25'); // 6 weeks ~ Feb 12 (difference 18 days)
  const statsDueSoon = tracker.computeScheduleStats(dob, completions, nearSixWeeks);
  expect(statsDueSoon.dueSoonCount).toBeGreaterThan(0);
  expect(statsDueSoon.nextDueDate).toBeInstanceOf(Date);
  });
});
