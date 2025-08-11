// Local Storage Management for VaccinationTracker

class VaccinationStorage {
  constructor() {
    this.storageKey = 'vaccinationTrackerData';
    this.childrenKey = 'vaccinationChildren';
  }

  // Select the localStorage implementation (prefer test mock on global)
  getLocalStorage() {
    if (typeof global !== 'undefined' && global.localStorage) {
      return global.localStorage;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    return localStorage;
  }

  // Save child data
  saveChild(childData) {
    const children = this.getAllChildren();
    const existingIndex = children.findIndex(child => child.id === childData.id);

    if (existingIndex >= 0) {
      children[existingIndex] = childData;
    } else {
      children.push(childData);
    }

    const ls = this.getLocalStorage();
    ls.setItem(this.childrenKey, JSON.stringify(children));
  }

  // Get all children
  getAllChildren() {
    const ls = this.getLocalStorage();
    const raw = ls.getItem(this.childrenKey);
    if (!raw) {return [];}
    try {
      return JSON.parse(raw);
    } catch (e) {
      /* eslint-disable-next-line no-console */
      console.error('Invalid children JSON in storage:', e);
      return [];
    }
  }

  // Get child by ID
  getChild(childId) {
    const children = this.getAllChildren();
    return children.find(child => child.id === childId);
  }

  // Delete child (optionally including vaccination data)
  deleteChild(childId, options = { includeVaccinationData: false }) {
    const children = this.getAllChildren();
    const filteredChildren = children.filter(child => child.id !== childId);
    const ls = this.getLocalStorage();
    ls.setItem(this.childrenKey, JSON.stringify(filteredChildren));

    if (options.includeVaccinationData) {
      const key = `${this.storageKey}_${childId}`;
      ls.removeItem(key);
    }
  }

  // Save vaccination completion data
  saveVaccinationCompletion(childId, age, vaccine, completionDate) {
    const key = `${this.storageKey}_${childId}`;
    const data = this.getVaccinationData(childId);

    if (!data.completions) {
      data.completions = {};
    }

    if (!data.completions[age]) {
      data.completions[age] = {};
    }

    data.completions[age][vaccine] = completionDate;
    const ls = this.getLocalStorage();
    ls.setItem(key, JSON.stringify(data));
  }

  // Get vaccination data for a child
  getVaccinationData(childId) {
    const key = `${this.storageKey}_${childId}`;
    const ls = this.getLocalStorage();
    const raw = ls.getItem(key);
    if (!raw) {return { completions: {} };}
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : { completions: {} };
    } catch (e) {
      /* eslint-disable-next-line no-console */
      console.error('Invalid vaccination JSON in storage:', e);
      return { completions: {} };
    }
  }

  // Clear all data
  clearAllData() {
    const ls = this.getLocalStorage();
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i);
      if (key && (key.startsWith(this.storageKey) || key === this.childrenKey)) {
        ls.removeItem(key);
      }
    }
  }

  // Export data as JSON
  exportData() {
    const children = this.getAllChildren();
    const exportData = {
      children,
      vaccinationData: {}
    };

    children.forEach(child => {
      exportData.vaccinationData[child.id] = this.getVaccinationData(child.id);
    });

    return JSON.stringify(exportData, null, 2);
  }

  // Import data from JSON
  importData(jsonData) {
    try {
      const data = JSON.parse(jsonData);

      if (data.children) {
        const ls = this.getLocalStorage();
        ls.setItem(this.childrenKey, JSON.stringify(data.children));
      }

      if (data.vaccinationData) {
        const ls = this.getLocalStorage();
        Object.keys(data.vaccinationData).forEach(childId => {
          const key = `${this.storageKey}_${childId}`;
          ls.setItem(key, JSON.stringify(data.vaccinationData[childId]));
        });
      }

      return true;
    } catch (error) {
      /* eslint-disable-next-line no-console */
      console.error('Error importing data:', error);
      return false;
    }
  }
}

// Expose class and instance globally for browser usage
if (typeof window !== 'undefined') {
  window.VaccinationStorage = VaccinationStorage;
  window.vaccinationStorage = new VaccinationStorage();
}

// CommonJS export for Jest/node environment
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { VaccinationStorage };
}
