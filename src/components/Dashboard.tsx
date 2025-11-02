import React, { useState } from 'react';
import { Download, FileText, Calendar, TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { Budget, Actual, FilterOptions } from '../types/budget';
import { 
  calculateDashboardSummary, 
  getMonthlyActuals,
  formatCurrency, 
  formatPercentage 
} from '../utils/budgetCalculations';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, ComposedChart } from 'recharts';
import { TimeGrainToggle } from './TimeGrainToggle';
import { YearSelector } from './YearSelector';

interface DashboardProps {
  budgets: Budget[];
  actuals: Actual[];
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onExportCSV: () => void;
  onExportPDF: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  budgets,
  actuals,
  filters,
  onFiltersChange,
  onExportCSV,
  onExportPDF
}) => {
  const [waterfallPeriod, setWaterfallPeriod] = useState<'H1' | 'H2' | 'whole-year'>('whole-year');

  // Get available years from budgets and actuals
  const availableYears = [...new Set([
    ...budgets.map(b => b.year),
    ...actuals.map(a => a.year)
  ])].sort((a, b) => b - a);

  // Initialize filters if empty
  const activeFilters = {
    ...filters,
    years: filters.years.length > 0 ? filters.years : [new Date().getFullYear()]
  };

  // Calculate dashboard summary
  const summary = calculateDashboardSummary(budgets, actuals, activeFilters);

  // Get monthly actuals for trend chart
  const monthlyData = getMonthlyActuals(actuals, activeFilters);

  // Prepare trend chart data with budget targets
  const trendChartData = monthlyData.map(item => {
    const [year, period] = item.month.includes('-H') ? 
      [parseInt(item.month.split('-')[0]), item.month.split('-')[1]] :
      [parseInt(item.month), 'year'];
    
    let budgetTarget = 0;
    if (period === 'H1') {
      budgetTarget = summary.h1Budget / 6; // Divide H1 budget by 6 months
    } else if (period === 'H2') {
      budgetTarget = summary.h2Budget / 6; // Divide H2 budget by 6 months
    } else if (period === 'year') {
      budgetTarget = summary.totalBudget / 12; // Divide total budget by 12 months
    }

    return {
      month: item.month,
      actual: item.amount,
      budgetTarget,
      isAllocated: item.isAllocated || false
    };
  });

  // Calculate waterfall data based on selected period
  const getWaterfallData = () => {
    let budget, actual, remaining;
    
    switch (waterfallPeriod) {
      case 'H1':
        budget = summary.h1Budget;
        actual = summary.h1Actuals;
        remaining = summary.h1Variance;
        break;
      case 'H2':
        budget = summary.h2Budget;
        actual = summary.h2Actuals;
        remaining = summary.h2Variance;
        break;
      default:
        budget = summary.totalBudget;
        actual = summary.totalActuals;
        remaining = summary.totalVariance;
    }

    return [
      { name: 'Budget', value: budget, color: '#2F80ED' },
      { name: 'Actual', value: actual, color: '#9B51E0' },
      { name: 'Remaining', value: remaining, color: remaining >= 0 ? '#27AE60' : '#EB5757' }
    ];
  };

  const waterfallData = getWaterfallData();

  // Calculate insights
  const avgBurnRate = summary.burnPercentage;
  
  const getOverspendPeriod = () => {
    if (summary.h1Variance < 0 && summary.h2Variance < 0) {
      return Math.abs(summary.h1Variance) > Math.abs(summary.h2Variance) ? 'H1' : 'H2';
    } else if (summary.h1Variance < 0) {
      return 'H1';
    } else if (summary.h2Variance < 0) {
      return 'H2';
    }
    return 'None';
  };

  const getUnderspendPeriod = () => {
    if (summary.h1Variance > 0 && summary.h2Variance > 0) {
      return summary.h1Variance > summary.h2Variance ? 'H1' : 'H2';
    } else if (summary.h1Variance > 0) {
      return 'H1';
    } else if (summary.h2Variance > 0) {
      return 'H2';
    }
    return 'None';
  };

  const largestOverspend = getOverspendPeriod();
  const largestUnderspend = getUnderspendPeriod();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const isH1 = label.includes('H1') || (parseInt(label) && parseInt(label.split('-')[1]) <= 6);
      const halfBudget = isH1 ? summary.h1Budget : summary.h2Budget;
      const halfActual = isH1 ? summary.h1Actuals : summary.h2Actuals;
      const halfVariance = isH1 ? summary.h1Variance : summary.h2Variance;
      
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{label}</p>
          <div className="space-y-1 mt-2">
            <p className="text-sm text-purple-600">Monthly Actual: {formatCurrency(data.actual)}</p>
            <p className="text-sm text-blue-600">Monthly Target: {formatCurrency(data.budgetTarget)}</p>
            <p className="text-sm text-gray-600">Half Budget: {formatCurrency(halfBudget)}</p>
            <p className="text-sm text-gray-600">Half Actual: {formatCurrency(halfActual)}</p>
            <p className={`text-sm font-medium ${halfVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              Half Variance: {halfVariance >= 0 ? '+' : ''}{formatCurrency(halfVariance)}
            </p>
            {data.isAllocated && (
              <p className="text-xs text-orange-600">⚠️ Allocated data</p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  const WaterfallTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">{formatCurrency(data.value)}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Budget Dashboard</h1>
            <p className="text-gray-600">Executive budget overview and performance tracking</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onExportPDF}
              className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={onExportCSV}
              className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <YearSelector
            availableYears={availableYears}
            selectedYears={activeFilters.years}
            onYearsChange={(years) => onFiltersChange({ ...activeFilters, years })}
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Half</label>
            <select
              value={activeFilters.halfFilter || 'both'}
              onChange={(e) => onFiltersChange({ 
                ...activeFilters, 
                halfFilter: e.target.value as 'H1' | 'H2' | 'both' 
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="both">Both</option>
              <option value="H1">H1 Only</option>
              <option value="H2">H2 Only</option>
            </select>
          </div>

          <TimeGrainToggle
            timeGrain={activeFilters.timeGrain}
            onTimeGrainChange={(timeGrain) => onFiltersChange({ ...activeFilters, timeGrain })}
          />
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Budget */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-blue-100 p-2 rounded-lg">
              <DollarSign className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Budget</p>
          <p className="text-3xl font-bold text-blue-600">{formatCurrency(summary.totalBudget)}</p>
          <p className="text-sm text-gray-500 mt-1">
            H1: {formatCurrency(summary.h1Budget)} • H2: {formatCurrency(summary.h2Budget)}
          </p>
        </div>

        {/* Total Actuals */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="bg-purple-100 p-2 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Total Actuals</p>
          <p className="text-3xl font-bold text-purple-600">{formatCurrency(summary.totalActuals)}</p>
          <p className="text-sm text-gray-500 mt-1">
            H1: {formatCurrency(summary.h1Actuals)} • H2: {formatCurrency(summary.h2Actuals)}
          </p>
        </div>

        {/* Variance */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className={`p-2 rounded-lg ${summary.totalVariance >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              {summary.totalVariance >= 0 ? 
                <TrendingUp className="w-5 h-5 text-green-600" /> : 
                <TrendingDown className="w-5 h-5 text-red-600" />
              }
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Variance</p>
          <p className={`text-3xl font-bold ${summary.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {summary.totalVariance >= 0 ? '+' : ''}{formatCurrency(summary.totalVariance)}
          </p>
          <p className={`text-sm mt-1 ${summary.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {summary.totalVariance >= 0 ? '+' : ''}{formatPercentage((summary.totalVariance / summary.totalBudget) * 100)}
          </p>
        </div>

        {/* Burn Rate */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-2">
            <div className={`p-2 rounded-lg ${
              summary.burnPercentage < 80 ? 'bg-green-100' : 
              summary.burnPercentage <= 100 ? 'bg-yellow-100' : 'bg-red-100'
            }`}>
              <AlertTriangle className={`w-5 h-5 ${
                summary.burnPercentage < 80 ? 'text-green-600' : 
                summary.burnPercentage <= 100 ? 'text-yellow-600' : 'text-red-600'
              }`} />
            </div>
          </div>
          <p className="text-sm font-medium text-gray-600 mb-1">Burn Rate</p>
          <p className={`text-3xl font-bold ${
            summary.burnPercentage < 80 ? 'text-green-600' : 
            summary.burnPercentage <= 100 ? 'text-yellow-600' : 'text-red-600'
          }`}>
            {formatPercentage(summary.burnPercentage)}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            {summary.totalBudget > 0 ? 'of total budget' : 'No budget set'}
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Budget vs Actuals Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Budget vs Actuals Over Time</h3>
            <p className="text-sm text-gray-600">Monthly expenses against half-year budgets</p>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="actual" fill="#9B51E0" name="Monthly Actuals" />
                <Line 
                  type="stepAfter" 
                  dataKey="budgetTarget" 
                  stroke="#2F80ED" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Monthly Budget Target"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Budget Waterfall */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Budget Waterfall</h3>
              <p className="text-sm text-gray-600">Budget vs actual breakdown</p>
            </div>
            <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setWaterfallPeriod('H1')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  waterfallPeriod === 'H1'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                H1
              </button>
              <button
                onClick={() => setWaterfallPeriod('H2')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  waterfallPeriod === 'H2'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                H2
              </button>
              <button
                onClick={() => setWaterfallPeriod('whole-year')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  waterfallPeriod === 'whole-year'
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Whole Year
              </button>
            </div>
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={waterfallData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<WaterfallTooltip />} />
                <Bar dataKey="value" fill="green" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          
          <div className="text-center text-sm text-gray-500 mt-2">
            Showing {waterfallPeriod === 'whole-year' ? 'Whole Year' : waterfallPeriod} data
          </div>
        </div>
      </div>
    </div>
  );
};