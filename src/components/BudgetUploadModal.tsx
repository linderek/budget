import React, { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, Download, AlertCircle, CheckCircle, Loader, ArrowRight, Edit, Save, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Budget, CATEGORY_LIST, TEAM_LIST } from '../types/budget';

interface BudgetUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (budgets: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>[]) => void;
}

interface ParsedRow {
  id: string;
  year?: number;
  team?: string[];
  category?: string;
  h1Budget?: number;
  h2Budget?: number;
  notes?: string;
  status: 'valid' | 'needs-mapping' | 'error';
  errors: string[];
  originalData: any;
}

interface HeaderMapping {
  [fileColumn: string]: string;
}

interface ImportLog {
  timestamp: Date;
  fileName: string;
  totalRows: number;
  imported: number;
  updated: number;
  skipped: number;
  issues: string[];
}

const REQUIRED_FIELDS = ['year', 'team', 'category'];
const OPTIONAL_FIELDS = ['h1Budget', 'h2Budget', 'notes'];
const ALL_FIELDS = [...REQUIRED_FIELDS, ...OPTIONAL_FIELDS];

export const BudgetUploadModal: React.FC<BudgetUploadModalProps> = ({
  isOpen,
  onClose,
  onImportComplete
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [sheets, setSheets] = useState<string[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<string>('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [headerMapping, setHeaderMapping] = useState<HeaderMapping>({});
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [defaultYear, setDefaultYear] = useState<number>(new Date().getFullYear());
  const [defaultTeam, setDefaultTeam] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [importLog, setImportLog] = useState<ImportLog | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileSelect = async (selectedFile: File) => {
    setIsProcessing(true);
    try {
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
        setHeaders(headerRow.filter(h => h && h.toString().trim()));
        
        // Auto-detect common header mappings
        const autoMapping: HeaderMapping = {};
        headerRow.forEach(header => {
          const normalizedHeader = header.toString().toLowerCase().trim();
          
          // Category mappings
          if (['category', 'budget_category', 'expense_category', 'type'].includes(normalizedHeader)) {
            autoMapping[header] = 'category';
          }
          // H1 Budget mappings
          else if (['h1_budget', 'h1budget', 'first_half', 'jan_jun', 'h1_amount', 'h1 budget'].includes(normalizedHeader)) {
            autoMapping[header] = 'h1Budget';
          }
          // H2 Budget mappings
          else if (['h2_budget', 'h2budget', 'second_half', 'jul_dec', 'h2_amount', 'h2 budget'].includes(normalizedHeader)) {
            autoMapping[header] = 'h2Budget';
          }
          // Notes mappings
          else if (['notes', 'comments', 'description', 'remarks'].includes(normalizedHeader)) {
            autoMapping[header] = 'notes';
          }
          // DO NOT auto-map Year and Team - user must explicitly choose
        });
        
        setHeaderMapping(autoMapping);
        setStep('mapping');
      }
    } catch (error) {
      console.error('Error reading file:', error);
      alert('Error reading Excel file. Please ensure it\'s a valid .xlsx file.');
    }
    setIsProcessing(false);
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
      setHeaders(headerRow.filter(h => h && h.toString().trim()));
    }
  };

  const parseData = async () => {
    if (!file || !selectedSheet) return;
    
    setIsProcessing(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const worksheet = workbook.Sheets[selectedSheet];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      const rows = jsonData.slice(1) as any[][]; // Skip header row
      const headerRow = jsonData[0] as string[];
      
      const parsed: ParsedRow[] = rows.map((row, index) => {
        const rowData: any = {};
        const errors: string[] = [];
        
        // Map columns based on header mapping
        headerRow.forEach((header, colIndex) => {
          const mappedField = headerMapping[header];
          if (mappedField && row[colIndex] !== undefined && row[colIndex] !== null) {
            rowData[mappedField] = row[colIndex];
          }
        });
        
        // Store original data for reference
        const originalData: any = {};
        headerRow.forEach((header, colIndex) => {
          originalData[header] = row[colIndex];
        });
        
        // Parse and validate data
        const parsedRow: ParsedRow = {
          id: `row-${index}`,
          originalData,
          errors,
          status: 'valid'
        };
        
        // Year validation
        parsedRow.year = defaultYear;
        
        // Team validation
        if (defaultTeam) {
          parsedRow.team = [defaultTeam];
        } else {
          errors.push('Team is required');
          parsedRow.status = 'needs-mapping';
        }
        
        // Category validation
        if (rowData.category) {
          const category = rowData.category.toString().trim();
          const validCategory = CATEGORY_LIST.find(cat => 
            cat.toLowerCase() === category.toLowerCase()
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
        
        // Budget amount validation
        const h1Budget = parseFloat(rowData.h1Budget?.toString() || '0') || 0;
        const h2Budget = parseFloat(rowData.h2Budget?.toString() || '0') || 0;
        
        parsedRow.h1Budget = h1Budget;
        parsedRow.h2Budget = h2Budget;
        
        if (h1Budget === 0 && h2Budget === 0) {
          errors.push('At least one budget amount (H1 or H2) must be greater than 0');
          parsedRow.status = 'error';
        }
        
        // Notes
        parsedRow.notes = rowData.notes?.toString().trim() || '';
        
        if (errors.length > 0 && parsedRow.status === 'valid') {
          parsedRow.status = 'error';
        }
        
        return parsedRow;
      });
      
      setParsedRows(parsed);
      setStep('preview');
    } catch (error) {
      console.error('Error parsing data:', error);
      alert('Error parsing Excel data.');
    }
    setIsProcessing(false);
  };

  const updateRowField = (rowId: string, field: string, value: any) => {
    setParsedRows(prev => prev.map(row => {
      if (row.id === rowId) {
        const updated = { ...row, [field]: value };
        
        // Re-validate the row
        const errors: string[] = [];
        
        if (!updated.team || updated.team.length === 0) {
          errors.push('Team is required');
        }
        if (!updated.category) {
          errors.push('Category is required');
        }
        if ((updated.h1Budget || 0) === 0 && (updated.h2Budget || 0) === 0) {
          errors.push('At least one budget amount must be greater than 0');
        }
        
        updated.errors = errors;
        updated.status = errors.length === 0 ? 'valid' : 'error';
        
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
    
    const budgets: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>[] = validRows.map(row => ({
      year: row.year!,
      team: row.team!,
      category: row.category!,
      h1Budget: row.h1Budget || 0,
      h2Budget: row.h2Budget || 0,
      annualBudget: (row.h1Budget || 0) + (row.h2Budget || 0),
      notes: row.notes || ''
    }));
    
    // Create import log
    const log: ImportLog = {
      timestamp: new Date(),
      fileName: file?.name || 'Unknown',
      totalRows: parsedRows.length,
      imported: validRows.length,
      updated: 0, // This would be calculated by the parent component
      skipped: parsedRows.length - validRows.length,
      issues: parsedRows
        .filter(row => row.status !== 'valid')
        .slice(0, 10)
        .map(row => `Row ${parseInt(row.id.split('-')[1]) + 2}: ${row.errors.join(', ')}`)
    };
    
    setImportLog(log);
    onImportComplete(budgets);
    
    // Reset state
    setStep('upload');
    setFile(null);
    setParsedRows([]);
    setHeaderMapping({});
  };

  const getStatusBadge = (status: ParsedRow['status']) => {
    switch (status) {
      case 'valid':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Valid</span>;
      case 'needs-mapping':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Needs Mapping</span>;
      case 'error':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Error</span>;
    }
  };
const exampleCSV=()=>{

      const csvData = [
      [ 'Year', 'Team', 'Category', 'H1 Budget', 'H2 Budget', 'Annual Budget', 'Date', 'Amount', 'Description']
    ];
    // Convert to CSV string
    const csvContent = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    // Download CSV
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ExampleBudgetData.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Upload className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Upload Budget Data</h2>
              <p className="text-sm text-gray-600">Import budgets from Excel files</p>
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

              {step === 'upload'&&(<div className={`flex items-center space-x-2 'text-blue-600'`}>
                  <button
                    onClick={exampleCSV}
                    className="flex items-center space-x-2 bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Example Excel</span>
                  </button>
              </div>)}
              
              <div className={`flex items-center space-x-2 ${step === 'upload' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'upload' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <Upload className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Upload</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className={`flex items-center space-x-2 ${step === 'mapping' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'mapping' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <Edit className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">Mapping</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
              <div className={`flex items-center space-x-2 ${step === 'preview' ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'preview' ? 'bg-blue-100' : 'bg-gray-100'}`}>
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
                  Upload Excel File
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Supports .xlsx files with budget data
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Choose File'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx"
                  onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                  className="hidden"
                />
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Expected Columns</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Year:</strong> 4-digit year (2020-2030)</p>
                  <p><strong>Team:</strong> One of: Finance, Marketing, Business Development, Strategy, Product & Engineering, People & Culture, Account Management, Compliance</p>
                  <p><strong>Category:</strong> Must match existing category list</p>
                  <p><strong>H1 Budget:</strong> Budget for Jan-Jun (currency)</p>
                  <p><strong>H2 Budget:</strong> Budget for Jul-Dec (currency)</p>
                  <p><strong>Notes:</strong> Optional comments</p>
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
                  File: {file?.name}
                </div>
              </div>

              {sheets.length > 1 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Sheet</label>
                  <select
                    value={selectedSheet}
                    onChange={(e) => handleSheetChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

                {/* Team Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Team <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={defaultTeam}
                    onChange={(e) => setDefaultTeam(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">-- Select Team --</option>
                    {TEAM_LIST.map(team => (
                      <option key={team} value={team}>{team}</option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    All rows in this file will be assigned to the selected Team.
                  </p>
                </div>

                {/* Other Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['category', 'h1Budget', 'h2Budget', 'notes'].map(field => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.charAt(0).toUpperCase() + field.slice(1).replace(/([A-Z])/g, ' $1')}
                        {field === 'category' && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      <select
                        value={Object.keys(headerMapping).find(key => headerMapping[key] === field) || ''}
                        onChange={(e) => {
                          const newMapping = { ...headerMapping };
                          // Remove old mapping
                          Object.keys(newMapping).forEach(key => {
                            if (newMapping[key] === field) {
                              delete newMapping[key];
                            }
                          });
                          // Add new mapping
                          if (e.target.value) {
                            newMapping[e.target.value] = field;
                          }
                          setHeaderMapping(newMapping);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- Select Column --</option>
                        {headers.map(header => (
                          <option key={header} value={header}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={parseData}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  disabled={isProcessing || 
                    !defaultTeam || 
                    !Object.values(headerMapping).includes('category') || 
                    (!defaultYear || defaultYear < 2020) ||
                    (!Object.values(headerMapping).includes('h1Budget') && !Object.values(headerMapping).includes('h2Budget'))
                  }
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
                  <span className="text-green-600">
                    {parsedRows.filter(r => r.status === 'valid').length} Valid
                  </span>
                  <span className="text-yellow-600">
                    {parsedRows.filter(r => r.status === 'needs-mapping').length} Need Mapping
                  </span>
                  <span className="text-red-600">
                    {parsedRows.filter(r => r.status === 'error').length} Errors
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Year</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Team</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">H1 Budget</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">H2 Budget</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Notes</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parsedRows.slice(0, 50).map((row) => (
                      <tr key={row.id} className={`${row.status === 'error' ? 'bg-red-50' : row.status === 'needs-mapping' ? 'bg-yellow-50' : ''}`}>
                        <td className="px-4 py-3">{getStatusBadge(row.status)}</td>
                        <td className="px-4 py-3 text-sm">{row.year}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {row.team?.map(team => (
                              <span key={team} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                                {team}
                              </span>
                            ))}
                          </div>
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
                            value={row.h1Budget || ''}
                            onChange={(e) => updateRowField(row.id, 'h1Budget', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded text-right"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-right">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={row.h2Budget || ''}
                            onChange={(e) => updateRowField(row.id, 'h2Budget', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 text-xs border border-gray-300 rounded text-right"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input
                            type="text"
                            value={row.notes || ''}
                            onChange={(e) => updateRowField(row.id, 'notes', e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded"
                            placeholder="Optional notes..."
                          />
                        </td>
                        <td className="px-4 py-3">
                          {row.errors.length > 0 && (
                            <div className="text-xs text-red-600">
                              {row.errors.slice(0, 2).map((error, i) => (
                                <div key={i}>{error}</div>
                              ))}
                              {row.errors.length > 2 && <div>+{row.errors.length - 2} more...</div>}
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
                  disabled={parsedRows.filter(r => r.status === 'valid').length === 0}
                >
                  <Save className="w-4 h-4" />
                  <span>Import {parsedRows.filter(r => r.status === 'valid').length} Budgets</span>
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
                <p>✅ Imported {importLog.imported}, skipped {importLog.skipped} from {importLog.fileName}</p>
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