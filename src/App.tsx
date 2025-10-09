import React, { useState } from 'react';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { Analysis } from './components/Analysis';
import { BudgetInput } from './components/BudgetInput';
import { ActualsInput } from './components/ActualsInput';
import { Budget, Actual, FilterOptions } from './types/budget';
import { sampleBudgets, sampleActuals } from './data/sampleData';
import { duplicateLastYearBudgets } from './utils/budgetCalculations';
import { getTimeGrainDefault } from './utils/budgetCalculations';

function App() {
  const [currentPage, setCurrentPage] = useState<'dashboard' | 'budgets' | 'actuals' | 'analysis'>('dashboard');
  const [budgets, setBudgets] = useState<Budget[]>(sampleBudgets);
  const [actuals, setActuals] = useState<Actual[]>(sampleActuals);
  
  const [filters, setFilters] = useState<FilterOptions>(() => {
    // Get saved time grain preference or determine default
    const savedTimeGrain = localStorage.getItem('budgetTracker_timeGrain') as 'half-year' | 'whole-year' | null;
    const savedYearSelectionMode = localStorage.getItem('budgetTracker_yearSelectionMode') as 'multi-select' | 'range' | null;
    const defaultTimeGrain = savedTimeGrain || getTimeGrainDefault(sampleBudgets, sampleActuals);
    
    return {
      years: [],
      yearSelectionMode: savedYearSelectionMode || 'multi-select',
      teams: [],
      categories: [],
      timeGrain: defaultTimeGrain,
      halfFilter: 'both'
    };
  });

  // Budget management
  const handleAddBudget = (budgetData: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newBudget: Budget = {
      ...budgetData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setBudgets(prev => [...prev, newBudget]);
  };

  const handleUpdateBudget = (id: string, budgetData: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => {
    setBudgets(prev => prev.map(budget => 
      budget.id === id 
        ? { ...budget, ...budgetData, updatedAt: new Date() }
        : budget
    ));
  };

  const handleDeleteBudget = (id: string) => {
    if (confirm('Are you sure you want to delete this budget?')) {
      setBudgets(prev => prev.filter(budget => budget.id !== id));
    }
  };

  const handleDuplicateYear = (fromYear: number, toYear: number) => {
    const duplicatedBudgets = duplicateLastYearBudgets(budgets, fromYear, toYear);
    setBudgets(prev => [...prev, ...duplicatedBudgets]);
  };

  // Actuals management
  const handleAddActual = (actualData: Omit<Actual, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newActual: Actual = {
      ...actualData,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setActuals(prev => [...prev, newActual]);
  };

  const handleUpdateActual = (id: string, actualData: Omit<Actual, 'id' | 'createdAt' | 'updatedAt'>) => {
    setActuals(prev => prev.map(actual => 
      actual.id === id 
        ? { ...actual, ...actualData, updatedAt: new Date() }
        : actual
    ));
  };

  const handleDeleteActual = (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      setActuals(prev => prev.filter(actual => actual.id !== id));
    }
  };

  // Success toast handler
  const showSuccessToast = (message: string) => {
    // In a real app, you'd use a toast library
    alert(message);
  };

  // Export functions
  const handleExportCSV = () => {
    const csvData = [
      ['Type', 'Year', 'Team', 'Category', 'H1 Budget', 'H2 Budget', 'Annual Budget', 'Date', 'Amount', 'Description']
    ];

    // Add budget data
    budgets.forEach(budget => {
      csvData.push([
        'Budget',
        budget.year.toString(),
        budget.team.join('; '),
        budget.category,
        budget.h1Budget.toString(),
        budget.h2Budget.toString(),
        budget.annualBudget.toString(),
        '',
        '',
        budget.notes
      ]);
    });

    // Add actual data
    actuals.forEach(actual => {
      csvData.push([
        'Actual',
        actual.year.toString(),
        actual.team.join('; '),
        actual.category,
        '',
        '',
        '',
        actual.date,
        actual.amount.toString(),
        actual.description
      ]);
    });

    // Convert to CSV string
    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Budget_Data_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    import('jspdf').then(({ default: jsPDF }) => {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Header
      pdf.setFontSize(20);
      pdf.text('Budget Tracker Pro - Data Export', pageWidth / 2, 20, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });
      
      // Summary
      pdf.setFontSize(14);
      pdf.text('Data Summary:', 20, 50);
      
      pdf.setFontSize(10);
      let yPos = 65;
      const summaryData = [
        ['Total Budgets:', budgets.length.toString()],
        ['Total Actuals:', actuals.length.toString()],
        ['Years Covered:', [...new Set([...budgets.map(b => b.year), ...actuals.map(a => a.year)])].sort().join(', ')],
        ['Teams:', [...new Set([...budgets.flatMap(b => b.team), ...actuals.flatMap(a => a.team)])].length.toString()],
        ['Categories:', [...new Set([...budgets.map(b => b.category), ...actuals.map(a => a.category)])].length.toString()]
      ];
      
      summaryData.forEach(([label, value]) => {
        pdf.text(label, 20, yPos);
        pdf.text(value, 100, yPos);
        yPos += 8;
      });
      
      // Budget Summary by Year
      yPos += 10;
      pdf.setFontSize(14);
      pdf.text('Budget Summary by Year:', 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(8);
      const yearSummary = [...new Set(budgets.map(b => b.year))].sort().map(year => {
        const yearBudgets = budgets.filter(b => b.year === year);
        const yearActuals = actuals.filter(a => a.year === year);
        const totalBudget = yearBudgets.reduce((sum, b) => sum + b.annualBudget, 0);
        const totalActual = yearActuals.reduce((sum, a) => sum + a.amount, 0);
        
        return {
          year,
          budget: totalBudget,
          actual: totalActual,
          variance: totalBudget - totalActual
        };
      });
      
      // Table headers
      const headers = ['Year', 'Budget', 'Actual', 'Variance'];
      const colWidths = [30, 40, 40, 40];
      let xPos = 20;
      
      headers.forEach((header, index) => {
        pdf.text(header, xPos, yPos);
        xPos += colWidths[index];
      });
      
      yPos += 8;
      pdf.line(20, yPos - 3, pageWidth - 20, yPos - 3);
      
      // Table data
      yearSummary.forEach((item) => {
        xPos = 20;
        const rowData = [
          item.year.toString(),
          `$${item.budget.toLocaleString()}`,
          `$${item.actual.toLocaleString()}`,
          `$${item.variance.toLocaleString()}`
        ];
        
        rowData.forEach((data, index) => {
          pdf.text(data, xPos, yPos);
          xPos += colWidths[index];
        });
        
        yPos += 8;
      });
      
      pdf.save(`Budget_Data_Export_${new Date().toISOString().split('T')[0]}.pdf`);
    }).catch(error => {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation currentPage={currentPage} onPageChange={setCurrentPage} />
      
      <main>
        {currentPage === 'dashboard' && (
          <Dashboard
            budgets={budgets}
            actuals={actuals}
            filters={filters}
            onFiltersChange={setFilters}
            onExportCSV={handleExportCSV}
            onExportPDF={handleExportPDF}
          />
        )}
        
        {currentPage === 'analysis' && (
          <Analysis
            budgets={budgets}
            actuals={actuals}
            filters={filters}
            onFiltersChange={setFilters}
            onExportPDF={handleExportPDF}
            onExportExcel={handleExportCSV}
          />
        )}
        
        {currentPage === 'budgets' && (
          <BudgetInput
            budgets={budgets}
            onAddBudget={handleAddBudget}
            onUpdateBudget={handleUpdateBudget}
            onDeleteBudget={handleDeleteBudget}
            onDuplicateYear={handleDuplicateYear}
          />
        )}
        
        {currentPage === 'actuals' && (
          <ActualsInput
            actuals={actuals}
            onAddActual={handleAddActual}
            onUpdateActual={handleUpdateActual}
            onDeleteActual={handleDeleteActual}
          />
        )}
      </main>
    </div>
  );
}

export default App;