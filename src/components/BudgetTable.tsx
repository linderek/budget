import React from 'react';
import { Edit, Trash2, AlertTriangle } from 'lucide-react';
import { BudgetCategory } from '../types/budget';
import { getRowColor, formatCurrency, formatPercentage } from '../utils/budgetCalculations';

interface BudgetTableProps {
  categories: BudgetCategory[];
  onEdit?: (category: BudgetCategory) => void;
  onDelete?: (categoryId: string) => void;
}

export const BudgetTable: React.FC<BudgetTableProps> = ({ categories, onEdit, onDelete }) => {
  // Group categories by category name and sum amounts
  const groupedCategories = categories.reduce((acc, category) => {
    const existing = acc.find(item => item.category === category.category);
    if (existing) {
      existing.requestedAmount += category.requestedAmount;
      existing.approvedAmount += category.approvedAmount;
      existing.amountSpentToDate += category.amountSpentToDate;
      existing.remainingAmount += category.remainingAmount;
      existing.teams = [...new Set([...existing.teams, ...category.team])];
      existing.items.push(category);
    } else {
      acc.push({
        category: category.category,
        requestedAmount: category.requestedAmount,
        approvedAmount: category.approvedAmount,
        amountSpentToDate: category.amountSpentToDate,
        remainingAmount: category.remainingAmount,
        remainingPercentage: category.approvedAmount > 0 ? (category.remainingAmount / category.approvedAmount) * 100 : 0,
        teams: [...category.team],
        status: category.status,
        items: [category]
      });
    }
    return acc;
  }, [] as Array<{
    category: string;
    requestedAmount: number;
    approvedAmount: number;
    amountSpentToDate: number;
    remainingAmount: number;
    remainingPercentage: number;
    teams: string[];
    status: BudgetCategory['status'];
    items: BudgetCategory[];
  }>);

  // Sort by remaining percentage ascending (surface risk)
  const sortedCategories = groupedCategories.sort((a, b) => a.remainingPercentage - b.remainingPercentage);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Budget Categories</h3>
        <p className="text-sm text-gray-600">Grouped by category, sorted by remaining percentage (risk first)</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teams
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Requested
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Approved
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Spent
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Remaining
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Remaining %
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedCategories.map((categoryGroup, index) => (
              <tr key={`${categoryGroup.category}-${index}`} className={`transition-colors ${getRowColor(categoryGroup.status)}`}>
                <td className="px-6 py-4">
                  <div className="text-sm font-medium text-gray-900">{categoryGroup.category}</div>
                  <div className="text-xs text-gray-500">{categoryGroup.items.length} item{categoryGroup.items.length !== 1 ? 's' : ''}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap gap-1">
                    {categoryGroup.teams.map(team => (
                      <span key={team} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        {team}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900">
                  {formatCurrency(categoryGroup.requestedAmount)}
                </td>
                <td className="px-6 py-4 text-right text-sm text-gray-900">
                  {formatCurrency(categoryGroup.approvedAmount)}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="text-sm text-gray-900">{formatCurrency(categoryGroup.amountSpentToDate)}</div>
                  <div className="text-xs text-gray-500">
                    {categoryGroup.approvedAmount > 0 ? formatPercentage((categoryGroup.amountSpentToDate / categoryGroup.approvedAmount) * 100) : '0.00%'} of approved
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className={`text-sm font-medium ${
                    categoryGroup.remainingAmount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(categoryGroup.remainingAmount)}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className={`text-sm font-bold ${
                    categoryGroup.status === 'critical' ? 'text-red-600' :
                    categoryGroup.status === 'underutilized' ? 'text-green-600' :
                    'text-gray-900'
                  }`}>
                    {formatPercentage(categoryGroup.remainingPercentage)}
                  </div>
                  {categoryGroup.status === 'critical' && (
                    <div className="flex items-center text-xs text-red-600 mt-1">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      At Risk
                    </div>
                  )}
                  {categoryGroup.status === 'underutilized' && (
                    <div className="text-xs text-green-600 mt-1">Under-utilized</div>
                  )}
                </td>
                <td className="px-6 py-4 text-sm font-medium">
                  <div className="flex items-center space-x-2">
                    {onEdit && categoryGroup.items.length === 1 && (
                      <button
                        onClick={() => onEdit(categoryGroup.items[0])}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="Edit category"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && categoryGroup.items.length === 1 && (
                      <button
                        onClick={() => onDelete(categoryGroup.items[0].id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {categoryGroup.items.length > 1 && (
                      <span className="text-xs text-gray-500">Multiple items</span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {categories.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">
            <AlertTriangle className="w-12 h-12 mx-auto" />
          </div>
          <p className="text-gray-500">No budget categories found</p>
          <p className="text-sm text-gray-400">Upload a spreadsheet or add categories manually</p>
        </div>
      )}
    </div>
  );
};