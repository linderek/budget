import React from 'react';
import { X, TrendingUp, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Budget, Actual, FilterOptions } from '../types/budget';
import { 
  getTeamMonthlyActuals, 
  getTeamCategoryBreakdown, 
  formatCurrency, 
  formatPercentage,
  formatBudgetDisplay 
} from '../utils/budgetCalculations';

interface TeamDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: string;
  budgets: Budget[];
  actuals: Actual[];
  filters: FilterOptions;
}

export const TeamDrilldownModal: React.FC<TeamDrilldownModalProps> = ({
  isOpen,
  onClose,
  team,
  budgets,
  actuals,
  filters
}) => {
  if (!isOpen) return null;

  const monthlyData = getTeamMonthlyActuals(actuals, filters, team);
  const categoryBreakdown = getTeamCategoryBreakdown(budgets, actuals, filters, team);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{team} Team Analysis</h2>
              <p className="text-sm text-gray-600">Detailed breakdown for {filters.year}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Monthly Actuals Chart */}
          <div className="mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Monthly Actuals Trend</h3>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [formatCurrency(value), 'Amount']}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#3B82F6" 
                      strokeWidth={3}
                      dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Category Breakdown Table */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Category Breakdown</h3>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">H1 Budget</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">H1 Actual</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">H1 Var</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">H2 Budget</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">H2 Actual</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">H2 Var</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Var</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Burn %</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {categoryBreakdown.map((category) => (
                      <tr key={category.category} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{category.category}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(category.h1Budget)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(category.h1Actual)}</td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${
                          category.h1Variance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {category.h1Variance >= 0 ? '+' : ''}{formatCurrency(category.h1Variance)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(category.h2Budget)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(category.h2Actual)}</td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${
                          category.h2Variance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {category.h2Variance >= 0 ? '+' : ''}{formatCurrency(category.h2Variance)}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right font-bold ${
                          category.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {category.totalVariance >= 0 ? '+' : ''}{formatCurrency(category.totalVariance)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right font-medium">
                          {formatPercentage(category.burnPercentage)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {categoryBreakdown.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No data found for {team} team</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};