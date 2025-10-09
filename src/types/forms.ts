export interface BudgetFormData {
  department: string;
  category: string;
  budgetAmount: number;
  actualAmount: number;
  period: string;
}

export interface DepartmentFormData {
  name: string;
  description?: string;
}

export interface FormErrors {
  [key: string]: string;
}