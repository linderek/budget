import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { BudgetCategory } from '../types/budget';

interface BudgetChartsProps {
  categories: BudgetCategory[];
}

export const BudgetCharts: React.FC<BudgetChartsProps> = ({ categories }) => {
  // Prepare data for bar chart
  const barChartData = categories.map(cat => ({
    name: cat.categoryCode,
    fullName: cat.category,
    requested: cat.requestedAmount,
    approved: cat.approvedAmount,
    spent: cat.amountSpentToDate,
    remaining: cat.remainingAmount
  }));

  // Prepare data for pie chart (spending by category)
  const pieChartData = categories.map(cat => ({
    name: cat.categoryCode,
    value: cat.amountSpentToDate,
    fullName: cat.category,
    percentage: cat.spentPercentage
  }));

  // Status distribution for pie chart
  const statusData = [
    { name: 'On Track', value: categories.filter(cat => cat.status === 'normal').length, color: '#6B7280' },
    { name: 'Warning', value: categories.filter(cat => cat.status === 'warning').length, color: '#F59E0B' },
    { name: 'Critical', value: categories.filter(cat => cat.status === 'critical').length, color: '#EF4444' },
    { name: 'Under-utilized', value: categories.filter(cat => cat.status === 'underutilized').length, color: '#10B981' }
  ].filter(item => item.value > 0);

  const COLORS = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6B7280', '#EC4899', '#14B8A6'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.fullName}</p>
          <div className="space-y-1 mt-2">
            {payload.map((entry: any, index: number) => (
              <p key={index} className="text-sm" style={{ color: entry.color }}>
                {entry.name}: ${entry.value.toLocaleString()}
              </p>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900">{data.fullName}</p>
          <p className="text-sm text-gray-600">
            Spent: ${data.value.toLocaleString()} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
      {/* Bar Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Budget vs Actual by Category</h3>
          <p className="text-sm text-gray-600">Comparison of requested, approved, and spent amounts</p>
        </div>
        <div id="budget-bar-chart" className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
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
              <Legend />
              <Bar dataKey="requested" fill="#93C5FD" name="Requested" />
              <Bar dataKey="approved" fill="#3B82F6" name="Approved" />
              <Bar dataKey="spent" fill="#1D4ED8" name="Spent" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Pie Chart - Spending Distribution */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Spending Distribution</h3>
          <p className="text-sm text-gray-600">Breakdown of spending by category</p>
        </div>
        <div id="budget-pie-chart" className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name} (${percentage.toFixed(1)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<PieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Status Distribution Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Category Status Distribution</h3>
          <p className="text-sm text-gray-600">Overview of category performance status</p>
        </div>
        <div className="flex items-center justify-center">
          <div id="status-pie-chart" className="h-64 w-96">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: any) => [`${value} categories`, 'Count']}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};