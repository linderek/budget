import React, { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, Download, AlertCircle, CheckCircle, Loader, ArrowRight, Edit, Save, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';
import { Actual, CATEGORY_LIST, TEAM_LIST } from '../types/budget';
import { getYearFromDate, getMonthFromDate, getHalfFromMonth } from '../utils/budgetCalculations';

export interface ImportLog {
  id: string;
  timestamp: Date;
  fileName: string;
  fileSize: number;
  uploader: string;
  totalRows: number;
  imported: number;
  updated: number;
  skipped: number;
  status: 'completed' | 'partial' | 'error';
  issues: string[];
}

interface ActualsUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (actuals: Omit<Actual, 'id' | 'createdAt' | 'updatedAt'>[], log: ImportLog) => void;
  existingActuals: Actual[];
}

interface ParsedActualRow {
  id: string;
  date?: string; // YYYY-MM format
  year?: number;
  half?: 'H1' | 'H2';
  team?: string[];
  category?: string;
  amount?: number;
  description?: string;
  approvedAmount?: number;
  requestedAmount?: number;
  notes?: string;
  status: 'valid' | 'needs-mapping' | 'error';
  errors: string[];
  warnings: string[];
  originalData: any;
  isUpdate?: boolean;
  existingRecord?: Actual;
}

interface HeaderMapping {
  [fileColumn: string]: string;
}

interface PeriodConfig {
  monthColumn?: string;
  halfColumn?: string;
  defaultHalf?: 'H1' | 'H2';
  defaultYear?: number;
  yearColumn?: string;
}

export interface ImportLog {
  id: string;
  timestamp: Date;
  fileName: string;
  fileSize: number;
  uploader: string;
  totalRows: number;
  imported: number;
  updated: number;
  skipped: number;
  issues: string[];
  status: 'completed' | 'partial' | 'failed';
}

const REQUIRED_FIELDS = ['date', 'category', 'amount'];
const OPTIONAL_FIELDS = ['team', 'description', 'approvedAmount', 'requestedAmount', 'notes'];

export const ActualsUploadModal: React.FC<ActualsUploadModalProps> = ({
  isOpen,
  onClose,
  onImportComplete,
  existingActuals
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [headerMapping, setHeaderMapping] = useState<HeaderMapping>({});
  const [parsedRows, setParsedRows] = useState<ParsedActualRow[]>([]);
  const [defaultMonth, setDefaultMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [defaultTeam, setDefaultTeam] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importLog, setImportLog] = useState<ImportLog | null>(null);
  const [allowNegativeAmounts, setAllowNegativeAmounts] = useState(false);
  const [periodConfig, setPeriodConfig] = useState<PeriodConfig>({
    defaultYear: new Date().getFullYear()
  });
  const [defaultYear, setDefaultYear] = useState<number>(new Date().getFullYear());
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (selectedFile: File) => {
    if (selectedFile.size > 25 * 1024 * 1024) {
      alert('File size exceeds 25MB limit. Please use a smaller file.');
      return;
    }

    setIsProcessing(true);
    try {
      if (selectedFile.name.endsWith('.csv')) {
        // Handle CSV files
        Papa.parse(selectedFile, {
          header: true,
          complete: (results) => {
            const headerRow = Object.keys(results.data[0] || {});
            setHeaders(headerRow.filter(h => h && h.toString().trim()));
            setFile(selectedFile);
            setSheets(['Sheet1']);
            setSelectedSheet('Sheet1');
            autoMapHeaders(headerRow);
            setStep('mapping');
            setIsProcessing(false);
          },
          error: (error) => {
            console.error('Error reading CSV:', error);
            alert('Error reading CSV file.');
            setIsProcessing(false);
          }
        });
      } else {
        // Handle Excel files
        const arrayBuffer = await selectedFile.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        setFile(selectedFile);
        setSheets(workbook.SheetNames);
        setSelectedSheet(workbook.SheetNames[0]);
        
        // Parse first sheet to get headers
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length > 0) {
          const headerRow = jsonData[0] as string[];
          const cleanHeaders = headerRow.filter(h => h && h.toString().trim());
          setHeaders(cleanHeaders);
          autoMapHeaders(cleanHeaders);
          setStep('mapping');
        }
      }
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error reading file. Please ensure it\'s a valid Excel or CSV file.');
    }
    setIsProcessing(false);
  };

  const autoMapHeaders = (headerRow: string[]) => {
    const autoMapping: HeaderMapping = {};
    headerRow.forEach(header => {
      const normalizedHeader = header.toString().toLowerCase().trim();
      
      // Year mappings
      if (['year', 'yyyy', 'fiscal_year'].includes(normalizedHeader)) {
        autoMapping[header] = 'year';
      }
      // Month mappings
      else if (['month', 'period', 'month_year', 'yyyy-mm', 'date'].includes(normalizedHeader)) {
        autoMapping[header] = 'month';
      }
      // Half mappings
      else if (['half', 'h1_h2', 'semester', 'half_year', 'period_half'].includes(normalizedHeader)) {
        autoMapping[header] = 'half';
      }
      // Category mappings
      else if (['category', 'expense_category', 'budget_category', 'type'].includes(normalizedHeader)) {
        autoMapping[header] = 'category';
      }
      // Amount mappings
      else if (['amount_spent_to_date', 'amount_spent', 'actual_amount', 'actuals', 'spent', 'amount'].includes(normalizedHeader)) {
        autoMapping[header] = 'amount';
      }
      // Team mappings
      else if (['team', 'teams', 'department', 'departments'].includes(normalizedHeader)) {
        autoMapping[header] = 'team';
      }
      // Description mappings
      else if (['description', 'details', 'expense_description'].includes(normalizedHeader)) {
        autoMapping[header] = 'description';
      }
      // Optional amount mappings
      else if (['approved_amount', 'approved', 'budget_approved'].includes(normalizedHeader)) {
        autoMapping[header] = 'approvedAmount';
      }
      else if (['requested_amount', 'requested', 'budget_requested'].includes(normalizedHeader)) {
        autoMapping[header] = 'requestedAmount';
      }
      else if (['notes', 'comments', 'remarks'].includes(normalizedHeader)) {
        autoMapping[header] = 'notes';
      }
    });
    
    setHeaderMapping(autoMapping);
  };

  const handleSheetChange = async (sheetName: string) => {
    if (!file) return;
    
    setSelectedSheet(sheetName);
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
    if (jsonData.length > 0) {
      const headerRow = jsonData[0] as string[];
      const cleanHeaders = headerRow.filter(h => h && h.toString().trim());
      setHeaders(cleanHeaders);
      autoMapHeaders(cleanHeaders);
    }
  };

  const normalizeValue = (value: any, type: 'string' | 'number' | 'date'): any => {
    if (value === null || value === undefined || value === '') return null;
    
    switch (type) {
      case 'string':
        return value.toString().trim();
      case 'number':
        const numStr = value.toString().replace(/[$,%]/g, '');
        const num = parseFloat(numStr);
        return isNaN(num) ? null : num;
      case 'date':
        const dateStr = value.toString().trim();
        // Handle various date formats
        if (/^\d{4}-\d{2}$/.test(dateStr)) return dateStr;
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr.slice(0, 7);
        return null;
      default:
        return value;
    }
  };

  const normalizeHalfValue = (value: string): 'H1' | 'H2' | null => {
    const normalized = value.toString().toLowerCase().trim();
    
    // H1 variations
    if (['h1', '1h', 'h-1', 'first half', 'first', '1st half', 'jan-jun'].includes(normalized)) {
      return 'H1';
    }
    
    // H2 variations
    if (['h2', '2h', 'h-2', 'second half', 'second', '2nd half', 'jul-dec'].includes(normalized)) {
      return 'H2';
    }
    
    return null;
  };

  const deriveHalfFromMonth = (monthStr: string): 'H1' | 'H2' | null => {
    const month = parseInt(monthStr.split('-')[1]);
    if (month >= 1 && month <= 6) return 'H1';
    if (month >= 7 && month <= 12) return 'H2';
    return null;
  };

  const deriveYearFromMonth = (monthStr: string): number | null => {
    const year = parseInt(monthStr.split('-')[0]);
    return isNaN(year) ? null : year;
  };

  const parseData = async () => {
    if (!file || !selectedSheet) return;
    
    setIsProcessing(true);
    try {
      let jsonData: any[];
      
      if (file.name.endsWith('.csv')) {
        // Parse CSV
        const text = await file.text();
        const result = Papa.parse(text, { header: true });
        jsonData = result.data;
      } else {
        // Parse Excel
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const worksheet = workbook.Sheets[selectedSheet];
        jsonData = XLSX.utils.sheet_to_json(worksheet);
      }
      
      if (jsonData.length > 50000) {
        alert('File contains more than 50,000 rows. Please split into smaller files.');
        setIsProcessing(false);
        return;
      }
      
      const parsed: ParsedActualRow[] = jsonData.map((row: any, index: number) => {
        const rowData: any = {};
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Map columns based on header mapping
        Object.keys(headerMapping).forEach(fileHeader => {
          const mappedField = headerMapping[fileHeader];
          if (mappedField && row[fileHeader] !== undefined && row[fileHeader] !== null) {
            rowData[mappedField] = row[fileHeader];
          }
        });
        
        const parsedRow: ParsedActualRow = {
          id: `row-${index}`,
          originalData: row,
          errors,
          warnings,
          status: 'valid'
        };
        
        // Period validation (Month or Half + Year)
        let hasValidPeriod = false;
        
        // Try Month first
        if (rowData.month) {
          const monthStr = rowData.month.toString().trim();
          if (monthStr.match(/^\d{4}-\d{2}$/)) {
            parsedRow.date = monthStr;
            parsedRow.year = deriveYearFromMonth(monthStr);
            parsedRow.half = deriveHalfFromMonth(monthStr);
            hasValidPeriod = true;
          } else {
            errors.push('Invalid month format (expected YYYY-MM)');
          }
        }
        
        // Try Half + Year
        if (!hasValidPeriod) {
          let halfValue: 'H1' | 'H2' | null = null;
          let yearValue: number | null = null;
          
          // Get Half from column or default
          if (rowData.half) {
            halfValue = normalizeHalfValue(rowData.half.toString());
            if (!halfValue) {
              errors.push(`Invalid half value: ${rowData.half}`);
            }
          } else if (periodConfig.defaultHalf) {
            halfValue = periodConfig.defaultHalf;
          }
          
          // Year validation and date parsing
          parsedRow.year = defaultYear;
          
          if (halfValue && parsedRow.year) {
            parsedRow.half = halfValue;
            parsedRow.date = `${parsedRow.year}-${halfValue === 'H1' ? '04' : '10'}`; // Use midpoint for semiannual
            hasValidPeriod = true;
          }
        }
        
        // Check for Month/Half conflicts
        if (parsedRow.date && parsedRow.half) {
          const derivedHalf = deriveHalfFromMonth(parsedRow.date);
          if (derivedHalf !== parsedRow.half) {
            errors.push(`Conflict: Month ${parsedRow.date} is in ${derivedHalf} but Half is ${parsedRow.half}`);
            parsedRow.status = 'error';
          }
        }
        
        if (!hasValidPeriod) {
          errors.push('Period required: provide Month (YYYY-MM) or Half (H1/H2) + Year');
          parsedRow.status = 'needs-mapping';
        }
        
        // Category validation
        if (rowData.category) {
          const category = normalizeValue(rowData.category, 'string');
          const validCategory = CATEGORY_LIST.find(cat => 
            cat.toLowerCase() === category?.toLowerCase()
          );
          
          if (validCategory) {
            parsedRow.category = validCategory;
          } else {
            errors.push(`Invalid category: ${category}`);
            parsedRow.status = 'needs-mapping';
          }
        } else {
          errors.push('Category is required');
          parsedRow.status = 'needs-mapping';
        }
        
        // Amount validation
        if (rowData.amount !== undefined && rowData.amount !== null) {
          const amount = normalizeValue(rowData.amount, 'number');
          if (amount !== null) {
            if (amount < 0 && !allowNegativeAmounts) {
              warnings.push('Negative amount detected');
              parsedRow.status = 'needs-mapping';
            }
            parsedRow.amount = Math.abs(amount); // Always store as positive
          } else {
            errors.push('Invalid amount value');
            parsedRow.status = 'error';
          }
        } else {
          errors.push('Amount is required');
          parsedRow.status = 'needs-mapping';
        }
        
        // Team validation
        if (rowData.team) {
          const teamStr = normalizeValue(rowData.team, 'string');
          const teams = teamStr.split(/[,;|]/).map((t: string) => t.trim()).filter((t: string) => t);
          const validTeams = teams.filter((team: string) => 
            TEAM_LIST.some(validTeam => validTeam.toLowerCase() === team.toLowerCase())
          );
          
          if (validTeams.length > 0) {
            parsedRow.team = validTeams;
          } else if (teams.length > 0) {
            warnings.push(`Invalid team(s): ${teamStr}`);
            parsedRow.status = 'needs-mapping';
          }
        }
        
        if (!parsedRow.team && defaultTeam) {
          parsedRow.team = [defaultTeam];
        }
        
        if (!parsedRow.team || parsedRow.team.length === 0) {
          errors.push('Team is required');
          parsedRow.status = 'needs-mapping';
        }
        
        // Optional fields
        parsedRow.description = normalizeValue(rowData.description, 'string') || '';
        parsedRow.approvedAmount = normalizeValue(rowData.approvedAmount, 'number') || undefined;
        parsedRow.requestedAmount = normalizeValue(rowData.requestedAmount, 'number') || undefined;
        parsedRow.notes = normalizeValue(rowData.notes, 'string') || '';
        
        // Check for existing records (deduplication)
        if (parsedRow.date && parsedRow.category) {
          const existing = existingActuals.find(actual => 
            actual.date === parsedRow.date && actual.category === parsedRow.category
          );
          if (existing) {
            parsedRow.isUpdate = true;
            parsedRow.existingRecord = existing;
          }
        }
        
        if (errors.length > 0 && parsedRow.status === 'valid') {
          parsedRow.status = 'error';
        }
        
        return parsedRow;
      });
      
      setParsedRows(parsed);
      setStep('preview');
    } catch (error) {
      console.error('Error parsing data:', error);
      alert('Error parsing file data.');
    }
    setIsProcessing(false);
  };

  const updateRowField = (rowId: string, field: string, value: any) => {
    setParsedRows(prev => prev.map(row => {
      if (row.id === rowId) {
        const updated = { ...row, [field]: value };
        
        // Re-validate the row
        const errors: string[] = [];
        const warnings: string[] = [];
        
        // Period validation
        const hasMonth = updated.date && updated.date.match(/^\d{4}-\d{2}$/);
        const hasHalfYear = updated.half && updated.year;
        
        if (!hasMonth && !hasHalfYear) {
          errors.push('Period required: provide Month or Half + Year');
        }
        
        if (!updated.date) {
          errors.push('Date is required');
        } else if (!/^\d{4}-\d{2}$/.test(updated.date)) {
          errors.push('Invalid date format (expected YYYY-MM)');
        } else {
          updated.year = getYearFromDate(updated.date);
          const month = getMonthFromDate(updated.date);
          updated.half = getHalfFromMonth(month);
        }
        
        if (!updated.category) {
          errors.push('Category is required');
        }
        
        if (!updated.amount || updated.amount <= 0) {
          errors.push('Amount must be greater than 0');
        } else if (updated.amount < 0 && !allowNegativeAmounts) {
          warnings.push('Negative amount detected');
        }
        
        if (!updated.team || updated.team.length === 0) {
          errors.push('Team is required');
        }
        
        if (!updated.description || !updated.description.trim()) {
          errors.push('Description is required');
        }
        
        updated.errors = errors;
        updated.warnings = warnings;
        updated.status = errors.length === 0 ? (warnings.length > 0 ? 'needs-mapping' : 'valid') : 'error';
        
        return updated;
      }
      return row;
    }));
  };

  const handleImport = () => {
    const validRows = parsedRows.filter(row => row.status === 'valid');
    
    if (validRows.length === 0) {
      alert('No valid rows to import. Please fix the errors first.');
      return;
    }
    
    const actuals: Omit<Actual, 'id' | 'createdAt' | 'updatedAt'>[] = validRows.map(row => ({
      date: row.date!,
      year: row.year!,
      half: row.half!,
      team: row.team!,
      category: row.category!,
      amount: row.amount!,
      description: row.description || `Expense for ${row.category}`
    }));
    
    // Create import log
    const log: ImportLog = {
      id: Date.now().toString(),
      timestamp: new Date(),
      fileName: file?.name || 'Unknown',
      fileSize: file?.size || 0,
      uploader: 'Finance Team', // In real app, get from auth
      totalRows: parsedRows.length,
      imported: validRows.filter(row => !row.isUpdate).length,
      updated: validRows.filter(row => row.isUpdate).length,
      skipped: parsedRows.length - validRows.length,
      issues: parsedRows
        .filter(row => row.status !== 'valid')
        .slice(0, 10)
        .map(row => `Row ${parseInt(row.id.split('-')[1]) + 2}: ${row.errors.join(', ')}`),
      status: validRows.length === parsedRows.length ? 'completed' : 'partial'
    };
    
    onImportComplete(actuals, log);
    
    // Reset state
    setStep('upload');
    setFile(null);
    setParsedRows([]);
    setHeaderMapping({});
    setPeriodConfig({ defaultYear: new Date().getFullYear() });
  };

  const downloadTemplate = () => {
    const templateData = [
      ['Month', 'Category', 'Amount Spent to Date', 'Team', 'Description', 'Approved Amount', 'Requested Amount', 'Notes'],
      ['2025-01', 'COM - Regulatory Compliance Fees', '32000', 'Compliance', 'Q1 compliance audit fees', '45000', '50000', 'Annual audit cycle'],
      ['2025-01', 'TEC - Software Subscriptions / SaaS Licenses', '15000', 'Product & Engineering', 'Monthly SaaS subscriptions', '80000', '80000', 'Core development tools'],
      ['2025-01', 'EE - Training and Development', '21000', 'People & Culture', 'Employee training programs', '25000', '30000', 'Skills development initiative'],
      ['2025-02', 'MKT - Digital Advertising', '45000', 'Marketing', 'February ad campaigns', '60000', '65000', 'Q1 marketing push'],
      ['2025-02', 'OPEX - Office Supplies', '3500', 'Finance', 'Monthly office supplies', '5000', '5000', 'Standard office materials']
    ];

    if (file?.name.endsWith('.csv')) {
      const csv = Papa.unparse(templateData);
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'actuals_template.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      const ws = XLSX.utils.aoa_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Actuals Template');
      XLSX.writeFile(wb, 'actuals_template.xlsx');
    }
  };

  const getStatusBadge = (status: ParsedActualRow['status'], warnings: string[]) => {
    if (status === 'valid' && warnings.length > 0) {
      return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Valid (Warnings)</span>;
    }
    
    switch (status) {
      case 'valid':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Valid</span>;
      case 'needs-mapping':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Needs Mapping</span>;
      case 'error':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Error</span>;
    }
  };

  const validRowsCount = parsedRows.filter(r => r.status === 'valid').length;
  const newRowsCount = parsedRows.filter(r => r.status === 'valid' && !r.isUpdate).length;
  const updateRowsCount = parsedRows.filter(r => r.status === 'valid' && r.isUpdate).length;
  const skipRowsCount = parsedRows.length - validRowsCount;

  // Check if required mappings are present
  const hasRequiredMappings = 
    (Object.values(headerMapping).includes('date') || defaultMonth) &&
    Object.values(headerMapping).includes('category') &&
    Object.values(headerMapping).includes('amount') &&
    (Object.values(headerMapping).includes('team') || defaultTeam);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <Upload className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Actuals Input</h2>
              <p className="text-sm text-gray-600">Upload monthly actual spending by category</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center space-x-2 ${step === 'upload' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Upload className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Upload</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className={`flex items-center space-x-2 ${step === 'mapping' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'mapping' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <Edit className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Mapping</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className={`flex items-center space-x-2 ${step === 'preview' ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'preview' ? 'bg-green-100' : 'bg-gray-100'}`}>
                  <CheckCircle className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Preview</span>
              </div>
            </div>
          </div>

          {/* Upload Step */}
          {step === 'upload' && (
            <div className="space-y-6">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
                <FileSpreadsheet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Upload Actuals File
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Supports .xlsx, .csv files up to 25MB with up to 50,000 rows
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Choose File'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.csv"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Need a template?</p>
                      <p className="text-sm text-green-700">Download our sample file to get started</p>
                    </div>
                  </div>
                  <button
                    onClick={downloadTemplate}
                    className="flex items-center space-x-2 text-green-600 hover:text-green-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="text-sm font-medium">Download Template</span>
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Required Columns</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Month:</strong> YYYY-MM format (e.g., 2025-01)</p>
                  <p><strong>Category:</strong> Must match existing category list</p>
                  <p><strong>Amount Spent to Date:</strong> Numeric value (currency symbols will be stripped)</p>
                  <p><strong>Team:</strong> One of the valid team names</p>
                  <p><strong>Description:</strong> Text description of the expense</p>
                </div>
                <div className="mt-3">
                  <h5 className="font-medium text-blue-900 mb-1">Optional Columns</h5>
                  <p className="text-sm text-blue-700">Approved Amount, Requested Amount, Notes</p>
                </div>
              </div>
            </div>
          )}

          {/* Mapping Step */}
          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Map Column Headers</h3>
                <div className="text-sm text-gray-500">
                  File: {file?.name} ({(file?.size || 0 / 1024 / 1024).toFixed(1)} MB)
                </div>
              </div>

              {sheets.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Sheet</label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    {sheets.map(sheet => (
                      <option key={sheet} value={sheet}>{sheet}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-6">
                {/* Year Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={defaultYear}
                    onChange={(e) => setDefaultYear(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- Select Year --</option>
                    {Array.from({ length: 16 }, (_, i) => 2020 + i).map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    All rows in this file will be saved as the selected Year.
                  </p>
                </div>

                {/* Period Mapping Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-4">Period Mapping</h4>
                  <div className="space-y-4">
                    {/* Month Column Mapping */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Map Month Column (YYYY-MM format)
                      </label>
                      <select
                        value={Object.keys(headerMapping).find(key => headerMapping[key] === 'month') || ''}
                        onChange={(e) => {
                          const newMapping = { ...headerMapping };
                          Object.keys(newMapping).forEach(key => {
                            if (newMapping[key] === 'month') {
                              delete newMapping[key];
                            }
                          });
                          if (e.target.value) {
                            newMapping[e.target.value] = 'month';
                          }
                          setHeaderMapping(newMapping);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- Select Month Column --</option>
                        {headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>

                    {/* Half Column Mapping */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Map Half Column (H1/H2 values)
                      </label>
                      <select
                        value={Object.keys(headerMapping).find(key => headerMapping[key] === 'half') || ''}
                        onChange={(e) => {
                          const newMapping = { ...headerMapping };
                          Object.keys(newMapping).forEach(key => {
                            if (newMapping[key] === 'half') {
                              delete newMapping[key];
                            }
                          });
                          if (e.target.value) {
                            newMapping[e.target.value] = 'half';
                          }
                          setHeaderMapping(newMapping);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- Select Half Column --</option>
                        {headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>

                    {/* Year Column Mapping */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Map Year Column
                      </label>
                      <select
                        value={Object.keys(headerMapping).find(key => headerMapping[key] === 'year') || ''}
                        onChange={(e) => {
                          const newMapping = { ...headerMapping };
                          Object.keys(newMapping).forEach(key => {
                            if (newMapping[key] === 'year') {
                              delete newMapping[key];
                            }
                          });
                          if (e.target.value) {
                            newMapping[e.target.value] = 'year';
                          }
                          setHeaderMapping(newMapping);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- Select Year Column --</option>
                        {headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Default Controls */}
                  {!Object.values(headerMapping).includes('half') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Default Half</label>
                      <div className="flex space-x-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="defaultHalf"
                            value="H1"
                            checked={periodConfig.defaultHalf === 'H1'}
                            onChange={(e) => setPeriodConfig(prev => ({ ...prev, defaultHalf: e.target.value as 'H1' | 'H2' }))}
                            className="mr-2"
                          />
                          H1 (Jan-Jun)
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="defaultHalf"
                            value="H2"
                            checked={periodConfig.defaultHalf === 'H2'}
                            onChange={(e) => setPeriodConfig(prev => ({ ...prev, defaultHalf: e.target.value as 'H1' | 'H2' }))}
                            className="mr-2"
                          />
                          H2 (Jul-Dec)
                        </label>
                      </div>
                      {periodConfig.defaultHalf && (
                        <p className="text-xs text-gray-500 mt-1">
                          Applied to all rows that do not have a Half value.
                        </p>
                      )}
                    </div>
                  )}

                  {!Object.values(headerMapping).includes('year') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Default Year</label>
                      <input
                        type="number"
                        min="2020"
                        max="2030"
                        value={periodConfig.defaultYear || new Date().getFullYear()}
                        onChange={(e) => setPeriodConfig(prev => ({ ...prev, defaultYear: parseInt(e.target.value) }))}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Applied to all rows that do not have a Year value.
                      </p>
                    </div>
                  )}
                </div>

                {/* Required Fields Section */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="font-medium text-red-900 mb-4">Required Fields</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Category Mapping */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={Object.keys(headerMapping).find(key => headerMapping[key] === 'category') || ''}
                        onChange={(e) => {
                          const newMapping = { ...headerMapping };
                          Object.keys(newMapping).forEach(key => {
                            if (newMapping[key] === 'category') delete newMapping[key];
                          });
                          if (e.target.value) newMapping[e.target.value] = 'category';
                          setHeaderMapping(newMapping);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">-- Select Column --</option>
                        {headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Must match existing categories
                      </p>
                    </div>

                    {/* Amount Mapping */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Amount Spent to Date <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={Object.keys(headerMapping).find(key => headerMapping[key] === 'amount') || ''}
                        onChange={(e) => {
                          const newMapping = { ...headerMapping };
                          Object.keys(newMapping).forEach(key => {
                            if (newMapping[key] === 'amount') delete newMapping[key];
                          });
                          if (e.target.value) newMapping[e.target.value] = 'amount';
                          setHeaderMapping(newMapping);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">-- Select Column --</option>
                        {headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Numeric values ($ and , will be stripped)
                      </p>
                    </div>

                    {/* Team Mapping */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Team <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={Object.keys(headerMapping).find(key => headerMapping[key] === 'team') || ''}
                        onChange={(e) => {
                          const newMapping = { ...headerMapping };
                          Object.keys(newMapping).forEach(key => {
                            if (newMapping[key] === 'team') delete newMapping[key];
                          });
                          if (e.target.value) {
                            newMapping[e.target.value] = 'team';
                            setDefaultTeam('');
                          }
                          setHeaderMapping(newMapping);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">-- Select Column --</option>
                        {headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Choose column or set default below
                      </p>
                      
                      {!Object.values(headerMapping).includes('team') && (
                        <div className="mt-3">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Default Team (for all rows)</label>
                          <select
                            value={defaultTeam}
                            onChange={(e) => setDefaultTeam(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                          >
                            <option value="">-- Select Team --</option>
                            {TEAM_LIST.map(team => (
                              <option key={team} value={team}>{team}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Team and Description Section */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 mb-4">Description</h4>
                  <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                    {/* Description Mapping */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={Object.keys(headerMapping).find(key => headerMapping[key] === 'description') || ''}
                        onChange={(e) => {
                          const newMapping = { ...headerMapping };
                          Object.keys(newMapping).forEach(key => {
                            if (newMapping[key] === 'description') delete newMapping[key];
                          });
                          if (e.target.value) newMapping[e.target.value] = 'description';
                          setHeaderMapping(newMapping);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      >
                        <option value="">-- Select Column --</option>
                        {headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Expense description or details
                      </p>
                    </div>
                  </div>
                </div>

                {/* Optional Fields Section */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-4">Optional Fields</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {['approvedAmount', 'requestedAmount', 'notes'].map(field => (
                      <div key={field}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field === 'approvedAmount' ? 'Approved Amount' :
                           field === 'requestedAmount' ? 'Requested Amount' : 'Notes'}
                        </label>
                        <select
                          value={Object.keys(headerMapping).find(key => headerMapping[key] === field) || ''}
                          onChange={(e) => {
                            const newMapping = { ...headerMapping };
                            Object.keys(newMapping).forEach(key => {
                              if (newMapping[key] === field) delete newMapping[key];
                            });
                            if (e.target.value) newMapping[e.target.value] = field;
                            setHeaderMapping(newMapping);
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="">-- Select Column --</option>
                          {headers.map(header => (
                            <option key={header} value={header}>{header}</option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">
                          {field === 'notes' ? 'Optional — add context or leave unmapped' : 'Optional budget reference'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Validation Error */}
              {!Object.values(headerMapping).includes('month') && 
               !Object.values(headerMapping).includes('half') && 
               !periodConfig.defaultHalf && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <p className="text-red-800 font-medium">
                      Provide a period by mapping Month or selecting H1/H2.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={parseData}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
                  disabled={isProcessing || 
                    !Object.values(headerMapping).includes('team') || 
                    !Object.values(headerMapping).includes('category') || 
                    (!defaultYear || defaultYear < 2020) ||
                    (!Object.values(headerMapping).includes('month') && 
                     !Object.values(headerMapping).includes('half') && 
                     !periodConfig.defaultHalf)}
                >
                  {isProcessing ? 'Parsing...' : 'Parse Data'}
                </button>
              </div>
            </div>
          )}

          {/* Preview Step */}
          {step === 'preview' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Preview & Import</h3>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-green-600">{newRowsCount} New</span>
                  <span className="text-blue-600">{updateRowsCount} Updates</span>
                  <span className="text-gray-600">{skipRowsCount} Skipped</span>
                </div>
              </div>

              {/* Negative Amount Warning */}
              {parsedRows.some(row => row.warnings.some(w => w.includes('Negative'))) && !allowNegativeAmounts && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    <h4 className="font-medium text-yellow-900">Negative Amounts Detected</h4>
                  </div>
                  <p className="text-sm text-yellow-800 mb-3">
                    Some rows contain negative amounts. These will be converted to positive values.
                  </p>
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={allowNegativeAmounts}
                      onChange={(e) => setAllowNegativeAmounts(e.target.checked)}
                      className="rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
                    />
                    <span className="text-sm text-yellow-800">I understand and want to proceed</span>
                  </label>
                </div>
              )}

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Half</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      {Object.values(headerMapping).includes('approvedAmount') && (
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Approved</th>
                      )}
                      {Object.values(headerMapping).includes('requestedAmount') && (
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Requested</th>
                      )}
                      {Object.values(headerMapping).includes('notes') && (
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                      )}
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedRows.slice(0, 50).map((row) => (
                      <tr key={row.id} className={`${
                        row.status === 'error' ? 'bg-red-50' : 
                        row.status === 'needs-mapping' ? 'bg-yellow-50' : 
                        row.isUpdate ? 'bg-blue-50' : ''
                      }`}>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-1">
                            {getStatusBadge(row.status, row.warnings)}
                            {row.isUpdate && (
                              <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                Update
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">{row.year}</td>
                        <td className="px-4 py-3">
                          {row.half && (
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                              row.half === 'H1' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                            }`}>
                              {row.half}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {row.date || (row.date === null ? 'Semiannual' : '')}
                        </td>
                        <td className="px-4 py-3">
                          {row.status === 'needs-mapping' && !row.team ? (
                            <select
                              value=""
                              onChange={(e) => updateRowField(row.id, 'team', [e.target.value])}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                            >
                              <option value="">Select team...</option>
                              {TEAM_LIST.map(team => (
                                <option key={team} value={team}>{team}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {row.team?.map(team => (
                                <span key={team} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                  {team}
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {row.status === 'needs-mapping' && !row.category ? (
                            <select
                              value=""
                              onChange={(e) => updateRowField(row.id, 'category', e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                            >
                              <option value="">Select category...</option>
                              {CATEGORY_LIST.map(category => (
                                <option key={category} value={category}>{category}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-sm">{row.category}</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.amount || ''}
                            onChange={(e) => updateRowField(row.id, 'amount', parseFloat(e.target.value) || 0)}
                            className="w-24 px-2 py-1 text-xs border border-gray-300 rounded text-right"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={row.description || ''}
                            onChange={(e) => updateRowField(row.id, 'description', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                            placeholder="Expense description..."
                          />
                        </td>
                        {Object.values(headerMapping).includes('approvedAmount') && (
                          <td className="px-4 py-3 text-sm text-right">
                            ${(row.approvedAmount || 0).toLocaleString()}
                          </td>
                        )}
                        {Object.values(headerMapping).includes('requestedAmount') && (
                          <td className="px-4 py-3 text-sm text-right">
                            ${(row.requestedAmount || 0).toLocaleString()}
                          </td>
                        )}
                        {Object.values(headerMapping).includes('notes') && (
                          <td className="px-4 py-3 text-sm">
                            {row.notes}
                          </td>
                        )}
                        <td className="px-4 py-3">
                          {(row.errors.length > 0 || row.warnings.length > 0) && (
                            <div className="text-xs space-y-1">
                              {row.errors.slice(0, 2).map((error, i) => (
                                <div key={i} className="text-red-600">{error}</div>
                              ))}
                              {row.warnings.slice(0, 2).map((warning, i) => (
                                <div key={i} className="text-yellow-600">{warning}</div>
                              ))}
                              {(row.errors.length + row.warnings.length) > 2 && (
                                <div className="text-gray-500">+{(row.errors.length + row.warnings.length) - 2} more...</div>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {parsedRows.length > 50 && (
                <p className="text-sm text-gray-500 text-center">
                  Showing first 50 rows of {parsedRows.length} total rows
                </p>
              )}

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setStep('mapping')}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleImport}
                  className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
                  disabled={validRowsCount === 0}
                >
                  <Save className="w-4 h-4" />
                  <span>Import {newRowsCount} New, Update {updateRowsCount}</span>
                </button>
              </div>
            </div>
          )}

          {/* Import Log */}
          {importLog && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h4 className="font-medium text-green-900">Import Complete</h4>
              </div>
              <div className="text-sm text-green-800">
                <p>✅ Imported {importLog.imported} new, updated {importLog.updated}, skipped {importLog.skipped} from {importLog.fileName}</p>
                {importLog.issues.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Issues:</p>
                    <ul className="list-disc list-inside ml-2">
                      {importLog.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};