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

/**
 * Export day-wise performance summary to Excel-compatible CSV
 */
export interface DayWiseSummaryRow {
  day: string;
  orders: number;
  daySales: number;
  dayProfit: number;
  cashCollection: number;
  onlineCollection: number;
  dueCollection: number;
  dueAmount: number;
}

export function exportDayWiseSummary(rows: DayWiseSummaryRow[], filename: string) {
  exportToExcel(
    rows,
    [
      { key: 'day', header: 'Day' },
      { key: 'orders', header: 'No. of Orders', format: (v) => String(v) },
      { key: 'daySales', header: 'Day Sales', format: (v) => Number(v).toFixed(2) },
      { key: 'dayProfit', header: 'Day Profit', format: (v) => Number(v).toFixed(2) },
      { key: 'cashCollection', header: 'Cash Collection', format: (v) => Number(v).toFixed(2) },
      { key: 'onlineCollection', header: 'Online Collection', format: (v) => Number(v).toFixed(2) },
      { key: 'dueCollection', header: 'Due Collection', format: (v) => Number(v).toFixed(2) },
      { key: 'dueAmount', header: 'Due Amount', format: (v) => Number(v).toFixed(2) },
    ],
    filename
  );
}
