// Form validation for VaccinationTracker

class VaccinationValidator {
  constructor() {
    this.errors = [];
  }

  // Validate child name
  validateName(name) {
    if (!name || name.trim().length === 0) {
      this.errors.push('Child name is required');
      return false;
    }
    
    if (name.trim().length < 2) {
      this.errors.push('Child name must be at least 2 characters long');
      return false;
    }
    
    if (name.trim().length > 50) {
      this.errors.push('Child name must be less than 50 characters');
      return false;
    }
    
    // Check for valid characters (letters, spaces, hyphens, apostrophes)
    const nameRegex = /^[a-zA-Z\s\-']+$/;
    if (!nameRegex.test(name.trim())) {
      this.errors.push('Child name can only contain letters, spaces, hyphens, and apostrophes');
      return false;
    }
    
    return true;
  }

  // Validate date of birth
  validateDateOfBirth(dob) {
    if (!dob) {
      this.errors.push('Date of birth is required');
      return false;
    }
    
    const dobDate = new Date(dob);
    const today = new Date();
    
    if (isNaN(dobDate.getTime())) {
      this.errors.push('Please enter a valid date of birth');
      return false;
    }
    
    if (dobDate > today) {
      this.errors.push('Date of birth cannot be in the future');
      return false;
    }
    
    // Check if child is not older than 18 years
    const ageInYears = (today - dobDate) / (1000 * 60 * 60 * 24 * 365.25);
    if (ageInYears > 18) {
      this.errors.push('This tracker is designed for children under 18 years');
      return false;
    }
    
    return true;
  }

  // Validate completion date
  validateCompletionDate(completionDate, dob) {
    if (!completionDate) {
      this.errors.push('Completion date is required');
      return false;
    }
    
    const completionDateObj = new Date(completionDate);
    const dobDate = new Date(dob);
    const today = new Date();
    
    if (isNaN(completionDateObj.getTime())) {
      this.errors.push('Please enter a valid completion date');
      return false;
    }
    
    if (completionDateObj < dobDate) {
      this.errors.push('Completion date cannot be before date of birth');
      return false;
    }
    
    if (completionDateObj > today) {
      this.errors.push('Completion date cannot be in the future');
      return false;
    }
    
    return true;
  }

  // Get all errors
  getErrors() {
    return this.errors;
  }

  // Clear errors
  clearErrors() {
    this.errors = [];
  }

  // Validate complete child data
  validateChildData(childData) {
    this.clearErrors();
    
    const isNameValid = this.validateName(childData.name);
    const isDobValid = this.validateDateOfBirth(childData.dob);
    
    return isNameValid && isDobValid;
  }

  // Format error message for display
  formatErrorMessage() {
    if (this.errors.length === 0) return '';
    
    if (this.errors.length === 1) {
      return this.errors[0];
    }
    
    return 'Please fix the following errors:\n' + this.errors.join('\n');
  }
}

// Initialize validator instance
const vaccinationValidator = new VaccinationValidator(); 