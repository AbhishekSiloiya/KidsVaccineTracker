// Unit tests for storage.js

describe('VaccinationStorage', () => {
  let storage;

  beforeEach(() => {
    storage = new VaccinationStorage();
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('saveChild', () => {
    test('should save a new child to localStorage', () => {
      const childData = {
        id: 'child-1',
        name: 'John Doe',
        dob: '2023-01-01',
        createdAt: '2024-01-01T00:00:00.000Z'
      };

      storage.saveChild(childData);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'vaccinationChildren',
        JSON.stringify([childData])
      );
    });

    test('should update existing child in localStorage', () => {
      const existingChild = {
        id: 'child-1',
        name: 'John Doe',
        dob: '2023-01-01'
      };

      const updatedChild = {
        id: 'child-1',
        name: 'John Smith',
        dob: '2023-01-01'
      };

      // Save initial child
      storage.saveChild(existingChild);

      // Update child
      storage.saveChild(updatedChild);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'vaccinationChildren',
        JSON.stringify([updatedChild])
      );
    });

    test('should add multiple children to localStorage', () => {
      const child1 = { id: 'child-1', name: 'John', dob: '2023-01-01' };
      const child2 = { id: 'child-2', name: 'Jane', dob: '2023-06-01' };

      storage.saveChild(child1);
      storage.saveChild(child2);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'vaccinationChildren',
        JSON.stringify([child1, child2])
      );
    });
  });

  describe('getAllChildren', () => {
    test('should return empty array when no children exist', () => {
      const children = storage.getAllChildren();
      expect(children).toEqual([]);
    });

    test('should return all children from localStorage', () => {
      const mockChildren = [
        { id: 'child-1', name: 'John', dob: '2023-01-01' },
        { id: 'child-2', name: 'Jane', dob: '2023-06-01' }
      ];

      expect(jest.isMockFunction(localStorage.getItem)).toBe(true);
      localStorage.getItem.mockReturnValue(JSON.stringify(mockChildren));

      const children = storage.getAllChildren();
      expect(children).toEqual(mockChildren);
    });

    test('should handle invalid JSON in localStorage', () => {
      expect(jest.isMockFunction(localStorage.getItem)).toBe(true);
      localStorage.getItem.mockReturnValue('invalid-json');

      const children = storage.getAllChildren();
      expect(children).toEqual([]);
    });
  });

  describe('getChild', () => {
    test('should return child by ID', () => {
      const mockChildren = [
        { id: 'child-1', name: 'John', dob: '2023-01-01' },
        { id: 'child-2', name: 'Jane', dob: '2023-06-01' }
      ];

      expect(jest.isMockFunction(localStorage.getItem)).toBe(true);
      localStorage.getItem.mockReturnValue(JSON.stringify(mockChildren));

      const child = storage.getChild('child-1');
      expect(child).toEqual(mockChildren[0]);
    });

    test('should return undefined for non-existent child', () => {
      const mockChildren = [
        { id: 'child-1', name: 'John', dob: '2023-01-01' }
      ];

      expect(jest.isMockFunction(localStorage.getItem)).toBe(true);
      localStorage.getItem.mockReturnValue(JSON.stringify(mockChildren));

      const child = storage.getChild('non-existent');
      expect(child).toBeUndefined();
    });
  });

  describe('deleteChild', () => {
    test('should remove child from localStorage', () => {
      const mockChildren = [
        { id: 'child-1', name: 'John', dob: '2023-01-01' },
        { id: 'child-2', name: 'Jane', dob: '2023-06-01' }
      ];

      expect(jest.isMockFunction(localStorage.getItem)).toBe(true);
      localStorage.getItem.mockReturnValue(JSON.stringify(mockChildren));

      storage.deleteChild('child-1');

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'vaccinationChildren',
        JSON.stringify([mockChildren[1]])
      );
    });

    test('should handle deleting non-existent child', () => {
      const mockChildren = [
        { id: 'child-1', name: 'John', dob: '2023-01-01' }
      ];

      expect(jest.isMockFunction(localStorage.getItem)).toBe(true);
      localStorage.getItem.mockReturnValue(JSON.stringify(mockChildren));

      storage.deleteChild('non-existent');

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'vaccinationChildren',
        JSON.stringify(mockChildren)
      );
    });
  });

  describe('saveVaccinationCompletion', () => {
    test('should save vaccination completion data', () => {
      const childId = 'child-1';
      const age = 'Birth';
      const vaccine = 'BCG';
      const completionDate = '2023-01-01';

      storage.saveVaccinationCompletion(childId, age, vaccine, completionDate);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'vaccinationTrackerData_child-1',
        JSON.stringify({
          completions: {
            [age]: {
              [vaccine]: completionDate
            }
          }
        })
      );
    });

    test('should update existing vaccination data', () => {
      const childId = 'child-1';
      const existingData = {
        completions: {
          'Birth': {
            'BCG': '2023-01-01'
          }
        }
      };

      expect(jest.isMockFunction(localStorage.getItem)).toBe(true);
      localStorage.getItem.mockReturnValue(JSON.stringify(existingData));

      storage.saveVaccinationCompletion(childId, 'Birth', 'OPV 0', '2023-01-02');

      const expectedData = {
        completions: {
          'Birth': {
            'BCG': '2023-01-01',
            'OPV 0': '2023-01-02'
          }
        }
      };

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'vaccinationTrackerData_child-1',
        JSON.stringify(expectedData)
      );
    });
  });

  describe('getVaccinationData', () => {
    test('should return vaccination data for child', () => {
      const childId = 'child-1';
      const mockData = {
        completions: {
          'Birth': {
            'BCG': '2023-01-01'
          }
        }
      };

      expect(jest.isMockFunction(localStorage.getItem)).toBe(true);
      localStorage.getItem.mockReturnValue(JSON.stringify(mockData));

      const data = storage.getVaccinationData(childId);
      expect(data).toEqual(mockData);
    });

    test('should return empty completions object when no data exists', () => {
      const childId = 'child-1';
      expect(jest.isMockFunction(localStorage.getItem)).toBe(true);
      localStorage.getItem.mockReturnValue(null);

      const data = storage.getVaccinationData(childId);
      expect(data).toEqual({ completions: {} });
    });

    test('should handle invalid JSON in vaccination data', () => {
      const childId = 'child-1';
      expect(jest.isMockFunction(localStorage.getItem)).toBe(true);
      localStorage.getItem.mockReturnValue('invalid-json');

      const data = storage.getVaccinationData(childId);
      expect(data).toEqual({ completions: {} });
    });
  });

  describe('clearAllData', () => {
    test('should clear all vaccination tracker data', () => {
      // Mock localStorage keys
      Object.defineProperty(localStorage, 'length', { value: 3 });
      expect(jest.isMockFunction(localStorage.key)).toBe(true);
      localStorage.key.mockImplementation((index) => {
        const keys = ['vaccinationTrackerData_child-1', 'vaccinationChildren', 'other-data'];
        return keys[index];
      });

      storage.clearAllData();

      expect(localStorage.removeItem).toHaveBeenCalledWith('vaccinationTrackerData_child-1');
      expect(localStorage.removeItem).toHaveBeenCalledWith('vaccinationChildren');
      expect(localStorage.removeItem).not.toHaveBeenCalledWith('other-data');
    });
  });

  describe('exportData', () => {
    test('should export all data as JSON string', () => {
      const mockChildren = [
        { id: 'child-1', name: 'John', dob: '2023-01-01' }
      ];

      const mockVaccinationData = {
        completions: {
          'Birth': {
            'BCG': '2023-01-01'
          }
        }
      };

      expect(jest.isMockFunction(localStorage.getItem)).toBe(true);
      localStorage.getItem
        .mockReturnValueOnce(JSON.stringify(mockChildren))
        .mockReturnValueOnce(JSON.stringify(mockVaccinationData));

      const exportedData = storage.exportData();

      const expectedData = {
        children: mockChildren,
        vaccinationData: {
          'child-1': mockVaccinationData
        }
      };

      expect(exportedData).toBe(JSON.stringify(expectedData, null, 2));
    });

    test('should handle empty data export', () => {
      expect(jest.isMockFunction(localStorage.getItem)).toBe(true);
      localStorage.getItem.mockReturnValue(null);

      const exportedData = storage.exportData();

      const expectedData = {
        children: [],
        vaccinationData: {}
      };

      expect(exportedData).toBe(JSON.stringify(expectedData, null, 2));
    });
  });

  describe('importData', () => {
    test('should import valid JSON data', () => {
      const importData = {
        children: [
          { id: 'child-1', name: 'John', dob: '2023-01-01' }
        ],
        vaccinationData: {
          'child-1': {
            completions: {
              'Birth': {
                'BCG': '2023-01-01'
              }
            }
          }
        }
      };

      const result = storage.importData(JSON.stringify(importData));

      expect(result).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'vaccinationChildren',
        JSON.stringify(importData.children)
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'vaccinationTrackerData_child-1',
        JSON.stringify(importData.vaccinationData['child-1'])
      );
    });

    test('should handle invalid JSON data', () => {
      const result = storage.importData('invalid-json');

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalled();
    });

    test('should handle missing children data', () => {
      const importData = {
        vaccinationData: {
          'child-1': { completions: {} }
        }
      };

      const result = storage.importData(JSON.stringify(importData));

      expect(result).toBe(true);
      expect(localStorage.setItem).not.toHaveBeenCalledWith(
        'vaccinationChildren',
        expect.any(String)
      );
    });

    test('should handle missing vaccination data', () => {
      const importData = {
        children: [
          { id: 'child-1', name: 'John', dob: '2023-01-01' }
        ]
      };

      const result = storage.importData(JSON.stringify(importData));

      expect(result).toBe(true);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'vaccinationChildren',
        JSON.stringify(importData.children)
      );
    });
  });
}); 