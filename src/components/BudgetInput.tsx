import React, { useState } from 'react';
import { Plus, Copy, Save, Trash2, AlertCircle, Search, X, Upload } from 'lucide-react';
import { Budget, CATEGORY_LIST, TEAM_LIST } from '../types/budget';
import { formatCurrency } from '../utils/budgetCalculations';
import { BudgetUploadModal } from './BudgetUploadModal';

interface BudgetInputProps {
  budgets: Budget[];
  onAddBudget: (budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateBudget: (id: string, budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteBudget: (id: string) => void;
  onDuplicateYear: (fromYear: number, toYear: number) => void;
}

interface FormData {
  year: number;
  team: string[];
  category: string;
  h1Budget: number;
  h2Budget: number;
  notes: string;
}

interface FormErrors {
  [key: string]: string;
}

export const BudgetInput: React.FC<BudgetInputProps> = ({
  budgets,
  onAddBudget,
  onUpdateBudget,
  onDeleteBudget,
  onDuplicateYear
}) => {
  const [formData, setFormData] = useState<FormData>({
    year: new Date().getFullYear(),
    team: [],
    category: '',
    h1Budget: 0,
    h2Budget: 0,
    notes: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [duplicateFromYear, setDuplicateFromYear] = useState<number>(new Date().getFullYear() - 1);
  const [duplicateToYear, setDuplicateToYear] = useState<number>(new Date().getFullYear());
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Reset page when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.year || formData.year < 2020 || formData.year > 2030) {
      newErrors.year = 'Year must be between 2020 and 2030';
    }
    if (formData.team.length === 0) {
      newErrors.team = 'At least one team must be selected';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (formData.h1Budget < 0) {
      newErrors.h1Budget = 'H1 Budget cannot be negative';
    }
    if (formData.h2Budget < 0) {
      newErrors.h2Budget = 'H2 Budget cannot be negative';
    }
    if ((formData.h1Budget || 0) === 0 && (formData.h2Budget || 0) === 0) {
      newErrors.h1Budget = 'At least one budget amount must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const budgetData = {
        ...formData,
        annualBudget: formData.h1Budget + formData.h2Budget
      };

      if (editingId) {
        onUpdateBudget(editingId, budgetData);
        setEditingId(null);
      } else {
        onAddBudget(budgetData);
      }

      setFormData({
        year: new Date().getFullYear(),
        team: [],
        category: '',
        h1Budget: 0,
        h2Budget: 0,
        notes: ''
      });
      setErrors({});
    }
  };

  const handleEdit = (budget: Budget) => {
    setFormData({
      year: budget.year,
      team: budget.team,
      category: budget.category,
      h1Budget: budget.h1Budget,
      h2Budget: budget.h2Budget,
      notes: budget.notes
    });
    setEditingId(budget.id);
  };

  const handleCancel = () => {
    setFormData({
      year: new Date().getFullYear(),
      team: [],
      category: '',
      h1Budget: 0,
      h2Budget: 0,
      notes: ''
    });
    setEditingId(null);
    setErrors({});
  };

  const handleTeamToggle = (team: string) => {
    const newTeams = formData.team.includes(team)
      ? formData.team.filter(t => t !== team)
      : [...formData.team, team];
    setFormData(prev => ({ ...prev, team: newTeams }));
  };

  const handleDuplicate = () => {
    if (duplicateFromYear && duplicateToYear && duplicateFromYear !== duplicateToYear) {
      onDuplicateYear(duplicateFromYear, duplicateToYear);
    }
  };

  const handleImportComplete = (importedBudgets: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>[]) => {
    // Add all imported budgets
    importedBudgets.forEach(budget => {
      // Check if budget already exists (same year, team, category)
      const existing = budgets.find(b => 
        b.year === budget.year && 
        b.category === budget.category &&
        JSON.stringify(b.team.sort()) === JSON.stringify(budget.team.sort())
      );
      
      if (existing) {
        // Update existing budget
        onUpdateBudget(existing.id, budget);
      } else {
        // Add new budget
        onAddBudget(budget);
      }
    });
    
    setShowUploadModal(false);
  };

  const availableYears = [...new Set(budgets.map(b => b.year))].sort((a, b) => b - a);

  // Search functionality
  const parseSearchTerm = (search: string) => {
    const operators: { [key: string]: string } = {};
    let freeText = search;

    // Extract operators
    const operatorRegex = /(team|cat|category|year|amount):([^:\s]+(?:"[^"]*")?)/gi;
    let match;
    
    while ((match = operatorRegex.exec(search)) !== null) {
      const [fullMatch, key, value] = match;
      operators[key.toLowerCase()] = value.replace(/"/g, '');
      freeText = freeText.replace(fullMatch, '').trim();
    }

    return { operators, freeText: freeText.toLowerCase() };
  };

  const matchesSearch = (budget: Budget, searchTerm: string) => {
    if (!searchTerm.trim()) return true;

    const { operators, freeText } = parseSearchTerm(searchTerm);
    
    // Check operators
    for (const [key, value] of Object.entries(operators)) {
      switch (key) {
        case 'team':
          const teams = value.split(',').map(t => t.trim().toLowerCase());
          if (!teams.some(team => budget.team.some(t => t.toLowerCase().includes(team)))) {
            return false;
          }
          break;
        case 'cat':
        case 'category':
          if (!budget.category.toLowerCase().includes(value.toLowerCase())) {
            return false;
          }
          break;
        case 'year':
          if (budget.year.toString() !== value) {
            return false;
          }
          break;
        case 'amount':
          const totalBudget = budget.h1Budget + budget.h2Budget;
          if (value.includes('-')) {
            const [min, max] = value.split('-').map(Number);
            if (totalBudget < min || totalBudget > max) return false;
          } else if (value.startsWith('>')) {
            if (totalBudget <= Number(value.slice(1))) return false;
          } else if (value.startsWith('<')) {
            if (totalBudget >= Number(value.slice(1))) return false;
          } else {
            if (totalBudget !== Number(value)) return false;
          }
          break;
      }
    }

    // Check free text
    if (freeText) {
      const searchableText = [
        budget.category,
        ...budget.team,
        budget.year.toString(),
        budget.notes,
        formatCurrency(budget.h1Budget),
        formatCurrency(budget.h2Budget),
        formatCurrency(budget.annualBudget)
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(freeText)) {
        return false;
      }
    }

    return true;
  };

  // Sort budgets by year descending, then by category
  const sortedBudgets = [...budgets].sort((a, b) => {
    if (b.year !== a.year) return b.year - a.year;
    return a.category.localeCompare(b.category);
  });

  // Filter and paginate budgets
  const filteredBudgets = sortedBudgets.filter(budget => matchesSearch(budget, searchTerm));
  const totalPages = Math.ceil(filteredBudgets.length / itemsPerPage);
  const paginatedBudgets = filteredBudgets.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Budget Input</h2>
        <p className="text-gray-600">Manage H1 (Jan-Jun) and H2 (Jul-Dec) budgets by category and team</p>
      </div>

      {/* Duplicate Year Section */}
      <div className="bg-blue-50 rounded-xl border border-blue-200 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Quick Setup</h3>
            <p className="text-sm text-blue-700">Upload Excel files or duplicate budgets from a previous year</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Excel</span>
            </button>
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">From Year</label>
              <select
                value={duplicateFromYear}
                onChange={(e) => setDuplicateFromYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-blue-700 mb-1">To Year</label>
              <input
                type="number"
                min="2020"
                value={duplicateToYear}
                onChange={(e) => setDuplicateToYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleDuplicate}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors mt-6"
            >
              <Copy className="w-4 h-4" />
              <span>Duplicate</span>
            </button>
          </div>
        </div>
      </div>

      {/* Budget Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {editingId ? 'Edit Budget' : 'Add New Budget'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Year */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Year *</label>
              <input
                type="number"
                min="2020"
                max="2030"
                value={formData.year}
                onChange={(e) => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.year && <p className="text-red-600 text-sm mt-1">{errors.year}</p>}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a category...</option>
                {CATEGORY_LIST.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
              {errors.category && <p className="text-red-600 text-sm mt-1">{errors.category}</p>}
            </div>

            {/* Annual Budget (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Annual Budget</label>
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                {formatCurrency(formData.h1Budget + formData.h2Budget)}
              </div>
            </div>
          </div>

          {/* Team Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Teams * (Multi-select)</label>
            <div className="border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                {TEAM_LIST.map(team => (
                  <label key={team} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.team.includes(team)}
                      onChange={() => handleTeamToggle(team)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{team}</span>
                  </label>
                ))}
              </div>
            </div>
            {formData.team.length > 0 && (
              <p className="text-xs text-gray-500 mt-1">
                {formData.team.length} team{formData.team.length !== 1 ? 's' : ''} selected
              </p>
            )}
            {errors.team && <p className="text-red-600 text-sm mt-1">{errors.team}</p>}
          </div>

          {/* Budget Amounts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">H1 Budget (Jan-Jun) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Leave blank if no H1 budget"
                value={formData.h1Budget || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, h1Budget: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.h1Budget && <p className="text-red-600 text-sm mt-1">{errors.h1Budget}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">H2 Budget (Jul-Dec) *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Leave blank if no H2 budget"
                value={formData.h2Budget || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, h2Budget: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {errors.h2Budget && <p className="text-red-600 text-sm mt-1">{errors.h2Budget}</p>}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              rows={3}
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Optional notes about this budget..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>{editingId ? 'Update Budget' : 'Add Budget'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Budget List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Existing Budgets</h3>
            <div className="text-sm text-gray-500">
              {filteredBudgets.length} of {budgets.length} budgets
            </div>
          </div>
          
          {/* Search Bar */}
          <div className="mt-4 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Search budgets… (try: team:Finance year:2024 amount:>10000)"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                <X className="h-4 w-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teams</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">H1 Budget</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">H2 Budget</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Annual Budget</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedBudgets.map((budget) => (
                <tr key={budget.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{budget.year}</td>
                  <td className="px-6 py-4 text-sm text-gray-900">{budget.category}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {budget.team.map(team => (
                        <span key={team} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {team}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(budget.h1Budget)}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">{formatCurrency(budget.h2Budget)}</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">{formatCurrency(budget.annualBudget)}</td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(budget)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="Edit budget"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteBudget(budget.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Delete budget"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredBudgets.length)} of {filteredBudgets.length} results
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-700">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}


      {/* Upload Modal */}
      <BudgetUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onImportComplete={handleImportComplete}
      />
        {/* Empty States */}
        {budgets.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No budgets found</p>
            <p className="text-sm text-gray-400">Add your first budget using the form above</p>
          </div>
        ) : filteredBudgets.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No results found</p>
            <p className="text-sm text-gray-400">
              No budgets match your search: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{searchTerm}</span>
            </p>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear search
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};