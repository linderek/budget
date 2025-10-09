import Papa from 'papaparse';
import { BudgetCategory } from '../types/budget';
import { calculateBudgetMetrics } from './budgetCalculations';

export interface ParseResult {
  success: boolean;
  data?: BudgetCategory[];
  errors?: string[];
  totalRows?: number;
  validRows?: number;
}

export const parseSpreadsheet = (file: File, month: string, year: number): Promise<ParseResult> => {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => {
        const normalized = header.toLowerCase().trim();
        const headerMap: { [key: string]: string } = {
          'category': 'category',
          'category name': 'category',
          'budget category': 'category',
          'requested': 'requestedAmount',
          'requested amount': 'requestedAmount',
          'request': 'requestedAmount',
          'approved': 'approvedAmount',
          'approved amount': 'approvedAmount',
          'approval': 'approvedAmount',
          'spent': 'amountSpentToDate',
          'amount spent': 'amountSpentToDate',
          'spent to date': 'amountSpentToDate',
          'amount spent to date': 'amountSpentToDate',
          'remaining': 'remainingAmount',
          'remaining amount': 'remainingAmount',
          'remaining percentage': 'remainingPercentage',
          'remaining %': 'remainingPercentage',
          'code': 'categoryCode',
          'category code': 'categoryCode',
          'dept code': 'categoryCode'
        };
        return headerMap[normalized] || header;
      },
      complete: (results) => {
        const errors: string[] = [];
        const validRows: BudgetCategory[] = [];

        results.data.forEach((row: any, index: number) => {
          try {
            if (!row.category) {
              errors.push(`Row ${index + 1}: Missing category name`);
              return;
            }

            const requestedAmount = parseFloat(row.requestedAmount?.toString().replace(/[,$]/g, '') || '0');
            const approvedAmount = parseFloat(row.approvedAmount?.toString().replace(/[,$]/g, '') || '0');
            const amountSpentToDate = parseFloat(row.amountSpentToDate?.toString().replace(/[,$]/g, '') || '0');

            if (isNaN(requestedAmount) || isNaN(approvedAmount) || isNaN(amountSpentToDate)) {
              errors.push(`Row ${index + 1}: Invalid amount values`);
              return;
            }

            // Extract category code from category name if not provided
            let categoryCode = row.categoryCode?.toString().trim() || '';
            if (!categoryCode) {
              const match = row.category.match(/^([A-Z]{2,4})/);
              categoryCode = match ? match[1] : row.category.substring(0, 3).toUpperCase();
            }

            const calculatedMetrics = calculateBudgetMetrics(requestedAmount, approvedAmount, amountSpentToDate);

            const budgetCategory: BudgetCategory = {
              id: `${Date.now()}-${index}`,
              category: row.category.toString().trim(),
              categoryCode,
              requestedAmount,
              approvedAmount,
              amountSpentToDate,
              remainingAmount: calculatedMetrics.remainingAmount || 0,
              remainingPercentage: calculatedMetrics.remainingPercentage || 0,
              spentPercentage: calculatedMetrics.spentPercentage || 0,
              status: calculatedMetrics.status || 'normal',
              lastUpdated: new Date(),
              monthlyData: [{
                month,
                year,
                requestedAmount,
                approvedAmount,
                amountSpentToDate,
                remainingAmount: calculatedMetrics.remainingAmount || 0,
                remainingPercentage: calculatedMetrics.remainingPercentage || 0,
                variance: 0 // Will be calculated when comparing months
              }]
            };

            validRows.push(budgetCategory);
          } catch (error) {
            errors.push(`Row ${index + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });

        resolve({
          success: errors.length === 0 || validRows.length > 0,
          data: validRows,
          errors: errors.length > 0 ? errors : undefined,
          totalRows: results.data.length,
          validRows: validRows.length
        });
      },
      error: (error) => {
        resolve({
          success: false,
          errors: [`Failed to parse file: ${error.message}`]
        });
      }
    });
  });
};

export const generateSampleCSV = (): string => {
  const sampleData = [
    ['Category', 'Category Code', 'Requested Amount', 'Approved Amount', 'Amount Spent to Date'],
    ['COM - Marketing Campaigns', 'COM', '150000', '140000', '85000'],
    ['COM - Digital Advertising', 'COM', '80000', '75000', '65000'],
    ['TEC - Software Licenses', 'TEC', '120000', '110000', '45000'],
    ['TEC - Hardware Upgrades', 'TEC', '200000', '180000', '160000'],
    ['EE - Training Programs', 'EE', '50000', '45000', '8000'],
    ['EE - Conference Attendance', 'EE', '30000', '25000', '22000'],
    ['OPS - Office Supplies', 'OPS', '25000', '20000', '15000'],
    ['OPS - Facility Maintenance', 'OPS', '100000', '95000', '78000']
  ];

  return Papa.unparse(sampleData);
};