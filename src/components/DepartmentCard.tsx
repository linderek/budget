import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, TrendingUp, TrendingDown, Edit, Trash2, Plus } from 'lucide-react';
import { Department } from '../types/budget';

interface DepartmentCardProps {
  department: Department;
  onEditBudgetItem?: (budgetItem: any) => void;
  onDeleteBudgetItem?: (budgetItemId: string) => void;
  onAddCategoryToDepartment?: (departmentName: string) => void;
}

export const DepartmentCard: React.FC<DepartmentCardProps> = ({ 
  department, 
  onEditBudgetItem, 
  onDeleteBudgetItem,
  onAddCategoryToDepartment
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return 'text-red-600 bg-red-50';
    if (variance < 0) return 'text-green-600 bg-green-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getVarianceIcon = (variance: number) => {
    if (variance > 0) return TrendingUp;
    if (variance < 0) return TrendingDown;
    return null;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">{department.name}</h3>
          <div className="flex items-center space-x-2">
            {onAddCategoryToDepartment && (
              <button
                onClick={() => onAddCategoryToDepartment(department.name)}
                className="flex items-center space-x-1 text-sm text-green-600 hover:text-green-700 transition-colors bg-green-50 hover:bg-green-100 px-3 py-1 rounded-lg"
                title="Add category to this department"
              >
                <Plus className="w-3 h-3" />
                <span>Add Category</span>
              </button>
            )}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              <span>{isExpanded ? 'Collapse' : 'Expand'}</span>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-gray-600">Budget</p>
            <p className="text-lg font-semibold text-gray-900">
              ${department.totalBudget.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Actual</p>
            <p className="text-lg font-semibold text-gray-900">
              ${department.totalActual.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Variance</p>
            <div className="flex items-center space-x-1">
              <p className={`text-lg font-semibold ${getVarianceColor(department.totalVariance).split(' ')[0]}`}>
                {department.totalVariance >= 0 ? '+' : ''}${department.totalVariance.toLocaleString()}
              </p>
              {(() => {
                const Icon = getVarianceIcon(department.totalVariance);
                return Icon ? <Icon className="w-4 h-4" /> : null;
              })()}
            </div>
            <p className={`text-sm ${getVarianceColor(department.totalVariance).split(' ')[0]}`}>
              {department.variancePercentage >= 0 ? '+' : ''}{department.variancePercentage.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${Math.min((department.totalActual / department.totalBudget) * 100, 100)}%` }}
          />
        </div>

        {isExpanded && (
          <div className="border-t border-gray-200 pt-4 space-y-3">
            {department.categories.map((category) => {
              const VarianceIcon = getVarianceIcon(category.variance);
              return (
                <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{category.category}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <p className="text-xs text-gray-500">
                        Updated {category.lastUpdated.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="text-right">
                    <p className="text-sm text-gray-600">
                      ${category.actualAmount.toLocaleString()} / ${category.budgetAmount.toLocaleString()}
                    </p>
                    <div className="flex items-center justify-end space-x-1">
                      <span className={`text-sm font-medium ${getVarianceColor(category.variance).split(' ')[0]}`}>
                        {category.variancePercentage >= 0 ? '+' : ''}{category.variancePercentage.toFixed(1)}%
                      </span>
                      {VarianceIcon && <VarianceIcon className="w-3 h-3" />}
                    </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      {onEditBudgetItem && (
                        <button
                          onClick={() => onEditBudgetItem(category)}
                          className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit budget item"
                        >
                          <Edit className="w-3 h-3" />
                        </button>
                      )}
                      {onDeleteBudgetItem && (
                        <button
                          onClick={() => onDeleteBudgetItem(category.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete budget item"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};