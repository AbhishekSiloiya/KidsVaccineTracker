
/* eslint max-len: ["warn", { "code": 120, "ignoreStrings": true, "ignoreTemplateLiterals": true }] */
// Main application logic for VaccinationTracker

// Constants for the vaccination schedule
const vaccinationSchedule = [
  { age: 'Birth', vaccines: ['BCG', 'OPV 0', 'Hep B-1'] },
  { age: '6 Weeks', vaccines: ['DTWP/DTaP-1', 'IPV-1', 'Hib-1', 'Rotavirus-1', 'PCV-1'] },
  { age: '10 Weeks', vaccines: ['DTWP/DTaP-2', 'IPV-2', 'Hib-2', 'Rotavirus-2', 'PCV-2'] },
  { age: '14 Weeks', vaccines: ['DTWP/DTaP-3', 'IPV-3', 'Hib-3', 'Rotavirus-3', 'PCV-3'] },
  { age: '6 Months', vaccines: ['Influenza (IIV)-1'] },
  { age: '7 Months', vaccines: ['Influenza (IIV)-2'] },
  { age: '6-9 Months', vaccines: ['Typhoid Conjugate Vaccine'] },
  { age: '9 Months', vaccines: ['MMR-1', 'Meningococcal-1'] },
  { age: '12 Months', vaccines: ['Hepatitis A', 'Meningococcal-2', 'Japanese Encephalitis-1', 'Cholera-1'] },
  { age: '13 Months', vaccines: ['Japanese Encephalitis-2', 'Cholera-2'] },
  { age: '15 Months', vaccines: ['MMR-2', 'Varicella-1', 'PCV Booster'] },
  { age: '16-18 Months', vaccines: ['DTWP/DTaP-B1', 'Hib-B1', 'IPV-B1'] },
  { age: '18-19 Months', vaccines: ['Hep A-2', 'Varicella-2'] },
  { age: '4-6 Years', vaccines: ['DTWP/DTaP-B2', 'IPV-B2', 'MMR-3'] },
  { age: '10-12 Years', vaccines: ['Tdap', 'HPV'] }
];

class VaccinationTracker {
  constructor() {
    this.currentChild = null;
    this.initializeElements();
    this.bindEvents();
    this.loadSavedData();
    this.renderProfilesDashboard();
  }

  // Initialize DOM elements
  initializeElements() {
    this.nameInput = document.getElementById('nameInput');
    this.dobInput = document.getElementById('dobInput');
    this.generateBtn = document.getElementById('generateBtn');
    this.cancelEditBtn = document.getElementById('cancelEditBtn');
    this.downloadCalendarBtn = document.getElementById('downloadCalendarBtn');
    this.errorMsg = document.getElementById('errorMsg');
    this.scheduleOutput = document.getElementById('scheduleOutput');
    this.editableView = document.getElementById('editableView');
    this.readOnlyView = document.getElementById('readOnlyView');
    this.inputCard = document.getElementById('inputCard');
    this.childNameDisplay = document.getElementById('childNameDisplay');
    this.childDobDisplay = document.getElementById('childDobDisplay');
    this.editBtn = document.getElementById('editBtn');
    this.loadingSpinner = document.getElementById('loadingSpinner');
    // Dashboard elements
    this.profilesDashboard = document.getElementById('profilesDashboard');
    this.profilesList = document.getElementById('profilesList');
    this.manageProfilesBtn = document.getElementById('manageProfilesBtn');
    this.backToScheduleBtn = document.getElementById('backToScheduleBtn');
    this.addChildBtn = document.getElementById('addChildBtn');
  }

  // Bind event listeners (guard against missing elements in test/dom setups)
  bindEvents() {
    if (this.generateBtn) {
      this.generateBtn.addEventListener('click', () => this.generateSchedule());
    }
    if (this.cancelEditBtn) {
      this.cancelEditBtn.addEventListener('click', () => this.cancelEdit());
    }
    if (this.editBtn) {
      this.editBtn.addEventListener('click', () => this.editChild());
    }
    if (this.downloadCalendarBtn) {
      this.downloadCalendarBtn.addEventListener('click', () => this.downloadCalendar());
    }

    // Add keyboard support
    if (this.nameInput) {
      this.nameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {this.generateSchedule();}
      });
    }
    if (this.dobInput) {
      this.dobInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {this.generateSchedule();}
      });
    }

    // Dashboard events
    if (this.manageProfilesBtn) {
      this.manageProfilesBtn.addEventListener('click', () => this.showDashboard());
    }
    if (this.backToScheduleBtn) {
      this.backToScheduleBtn.addEventListener('click', () => this.hideDashboard());
    }
    if (this.addChildBtn) {
      this.addChildBtn.addEventListener('click', () => {
        this.hideDashboard();
        this.editChild();
      });
    }
  }

  // Load saved data on page load
  loadSavedData() {
    const children = window.vaccinationStorage.getAllChildren();
    if (children.length > 0) {
      // Load the most recent child
      const [lastChild] = children.slice(-1);
      this.loadChildData(lastChild);
    }
  }

  // Load child data into the interface
  loadChildData(child) {
    this.currentChild = child;
    this.childNameDisplay.textContent = child.name;
    this.childDobDisplay.textContent = new Date(child.dob).toLocaleDateString('en-IN');

    this.editableView.classList.add('hidden');
    this.readOnlyView.classList.remove('hidden');

    this.renderSchedule(new Date(child.dob));
  }

  // Dashboard: show profiles
  showDashboard() {
    if (this.profilesDashboard) {
      this.profilesDashboard.classList.remove('hidden');
      this.editableView.classList.add('hidden');
      this.readOnlyView.classList.add('hidden');
      if (this.inputCard) { this.inputCard.classList.add('hidden'); }
      this.scheduleOutput.innerHTML = '';
      this.renderProfilesDashboard();
    }
  }

  // Dashboard: hide and return to current view
  hideDashboard() {
    if (this.profilesDashboard) {
      this.profilesDashboard.classList.add('hidden');
    }
    if (this.inputCard) { this.inputCard.classList.remove('hidden'); }
    if (this.currentChild) {
      this.readOnlyView.classList.remove('hidden');
    } else {
      this.editableView.classList.remove('hidden');
    }
  }

  // Render profiles list
  renderProfilesDashboard() {
    if (!this.profilesList) {return;}
    const children = window.vaccinationStorage.getAllChildren();
    this.profilesList.innerHTML = '';

    const { totalEl, completedEl, overdueEl, upcomingEl } = this.getDashboardStatElements();
    if (totalEl) { totalEl.textContent = String(children.length); }

    if (children.length === 0) {
      this.renderEmptyProfilesMessage();
      const zeroTotals = { completed: 0, overdue: 0, upcoming: 0 };
      this.updateDashboardStatsTotals(zeroTotals, { completedEl, overdueEl, upcomingEl });
      return;
    }

    const totals = { completed: 0, overdue: 0, upcoming: 0 };
    children.forEach((child) => {
      const stats = this.computeMilestoneStatsForChild(child);
      totals.completed += stats.milestonesCompleted;
      totals.overdue += stats.overdueCount;
      totals.upcoming += stats.upcomingCount;

      const row = this.buildProfileRow(child, stats);
      this.profilesList.appendChild(row);
      this.attachProfileRowHandlers(row, child);
    });

    this.updateDashboardStatsTotals(totals, { completedEl, overdueEl, upcomingEl });
  }

  getDashboardStatElements() {
    return {
      totalEl: document.getElementById('statTotal'),
      completedEl: document.getElementById('statCompleted'),
      overdueEl: document.getElementById('statOverdue'),
      upcomingEl: document.getElementById('statUpcoming')
    };
  }

  updateDashboardStatsTotals(totals, els) {
    const { completedEl, overdueEl, upcomingEl } = els;
    if (completedEl) { completedEl.textContent = String(totals.completed); }
    if (overdueEl) { overdueEl.textContent = String(totals.overdue); }
    if (upcomingEl) { upcomingEl.textContent = String(totals.upcoming); }
  }

  renderEmptyProfilesMessage() {
    const empty = document.createElement('div');
    empty.className = 'text-sm text-gray-600 p-3';
    empty.textContent = 'No profiles yet. Add a child to get started.';
    this.profilesList.appendChild(empty);
  }

  buildProfileRow(child, stats) {
    const {
      ageString,
      overdueCount,
      dueSoonCount,
      milestonesCompleted,
      totalMilestones,
      nextDueDate,
      nextDueLabel
    } = stats;

    const row = document.createElement('div');
    row.className = 'profile-card';
    row.innerHTML = `
      <div class="flex-1">
        <div class="flex items-center justify-between gap-2 flex-wrap">
          <div class="flex items-center gap-2">
            <span class="font-semibold text-gray-800 text-base">${child.name}</span>
            <span class="text-sm text-gray-600">Born ${new Date(child.dob).toLocaleDateString('en-IN')}</span>
            <span class="text-sm text-gray-600">• ${ageString}</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="pill pill-red">${overdueCount} Overdue</span>
            <span class="pill pill-yellow">${dueSoonCount} Due Soon</span>
            <span class="pill pill-green">${milestonesCompleted}/${totalMilestones} Complete</span>
          </div>
        </div>
        <div class="mt-3 bg-blue-50 text-blue-900 rounded-md p-3">
          <div class="text-sm font-semibold">Next Due:</div>
          <div class="text-base">${nextDueDate ? nextDueLabel : 'All done'}</div>
        </div>
      </div>
      <div class="flex items-center gap-2 ml-3">
        <button class="view-btn bg-gray-100 text-gray-800 px-3 py-1 rounded-md text-xs hover:bg-gray-200">View</button>
        <button class="delete-btn bg-red-600 text-white px-3 py-1 rounded-md text-xs hover:bg-red-700">Delete</button>
      </div>
    `;
    return row;
  }

  attachProfileRowHandlers(row, child) {
    row.querySelector('.view-btn').addEventListener('click', () => {
      this.hideDashboard();
      this.loadChildData(child);
    });

    row.querySelector('.delete-btn').addEventListener('click', () => {
      // eslint-disable-next-line no-alert
      const ok = window.confirm(`Delete profile for ${child.name}? This cannot be undone.`);
      if (!ok) {return;}
      window.vaccinationStorage.deleteChild(child.id, { includeVaccinationData: true });
      if (this.currentChild && this.currentChild.id === child.id) {
        this.currentChild = null;
        this.scheduleOutput.innerHTML = '';
        this.readOnlyView.classList.add('hidden');
        this.editableView.classList.remove('hidden');
      }
      this.renderProfilesDashboard();
    });
  }

  // Helper to format child age like "7 months old"
  formatAgeString(dob, today = new Date()) {
    const totalMonths = (today.getFullYear() - dob.getFullYear()) * 12 + (today.getMonth() - dob.getMonth());
    const years = Math.floor(totalMonths / 12);
    const months = totalMonths % 12;
    if (years <= 0) {
      return `${months} months old`;
    }
    if (months === 0) {
      return `${years} year${years > 1 ? 's' : ''} old`;
    }
    return `${years}y ${months}m old`;
  }

  // Compute milestone stats for a child used by both pages to stay in sync
  computeMilestoneStatsForChild(child) {
    const dob = new Date(child.dob);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const vaccinationData = window.vaccinationStorage.getVaccinationData(child.id);
    const completions = vaccinationData.completions || {};
    const stats = this.computeScheduleStats(dob, completions, today);
    return { ageString: this.formatAgeString(dob, today), ...stats };
  }

  computeScheduleStats(dob, completions, today) {
    const dueSoonDays = 30;
    let milestonesCompleted = 0;
    let overdueCount = 0;
    let dueSoonCount = 0;
    let upcomingCount = 0;
    let nextDueLabel = 'All caught up';
    let nextDueDate = null;

    vaccinationSchedule.forEach((item) => {
      const due = this.calcDate(dob, item.age);
      due.setHours(0, 0, 0, 0);

      const completedForAge = completions[item.age] || {};
      const isCompleted = item.vaccines.every((v) => Boolean(completedForAge[v]));
      if (isCompleted) {
        milestonesCompleted += 1;
        return;
      }

      if (due < today) {
        overdueCount += 1;
        return;
      }

      upcomingCount += 1;
      const daysUntil = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
      if (daysUntil <= dueSoonDays) { dueSoonCount += 1; }
      if (!nextDueDate || due < nextDueDate) {
        nextDueDate = due;
        nextDueLabel = `${item.vaccines[0]} - ${due.toLocaleDateString('en-IN')}`;
      }
    });

    return {
      milestonesCompleted,
      totalMilestones: vaccinationSchedule.length,
      overdueCount,
      dueSoonCount,
      upcomingCount,
      nextDueDate,
      nextDueLabel
    };
  }

  // Generate vaccination schedule
  generateSchedule() {
    const nameVal = this.nameInput.value.trim();
    const dobVal = this.dobInput.value;

    // Validate input
    const childData = { name: nameVal, dob: dobVal };
    if (!window.vaccinationValidator.validateChildData(childData)) {
      this.showError(window.vaccinationValidator.formatErrorMessage());
      return;
    }

    this.hideError();
    this.showLoading();

    // Create child object with unique ID
    const child = {
      id: this.generateId(),
      name: nameVal,
      dob: dobVal,
      createdAt: new Date().toISOString()
    };

    // Save to storage
    try {
      window.vaccinationStorage.saveChild(child);
      this.currentChild = child;
    } catch (e) {
      /* eslint-disable-next-line no-console */
      console.error('Error saving child:', e);
      this.hideLoading();
      this.showError('We could not save data. Please check storage availability and try again.');
      return;
    }

    // Update display
    this.childNameDisplay.textContent = nameVal;
    this.childDobDisplay.textContent = new Date(dobVal).toLocaleDateString('en-IN');

    this.editableView.classList.add('hidden');
    this.readOnlyView.classList.remove('hidden');

    this.renderSchedule(new Date(dobVal));
    this.hideLoading();
  }

  // Render the vaccination schedule
  renderSchedule(dobDate) {
    this.scheduleOutput.innerHTML = '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    vaccinationSchedule.forEach(item => {
      const dueDate = this.calcDate(dobDate, item.age);
      dueDate.setHours(0, 0, 0, 0);

      const completionMap = window.vaccinationStorage.getVaccinationData(this.currentChild.id).completions || {};
      const completedForAge = completionMap[item.age] || {};
      const isCompleted = item.vaccines.every(v => Boolean(completedForAge[v]));
      const card = this.createScheduleCard(item, dueDate, today, { isCompleted, completedForAge });
      this.scheduleOutput.appendChild(card);
      this.attachScheduleCardHandlers(card);
      this.setupMarkComplete(card, dueDate, item);
    });
  }

  /* eslint-disable-next-line max-lines-per-function */
  createScheduleCard(item, dueDate, today, state) {
    const { isCompleted, completedForAge } = state;
    let statusClass = 'status-upcoming';
    let statusText = 'Upcoming';
    if (isCompleted) {
      statusClass = 'status-completed';
      statusText = 'Completed';
    } else if (dueDate < today) {
      statusClass = 'status-due';
      statusText = 'Due / Overdue';
    }

    const card = document.createElement('div');
    card.className = 'schedule-card fade-in';
    card.innerHTML = `
      <div class="flex items-center justify-between cursor-pointer">
        <div class="flex items-center gap-2">
          <span class="${statusClass}">${statusText}</span>
          <div>
            <p class="font-semibold text-gray-800 text-base">${item.age}</p>
            <p class="text-xs text-gray-600 due-date ${isCompleted ? 'hidden' : ''}">Due: ${dueDate.toLocaleDateString('en-IN')}</p>
            <p class="text-xs text-gray-600 completed-date ${isCompleted ? '' : 'hidden'}">${isCompleted ? `Completed: ${this.getFirstCompletionDate(completedForAge).toLocaleDateString('en-IN')}` : ''}</p>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <p class="text-xs text-gray-700 whitespace-nowrap hidden sm:block">${item.vaccines.join(', ')}</p>
          <svg class="expand-icon w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
          </svg>
        </div>
      </div>
      <div class="card-details">
        <p class="text-xs text-gray-600 mb-1 detail-due hidden"></p>
        <p class="font-semibold mb-1 text-gray-800">Vaccines to be administered:</p>
        <ul class="list-disc pl-5 mb-2 text-sm text-gray-700">
          ${item.vaccines.map(v => `<li>${v}</li>`).join('')}
        </ul>
        <button class="mark-btn bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs hover:bg-blue-200 transition duration-200 ease-in-out ${isCompleted ? 'hidden' : ''}">
          Mark as Complete
        </button>
        <div class="complete-form mt-2 hidden">
          <input type="date" class="comp-date border text-xs p-1 rounded-md mr-1 outline-none" />
          <button class="save-btn bg-green-600 text-white px-2 py-1 rounded-md text-xs hover:bg-green-700 transition duration-200 ease-in-out shadow-sm">
            Save
          </button>
          <p class="error-text hidden text-xs mt-1">Select a date.</p>
        </div>
      </div>
    `;
    return card;
  }

  attachScheduleCardHandlers(card) {
    card.querySelector('.cursor-pointer').addEventListener('click', () => {
      card.classList.toggle('expanded');
    });
  }

  // Helper to extract earliest completion date from a vaccines map
  getFirstCompletionDate(completedForAge) {
    const dates = Object.values(completedForAge || {})
      .map((d) => new Date(d))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a - b);
    const [first = new Date()] = dates;
    return first;
  }

  // Calculate due date based on age string
  calcDate(base, ageStr) {
    if (!ageStr || typeof ageStr !== 'string') {return new Date(base);}

    const parts = ageStr.split(' ');
    let numStr = parts[0] ?? '';
    const unit = (parts[1] ?? '').toLowerCase();

    // Handle ranges like "6-9 Months"
    if (numStr.includes('-')) {
      [numStr] = numStr.split('-');
    }

    const n = parseInt(numStr, 10) || 0;
    const d = new Date(base);

    if (unit.startsWith('week')) {
      d.setDate(d.getDate() + n * 7);
    } else if (unit.startsWith('month')) {
      d.setMonth(d.getMonth() + n);
    } else if (unit.includes('year')) {
      d.setFullYear(d.getFullYear() + n);
    }

    return d;
  }

  // Setup mark complete functionality
  setupMarkComplete(card, dueDate, scheduleItem) {
    const markBtn = card.querySelector('.mark-btn');
    const form = card.querySelector('.complete-form');
    markBtn.addEventListener('click', () => {
      markBtn.classList.add('hidden');
      form.classList.remove('hidden');
    });
    form.querySelector('.save-btn').addEventListener('click', () => this.handleSaveCompletion(card, form, dueDate, scheduleItem));
  }

  handleSaveCompletion(card, form, dueDate, scheduleItem) {
    const dateInput = form.querySelector('.comp-date');
    const { value: completionDate } = dateInput;

    window.vaccinationValidator.clearErrors();
    if (!window.vaccinationValidator.validateCompletionDate(completionDate, this.currentChild.dob)) {
      const [firstError] = window.vaccinationValidator.getErrors();
      form.querySelector('.error-text').textContent = firstError;
      form.querySelector('.error-text').classList.remove('hidden');
      return;
    }

    form.querySelector('.error-text').classList.add('hidden');
    scheduleItem.vaccines.forEach(vaccine => {
      window.vaccinationStorage.saveVaccinationCompletion(
        this.currentChild.id,
        scheduleItem.age,
        vaccine,
        completionDate
      );
    });

    this.updateCompletionUI(card, form, completionDate, dueDate);

    // Re-render schedule to reflect persistent completion state and sync dashboard
    const currentDob = new Date(this.currentChild.dob);
    this.renderSchedule(currentDob);
    this.renderProfilesDashboard();
  }

  updateCompletionUI(card, form, completionDate, dueDate) {
    const dueEl = card.querySelector('.due-date');
    const compEl = card.querySelector('.completed-date');
    const badge = card.querySelector('span.status-due, span.status-upcoming, span.status-completed');
    const detailDue = card.querySelector('.detail-due');

    const fmt = new Date(completionDate).toLocaleDateString('en-IN');
    dueEl.classList.add('hidden');
    compEl.textContent = `Completed: ${fmt}`;
    compEl.classList.remove('hidden');
    badge.textContent = 'Completed';
    badge.classList.remove('status-due', 'status-upcoming');
    badge.classList.add('status-completed');
    form.classList.add('hidden');
    detailDue.textContent = `Due: ${dueDate.toLocaleDateString('en-IN')}`;
    detailDue.classList.remove('hidden');
  }

  // Cancel edit mode
  cancelEdit() {
    this.editableView.classList.add('hidden');
    this.readOnlyView.classList.remove('hidden');
    this.cancelEditBtn.classList.add('hidden');
  }

  // Edit child information
  editChild() {
    this.readOnlyView.classList.add('hidden');
    this.editableView.classList.remove('hidden');
    this.cancelEditBtn.classList.remove('hidden');

    // Populate form with current data
    if (this.currentChild) {
      this.nameInput.value = this.currentChild.name;
      this.dobInput.value = this.currentChild.dob;
    }
  }

  // Download calendar file
  downloadCalendar() {
    if (!this.currentChild) {
      this.showError('Please generate a schedule first.');
      return;
    }

    const childName = this.currentChild.name;
    const dobDate = new Date(this.currentChild.dob);
    const icsContent = this.generateIcsString(childName, dobDate);

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${childName.replace(/\s+/g, '-')}-vaccination-schedule.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Generate ICS string for calendar
  generateIcsString(childName, dobDate) {
    let icsString = 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//VaccinationTracker//NONSGML v1.0//EN\nCALSCALE:GREGORIAN\n';

    vaccinationSchedule.forEach(item => {
      const dueDate = this.calcDate(dobDate, item.age);
      const formattedDate = dueDate.toISOString().slice(0, 10).replace(/-/g, '');
      const endDate = new Date(dueDate);
      endDate.setDate(endDate.getDate() + 1);
      const formattedEndDate = endDate.toISOString().slice(0, 10).replace(/-/g, '');
      const [now] = new Date().toISOString().replace(/[-:]/g, '').split('.');

      item.vaccines.forEach(vaccine => {
        const summary = `${childName} - ${vaccine}`;
        icsString += 'BEGIN:VEVENT\n';
        const uid = `${now}-${Math.random().toString(36).substring(2, 9)}`;
        icsString += `UID:${uid}\n`;
        icsString += `DTSTAMP:${now}Z\n`;
        icsString += `DTSTART;VALUE=DATE:${formattedDate}\n`;
        icsString += `DTEND;VALUE=DATE:${formattedEndDate}\n`;
        icsString += `SUMMARY:${summary}\n`;
        icsString += `DESCRIPTION:Vaccination for ${childName}. This is due around the ${item.age} milestone.\n`;
        icsString += 'END:VEVENT\n';
      });
    });

    icsString += 'END:VCALENDAR';
    return icsString;
  }

  // Generate unique ID
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Show error message
  showError(message) {
    this.errorMsg.textContent = message;
    this.errorMsg.classList.remove('hidden');
  }

  // Hide error message
  hideError() {
    this.errorMsg.classList.add('hidden');
  }

  // Show loading spinner
  showLoading() {
    this.loadingSpinner.classList.remove('hidden');
  }

  // Hide loading spinner
  hideLoading() {
    this.loadingSpinner.classList.add('hidden');
  }
}

// Make class available on global objects for test and browser environments
if (typeof global !== 'undefined') {
  global.VaccinationTracker = VaccinationTracker;
}
if (typeof window !== 'undefined') {
  window.VaccinationTracker = VaccinationTracker;
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new VaccinationTracker();
});

// Register service worker for PWA functionality (skip on localhost/dev)
if ('serviceWorker' in navigator) {
  const isLocalhost = ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
  if (!isLocalhost) {
    window.addEventListener('load', () => {
      // Use relative path to work under subpaths too
      navigator.serviceWorker.register('./sw.js')
        .then(registration => {
          /* eslint-disable-next-line no-console */
          console.info('SW registered: ', registration);
        })
        .catch(registrationError => {
          /* eslint-disable-next-line no-console */
          console.warn('SW registration failed: ', registrationError);
        });
    });
  }
}
