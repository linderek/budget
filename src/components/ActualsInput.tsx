import React, { useState } from 'react';
import { Plus, Save, Trash2, AlertCircle, Calendar, Search, X, Upload, Clock, User } from 'lucide-react';
import { Actual, CATEGORY_LIST, TEAM_LIST } from '../types/budget';
import { formatCurrency, getHalfFromMonth, getYearFromDate, getMonthFromDate } from '../utils/budgetCalculations';
import { ActualsUploadModal, ImportLog } from './ActualsUploadModal';

interface ActualsInputProps {
  actuals: Actual[];
  onAddActual: (actual: Omit<Actual, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateActual: (id: string, actual: Omit<Actual, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onDeleteActual: (id: string) => void;
}

interface FormData {
  date: string;
  team: string[];
  category: string;
  amount: number;
  description: string;
}

interface FormErrors {
  [key: string]: string;
}

export const ActualsInput: React.FC<ActualsInputProps> = ({
  actuals,
  onAddActual,
  onUpdateActual,
  onDeleteActual
}) => {
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState<FormData>({
    date: getCurrentMonth(),
    team: [],
    category: '',
    amount: 0,
    description: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [importLogs, setImportLogs] = useState<ImportLog[]>([]);

  // Reset page when search term changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Sort actuals by date descending (most recent first)
  const sortedActuals = [...actuals].sort((a, b) => b.date.localeCompare(a.date));

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }
    if (formData.team.length === 0) {
      newErrors.team = 'At least one team must be selected';
    }
    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (formData.amount <= 0) {
      newErrors.amount = 'Amount must be greater than 0';
    }
    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const year = getYearFromDate(formData.date);
      const month = getMonthFromDate(formData.date);
      const half = getHalfFromMonth(month);

      const actualData = {
        ...formData,
        year,
        half
      };

      if (editingId) {
        onUpdateActual(editingId, actualData);
        setEditingId(null);
      } else {
        onAddActual(actualData);
      }

      setFormData({
        date: getCurrentMonth(),
        team: [],
        category: '',
        amount: 0,
        description: ''
      });
      setErrors({});
    }
  };

  const handleEdit = (actual: Actual) => {
    setFormData({
      date: actual.date,
      team: actual.team,
      category: actual.category,
      amount: actual.amount,
      description: actual.description
    });
    setEditingId(actual.id);
  };

  const handleCancel = () => {
    setFormData({
      date: getCurrentMonth(),
      team: [],
      category: '',
      amount: 0,
      description: ''
    });
    setEditingId(null);
    setErrors({});
  };

  const handleImportComplete = (importedActuals: Omit<Actual, 'id' | 'createdAt' | 'updatedAt'>[], log: ImportLog) => {
    // Process imported actuals
    importedActuals.forEach(actual => {
      // Check if actual already exists (same date and category)
      const existing = actuals.find(a => 
        a.date === actual.date && a.category === actual.category
      );
      
      if (existing) {
        // Update existing actual
        onUpdateActual(existing.id, actual);
      } else {
        // Add new actual
        onAddActual(actual);
      }
    });
    
    // Add to import logs
    setImportLogs(prev => [log, ...prev].slice(0, 10)); // Keep last 10 logs
    setShowUploadModal(false);
  };

  const handleTeamToggle = (team: string) => {
    const newTeams = formData.team.includes(team)
      ? formData.team.filter(t => t !== team)
      : [...formData.team, team];
    setFormData(prev => ({ ...prev, team: newTeams }));
  };

  const getHalfDisplay = (date: string) => {
    const month = getMonthFromDate(date);
    return getHalfFromMonth(month);
  };

  // Search functionality
  const parseSearchTerm = (search: string) => {
    const operators: { [key: string]: string } = {};
    let freeText = search;

    // Extract operators
    const operatorRegex = /(team|cat|category|half|year|month|amount):([^:\s]+(?:"[^"]*")?)/gi;
    let match;
    
    while ((match = operatorRegex.exec(search)) !== null) {
      const [fullMatch, key, value] = match;
      operators[key.toLowerCase()] = value.replace(/"/g, '');
      freeText = freeText.replace(fullMatch, '').trim();
    }

    return { operators, freeText: freeText.toLowerCase() };
  };

  const matchesSearch = (actual: Actual, searchTerm: string) => {
    if (!searchTerm.trim()) return true;

    const { operators, freeText } = parseSearchTerm(searchTerm);
    
    // Check operators
    for (const [key, value] of Object.entries(operators)) {
      switch (key) {
        case 'team':
          const teams = value.split(',').map(t => t.trim().toLowerCase());
          if (!teams.some(team => actual.team.some(t => t.toLowerCase().includes(team)))) {
            return false;
          }
          break;
        case 'cat':
        case 'category':
          if (!actual.category.toLowerCase().includes(value.toLowerCase())) {
            return false;
          }
          break;
        case 'half':
          if (actual.half.toLowerCase() !== value.toLowerCase()) {
            return false;
          }
          break;
        case 'year':
          if (actual.year.toString() !== value) {
            return false;
          }
          break;
        case 'month':
          if (actual.date !== value) {
            return false;
          }
          break;
        case 'amount':
          const amount = actual.amount;
          if (value.includes('-')) {
            const [min, max] = value.split('-').map(Number);
            if (amount < min || amount > max) return false;
          } else if (value.startsWith('>')) {
            if (amount <= Number(value.slice(1))) return false;
          } else if (value.startsWith('<')) {
            if (amount >= Number(value.slice(1))) return false;
          } else {
            if (amount !== Number(value)) return false;
          }
          break;
      }
    }

    // Check free text
    if (freeText) {
      const searchableText = [
        actual.description,
        actual.category,
        ...actual.team,
        actual.date,
        actual.half,
        actual.amount.toString(),
        new Date(actual.date + '-01').toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short' 
        })
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(freeText)) {
        return false;
      }
    }

    return true;
  };

  // Filter and paginate actuals
  const filteredActuals = sortedActuals.filter(actual => matchesSearch(actual, searchTerm));
  const totalPages = Math.ceil(filteredActuals.length / itemsPerPage);
  const paginatedActuals = filteredActuals.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Actuals Input</h2>
        <p className="text-gray-600">Upload monthly actual spending by category. Use the template if your columns differ.</p>
      </div>

      {/* Quick Upload Section */}
      <div className="bg-green-50 rounded-xl border border-green-200 p-6 mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">Quick Upload</h3>
            <p className="text-sm text-green-700">Upload Excel/CSV files with monthly actuals data</p>
          </div>
          <button
            onClick={() => setShowUploadModal(true)}
            className="flex items-center space-x-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Upload className="w-5 h-5" />
            <span>Upload Actuals File</span>
          </button>
        </div>
      </div>

      {/* Actuals Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {editingId ? 'Edit Actual Expense' : 'Add New Actual Expense'}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Month *
              </label>
              <input
                type="month"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {formData.date && (
                <p className="text-xs text-gray-500 mt-1">
                  Half: {getHalfDisplay(formData.date)} • Year: {getYearFromDate(formData.date)}
                </p>
              )}
              {errors.date && <p className="text-red-600 text-sm mt-1">{errors.date}</p>}
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

            {/* Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.amount || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="0.00"
              />
              {errors.amount && <p className="text-red-600 text-sm mt-1">{errors.amount}</p>}
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

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Describe the expense..."
            />
            {errors.description && <p className="text-red-600 text-sm mt-1">{errors.description}</p>}
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
              <span>{editingId ? 'Update Expense' : 'Add Expense'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Actuals List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Recent Expenses</h3>
            <div className="text-sm text-gray-500">
              {filteredActuals.length} of {actuals.length} expenses
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
              placeholder="Search expenses… (try: team:Finance half:H2 amount:>500)"
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Half</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teams</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedActuals.map((actual) => (
                <tr key={actual.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {new Date(actual.date + '-01').toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'short' 
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      actual.half === 'H1' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                    }`}>
                      {actual.half}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{actual.category}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {actual.team.map(team => (
                        <span key={team} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                          {team}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 text-right">{formatCurrency(actual.amount)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate" title={actual.description}>
                    {actual.description}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleEdit(actual)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="Edit expense"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteActual(actual.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Delete expense"
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
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredActuals.length)} of {filteredActuals.length} results
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

        {/* Empty States */}
        {actuals.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No expenses recorded</p>
            <p className="text-sm text-gray-400">Add your first expense using the form above</p>
          </div>
        ) : filteredActuals.length === 0 ? (
          <div className="text-center py-12">
            <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No results found</p>
            <p className="text-sm text-gray-400">
              No expenses match your search: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{searchTerm}</span>
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

      {/* Import Logs */}
      {importLogs.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Import History</h3>
            <p className="text-sm text-gray-600">Recent file uploads and processing logs</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Timestamp</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uploader</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Rows</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Imported</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Updated</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Skipped</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {importLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>{log.timestamp.toLocaleString()}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{log.fileName}</div>
                        <div className="text-xs text-gray-500">{(log.fileSize / 1024 / 1024).toFixed(1)} MB</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <User className="w-4 h-4 text-gray-400" />
                        <span>{log.uploader}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 text-right">{log.totalRows}</td>
                    <td className="px-6 py-4 text-sm text-green-600 text-right font-medium">{log.imported}</td>
                    <td className="px-6 py-4 text-sm text-blue-600 text-right font-medium">{log.updated}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-right">{log.skipped}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        log.status === 'completed' ? 'bg-green-100 text-green-800' :
                        log.status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <ActualsUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onImportComplete={handleImportComplete}
        existingActuals={actuals}
      />
    </div>
  );
};