import React from 'react';
import { TrendingUp, Bell, Settings, User, Upload, Plus } from 'lucide-react';

interface HeaderProps {
  activeAlerts: number;
  onUploadClick: () => void;
  onAddBudgetClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeAlerts, onUploadClick, onAddBudgetClick }) => {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">BudgetLive</h1>
            <p className="text-sm text-gray-500">Dynamic Budget Tracking</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={onAddBudgetClick}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">Add Budget</span>
          </button>
          <button
            onClick={onUploadClick}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm font-medium">Upload Data</span>
          </button>
          <div className="relative">
            <Bell className="w-6 h-6 text-gray-600 hover:text-gray-900 cursor-pointer transition-colors" />
            {activeAlerts > 0 && (
              <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeAlerts}
              </span>
            )}
          </div>
          <Settings className="w-6 h-6 text-gray-600 hover:text-gray-900 cursor-pointer transition-colors" />
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-gray-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Finance Team</span>
          </div>
        </div>
      </div>
    </header>
  );
};