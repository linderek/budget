import React, { useState } from 'react';
import { X, Plus, DollarSign, Building, Tag, Calendar } from 'lucide-react';
import { BudgetFormData, FormErrors } from '../types/forms';

interface AddBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: BudgetFormData) => void;
  departments: string[];
  preselectedDepartment?: string;
}

export const AddBudgetModal: React.FC<AddBudgetModalProps> = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  departments,
  preselectedDepartment
}) => {
  const [formData, setFormData] = useState<BudgetFormData>({
    department: preselectedDepartment || '',
    category: '',
    budgetAmount: 0,
    actualAmount: 0,
    period: 'Q1 2025'
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isNewDepartment, setIsNewDepartment] = useState(!preselectedDepartment);

  // Update form data when preselected department changes
  React.useEffect(() => {
    if (preselectedDepartment) {
      setFormData(prev => ({ ...prev, department: preselectedDepartment }));
      setIsNewDepartment(false);
    }
  }, [preselectedDepartment]);
  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.department.trim()) {
      newErrors.department = 'Department is required';
    }
    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }
    if (formData.budgetAmount <= 0) {
      newErrors.budgetAmount = 'Budget amount must be greater than 0';
    }
    if (formData.actualAmount < 0) {
      newErrors.actualAmount = 'Actual amount cannot be negative';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
      setFormData({
        department: preselectedDepartment || '',
        category: '',
        budgetAmount: 0,
        actualAmount: 0,
        period: 'Q1 2025'
      });
      setErrors({});
      setIsNewDepartment(!preselectedDepartment);
      onClose();
    }
  };

  const handleInputChange = (field: keyof BudgetFormData, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Plus className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Add Budget Item</h2>
              <p className="text-sm text-gray-600">
                {preselectedDepartment 
                  ? `Add category to ${preselectedDepartment}` 
                  : 'Create a new budget category'
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Department Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Building className="w-4 h-4 inline mr-1" />
              Department
            </label>
            {preselectedDepartment ? (
              <div className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-700">
                {preselectedDepartment}
                <span className="text-xs text-gray-500 ml-2">(preselected)</span>
              </div>
            ) : (
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="existing-dept"
                  name="deptType"
                  checked={!isNewDepartment}
                  onChange={() => setIsNewDepartment(false)}
                  className="text-blue-600"
                />
                <label htmlFor="existing-dept" className="text-sm text-gray-700">
                  Select existing department
                </label>
              </div>
              {!isNewDepartment && (
                <select
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Choose a department...</option>
                  {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              )}
              
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="new-dept"
                  name="deptType"
                  checked={isNewDepartment}
                  onChange={() => setIsNewDepartment(true)}
                  className="text-blue-600"
                />
                <label htmlFor="new-dept" className="text-sm text-gray-700">
                  Create new department
                </label>
              </div>
              {isNewDepartment && (
                <input
                  type="text"
                  placeholder="Enter new department name"
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              )}
            </div>
            )}
            {errors.department && (
              <p className="text-red-600 text-sm mt-1">{errors.department}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag className="w-4 h-4 inline mr-1" />
              Category
            </label>
            <input
              type="text"
              placeholder="e.g., Digital Advertising, Office Supplies"
              value={formData.category}
              onChange={(e) => handleInputChange('category', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.category && (
              <p className="text-red-600 text-sm mt-1">{errors.category}</p>
            )}
          </div>

          {/* Budget Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Budget Amount
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={formData.budgetAmount || ''}
              onChange={(e) => handleInputChange('budgetAmount', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.budgetAmount && (
              <p className="text-red-600 text-sm mt-1">{errors.budgetAmount}</p>
            )}
          </div>

          {/* Actual Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign className="w-4 h-4 inline mr-1" />
              Actual Amount
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={formData.actualAmount || ''}
              onChange={(e) => handleInputChange('actualAmount', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            {errors.actualAmount && (
              <p className="text-red-600 text-sm mt-1">{errors.actualAmount}</p>
            )}
          </div>

          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar className="w-4 h-4 inline mr-1" />
              Period
            </label>
            <select
              value={formData.period}
              onChange={(e) => handleInputChange('period', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="Q1 2025">Q1 2025</option>
              <option value="Q2 2025">Q2 2025</option>
              <option value="Q3 2025">Q3 2025</option>
              <option value="Q4 2025">Q4 2025</option>
              <option value="Jan 2025">Jan 2025</option>
              <option value="Feb 2025">Feb 2025</option>
              <option value="Mar 2025">Mar 2025</option>
            </select>
          </div>

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
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Budget Item</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};