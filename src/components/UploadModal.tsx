import React, { useState, useRef } from 'react';
import { Upload, X, FileSpreadsheet, Download, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { UploadedFile } from '../types/budget';
import { parseSpreadsheet, generateSampleCSV, ParseResult } from '../utils/spreadsheetParser';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete: (result: ParseResult) => void;
  currentMonth?: string;
  currentYear?: number;
}

export const UploadModal: React.FC<UploadModalProps> = ({ 
  isOpen, 
  onClose, 
  onUploadComplete,
  currentMonth = new Date().toLocaleString('default', { month: 'long' }),
  currentYear = new Date().getFullYear()
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    const validFiles = files.filter(file => 
      file.type === 'text/csv' || 
      file.type === 'application/vnd.ms-excel' ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.name.endsWith('.csv')
    );

    if (validFiles.length === 0) {
      alert('Please upload CSV or Excel files only.');
      return;
    }

    setIsProcessing(true);

    for (const file of validFiles) {
      const uploadedFile: UploadedFile = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        name: file.name,
        uploadDate: new Date(),
        month: currentMonth,
        year: currentYear,
        recordsCount: 0,
        status: 'processing'
      };

      setUploadedFiles(prev => [...prev, uploadedFile]);

      try {
        const result = await parseSpreadsheet(file, currentMonth, currentYear);
        
        setUploadedFiles(prev => prev.map(f => 
          f.id === uploadedFile.id 
            ? { 
                ...f, 
                status: result.success ? 'completed' : 'error',
                recordsCount: result.validRows || 0
              }
            : f
        ));

        if (result.success) {
          onUploadComplete(result);
        }
      } catch (error) {
        setUploadedFiles(prev => prev.map(f => 
          f.id === uploadedFile.id 
            ? { 
                ...f, 
                status: 'error'
              }
            : f
        ));
      }
    }

    setIsProcessing(false);
  };

  const downloadSample = () => {
    const csv = generateSampleCSV();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'budget-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'processing':
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Upload Budget Data</h2>
            <p className="text-sm text-gray-600 mt-1">Import your budget data from spreadsheets</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Upload Area */}
          <div
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Drop your files here, or click to browse
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Supports CSV and Excel files (.csv, .xls, .xlsx)
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              disabled={isProcessing}
            >
              {isProcessing ? 'Processing...' : 'Choose Files'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.xls,.xlsx"
              onChange={handleFileInput}
              className="hidden"
            />
          </div>

          {/* Sample Template */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileSpreadsheet className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-900">Need a template?</p>
                  <p className="text-sm text-gray-600">Download our sample CSV file to get started</p>
                </div>
              </div>
              <button
                onClick={downloadSample}
                className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span className="text-sm font-medium">Download Template</span>
              </button>
            </div>
          </div>

          {/* File List */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900">Uploaded Files</h4>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(file.status)}
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{file.name}</p>
                        <p className="text-xs text-gray-600">
                          {file.month} {file.year} • {file.uploadDate.toLocaleTimeString()}
                        </p>
                        {file.status === 'completed' && file.recordsCount && (
                          <p className="text-xs text-green-600">
                            {file.recordsCount} records imported successfully
                          </p>
                        )}
                        {file.status === 'error' && (
                          <p className="text-xs text-red-600">Error processing file</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Expected Format */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Expected File Format</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>Your spreadsheet should include these columns:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li><strong>Category:</strong> Budget category name</li>
                <li><strong>Category Code:</strong> Category code (e.g., COM, TEC, EE) - optional</li>
                <li><strong>Requested Amount:</strong> Originally requested budget</li>
                <li><strong>Approved Amount:</strong> Approved budget amount</li>
                <li><strong>Amount Spent to Date:</strong> Current spending amount</li>
              </ul>
              <p className="mt-2 text-xs">
                <strong>Note:</strong> Remaining amounts and percentages will be calculated automatically.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onClose}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            disabled={uploadedFiles.filter(f => f.status === 'completed').length === 0}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};