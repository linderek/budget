import React from 'react';
import { BarChart3, PlusCircle, DollarSign, TrendingUp } from 'lucide-react';

interface NavigationProps {
  currentPage: 'dashboard' | 'budgets' | 'actuals' | 'analysis';
  onPageChange: (page: 'dashboard' | 'budgets' | 'actuals' | 'analysis') => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentPage, onPageChange }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, description: 'View analytics and reports' },
    { id: 'analysis', label: 'Analysis', icon: TrendingUp, description: 'Team & category analysis' },
    { id: 'budgets', label: 'Budget Input', icon: DollarSign, description: 'Manage H1/H2 budgets' },
    { id: 'actuals', label: 'Actuals Input', icon: PlusCircle, description: 'Record monthly expenses' }
  ];

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Budget Tracker Pro</h1>
            <p className="text-sm text-gray-500">H1/H2 Budget & Monthly Actuals Management</p>
          </div>
        </div>
        
        <nav className="flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-100 text-blue-700 border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
                title={item.description}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};