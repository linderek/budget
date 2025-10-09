import { Department, Alert, ForecastData } from '../types/budget';

export const departments: Department[] = [
  {
    id: '1',
    name: 'Marketing',
    totalBudget: 150000,
    totalActual: 142500,
    totalVariance: -7500,
    variancePercentage: -5.0,
    categories: [
      {
        id: '1',
        category: 'Digital Advertising',
        department: 'Marketing',
        budgetAmount: 80000,
        actualAmount: 78500,
        variance: -1500,
        variancePercentage: -1.9,
        period: 'Q1 2025',
        lastUpdated: new Date('2025-01-15T10:30:00')
      },
      {
        id: '2',
        category: 'Content Creation',
        department: 'Marketing',
        budgetAmount: 35000,
        actualAmount: 32000,
        variance: -3000,
        variancePercentage: -8.6,
        period: 'Q1 2025',
        lastUpdated: new Date('2025-01-15T09:15:00')
      },
      {
        id: '3',
        category: 'Events & Trade Shows',
        department: 'Marketing',
        budgetAmount: 35000,
        actualAmount: 32000,
        variance: -3000,
        variancePercentage: -8.6,
        period: 'Q1 2025',
        lastUpdated: new Date('2025-01-15T11:45:00')
      }
    ]
  },
  {
    id: '2',
    name: 'Sales',
    totalBudget: 200000,
    totalActual: 215000,
    totalVariance: 15000,
    variancePercentage: 7.5,
    categories: [
      {
        id: '4',
        category: 'Sales Commissions',
        department: 'Sales',
        budgetAmount: 120000,
        actualAmount: 135000,
        variance: 15000,
        variancePercentage: 12.5,
        period: 'Q1 2025',
        lastUpdated: new Date('2025-01-15T14:20:00')
      },
      {
        id: '5',
        category: 'Travel & Entertainment',
        department: 'Sales',
        budgetAmount: 50000,
        actualAmount: 48000,
        variance: -2000,
        variancePercentage: -4.0,
        period: 'Q1 2025',
        lastUpdated: new Date('2025-01-15T13:10:00')
      },
      {
        id: '6',
        category: 'Sales Tools & Software',
        department: 'Sales',
        budgetAmount: 30000,
        actualAmount: 32000,
        variance: 2000,
        variancePercentage: 6.7,
        period: 'Q1 2025',
        lastUpdated: new Date('2025-01-15T12:30:00')
      }
    ]
  },
  {
    id: '3',
    name: 'Operations',
    totalBudget: 300000,
    totalActual: 285000,
    totalVariance: -15000,
    variancePercentage: -5.0,
    categories: [
      {
        id: '7',
        category: 'Office Rent',
        department: 'Operations',
        budgetAmount: 120000,
        actualAmount: 120000,
        variance: 0,
        variancePercentage: 0,
        period: 'Q1 2025',
        lastUpdated: new Date('2025-01-15T08:00:00')
      },
      {
        id: '8',
        category: 'Utilities',
        department: 'Operations',
        budgetAmount: 25000,
        actualAmount: 22000,
        variance: -3000,
        variancePercentage: -12.0,
        period: 'Q1 2025',
        lastUpdated: new Date('2025-01-15T16:45:00')
      },
      {
        id: '9',
        category: 'Equipment & Maintenance',
        department: 'Operations',
        budgetAmount: 155000,
        actualAmount: 143000,
        variance: -12000,
        variancePercentage: -7.7,
        period: 'Q1 2025',
        lastUpdated: new Date('2025-01-15T15:20:00')
      }
    ]
  }
];

export const alerts: Alert[] = [
  {
    id: '1',
    type: 'critical',
    department: 'Sales',
    category: 'Sales Commissions',
    message: 'Sales Commissions exceeded budget by 12.5% ($15,000)',
    variance: 15000,
    timestamp: new Date('2025-01-15T14:20:00')
  },
  {
    id: '2',
    type: 'warning',
    department: 'Operations',
    category: 'Utilities',
    message: 'Utilities spending 12% under budget - investigate potential issues',
    variance: -3000,
    timestamp: new Date('2025-01-15T16:45:00')
  },
  {
    id: '3',
    type: 'warning',
    department: 'Marketing',
    category: 'Content Creation',
    message: 'Content Creation 8.6% under budget ($3,000)',
    variance: -3000,
    timestamp: new Date('2025-01-15T09:15:00')
  },
  {
    id: '4',
    type: 'info',
    department: 'Operations',
    category: 'Equipment & Maintenance',
    message: 'Equipment spending trending 7.7% under budget',
    variance: -12000,
    timestamp: new Date('2025-01-15T15:20:00')
  }
];

export const forecastData: ForecastData[] = [
  { month: 'Jan', projected: 180000, actual: 175000, budget: 185000 },
  { month: 'Feb', projected: 195000, actual: 190000, budget: 200000 },
  { month: 'Mar', projected: 210000, actual: 205000, budget: 215000 },
  { month: 'Apr', projected: 225000, actual: 0, budget: 230000 },
  { month: 'May', projected: 240000, actual: 0, budget: 245000 },
  { month: 'Jun', projected: 255000, actual: 0, budget: 260000 }
]