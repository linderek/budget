import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Target } from 'lucide-react';
import { DepartmentSummary as SummaryType } from '../types/budget';

interface DepartmentSummaryProps {
  summary: SummaryType;
  departmentName: string;
}

export const DepartmentSummary: React.FC<DepartmentSummaryProps> = ({ summary, departmentName }) => {
  const stats = [
    {
      title: 'Total Requested',
      value: `$${summary.totalRequested.toLocaleString()}`,
      icon: Target,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Total Approved',
      value: `$${summary.totalApproved.toLocaleString()}`,
      icon: CheckCircle,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Total Spent',
      value: `$${summary.totalSpent.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
      subtitle: `${summary.spentPercentage.toFixed(1)}% of approved`
    },
    {
      title: 'Remaining Budget',
      value: `$${summary.totalRemaining.toLocaleString()}`,
      icon: summary.totalRemaining >= 0 ? TrendingUp : TrendingDown,
      color: summary.totalRemaining >= 0 ? 'bg-emerald-500' : 'bg-red-500',
      textColor: summary.totalRemaining >= 0 ? 'text-emerald-600' : 'text-red-600',
      subtitle: `${summary.remainingPercentage.toFixed(1)}% remaining`
    }
  ];

  const alerts = [
    {
      title: 'Critical Categories',
      count: summary.criticalCategories,
      color: 'text-red-600 bg-red-50',
      description: 'Over 80% spent'
    },
    {
      title: 'Under-utilized',
      count: summary.underutilizedCategories,
      color: 'text-green-600 bg-green-50',
      description: 'Less than 20% spent'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{departmentName} Budget Overview</h1>
          <p className="text-gray-600">Department-level budget tracking and analysis</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Total Categories</p>
          <p className="text-2xl font-bold text-gray-900">{summary.categoriesCount}</p>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className={`${stat.color} p-2 rounded-lg`}>
                <stat.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
            <p className={`text-xl font-bold ${stat.textColor}`}>{stat.value}</p>
            {stat.subtitle && (
              <p className={`text-sm ${stat.textColor} mt-1`}>{stat.subtitle}</p>
            )}
          </div>
        ))}
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Budget Utilization</span>
          <span className="text-sm text-gray-500">{summary.spentPercentage.toFixed(1)}% spent</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              summary.spentPercentage >= 80 
                ? 'bg-red-500' 
                : summary.spentPercentage >= 60 
                ? 'bg-yellow-500' 
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(summary.spentPercentage, 100)}%` }}
          />
        </div>
      </div>

      {/* Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.map((alert, index) => (
          <div key={index} className={`rounded-lg p-4 border ${alert.color}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{alert.title}</p>
                <p className="text-sm opacity-75">{alert.description}</p>
              </div>
              <div className="text-2xl font-bold">{alert.count}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};