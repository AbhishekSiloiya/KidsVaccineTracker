// Local Storage Management for VaccinationTracker

class VaccinationStorage {
  constructor() {
    this.storageKey = 'vaccinationTrackerData';
    this.childrenKey = 'vaccinationChildren';
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
    
    localStorage.setItem(this.childrenKey, JSON.stringify(children));
  }

  // Get all children
  getAllChildren() {
    const children = localStorage.getItem(this.childrenKey);
    return children ? JSON.parse(children) : [];
  }

  // Get child by ID
  getChild(childId) {
    const children = this.getAllChildren();
    return children.find(child => child.id === childId);
  }

  // Delete child
  deleteChild(childId) {
    const children = this.getAllChildren();
    const filteredChildren = children.filter(child => child.id !== childId);
    localStorage.setItem(this.childrenKey, JSON.stringify(filteredChildren));
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
    localStorage.setItem(key, JSON.stringify(data));
  }

  // Get vaccination data for a child
  getVaccinationData(childId) {
    const key = `${this.storageKey}_${childId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : { completions: {} };
  }

  // Clear all data
  clearAllData() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith(this.storageKey) || key === this.childrenKey) {
        localStorage.removeItem(key);
      }
    });
  }

  // Export data as JSON
  exportData() {
    const children = this.getAllChildren();
    const exportData = {
      children: children,
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
        localStorage.setItem(this.childrenKey, JSON.stringify(data.children));
      }
      
      if (data.vaccinationData) {
        Object.keys(data.vaccinationData).forEach(childId => {
          const key = `${this.storageKey}_${childId}`;
          localStorage.setItem(key, JSON.stringify(data.vaccinationData[childId]));
        });
      }
      
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

// Initialize storage instance
const vaccinationStorage = new VaccinationStorage(); 