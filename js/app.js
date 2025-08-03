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
    this.childNameDisplay = document.getElementById('childNameDisplay');
    this.childDobDisplay = document.getElementById('childDobDisplay');
    this.editBtn = document.getElementById('editBtn');
    this.loadingSpinner = document.getElementById('loadingSpinner');
  }

  // Bind event listeners
  bindEvents() {
    this.generateBtn.addEventListener('click', () => this.generateSchedule());
    this.cancelEditBtn.addEventListener('click', () => this.cancelEdit());
    this.editBtn.addEventListener('click', () => this.editChild());
    this.downloadCalendarBtn.addEventListener('click', () => this.downloadCalendar());
    
    // Add keyboard support
    this.nameInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.generateSchedule();
    });
    this.dobInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.generateSchedule();
    });
  }

  // Load saved data on page load
  loadSavedData() {
    const children = vaccinationStorage.getAllChildren();
    if (children.length > 0) {
      // Load the most recent child
      const lastChild = children[children.length - 1];
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

  // Generate vaccination schedule
  generateSchedule() {
    const nameVal = this.nameInput.value.trim();
    const dobVal = this.dobInput.value;
    
    // Validate input
    const childData = { name: nameVal, dob: dobVal };
    if (!vaccinationValidator.validateChildData(childData)) {
      this.showError(vaccinationValidator.formatErrorMessage());
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
    vaccinationStorage.saveChild(child);
    this.currentChild = child;
    
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
      
      const isPast = dueDate < today;
      const statusClass = isPast ? 'status-due' : 'status-upcoming';
      const statusText = isPast ? 'Due / Overdue' : 'Upcoming';
      
      const card = document.createElement('div');
      card.className = 'schedule-card fade-in';
      
      card.innerHTML = `
        <div class="flex items-center justify-between cursor-pointer">
          <div class="flex items-center gap-2">
            <span class="${statusClass}">${statusText}</span>
            <div>
              <p class="font-semibold text-gray-800 text-base">${item.age}</p>
              <p class="text-xs text-gray-600 due-date">Due: ${dueDate.toLocaleDateString('en-IN')}</p>
              <p class="text-xs text-gray-600 completed-date hidden"></p>
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
          <button class="mark-btn bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs hover:bg-blue-200 transition duration-200 ease-in-out">
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
      
      this.scheduleOutput.appendChild(card);
      
      // Add event listeners
      card.querySelector('.cursor-pointer').addEventListener('click', () => {
        card.classList.toggle('expanded');
      });
      
      this.setupMarkComplete(card, dueDate, item);
    });
  }

  // Calculate due date based on age string
  calcDate(base, ageStr) {
    if (!ageStr || typeof ageStr !== 'string') return new Date(base);
    
    const parts = ageStr.split(' ');
    let numStr = parts[0];
    let unit = parts.length > 1 ? parts[1].toLowerCase() : '';
    
    // Handle ranges like "6-9 Months"
    if (numStr.includes('-')) {
      numStr = numStr.split('-')[0];
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
    const dueEl = card.querySelector('.due-date');
    const compEl = card.querySelector('.completed-date');
    const badge = card.querySelector('span.status-due, span.status-upcoming, span.status-completed');
    const detailDue = card.querySelector('.detail-due');

    markBtn.addEventListener('click', () => {
      markBtn.classList.add('hidden');
      form.classList.remove('hidden');
    });

    form.querySelector('.save-btn').addEventListener('click', () => {
      const dateInput = form.querySelector('.comp-date');
      const completionDate = dateInput.value;
      
      if (!vaccinationValidator.validateCompletionDate(completionDate, this.currentChild.dob)) {
        form.querySelector('.error-text').textContent = vaccinationValidator.getErrors()[0];
        form.querySelector('.error-text').classList.remove('hidden');
        return;
      }
      
      form.querySelector('.error-text').classList.add('hidden');
      
      // Save completion data
      scheduleItem.vaccines.forEach(vaccine => {
        vaccinationStorage.saveVaccinationCompletion(
          this.currentChild.id,
          scheduleItem.age,
          vaccine,
          completionDate
        );
      });
      
      const fmt = new Date(completionDate).toLocaleDateString('en-IN');
      
      // Update display
      dueEl.classList.add('hidden');
      compEl.textContent = `Completed: ${fmt}`;
      compEl.classList.remove('hidden');
      badge.textContent = 'Completed';
      badge.classList.remove('status-due', 'status-upcoming');
      badge.classList.add('status-completed');
      form.classList.add('hidden');
      
      detailDue.textContent = `Due: ${dueDate.toLocaleDateString('en-IN')}`;
      detailDue.classList.remove('hidden');
    });
  }

  // Cancel edit mode
  cancelEdit() {
    this.editableView.classList.add('hidden');
    this.readOnlyView.classList.remove('hidden');
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
      alert('Please generate a schedule first.');
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
    let icsString = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//VaccinationTracker//NONSGML v1.0//EN\nCALSCALE:GREGORIAN\n`;
    
    vaccinationSchedule.forEach(item => {
      const dueDate = this.calcDate(dobDate, item.age);
      const formattedDate = dueDate.toISOString().slice(0, 10).replace(/-/g, '');
      const endDate = new Date(dueDate);
      endDate.setDate(endDate.getDate() + 1);
      const formattedEndDate = endDate.toISOString().slice(0, 10).replace(/-/g, '');
      const now = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
      const uniqueId = `${now}-${Math.random().toString(36).substring(2, 9)}`;

      item.vaccines.forEach(vaccine => {
        const summary = `${childName} - ${vaccine}`;
        icsString += `BEGIN:VEVENT\n`;
        icsString += `UID:${uniqueId}\n`;
        icsString += `DTSTAMP:${now}Z\n`;
        icsString += `DTSTART;VALUE=DATE:${formattedDate}\n`;
        icsString += `DTEND;VALUE=DATE:${formattedEndDate}\n`;
        icsString += `SUMMARY:${summary}\n`;
        icsString += `DESCRIPTION:Vaccination for ${childName}. This is due around the ${item.age} milestone.\n`;
        icsString += `END:VEVENT\n`;
      });
    });
    
    icsString += `END:VCALENDAR`;
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

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new VaccinationTracker();
});

// Register service worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('SW registered: ', registration);
      })
      .catch(registrationError => {
        console.log('SW registration failed: ', registrationError);
      });
  });
} 