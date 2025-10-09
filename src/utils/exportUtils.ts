import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';
import { BudgetCategory, DepartmentSummary } from '../types/budget';

export const exportToPDF = async (
  categories: BudgetCategory[],
  summary: DepartmentSummary,
  departmentName: string
) => {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  
  // Header
  pdf.setFontSize(20);
  pdf.text(`${departmentName} Budget Report`, pageWidth / 2, 20, { align: 'center' });
  
  pdf.setFontSize(12);
  pdf.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 30, { align: 'center' });
  
  // Summary Section
  pdf.setFontSize(16);
  pdf.text('Budget Summary', 20, 50);
  
  pdf.setFontSize(12);
  let yPos = 65;
  const summaryData = [
    ['Total Requested:', `$${summary.totalRequested.toLocaleString()}`],
    ['Total Approved:', `$${summary.totalApproved.toLocaleString()}`],
    ['Total Spent:', `$${summary.totalSpent.toLocaleString()}`],
    ['Total Remaining:', `$${summary.totalRemaining.toLocaleString()}`],
    ['Spent Percentage:', `${summary.spentPercentage.toFixed(1)}%`],
    ['Categories:', summary.categoriesCount.toString()],
    ['Critical Categories:', summary.criticalCategories.toString()],
    ['Under-utilized Categories:', summary.underutilizedCategories.toString()]
  ];
  
  summaryData.forEach(([label, value]) => {
    pdf.text(label, 20, yPos);
    pdf.text(value, 120, yPos);
    yPos += 8;
  });
  
  // Categories Section
  yPos += 10;
  pdf.setFontSize(16);
  pdf.text('Category Details', 20, yPos);
  yPos += 15;
  
  // Table headers
  pdf.setFontSize(10);
  const headers = ['Category', 'Approved', 'Spent', 'Remaining', 'Status'];
  const colWidths = [60, 30, 30, 30, 30];
  let xPos = 20;
  
  headers.forEach((header, index) => {
    pdf.text(header, xPos, yPos);
    xPos += colWidths[index];
  });
  
  yPos += 8;
  pdf.line(20, yPos - 3, pageWidth - 20, yPos - 3);
  
  // Table data
  categories.forEach((category) => {
    if (yPos > 270) {
      pdf.addPage();
      yPos = 20;
    }
    
    xPos = 20;
    const rowData = [
      category.category.substring(0, 25),
      `$${category.approvedAmount.toLocaleString()}`,
      `$${category.amountSpentToDate.toLocaleString()}`,
      `$${category.remainingAmount.toLocaleString()}`,
      category.status.charAt(0).toUpperCase() + category.status.slice(1)
    ];
    
    rowData.forEach((data, index) => {
      pdf.text(data, xPos, yPos);
      xPos += colWidths[index];
    });
    
    yPos += 8;
  });
  
  pdf.save(`${departmentName}_Budget_Report_${new Date().toISOString().split('T')[0]}.pdf`);
};

export const exportToExcel = (
  categories: BudgetCategory[],
  summary: DepartmentSummary,
  departmentName: string
) => {
  const wb = XLSX.utils.book_new();
  
  // Summary sheet
  const summaryData = [
    ['Budget Summary', ''],
    ['Total Requested', summary.totalRequested],
    ['Total Approved', summary.totalApproved],
    ['Total Spent', summary.totalSpent],
    ['Total Remaining', summary.totalRemaining],
    ['Spent Percentage', `${summary.spentPercentage.toFixed(1)}%`],
    ['Remaining Percentage', `${summary.remainingPercentage.toFixed(1)}%`],
    ['Total Categories', summary.categoriesCount],
    ['Critical Categories', summary.criticalCategories],
    ['Under-utilized Categories', summary.underutilizedCategories]
  ];
  
  const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWS, 'Summary');
  
  // Categories sheet
  const categoryData = categories.map(cat => ({
    'Category': cat.category,
    'Category Code': cat.categoryCode,
    'Requested Amount': cat.requestedAmount,
    'Approved Amount': cat.approvedAmount,
    'Amount Spent': cat.amountSpentToDate,
    'Remaining Amount': cat.remainingAmount,
    'Remaining Percentage': `${cat.remainingPercentage.toFixed(1)}%`,
    'Spent Percentage': `${cat.spentPercentage.toFixed(1)}%`,
    'Status': cat.status,
    'Last Updated': cat.lastUpdated.toLocaleDateString()
  }));
  
  const categoryWS = XLSX.utils.json_to_sheet(categoryData);
  XLSX.utils.book_append_sheet(wb, categoryWS, 'Categories');
  
  XLSX.writeFile(wb, `${departmentName}_Budget_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
};

export const captureChartAsImage = async (elementId: string): Promise<string> => {
  const element = document.getElementById(elementId);
  if (!element) return '';
  
  const canvas = await html2canvas(element);
  return canvas.toDataURL('image/png');
};