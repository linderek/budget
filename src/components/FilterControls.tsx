import React from 'react';
import { Filter, Download, Upload, Plus, X } from 'lucide-react';
import { FilterOptions, TEAM_LIST, CATEGORY_LIST } from '../types/budget';

interface FilterControlsProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  onUpload: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  onAddCategory: () => void;
}

export const FilterControls: React.FC<FilterControlsProps> = ({
  filters,
  onFilterChange,
  onUpload,
  onExportPDF,
  onExportExcel,
  onAddCategory
}) => {
  const handleTeamChange = (team: string) => {
    const newTeams = filters.teams.includes(team)
      ? filters.teams.filter(t => t !== team)
      : [...filters.teams, team];
    onFilterChange({ ...filters, teams: newTeams });
  };

  const handleCategoryChange = (category: string) => {
    const newCategories = filters.categories.includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...filters.categories, category];
    onFilterChange({ ...filters, categories: newCategories });
  };

  const clearTeamFilters = () => {
    onFilterChange({ ...filters, teams: [] });
  };

  const clearCategoryFilters = () => {
    onFilterChange({ ...filters, categories: [] });
  };

  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <div className="space-y-6">
        {/* Filter Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-lg font-semibold text-gray-900">Filters</span>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onAddCategory}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
            
            <button
              onClick={onUpload}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Data</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                onClick={onExportPDF}
                className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span>PDF</span>
              </button>
              
              <button
                onClick={onExportExcel}
                className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors text-sm"
              >
                <Download className="w-4 h-4" />
                <span>Excel</span>
              </button>
            </div>
          </div>
        </div>

        {/* Month Range Filter */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Month</label>
            <input
              type="month"
              value={filters.monthRange.start}
              onChange={(e) => onFilterChange({ 
                ...filters, 
                monthRange: { ...filters.monthRange, start: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Month</label>
            <input
              type="month"
              value={filters.monthRange.end}
              onChange={(e) => onFilterChange({ 
                ...filters, 
                monthRange: { ...filters.monthRange, end: e.target.value }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Team Filter */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Teams</label>
            {filters.teams.length > 0 && (
              <button
                onClick={clearTeamFilters}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <X className="w-3 h-3" />
                <span>Clear all</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {TEAM_LIST.map(team => (
              <button
                key={team}
                onClick={() => handleTeamChange(team)}
                className={`px-3 py-1 rounded-full text-sm transition-colors ${
                  filters.teams.includes(team)
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {team}
              </button>
            ))}
          </div>
          {filters.teams.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              {filters.teams.length} team{filters.teams.length !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        {/* Category Filter */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-700">Categories</label>
            {filters.categories.length > 0 && (
              <button
                onClick={clearCategoryFilters}
                className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
              >
                <X className="w-3 h-3" />
                <span>Clear all</span>
              </button>
            )}
          </div>
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
            <div className="space-y-2">
              {CATEGORY_LIST.map(category => (
                <label key={category} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.categories.includes(category)}
                    onChange={() => handleCategoryChange(category)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{category}</span>
                </label>
              ))}
            </div>
          </div>
          {filters.categories.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              {filters.categories.length} categor{filters.categories.length !== 1 ? 'ies' : 'y'} selected
            </p>
          )}
        </div>
      </div>
    </div>
  );
};