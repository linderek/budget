import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Clock, TrendingUp, TrendingDown, DollarSign, Edit, Trash2 } from 'lucide-react';
import { Department, BudgetItem } from '../types/budget';

interface AllExpensesCardProps {
  departments: Department[];
  onEditBudgetItem?: (budgetItem: any) => void;
  onDeleteBudgetItem?: (budgetItemId: string) => void;
}

export const AllExpensesCard: React.FC<AllExpensesCardProps> = ({ 
  departments, 
  onEditBudgetItem, 
  onDeleteBudgetItem 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Aggregate all categories from all departments
  const allCategories: BudgetItem[] = departments.flatMap(dept => dept.categories);
  
  const totalBudget = allCategories.reduce((sum, cat) => sum + cat.budgetAmount, 0);
  const totalActual = allCategories.reduce((sum, cat) => sum + cat.actualAmount, 0);
  const totalVariance = totalActual - totalBudget;
  const variancePercentage = (totalVariance / totalBudget) * 100;

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

  // Sort categories by variance (most concerning first)
  const sortedCategories = [...allCategories].sort((a, b) => {
    const aVarianceAbs = Math.abs(a.variancePercentage);
    const bVarianceAbs = Math.abs(b.variancePercentage);
    return bVarianceAbs - aVarianceAbs;
  });

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-200 overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">All Expenses Overview</h3>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center space-x-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <span>{isExpanded ? 'Collapse' : 'View All Categories'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <p className="text-sm text-blue-700 font-medium">Total Budget</p>
            <p className="text-xl font-bold text-gray-900">
              ${totalBudget.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700 font-medium">Total Actual</p>
            <p className="text-xl font-bold text-gray-900">
              ${totalActual.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-blue-700 font-medium">Total Variance</p>
            <div className="flex items-center space-x-1">
              <p className={`text-xl font-bold ${getVarianceColor(totalVariance).split(' ')[0]}`}>
                {totalVariance >= 0 ? '+' : ''}${totalVariance.toLocaleString()}
              </p>
              {(() => {
                const Icon = getVarianceIcon(totalVariance);
                return Icon ? <Icon className="w-5 h-5" /> : null;
              })()}
            </div>
            <p className={`text-sm font-medium ${getVarianceColor(totalVariance).split(' ')[0]}`}>
              {variancePercentage >= 0 ? '+' : ''}{variancePercentage.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="w-full bg-blue-200 rounded-full h-3 mb-4">
          <div
            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-3 rounded-full transition-all duration-500"
            style={{ width: `${Math.min((totalActual / totalBudget) * 100, 100)}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="bg-white bg-opacity-60 rounded-lg p-3">
            <p className="text-blue-700 font-medium">Categories</p>
            <p className="text-lg font-semibold text-gray-900">{allCategories.length}</p>
          </div>
          <div className="bg-white bg-opacity-60 rounded-lg p-3">
            <p className="text-blue-700 font-medium">Departments</p>
            <p className="text-lg font-semibold text-gray-900">{departments.length}</p>
          </div>
        </div>

        {isExpanded && (
          <div className="border-t border-blue-200 pt-4 mt-4 space-y-3">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium text-gray-900">All Budget Categories</h4>
              <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded-full">
                Sorted by variance impact
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2">
              {sortedCategories.map((category) => {
                const VarianceIcon = getVarianceIcon(category.variance);
                return (
                  <div key={category.id} className="flex items-center justify-between p-3 bg-white bg-opacity-80 rounded-lg hover:bg-opacity-100 transition-all">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <p className="font-medium text-gray-900 text-sm">{category.category}</p>
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {category.department}
                        </span>
                      </div>
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
          </div>
        )}
      </div>
    </div>
  );
};