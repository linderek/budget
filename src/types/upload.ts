export interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadedAt: Date;
  status: 'processing' | 'completed' | 'error';
  recordsCount?: number;
  errorMessage?: string;
}

export interface SpreadsheetRow {
  department: string;
  category: string;
  budgetAmount: number;
  actualAmount: number;
  period: string;
}

export interface UploadResult {
  success: boolean;
  data?: SpreadsheetRow[];
  errors?: string[];
  totalRows?: number;
  validRows?: number;
}