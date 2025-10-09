import React from 'react';
import { TrendingUp } from 'lucide-react';
import { ForecastData } from '../types/budget';

interface ForecastChartProps {
  data: ForecastData[];
}

export const ForecastChart: React.FC<ForecastChartProps> = ({ data }) => {
  const maxValue = Math.max(...data.map(d => Math.max(d.budget, d.projected, d.actual || 0)));
  
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Budget Forecast</h2>
          <p className="text-sm text-gray-500">6-month projection vs actual spending</p>
        </div>
        <TrendingUp className="w-6 h-6 text-blue-600" />
      </div>

      <div className="space-y-6">
        {data.map((item, index) => (
          <div key={item.month} className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">{item.month} 2025</span>
              <div className="flex items-center space-x-4 text-xs">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Budget: ${item.budget.toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span>Projected: ${item.projected.toLocaleString()}</span>
                </div>
                {item.actual > 0 && (
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span>Actual: ${item.actual.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-4">
                {/* Budget bar */}
                <div
                  className="absolute top-0 left-0 bg-blue-500 h-4 rounded-full opacity-30"
                  style={{ width: `${(item.budget / maxValue) * 100}%` }}
                />
                {/* Projected bar */}
                <div
                  className="absolute top-0 left-0 bg-purple-500 h-4 rounded-full opacity-60"
                  style={{ width: `${(item.projected / maxValue) * 100}%` }}
                />
                {/* Actual bar */}
                {item.actual > 0 && (
                  <div
                    className="absolute top-0 left-0 bg-green-500 h-4 rounded-full"
                    style={{ width: `${(item.actual / maxValue) * 100}%` }}
                  />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <div className="flex items-center space-x-2 mb-2">
          <TrendingUp className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-900">Forecast Insights</span>
        </div>
        <p className="text-sm text-blue-800">
          Based on current spending patterns, you're projected to be 3.2% under budget for Q2 2025. 
          Consider reallocating funds to high-performing departments.
        </p>
      </div>
    </div>
  );
};