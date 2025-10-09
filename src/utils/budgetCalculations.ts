import { Budget, Actual, DashboardSummary, CategoryAnalysis, FilterOptions } from '../types/budget';

// Time grain utilities
export const getAllocatedMonth = (year: number, half: 'H1' | 'H2'): string => {
  const month = half === 'H1' ? '04' : '10'; // Midpoint months
  return `${year}-${month}`;
};

export const isAllocatedMonth = (dateString: string, half: 'H1' | 'H2'): boolean => {
  const month = getMonthFromDate(dateString);
  return (half === 'H1' && month === 4) || (half === 'H2' && month === 10);
};

export const getTimeGrainDefault = (budgets: Budget[], actuals: Actual[]): 'half-year' | 'whole-year' => {
  const actualsWithMonth = actuals.filter(a => a.date && a.date.includes('-')).length;
  const totalActuals = actuals.length;
  
  // If more than 30% have month data, default to half-year
  // Otherwise default to whole-year
  if (totalActuals > 0 && (actualsWithMonth / totalActuals) > 0.3) {
    return 'half-year';
  }
  return 'whole-year';
};

export const translateFiltersOnGrainChange = (
  filters: FilterOptions, 
  newGrain: 'half-year' | 'whole-year'
): FilterOptions => {
  const newFilters = { ...filters, timeGrain: newGrain };
  
  if (newGrain === 'half-year') {
    // Convert month range to half-year range if possible
    if (filters.monthRange) {
      const startYear = getYearFromDate(filters.monthRange.start);
      const startMonth = getMonthFromDate(filters.monthRange.start);
      const endYear = getYearFromDate(filters.monthRange.end);
      const endMonth = getMonthFromDate(filters.monthRange.end);
      
      newFilters.halfRange = {
        startYear,
        startHalf: startMonth <= 6 ? 'H1' : 'H2',
        endYear,
        endHalf: endMonth <= 6 ? 'H1' : 'H2'
      };
    }
    delete newFilters.monthRange;
  } else {
    // Whole-year mode - clear both month and half ranges
    delete newFilters.monthRange;
    delete newFilters.halfRange;
  }
  
  return newFilters;
};

export const getHalfFromMonth = (month: number): 'H1' | 'H2' => {
  return month <= 6 ? 'H1' : 'H2';
};

export const getYearFromDate = (dateString: string): number => {
  return parseInt(dateString.split('-')[0]);
};

export const getMonthFromDate = (dateString: string): number => {
  return parseInt(dateString.split('-')[1]);
};

export const formatTimeGrainLabel = (
  timeGrain: 'half-year' | 'whole-year',
  year: number,
  half?: 'H1' | 'H2',
  month?: number
): string => {
  if (timeGrain === 'half-year' && half) {
    return `${year}-${half}`;
  }
  if (timeGrain === 'whole-year') {
    return `${year}`;
  }
  return `${year}`;
};

export const calculateMoMDelta = (
  current: number,
  previous: number | null,
  isAllocated: boolean = false
): number | null => {
  if (previous === null || isAllocated) return null;
  return current - previous;
};

export const calculateHoHDelta = (
  current: number,
  previousHalf: number | null
): number | null => {
  if (previousHalf === null) return null;
  return current - previousHalf;
};

export const calculateDashboardSummary = (
  budgets: Budget[],
  actuals: Actual[],
  filters: FilterOptions
): DashboardSummary => {
  // Filter budgets
  const filteredBudgets = budgets.filter(budget => {
    if (!filters.years.includes(budget.year)) return false;
    if (filters.teams.length > 0 && !budget.team.some(team => filters.teams.includes(team))) return false;
    if (filters.categories.length > 0 && !filters.categories.includes(budget.category)) return false;
    
    // Apply time grain filters
    if (filters.timeGrain === 'monthly' && filters.monthRange) {
      const startYear = getYearFromDate(filters.monthRange.start);
      const endYear = getYearFromDate(filters.monthRange.end);
      if (budget.year < startYear || budget.year > endYear) return false;
    }
    if (filters.timeGrain === 'half-year' && filters.halfRange) {
      const { startYear, startHalf, endYear, endHalf } = filters.halfRange;
      if (budget.year < startYear || budget.year > endYear) return false;
    }
    
    // Apply half filter
    if (filters.halfFilter && filters.halfFilter !== 'both') {
      // For budgets, check if they have the relevant half budget
      if (filters.halfFilter === 'H1' && budget.h1Budget === 0) return false;
      if (filters.halfFilter === 'H2' && budget.h2Budget === 0) return false;
    }
    
    return true;
  });

  // Filter actuals
  const filteredActuals = actuals.filter(actual => {
    if (!filters.years.includes(actual.year)) return false;
    if (filters.teams.length > 0 && !actual.team.some(team => filters.teams.includes(team))) return false;
    if (filters.categories.length > 0 && !filters.categories.includes(actual.category)) return false;
    
    // Apply time grain filters
    if (filters.timeGrain === 'monthly' && filters.monthRange) {
      const { start, end } = filters.monthRange;
      if (actual.date < start || actual.date > end) return false;
    }
    if (filters.timeGrain === 'half-year' && filters.halfRange) {
      const { startYear, startHalf, endYear, endHalf } = filters.halfRange;
      if (actual.year < startYear || actual.year > endYear) return false;
      if (actual.year === startYear && actual.half < startHalf) return false;
      if (actual.year === endYear && actual.half > endHalf) return false;
    }
    
    // Apply half filter
    if (filters.halfFilter && filters.halfFilter !== 'both') {
      if (actual.half !== filters.halfFilter) return false;
    }
    
    return true;
  });

  const h1Budget = filteredBudgets.reduce((sum, budget) => sum + budget.h1Budget, 0);
  const h2Budget = filteredBudgets.reduce((sum, budget) => sum + budget.h2Budget, 0);
  const totalBudget = h1Budget + h2Budget;

  const h1Actuals = filteredActuals.filter(actual => actual.half === 'H1').reduce((sum, actual) => sum + actual.amount, 0);
  const h2Actuals = filteredActuals.filter(actual => actual.half === 'H2').reduce((sum, actual) => sum + actual.amount, 0);
  const totalActuals = h1Actuals + h2Actuals;

  const h1Variance = h1Budget - h1Actuals;
  const h2Variance = h2Budget - h2Actuals;
  const totalVariance = totalBudget - totalActuals;

  const burnPercentage = totalBudget > 0 ? (totalActuals / totalBudget) * 100 : 0;

  return {
    h1Budget,
    h2Budget,
    totalBudget,
    h1Actuals,
    h2Actuals,
    totalActuals,
    h1Variance,
    h2Variance,
    totalVariance,
    burnPercentage
  };
};

export const calculateCategoryAnalysis = (
  budgets: Budget[],
  actuals: Actual[],
  filters: FilterOptions
): CategoryAnalysis[] => {
  // Filter data
  const filteredBudgets = budgets.filter(budget => {
    if (!filters.years.includes(budget.year)) return false;
    if (filters.teams.length > 0 && !budget.team.some(team => filters.teams.includes(team))) return false;
    if (filters.categories.length > 0 && !filters.categories.includes(budget.category)) return false;
    
    // Apply half filter
    if (filters.halfFilter && filters.halfFilter !== 'both') {
      if (filters.halfFilter === 'H1' && budget.h1Budget === 0) return false;
      if (filters.halfFilter === 'H2' && budget.h2Budget === 0) return false;
    }
    
    return true;
  });

  const filteredActuals = actuals.filter(actual => {
    if (!filters.years.includes(actual.year)) return false;
    if (filters.teams.length > 0 && !actual.team.some(team => filters.teams.includes(team))) return false;
    if (filters.categories.length > 0 && !filters.categories.includes(actual.category)) return false;
    
    // Apply half filter
    if (filters.halfFilter && filters.halfFilter !== 'both') {
      if (actual.half !== filters.halfFilter) return false;
    }
    
    return true;
  });

  // Group by category
  const categoryMap = new Map<string, CategoryAnalysis>();

  // Process budgets
  filteredBudgets.forEach(budget => {
    const existing = categoryMap.get(budget.category);
    if (existing) {
      existing.h1Budget += budget.h1Budget;
      existing.h2Budget += budget.h2Budget;
      existing.teams = [...new Set([...existing.teams, ...budget.team])];
    } else {
      categoryMap.set(budget.category, {
        category: budget.category,
        teams: [...budget.team],
        h1Budget: budget.h1Budget,
        h1Actual: 0,
        h1Variance: 0,
        h2Budget: budget.h2Budget,
        h2Actual: 0,
        h2Variance: 0,
        totalVariance: 0,
        burnPercentage: 0,
        status: 'normal'
      });
    }
  });

  // Process actuals
  filteredActuals.forEach(actual => {
    const existing = categoryMap.get(actual.category);
    if (existing) {
      if (actual.half === 'H1') {
        existing.h1Actual += actual.amount;
      } else {
        existing.h2Actual += actual.amount;
      }
      existing.teams = [...new Set([...existing.teams, ...actual.team])];
    } else {
      // Category has actuals but no budget
      categoryMap.set(actual.category, {
        category: actual.category,
        teams: [...actual.team],
        h1Budget: 0,
        h1Actual: actual.half === 'H1' ? actual.amount : 0,
        h1Variance: 0,
        h2Budget: 0,
        h2Actual: actual.half === 'H2' ? actual.amount : 0,
        h2Variance: 0,
        totalVariance: 0,
        burnPercentage: 0,
        status: 'no-budget'
      });
    }
  });

  // Calculate variances and status
  const result = Array.from(categoryMap.values()).map(category => {
    category.h1Variance = category.h1Budget - category.h1Actual;
    category.h2Variance = category.h2Budget - category.h2Actual;
    category.totalVariance = category.h1Variance + category.h2Variance;
    
    const totalBudget = category.h1Budget + category.h2Budget;
    const totalActual = category.h1Actual + category.h2Actual;
    category.burnPercentage = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

    // Determine status
    if (totalBudget === 0 && totalActual > 0) {
      category.status = 'no-budget';
    } else if (category.burnPercentage >= 80) {
      category.status = 'at-risk';
    } else if (category.burnPercentage <= 20 && totalActual > 0) {
      category.status = 'under-utilized';
    } else {
      category.status = 'normal';
    }

    return category;
  });

  // Sort by burn percentage descending (highest risk first)
  return result.sort((a, b) => b.burnPercentage - a.burnPercentage);
};

export const getMonthlyActuals = (
  actuals: Actual[],
  filters: FilterOptions
): { month: string; amount: number; isAllocated?: boolean; half?: 'H1' | 'H2' }[] => {
  const filteredActuals = actuals.filter(actual => {
    if (!filters.years.includes(actual.year)) return false;
    if (filters.teams.length > 0 && !actual.team.some(team => filters.teams.includes(team))) return false;
    if (filters.categories.length > 0 && !filters.categories.includes(actual.category)) return false;
    
    // Apply half filter
    if (filters.halfFilter && filters.halfFilter !== 'both') {
      if (actual.half !== filters.halfFilter) return false;
    }
    
    return true;
  });

  if (filters.timeGrain === 'half-year') {
    // Half-year mode
    const halfYearData: { month: string; amount: number }[] = [];
    
    filters.years.forEach(year => {
      if (!filters.halfFilter || filters.halfFilter === 'both' || filters.halfFilter === 'H1') {
        halfYearData.push({ month: `${year}-H1`, amount: 0 });
      }
      if (!filters.halfFilter || filters.halfFilter === 'both' || filters.halfFilter === 'H2') {
        halfYearData.push({ month: `${year}-H2`, amount: 0 });
      }
    });

    filteredActuals.forEach(actual => {
      const halfData = halfYearData.find(h => h.month === `${actual.year}-${actual.half}`);
      if (halfData) {
        halfData.amount += actual.amount;
      }
    });

    return halfYearData;
  } else {
    // Whole-year mode
    const yearlyData: { month: string; amount: number }[] = [];
    
    filters.years.forEach(year => {
      yearlyData.push({ month: `${year}`, amount: 0 });
    });

    filteredActuals.forEach(actual => {
      const yearData = yearlyData.find(y => y.month === `${actual.year}`);
      if (yearData) {
        yearData.amount += actual.amount;
      }
    });

    return yearlyData;
  }
};

export interface TeamAnalysis {
  team: string;
  h1Budget: number;
  h1Actual: number;
  h1Variance: number;
  h2Budget: number;
  h2Actual: number;
  h2Variance: number;
  totalBudget: number;
  totalActual: number;
  totalVariance: number;
  burnPercentage: number;
  hasH1Budget: boolean;
  hasH2Budget: boolean;
  hasH1Unbudgeted: boolean;
  hasH2Unbudgeted: boolean;
}

export const calculateTeamAnalysis = (
  budgets: Budget[],
  actuals: Actual[],
  filters: FilterOptions
): TeamAnalysis[] => {
  // Filter data
  const filteredBudgets = budgets.filter(budget => {
    if (!filters.years.includes(budget.year)) return false;
    if (filters.teams.length > 0 && !budget.team.some(team => filters.teams.includes(team))) return false;
    if (filters.categories.length > 0 && !filters.categories.includes(budget.category)) return false;
    
    // Apply half filter
    if (filters.halfFilter && filters.halfFilter !== 'both') {
      if (filters.halfFilter === 'H1' && budget.h1Budget === 0) return false;
      if (filters.halfFilter === 'H2' && budget.h2Budget === 0) return false;
    }
    
    return true;
  });

  const filteredActuals = actuals.filter(actual => {
    if (!filters.years.includes(actual.year)) return false;
    if (filters.teams.length > 0 && !actual.team.some(team => filters.teams.includes(team))) return false;
    if (filters.categories.length > 0 && !filters.categories.includes(actual.category)) return false;
    
    // Apply half filter
    if (filters.halfFilter && filters.halfFilter !== 'both') {
      if (actual.half !== filters.halfFilter) return false;
    }
    
    return true;
  });

  // Get all teams from both budgets and actuals
  const allTeams = new Set<string>();
  filteredBudgets.forEach(budget => budget.team.forEach(team => allTeams.add(team)));
  filteredActuals.forEach(actual => actual.team.forEach(team => allTeams.add(team)));

  const teamAnalysis: TeamAnalysis[] = Array.from(allTeams).map(team => {
    // Calculate budgets for this team
    const teamBudgets = filteredBudgets.filter(budget => budget.team.includes(team));
    const h1Budget = teamBudgets.reduce((sum, budget) => sum + (budget.h1Budget || 0), 0);
    const h2Budget = teamBudgets.reduce((sum, budget) => sum + (budget.h2Budget || 0), 0);
    const totalBudget = h1Budget + h2Budget;

    // Calculate actuals for this team
    const teamActuals = filteredActuals.filter(actual => actual.team.includes(team));
    const h1Actual = teamActuals.filter(actual => actual.half === 'H1').reduce((sum, actual) => sum + actual.amount, 0);
    const h2Actual = teamActuals.filter(actual => actual.half === 'H2').reduce((sum, actual) => sum + actual.amount, 0);
    const totalActual = h1Actual + h2Actual;

    // Calculate variances
    const h1Variance = h1Budget - h1Actual;
    const h2Variance = h2Budget - h2Actual;
    const totalVariance = totalBudget - totalActual;

    // Calculate burn percentage
    const burnPercentage = totalBudget > 0 ? (totalActual / totalBudget) * 100 : 0;

    // Check for budget existence and unbudgeted spend
    const hasH1Budget = h1Budget > 0;
    const hasH2Budget = h2Budget > 0;
    const hasH1Unbudgeted = !hasH1Budget && h1Actual > 0;
    const hasH2Unbudgeted = !hasH2Budget && h2Actual > 0;

    return {
      team,
      h1Budget,
      h1Actual,
      h1Variance,
      h2Budget,
      h2Actual,
      h2Variance,
      totalBudget,
      totalActual,
      totalVariance,
      burnPercentage,
      hasH1Budget,
      hasH2Budget,
      hasH1Unbudgeted,
      hasH2Unbudgeted
    };
  });

  // Sort by burn percentage descending, then total variance ascending (risk first)
  return teamAnalysis.sort((a, b) => {
    if (b.burnPercentage !== a.burnPercentage) {
      return b.burnPercentage - a.burnPercentage;
    }
    return a.totalVariance - b.totalVariance;
  });
};

export const getTeamMonthlyActuals = (
  actuals: Actual[],
  filters: FilterOptions,
  team: string
): { month: string; amount: number }[] => {
  const filteredActuals = actuals.filter(actual => {
    if (!filters.years.includes(actual.year)) return false;
    if (!actual.team.includes(team)) return false;
    if (filters.categories.length > 0 && !filters.categories.includes(actual.category)) return false;
    
    // Apply half filter
    if (filters.halfFilter && filters.halfFilter !== 'both') {
      if (actual.half !== filters.halfFilter) return false;
    }
    
    return true;
  });

  // Create monthly data for all selected years
  const monthlyData: { month: string; amount: number }[] = [];
  
  filters.years.forEach(year => {
    for (let i = 0; i < 12; i++) {
      monthlyData.push({
        month: new Date(year, i, 1).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        amount: 0
      });
    }
  });

  filteredActuals.forEach(actual => {
    const monthLabel = new Date(actual.year, getMonthFromDate(actual.date) - 1, 1)
      .toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    const monthData = monthlyData.find(m => m.month === monthLabel);
    if (monthData) {
      monthData.amount += actual.amount;
    }
  });

  return monthlyData;
};

export const getTeamCategoryBreakdown = (
  budgets: Budget[],
  actuals: Actual[],
  filters: FilterOptions,
  team: string
): CategoryAnalysis[] => {
  const teamFilters = { ...filters, teams: [team] };
  return calculateCategoryAnalysis(budgets, actuals, teamFilters);
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatPercentage = (percentage: number): string => {
  return `${percentage.toFixed(2)}%`;
};

export const formatBudgetDisplay = (amount: number, hasBudget: boolean): string => {
  if (!hasBudget && amount === 0) return 'N/A';
  return formatCurrency(amount);
};

export const shortenCategory = (label: string): { display: string; full: string } => {
  const full = label.trim();
  
  // Split on various dash patterns
  const dashPatterns = [' – ', ' - ', '–', '-'];
  let display = full;
  
  for (const pattern of dashPatterns) {
    if (full.includes(pattern)) {
      const parts = full.split(pattern);
      if (parts.length > 1 && parts[1].trim()) {
        display = parts[1].trim();
        break;
      }
    }
  }
  
  // Collapse whitespace and limit length
  display = display.replace(/\s+/g, ' ').trim();
  if (display.length > 18) {
    display = display.substring(0, 15) + '...';
  }
  
  return { display, full };
};

export const getReadableLabel = (fullLabel: string): { shortLabel: string; alias: string; tooltip: string } => {
  const { display, full } = shortenCategory(fullLabel);
  
  // Create alias by removing filler words and abbreviating
  const fillerWords = ['and', 'of', 'the', 'costs', 'fees', 'expenses', 'services', 'management', 'administration'];
  let alias = display;
  
  // Remove filler words
  fillerWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    alias = alias.replace(regex, '').replace(/\s+/g, ' ').trim();
  });
  
  // If still too long, create smart abbreviation
  if (alias.length > 22) {
    const words = alias.split(' ');
    if (words.length > 1) {
      // Take first letter of each word except the last, keep last word full
      const abbreviated = words.slice(0, -1).map(w => w.charAt(0).toUpperCase()).join('') + ' ' + words[words.length - 1];
      alias = abbreviated.length <= 22 ? abbreviated : alias.substring(0, 20) + '...';
    } else {
      alias = alias.substring(0, 20) + '...';
    }
  }
  
  return {
    shortLabel: display,
    alias: alias,
    tooltip: full
  };
};

export const getStatusBadge = (burnPercentage: number): { icon: string; color: string; label: string } => {
  if (burnPercentage < 80) {
    return { icon: '✅', color: 'text-green-600 bg-green-100', label: 'Healthy' };
  } else if (burnPercentage <= 100) {
    return { icon: '⚠️', color: 'text-amber-600 bg-amber-100', label: 'Near Limit' };
  } else {
    return { icon: '❌', color: 'text-red-600 bg-red-100', label: 'Overspent' };
  }
};
export const getBurnRateDisplay = (totalActual: number, totalBudget: number): string => {
  if (totalBudget === 0) {
    if (totalActual > 0) return 'Overspend w/o Budget';
    return 'N/A';
  }
  return formatPercentage((totalActual / totalBudget) * 100);
};

export const getBurnRateColor = (totalActual: number, totalBudget: number): string => {
  if (totalBudget === 0) {
    if (totalActual > 0) return 'text-red-600 bg-red-50';
    return 'text-gray-600 bg-gray-50';
  }
  
  const burnPercentage = (totalActual / totalBudget) * 100;
  if (burnPercentage >= 80) return 'text-red-600 bg-red-50';
  if (burnPercentage <= 20) return 'text-green-600 bg-green-50';
  return 'text-gray-900 bg-gray-50';
};

export const getStatusColor = (status: CategoryAnalysis['status']) => {
  switch (status) {
    case 'at-risk':
      return 'bg-red-50 text-red-800 border-red-200';
    case 'under-utilized':
      return 'bg-green-50 text-green-800 border-green-200';
    case 'no-budget':
      return 'bg-orange-50 text-orange-800 border-orange-200';
    default:
      return 'bg-gray-50 text-gray-800 border-gray-200';
  }
};

export const duplicateLastYearBudgets = (budgets: Budget[], fromYear: number, toYear: number): Budget[] => {
  const lastYearBudgets = budgets.filter(budget => budget.year === fromYear);
  
  return lastYearBudgets.map(budget => ({
    ...budget,
    id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
    year: toYear,
    notes: `Duplicated from ${fromYear}: ${budget.notes}`,
    createdAt: new Date(),
    updatedAt: new Date()
  }));
};