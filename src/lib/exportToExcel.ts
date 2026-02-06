/**
 * Export data to Excel-compatible CSV file
 */
export function exportToExcel<T extends object>(
  data: T[],
  columns: { key: keyof T; header: string; format?: (value: unknown) => string }[],
  filename: string
) {
  if (data.length === 0) {
    return;
  }

  // Create CSV content with BOM for Excel UTF-8 compatibility
  const BOM = '\uFEFF';
  
  // Headers
  const headers = columns.map(col => `"${col.header}"`).join(',');
  
  // Rows
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col.key];
      const formatted = col.format ? col.format(value) : String(value ?? '');
      // Escape quotes and wrap in quotes
      return `"${formatted.replace(/"/g, '""')}"`;
    }).join(',');
  });

  const csvContent = BOM + headers + '\n' + rows.join('\n');
  
  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
