import React from 'react';
import { X, TrendingUp, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Budget, Actual, FilterOptions } from '../types/budget';
import { 
  formatCurrency, 
  formatPercentage,
  getMonthlyActuals
} from '../utils/budgetCalculations';

interface CategoryDrilldownModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  budgets: Budget[];
  actuals: Actual[];
  filters: FilterOptions;
}

export const CategoryDrilldownModal: React.FC<CategoryDrilldownModalProps> = ({
  isOpen,
  onClose,
  category,
  budgets,
  actuals,
  filters
}) => {
  if (!isOpen) return null;

  // Filter data for this category
  const categoryFilters = { ...filters, categories: [category] };
  const monthlyData = getMonthlyActuals(actuals, categoryFilters);

  // Get teams involved in this category
  const categoryBudgets = budgets.filter(b => 
    b.category === category && filters.years.includes(b.year)
  );
  const categoryActuals = actuals.filter(a => 
    a.category === category && filters.years.includes(a.year)
  );

  const totalBudget = categoryBudgets.reduce((sum, b) => sum + b.h1Budget + b.h2Budget, 0);
  const totalActual = categoryActuals.reduce((sum, a) => sum + a.amount, 0);
  const variance = totalBudget - totalActual;
  const burnPercentage = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

  const teams = [...new Set([
    ...categoryBudgets.flatMap(b => b.team),
    ...categoryActuals.flatMap(a => a.team)
  ])];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{category} Analysis</h2>
              <p className="text-sm text-gray-600">Detailed breakdown and trends</p>
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
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <p className="text-sm font-medium text-blue-700">Total Budget</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(totalBudget)}</p>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <p className="text-sm font-medium text-purple-700">Total Actual</p>
              <p className="text-xl font-bold text-purple-900">{formatCurrency(totalActual)}</p>
            </div>
            <div className={`rounded-lg p-4 ${variance >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`text-sm font-medium ${variance >= 0 ? 'text-green-700' : 'text-red-700'}`}>Variance</p>
              <p className={`text-xl font-bold ${variance >= 0 ? 'text-green-900' : 'text-red-900'}`}>
                {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-700">Burn Rate</p>
              <p className="text-xl font-bold text-gray-900">{formatPercentage(burnPercentage)}</p>
            </div>
          </div>

          {/* Teams Involved */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Teams Involved</h3>
            <div className="flex flex-wrap gap-2">
              {teams.map(team => (
                <span key={team} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {team}
                </span>
              ))}
            </div>
          </div>

          {/* Trend Chart */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">Spending Trend</h3>
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
                      labelFormatter={(label) => `Period: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="amount" 
                      stroke="#8B5CF6" 
                      strokeWidth={3}
                      dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Budget Breakdown */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Budget Breakdown by Year</h3>
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teams</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">H1 Budget</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">H1 Actual</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">H2 Budget</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">H2 Actual</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Variance</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filters.years.map(year => {
                      const yearBudgets = categoryBudgets.filter(b => b.year === year);
                      const yearActuals = categoryActuals.filter(a => a.year === year);
                      
                      const h1Budget = yearBudgets.reduce((sum, b) => sum + b.h1Budget, 0);
                      const h2Budget = yearBudgets.reduce((sum, b) => sum + b.h2Budget, 0);
                      const h1Actual = yearActuals.filter(a => a.half === 'H1').reduce((sum, a) => sum + a.amount, 0);
                      const h2Actual = yearActuals.filter(a => a.half === 'H2').reduce((sum, a) => sum + a.amount, 0);
                      const totalVariance = (h1Budget + h2Budget) - (h1Actual + h2Actual);
                      
                      const yearTeams = [...new Set([
                        ...yearBudgets.flatMap(b => b.team),
                        ...yearActuals.flatMap(a => a.team)
                      ])];

                      return (
                        <tr key={year} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{year}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {yearTeams.map(team => (
                                <span key={team} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                  {team}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(h1Budget)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(h1Actual)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(h2Budget)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(h2Actual)}</td>
                          <td className={`px-4 py-3 text-sm text-right font-medium ${
                            totalVariance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {totalVariance >= 0 ? '+' : ''}{formatCurrency(totalVariance)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {filters.years.length === 0 && (
                <div className="text-center py-8">
                  <p className="text-gray-500">No data found for {category}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};