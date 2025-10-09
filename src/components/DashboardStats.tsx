import React from 'react';
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react';
import { Department } from '../types/budget';

interface DashboardStatsProps {
  departments: Department[];
  activeAlerts: number;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ departments, activeAlerts }) => {
  const totalBudget = departments.reduce((sum, dept) => sum + dept.totalBudget, 0);
  const totalActual = departments.reduce((sum, dept) => sum + dept.totalActual, 0);
  const totalVariance = totalActual - totalBudget;
  const variancePercentage = (totalVariance / totalBudget) * 100;

  const stats = [
    {
      title: 'Total Budget',
      value: `$${totalBudget.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-blue-500',
      textColor: 'text-blue-600'
    },
    {
      title: 'Actual Spend',
      value: `$${totalActual.toLocaleString()}`,
      icon: TrendingUp,
      color: 'bg-green-500',
      textColor: 'text-green-600'
    },
    {
      title: 'Variance',
      value: `${totalVariance >= 0 ? '+' : ''}$${totalVariance.toLocaleString()}`,
      icon: totalVariance >= 0 ? TrendingUp : TrendingDown,
      color: totalVariance >= 0 ? 'bg-red-500' : 'bg-green-500',
      textColor: totalVariance >= 0 ? 'text-red-600' : 'text-green-600',
      subtitle: `${variancePercentage >= 0 ? '+' : ''}${variancePercentage.toFixed(1)}%`
    },
    {
      title: 'Active Alerts',
      value: activeAlerts.toString(),
      icon: AlertTriangle,
      color: 'bg-orange-500',
      textColor: 'text-orange-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 mb-1">{stat.title}</p>
              <p className={`text-2xl font-bold ${stat.textColor}`}>{stat.value}</p>
              {stat.subtitle && (
                <p className={`text-sm ${stat.textColor} mt-1`}>{stat.subtitle}</p>
              )}
            </div>
            <div className={`${stat.color} p-3 rounded-lg`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};