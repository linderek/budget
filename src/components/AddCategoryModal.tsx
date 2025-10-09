import React, { useState } from 'react';
import { X, Plus, DollarSign, Tag, Users, Calendar, FileText } from 'lucide-react';
import { BudgetCategory, CATEGORY_LIST, TEAM_LIST } from '../types/budget';
import { calculateBudgetMetrics, formatCurrency, formatPercentage } from '../utils/budgetCalculations';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (category: BudgetCategory) => void;
}

interface FormData {
  category: string;
  team: string[];
  requestedAmount: number;
  approvedAmount: number;
  amountSpentToDate: number;
  month: string;
  notes: string;
}

interface FormErrors {
  [key: string]: string;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ isOpen, onClose, onSubmit }) => {
  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const [formData, setFormData] = useState<FormData>({
    category: '',
    team: [],
    requestedAmount: 0,
    approvedAmount: 0,
    amountSpentToDate: 0,
    month: getCurrentMonth(),
    notes: ''
  });
  
  const [errors, setErrors] = useState<FormErrors>({});

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.category) {
      newErrors.category = 'Category is required';
    }
    if (formData.team.length === 0) {
      newErrors.team = 'At least one team must be selected';
    }
    if (formData.requestedAmount <= 0) {
      newErrors.requestedAmount = 'Requested amount must be greater than 0';
    }
    if (formData.approvedAmount <= 0) {
      newErrors.approvedAmount = 'Approved amount must be greater than 0';
    }
    if (formData.amountSpentToDate < 0) {
      newErrors.amountSpentToDate = 'Spent amount cannot be negative';
    }
    if (!formData.month) {
      newErrors.month = 'Month is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const calculatedMetrics = calculateBudgetMetrics(
        formData.requestedAmount,
        formData.approvedAmount,
        formData.amountSpentToDate
      );

      const newCategory: BudgetCategory = {
        id: Date.now().toString(),
        category: formData.category,
        team: formData.team,
        requestedAmount: formData.requestedAmount,
        approvedAmount: formData.approvedAmount,
        amountSpentToDate: formData.amountSpentToDate,
        remainingAmount: calculatedMetrics.remainingAmount || 0,
        remainingPercentage: calculatedMetrics.remainingPercentage || 0,
        month: formData.month,
        notes: formData.notes,
        status: calculatedMetrics.status || 'normal',
        lastUpdated: new Date()
      };

      onSubmit(newCategory);
      setFormData({
        category: '',
        team: [],
        requestedAmount: 0,
        approvedAmount: 0,
        amountSpentToDate: 0,
        month: getCurrentMonth(),
        notes: ''
      });
      setErrors({});
      onClose();
    }
  };

  const handleInputChange = (field: keyof FormData, value: string | number | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleTeamToggle = (team: string) => {
    const newTeams = formData.team.includes(team)
      ? formData.team.filter(t => t !== team)
      : [...formData.team, team];
    handleInputChange('team', newTeams);
  };

  const remainingAmount = formData.approvedAmount - formData.amountSpentToDate;
  const remainingPercentage = formData.approvedAmount > 0 ? (remainingAmount / formData.approvedAmount) * 100 : 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Plus className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add Budget Category</h2>
              <p className="text-sm text-gray-600">Create a new budget category entry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Category *
            </label>
            <select
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Select a category...</option>
              {CATEGORY_LIST.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
            {errors.category && (
              <p className="text-red-600 text-sm mt-1">{errors.category}</p>
            )}
          </div>

          {/* Team Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Teams * (Select multiple)
            </label>
            <div className="border border-gray-300 rounded-lg p-3 max-h-32 overflow-y-auto">
              <div className="space-y-2">
                {TEAM_LIST.map(team => (
                  <label key={team} className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.team.includes(team)}
                      onChange={() => handleTeamToggle(team)}
                      className="rounded border-gray-300 text-green-600 focus:ring-green-500"
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
            {errors.team && (
              <p className="text-red-600 text-sm mt-1">{errors.team}</p>
            )}
          </div>

          {/* Amount Fields */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Requested Amount *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.requestedAmount || ''}
                onChange={(e) => handleInputChange('requestedAmount', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {errors.requestedAmount && (
                <p className="text-red-600 text-sm mt-1">{errors.requestedAmount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Approved Amount *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.approvedAmount || ''}
                onChange={(e) => handleInputChange('approvedAmount', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {errors.approvedAmount && (
                <p className="text-red-600 text-sm mt-1">{errors.approvedAmount}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="w-4 h-4 inline mr-1" />
                Amount Spent to Date
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="0.00"
                value={formData.amountSpentToDate || ''}
                onChange={(e) => handleInputChange('amountSpentToDate', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
              {errors.amountSpentToDate && (
                <p className="text-red-600 text-sm mt-1">{errors.amountSpentToDate}</p>
              )}
            </div>
          </div>

          {/* Month */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Month *
            </label>
            <input
              type="month"
              value={formData.month}
              onChange={(e) => handleInputChange('month', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            {errors.month && (
              <p className="text-red-600 text-sm mt-1">{errors.month}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText className="w-4 h-4 inline mr-1" />
              Notes
            </label>
            <textarea
              rows={3}
              placeholder="Optional notes about this budget category..."
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Calculated Preview */}
          {formData.approvedAmount > 0 && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Calculated Values:</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Remaining Amount:</p>
                  <p className={`font-semibold ${remainingAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(remainingAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Remaining Percentage:</p>
                  <p className={`font-semibold ${remainingPercentage >= 20 ? 'text-green-600' : remainingPercentage >= 80 ? 'text-red-600' : 'text-gray-900'}`}>
                    {formatPercentage(remainingPercentage)}
                  </p>
                </div>
              </div>
              {remainingPercentage <= 20 && formData.amountSpentToDate > 0 && (
                <p className="text-xs text-green-600 mt-2">⚠️ This category will be flagged as under-utilized</p>
              )}
              {(formData.amountSpentToDate / formData.approvedAmount) >= 0.8 && (
                <p className="text-xs text-red-600 mt-2">⚠️ This category will be flagged as at risk</p>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Category</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};