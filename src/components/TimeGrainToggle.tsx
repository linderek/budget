import React from 'react';
import { Calendar, BarChart3, TrendingUp } from 'lucide-react';

interface TimeGrainToggleProps {
  timeGrain: 'monthly' | 'half-year' | 'whole-year';
  onTimeGrainChange: (timeGrain: 'monthly' | 'half-year' | 'whole-year') => void;
}

export const TimeGrainToggle: React.FC<TimeGrainToggleProps> = ({
  timeGrain,
  onTimeGrainChange
}) => {
  React.useEffect(() => {
    // Persist user preference
    localStorage.setItem('budgetTracker_timeGrain', timeGrain);
  }, [timeGrain]);

  return (
    <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
      <span className="text-sm font-medium text-gray-700 px-2">Time Grain:</span>
      <button
        onClick={() => onTimeGrainChange('half-year')}
        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          timeGrain === 'half-year'
            ? 'bg-white text-blue-700 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onTimeGrainChange('half-year');
          }
        }}
      >
        <BarChart3 className="w-4 h-4" />
        <span>Half-Year</span>
      </button>
      <button
        onClick={() => onTimeGrainChange('whole-year')}
        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          timeGrain === 'whole-year'
            ? 'bg-white text-blue-700 shadow-sm'
            : 'text-gray-600 hover:text-gray-900'
        }`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onTimeGrainChange('whole-year');
          }
        }}
      >
        <TrendingUp className="w-4 h-4" />
        <span>Whole Year</span>
      </button>
    </div>
  );
};