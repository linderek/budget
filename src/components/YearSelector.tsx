import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, X, Plus } from 'lucide-react';

interface YearSelectorProps {
  availableYears: number[];
  selectedYears: number[];
  onYearsChange: (years: number[]) => void;
}

export const YearSelector: React.FC<YearSelectorProps> = ({
  availableYears,
  selectedYears,
  onYearsChange
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sortedYears = [...availableYears].sort((a, b) => b - a);

  const handleYearToggle = (year: number) => {
    if (selectedYears.includes(year)) {
      onYearsChange(selectedYears.filter(y => y !== year));
    } else {
      onYearsChange([...selectedYears, year].sort((a, b) => a - b));
    }
  };

  const handleManualInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const year = parseInt(inputValue);
      if (year >= 2020 && year <= 2050 && !selectedYears.includes(year)) {
        onYearsChange([...selectedYears, year].sort((a, b) => a - b));
        setInputValue('');
      }
    }
  };

  const addManualYear = () => {
    const year = parseInt(inputValue);
    if (year >= 2020 && year <= 2050 && !selectedYears.includes(year)) {
      onYearsChange([...selectedYears, year].sort((a, b) => a - b));
      setInputValue('');
    }
  };

  const clearAll = () => {
    onYearsChange([]);
  };

  const getDisplayText = () => {
    if (selectedYears.length === 0) return 'Select years...';
    if (selectedYears.length > 3) {
      return `${selectedYears.length} years selected`;
    }
    return selectedYears.sort((a, b) => a - b).join(', ');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 mb-2">Years</label>
      
      {/* Selected years chips */}
      {selectedYears.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {selectedYears.length <= 10 ? (
            selectedYears.sort((a, b) => a - b).map(year => (
              <span
                key={year}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              >
                {year}
                <button
                  onClick={() => handleYearToggle(year)}
                  className="ml-1 hover:text-blue-600"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            <span
              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
              title={selectedYears.sort((a, b) => a - b).join(', ')}
            >
              {selectedYears.length} years selected
              <button
                onClick={clearAll}
                className="ml-1 hover:text-blue-600"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {selectedYears.length <= 10 && (
            <button
              onClick={clearAll}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1"
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* Dropdown trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-left flex items-center justify-between"
      >
        <span className="text-sm text-gray-700">{getDisplayText()}</span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown content */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Manual input */}
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <input
                type="number"
                min="2020"
                max="2030"
                max="2050"
                placeholder="2024"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleManualInput}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={addManualYear}
                disabled={!inputValue || parseInt(inputValue) < 2020 || parseInt(inputValue) > 2050 || selectedYears.includes(parseInt(inputValue))}
                className="flex items-center space-x-1 px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">Enter year (2020-2050) and press Enter or click Add</p>
          </div>

          {/* Available years */}
          <div className="p-3">
            <div className="max-h-48 overflow-y-auto">
              <div className="grid grid-cols-4 gap-2">
                {sortedYears.map(year => (
                  <button
                    key={year}
                    onClick={() => handleYearToggle(year)}
                    className={`px-3 py-2 text-sm rounded transition-colors ${
                      selectedYears.includes(year)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};