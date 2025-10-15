import React, { useState } from 'react';
import { Search, Download, FileText, BarChart3, Users, Tag, Filter, X, ChevronDown } from 'lucide-react';
import { Budget, Actual, FilterOptions, TEAM_LIST, CATEGORY_LIST } from '../types/budget';
import { 
  calculateTeamAnalysis, 
  calculateCategoryAnalysis,
  formatCurrency, 
  formatPercentage,
  getReadableLabel,
  TeamAnalysis,
  CategoryAnalysis
} from '../utils/budgetCalculations';
import { TeamDrilldownModal } from './TeamDrilldownModal';
import { CategoryDrilldownModal } from './CategoryDrilldownModal';

interface AnalysisProps {
  budgets: Budget[];
  actuals: Actual[];
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
}

type AnalysisMode = 'team' | 'category';

export const Analysis: React.FC<AnalysisProps> = ({
  budgets,
  actuals,
  filters,
  onFiltersChange,
  onExportPDF,
  onExportExcel
}) => {
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('team');
  const [chartView, setChartView] = useState<ChartView>('top5');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRow, setSelectedRow] = useState<string | null>(null);
  const [drilldownTeam, setDrilldownTeam] = useState<string | null>(null);
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

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

  // Calculate analysis data
  const teamAnalysis = calculateTeamAnalysis(budgets, actuals, activeFilters);
  const categoryAnalysis = calculateCategoryAnalysis(budgets, actuals, activeFilters);

  // Filter data based on search
  const filteredTeamData = teamAnalysis.filter(team =>
    team.team.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCategoryData = categoryAnalysis.filter(category =>
    category.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle filter changes
  const handleYearChange = (year: number) => {
    const newYears = activeFilters.years.includes(year)
      ? activeFilters.years.filter(y => y !== year)
      : [...activeFilters.years, year];
    onFiltersChange({ ...activeFilters, years: newYears.sort((a, b) => a - b) });
  };

  const handleTeamChange = (team: string) => {
    const newTeams = activeFilters.teams.includes(team)
      ? activeFilters.teams.filter(t => t !== team)
      : [...activeFilters.teams, team];
    onFiltersChange({ ...activeFilters, teams: newTeams });
  };

  const handleCategoryChange = (category: string) => {
    const newCategories = activeFilters.categories.includes(category)
      ? activeFilters.categories.filter(c => c !== category)
      : [...activeFilters.categories, category];
    onFiltersChange({ ...activeFilters, categories: newCategories });
  };

  const handleRowClick = (item: TeamAnalysis | CategoryAnalysis) => {
    if (analysisMode === 'team') {
      const teamItem = item as TeamAnalysis;
      setSelectedRow(teamItem.team);
      setDrilldownTeam(teamItem.team);
    } else {
      const categoryItem = item as CategoryAnalysis;
      setSelectedRow(categoryItem.category);
      setDrilldownCategory(categoryItem.category);
    }
  };

  const handleExportPDF = () => {
    import('jspdf').then(({ default: jsPDF }) => {
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Header
      pdf.setFontSize(20);
      pdf.text(`${analysisMode === 'team' ? 'Team' : 'Category'} Analysis Report`, pageWidth / 2, 20, { align: 'center' });
      
      pdf.setFontSize(12);
      pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });
      
      // Filters
      pdf.setFontSize(14);
      pdf.text('Active Filters:', 20, 50);
      pdf.setFontSize(10);
      let yPos = 60;
      
      if (activeFilters.years.length > 0) {
        pdf.text(`Years: ${activeFilters.years.join(', ')}`, 20, yPos);
        yPos += 8;
      }
      if (activeFilters.halfFilter && activeFilters.halfFilter !== 'both') {
        pdf.text(`Half: ${activeFilters.halfFilter}`, 20, yPos);
        yPos += 8;
      }
      if (activeFilters.teams.length > 0) {
        pdf.text(`Teams: ${activeFilters.teams.join(', ')}`, 20, yPos);
        yPos += 8;
      }
      if (activeFilters.categories.length > 0) {
        pdf.text(`Categories: ${activeFilters.categories.slice(0, 3).join(', ')}${activeFilters.categories.length > 3 ? '...' : ''}`, 20, yPos);
        yPos += 8;
      }
      
      // Analysis Data
      yPos += 10;
      pdf.setFontSize(14);
      pdf.text(`${analysisMode === 'team' ? 'Team' : 'Category'} Analysis:`, 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(8);
      const data = analysisMode === 'team' ? filteredTeamData : filteredCategoryData;
      
      // Table headers
      const headers = [analysisMode === 'team' ? 'Team' : 'Category', 'Budget', 'Actual', 'Variance', 'Burn %'];
      const colWidths = [50, 30, 30, 30, 25];
      let xPos = 20;
      
      headers.forEach((header, index) => {
        pdf.text(header, xPos, yPos);
        xPos += colWidths[index];
      });
      
      yPos += 8;
      pdf.line(20, yPos - 3, pageWidth - 20, yPos - 3);
      
      // Table data
      data.slice(0, 25).forEach((item) => {
        if (yPos > 270) {
          pdf.addPage();
          yPos = 20;
        }
        
        xPos = 20;
        const totalBudget = analysisMode === 'team' ? item.totalBudget : item.h1Budget + item.h2Budget;
        const totalActual = analysisMode === 'team' ? item.totalActual : item.h1Actual + item.h2Actual;
        const totalVariance = analysisMode === 'team' ? item.totalVariance : item.totalVariance;
        const burnPercentage = analysisMode === 'team' ? item.burnPercentage : item.burnPercentage;
        
        const name = analysisMode === 'team' ? item.team : getReadableLabel(item.category).shortLabel;
        
        const rowData = [
          name.substring(0, 20),
          formatCurrency(totalBudget),
          formatCurrency(totalActual),
          formatCurrency(totalVariance),
          formatPercentage(burnPercentage)
        ];
        
        rowData.forEach((data, index) => {
          pdf.text(data, xPos, yPos);
          xPos += colWidths[index];
        });
        
        yPos += 8;
      });
      
      pdf.save(`${analysisMode === 'team' ? 'Team' : 'Category'}_Analysis_${new Date().toISOString().split('T')[0]}.pdf`);
    }).catch(error => {
      console.error('Error generating PDF:', error);
      alert('Error generating PDF. Please try again.');
    });
  };

  const handleExportExcel = () => {
    import('xlsx').then((XLSX) => {
      const wb = XLSX.utils.book_new();
      
      // Create summary sheet
      const summaryData = [
        [`${analysisMode === 'team' ? 'Team' : 'Category'} Analysis Summary`],
        ['Generated on:', new Date().toLocaleDateString()],
        [''],
        ['Active Filters:'],
        ['Years:', activeFilters.years.join(', ')],
        ['Half:', activeFilters.halfFilter || 'Both'],
        ['Teams:', activeFilters.teams.join(', ') || 'All'],
        ['Categories:', activeFilters.categories.length > 0 ? `${activeFilters.categories.length} selected` : 'All'],
        [''],
        ['Analysis Mode:', analysisMode === 'team' ? 'Team' : 'Category']
      ];
      
      const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
      
      // Create data sheet
      const data = analysisMode === 'team' ? filteredTeamData : filteredCategoryData;
      const sheetData = data.map(item => {
        if (analysisMode === 'team') {
          return {
            'Team': item.team,
            'H1 Budget': item.h1Budget,
            'H1 Actual': item.h1Actual,
            'H1 Variance': item.h1Variance,
            'H2 Budget': item.h2Budget,
            'H2 Actual': item.h2Actual,
            'H2 Variance': item.h2Variance,
            'Total Budget': item.totalBudget,
            'Total Actual': item.totalActual,
            'Total Variance': item.totalVariance,
            'Burn Percentage': `${item.burnPercentage.toFixed(2)}%`,
            'Has H1 Budget': item.hasH1Budget ? 'Yes' : 'No',
            'Has H2 Budget': item.hasH2Budget ? 'Yes' : 'No',
            'Has Unbudgeted H1': item.hasH1Unbudgeted ? 'Yes' : 'No',
            'Has Unbudgeted H2': item.hasH2Unbudgeted ? 'Yes' : 'No'
          };
        } else {
          return {
            'Category': item.category,
            'Teams': item.teams.join(', '),
            'H1 Budget': item.h1Budget,
            'H1 Actual': item.h1Actual,
            'H1 Variance': item.h1Variance,
            'H2 Budget': item.h2Budget,
            'H2 Actual': item.h2Actual,
            'H2 Variance': item.h2Variance,
            'Total Variance': item.totalVariance,
            'Burn Percentage': `${item.burnPercentage.toFixed(2)}%`,
            'Status': item.status
          };
        }
      });
      
      const dataWS = XLSX.utils.json_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(wb, dataWS, analysisMode === 'team' ? 'Teams' : 'Categories');
      
      XLSX.writeFile(wb, `${analysisMode === 'team' ? 'Team' : 'Category'}_Analysis_${new Date().toISOString().split('T')[0]}.xlsx`);
    }).catch(error => {
      console.error('Error generating Excel:', error);
      alert('Error generating Excel file. Please try again.');
    });
  };

  const getStatusBadge = (burnPercentage: number, hasUnbudgeted: boolean = false) => {
    if (hasUnbudgeted) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">⚠️ Unbudgeted</span>;
    }
    if (burnPercentage < 80) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">✅ Healthy</span>;
    } else if (burnPercentage <= 100) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">⚠️ Near Limit</span>;
    } else {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">❌ Overspent</span>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
          <span>Dashboard</span>
          <span>&gt;</span>
          <span className="text-gray-900">Analysis</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Team & Category Analysis</h1>
            <p className="text-gray-600">Detailed financial analysis with consolidated views</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
            <button
              onClick={handleExportPDF}
              className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>PDF</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Years */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Years</label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {availableYears.map(year => (
                  <label key={year} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={activeFilters.years.includes(year)}
                      onChange={() => handleYearChange(year)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{year}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Half Filter */}
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

            {/* Teams */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Teams</label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {TEAM_LIST.map(team => (
                  <label key={team} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={activeFilters.teams.includes(team)}
                      onChange={() => handleTeamChange(team)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{team}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categories</label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {CATEGORY_LIST.slice(0, 10).map(category => {
                  const { shortLabel } = getReadableLabel(category);
                  return (
                    <label key={category} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={activeFilters.categories.includes(category)}
                        onChange={() => handleCategoryChange(category)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700" title={category}>{shortLabel}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Mode Toggle and Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setAnalysisMode('team')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                analysisMode === 'team'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Teams</span>
            </button>
            <button
              onClick={() => setAnalysisMode('category')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                analysisMode === 'category'
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Tag className="w-4 h-4" />
              <span>Categories</span>
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${analysisMode}s...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2"
                >
                  <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div>
          {/* Consolidated Table */}
          <div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {analysisMode === 'team' ? 'Team' : 'Category'}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Budget</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actual</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Variance</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Burn %</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analysisMode === 'team' ? (
                    filteredTeamData.map((team) => (
                      <tr 
                        key={team.team} 
                        className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                          selectedRow === team.team ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => handleRowClick(team)}
                      >
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{team.team}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(team.totalBudget)}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(team.totalActual)}</td>
                        <td className={`px-4 py-3 text-sm text-right font-medium ${
                          team.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {team.totalVariance >= 0 ? '+' : ''}{formatCurrency(team.totalVariance)}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatPercentage(team.burnPercentage)}</td>
                        <td className="px-4 py-3">
                          {getStatusBadge(team.burnPercentage, team.hasH1Unbudgeted || team.hasH2Unbudgeted)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    filteredCategoryData.map((category) => {
                      const { shortLabel } = getReadableLabel(category.category);
                      const totalBudget = category.h1Budget + category.h2Budget;
                      const totalActual = category.h1Actual + category.h2Actual;
                      return (
                        <tr 
                          key={category.category} 
                          className={`hover:bg-gray-50 cursor-pointer transition-colors ${
                            selectedRow === category.category ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => handleRowClick(category)}
                        >
                          <td className="px-4 py-3 text-sm font-medium text-gray-900" >
                            {category.category
                            //shortLabel title={category.category}
                            }
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(totalBudget)}</td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatCurrency(totalActual)}</td>
                          <td className={`px-4 py-3 text-sm text-right font-medium ${
                            category.totalVariance >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {category.totalVariance >= 0 ? '+' : ''}{formatCurrency(category.totalVariance)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900 text-right">{formatPercentage(category.burnPercentage)}</td>
                          <td className="px-4 py-3">
                            {getStatusBadge(category.burnPercentage, category.status === 'no-budget')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {((analysisMode === 'team' && filteredTeamData.length === 0) || 
              (analysisMode === 'category' && filteredCategoryData.length === 0)) && (
              <div className="text-center py-8">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No {analysisMode} data for current filters</p>
                <button
                  onClick={() => {
                    setSearchTerm('');
                    onFiltersChange({ 
                      ...activeFilters, 
                      teams: [], 
                      categories: [],
                      halfFilter: 'both'
                    });
                  }}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Drilldown Modals */}
      <TeamDrilldownModal
        isOpen={!!drilldownTeam}
        onClose={() => {
          setDrilldownTeam(null);
          setSelectedRow(null);
        }}
        team={drilldownTeam || ''}
        budgets={budgets}
        actuals={actuals}
        filters={activeFilters}
      />

      <CategoryDrilldownModal
        isOpen={!!drilldownCategory}
        onClose={() => {
          setDrilldownCategory(null);
          setSelectedRow(null);
        }}
        category={drilldownCategory || ''}
        budgets={budgets}
        actuals={actuals}
        filters={activeFilters}
      />
    </div>
  );
};