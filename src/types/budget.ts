export interface Budget {
  id: string;
  year: number;
  team: string[];
  category: string;
  h1Budget: number; // Jan-Jun
  h2Budget: number; // Jul-Dec
  annualBudget: number; // Computed: H1 + H2
  notes: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Actual {
  id: string;
  date: string; // YYYY-MM format
  year: number; // Auto from date
  half: 'H1' | 'H2'; // Auto: H1 if month 1-6, H2 if month 7-12
  team: string[];
  category: string;
  amount: number;
  description: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardSummary {
  h1Budget: number;
  h2Budget: number;
  totalBudget: number;
  h1Actuals: number;
  h2Actuals: number;
  totalActuals: number;
  h1Variance: number;
  h2Variance: number;
  totalVariance: number;
  burnPercentage: number;
}

export interface CategoryAnalysis {
  category: string;
  teams: string[];
  h1Budget: number;
  h1Actual: number;
  h1Variance: number;
  h2Budget: number;
  h2Actual: number;
  h2Variance: number;
  totalVariance: number;
  burnPercentage: number;
  status: 'normal' | 'at-risk' | 'under-utilized' | 'no-budget';
}

export interface FilterOptions {
  years: number[];
  yearSelectionMode: 'multi-select' | 'range';
  teams: string[];
  categories: string[];
  timeGrain: 'half-year' | 'whole-year'|'monthly';
  halfFilter?: 'H1' | 'H2' | 'both';
  monthRange?: {
    start: string; // YYYY-MM
    end: string;   // YYYY-MM
  };
  halfRange?: {
    startYear: number;
    startHalf: 'H1' | 'H2';
    endYear: number;
    endHalf: 'H1' | 'H2';
  };
}

// Controlled lists
export const CATEGORY_LIST = [
  'OPEX - Office Supplies',
  'OPEX - Utilities',
  'OPEX - Rent or Lease Costs',
  'OPEX - Maintenance and Repairs',
  'OPEX - Transportation Costs',
  'CAPEX - Equipment Purchase',
  'CAPEX - Infrastructure Upgrades',
  'CAPEX - IT Hardware and Systems',
  'CAPEX - Furniture and Fixtures',
  'CAPEX - Real Estate Investments',
  'EE - Salaries and Wages',
  'EE - Employee Benefits',
  'EE - Training and Development',
  'EE - Recruitment Costs',
  'EE - Team Building Activities',
  'EE - Salary Increment Plan',
  'MKT - Digital Advertising',
  'MKT - Content Creation',
  'MKT - Event Sponsorships',
  'MKT - Trade Shows and Exhibitions',
  'MKT - Marketing Merchandise',
  'TEC - Software Subscriptions / SaaS Licenses',
  'TEC - IT Support Services',
  'TEC - Cybersecurity Tools',
  'COM - Regulatory Compliance Fees',
  'COM - Licenses and Permits',
  'COM - Legal Consultation Fees',
  'COM - Audit Services',
  'TEEX - Business Travel',
  'TEEX - Client Entertainment',
  'TEEX - Meals and Hospitality',
  'MISC - Contingency Funds',
  'MISC - Donations and Sponsorships',
  'MISC - Unexpected Expenses',
  'MISC - Miscellaneous Administrative Costs'
];

export const TEAM_LIST = [
  'Finance',
  'Marketing',
  'Business Development',
  'Strategy',
  'Product & Engineering',
  'People & Culture',
  'Account Management',
  'Compliance',
  'Solutions'
];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];