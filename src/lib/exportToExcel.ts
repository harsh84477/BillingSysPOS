import XLSX from 'xlsx-js-style';

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
 * Build CSV section string for a single table (with title header)
 */
function buildCsvSection<T extends object>(
  title: string,
  data: T[],
  columns: { key: keyof T; header: string; format?: (value: unknown) => string }[]
): string {
  const titleRow = `"${title}"` + ',' + columns.slice(1).map(() => '""').join(',');
  const headers = columns.map(col => `"${col.header}"`).join(',');
  const rows = data.map(item => {
    return columns.map(col => {
      const value = item[col.key];
      const formatted = col.format ? col.format(value) : String(value ?? '');
      return `"${formatted.replace(/"/g, '""')}"`;
    }).join(',');
  });
  return titleRow + '\n' + headers + '\n' + rows.join('\n');
}

/**
 * Export multiple tables in a single CSV file (separated by empty rows)
 */
export function exportMultiTableCsv(
  tables: {
    title: string;
    data: any[];
    columns: { key: string; header: string; format?: (value: unknown) => string }[];
  }[],
  filename: string
) {
  const BOM = '\uFEFF';
  const sections = tables
    .filter(t => t.data.length > 0)
    .map(t => buildCsvSection(t.title, t.data, t.columns as any));

  if (sections.length === 0) return;

  const csvContent = BOM + sections.join('\n\n\n');

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

// ─── Styled Excel Export ───

const thinBorder = {
  top: { style: 'thin', color: { rgb: 'CCCCCC' } },
  bottom: { style: 'thin', color: { rgb: 'CCCCCC' } },
  left: { style: 'thin', color: { rgb: 'CCCCCC' } },
  right: { style: 'thin', color: { rgb: 'CCCCCC' } },
};

const centerAlign = { horizontal: 'center', vertical: 'center' };

function styledCell(v: string | number, style: any = {}) {
  const isNum = typeof v === 'number';
  return {
    v,
    t: isNum ? 'n' : 's',
    s: {
      alignment: centerAlign,
      border: thinBorder,
      font: { sz: 10, name: 'Calibri' },
      ...style,
    },
  };
}

export interface ExcelTableDef {
  title: string;
  titleColor: string;   // hex e.g. '1F4E79'
  data: any[];
  columns: { key: string; header: string; format?: (v: unknown) => string | number }[];
}

export interface ExcelSummaryDef {
  title: string;
  items: { label: string; value: string | number }[];
}

/**
 * Export a styled .xlsx file with multiple tables, each with colored headers,
 * centered text, borders, and a summary section.
 */
export function exportStyledExcel(
  tables: ExcelTableDef[],
  summary: ExcelSummaryDef | null,
  filename: string
) {
  const ws: any = {};
  let row = 0;
  let maxCol = 0;

  // Helper: set cell
  const setCell = (r: number, c: number, cell: any) => {
    const ref = XLSX.utils.encode_cell({ r, c });
    ws[ref] = cell;
    if (c > maxCol) maxCol = c;
  };

  const merges: any[] = [];

  // ── Summary Section ──
  if (summary && summary.items.length > 0) {
    // Title row merged across 4 columns
    setCell(row, 0, {
      v: summary.title,
      t: 's',
      s: {
        alignment: centerAlign,
        font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
        fill: { fgColor: { rgb: '2E86AB' } },
        border: thinBorder,
      },
    });
    for (let c = 1; c <= 3; c++) {
      setCell(row, c, {
        v: '', t: 's',
        s: { fill: { fgColor: { rgb: '2E86AB' } }, border: thinBorder, alignment: centerAlign },
      });
    }
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: 3 } });
    row++;

    // Summary items: 2 per row (label + value | label + value)
    for (let i = 0; i < summary.items.length; i += 2) {
      const item1 = summary.items[i];
      const item2 = i + 1 < summary.items.length ? summary.items[i + 1] : null;

      setCell(row, 0, styledCell(item1.label, {
        font: { bold: true, sz: 10, color: { rgb: '1F4E79' }, name: 'Calibri' },
        fill: { fgColor: { rgb: 'E8F4FD' } },
      }));
      setCell(row, 1, styledCell(item1.value, {
        font: { bold: true, sz: 10, name: 'Calibri' },
        fill: { fgColor: { rgb: 'E8F4FD' } },
      }));

      if (item2) {
        setCell(row, 2, styledCell(item2.label, {
          font: { bold: true, sz: 10, color: { rgb: '1F4E79' }, name: 'Calibri' },
          fill: { fgColor: { rgb: 'E8F4FD' } },
        }));
        setCell(row, 3, styledCell(item2.value, {
          font: { bold: true, sz: 10, name: 'Calibri' },
          fill: { fgColor: { rgb: 'E8F4FD' } },
        }));
      } else {
        setCell(row, 2, styledCell('', { fill: { fgColor: { rgb: 'E8F4FD' } } }));
        setCell(row, 3, styledCell('', { fill: { fgColor: { rgb: 'E8F4FD' } } }));
      }
      row++;
    }

    row += 2; // gap
  }

  // ── Render each table ──
  tables.filter(t => t.data.length > 0).forEach((table, tableIdx) => {
    if (tableIdx > 0) row += 2; // gap between tables

    const colCount = table.columns.length;

    // Section title row (merged)
    setCell(row, 0, {
      v: table.title,
      t: 's',
      s: {
        alignment: centerAlign,
        font: { bold: true, sz: 12, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
        fill: { fgColor: { rgb: table.titleColor } },
        border: thinBorder,
      },
    });
    for (let c = 1; c < colCount; c++) {
      setCell(row, c, {
        v: '', t: 's',
        s: { fill: { fgColor: { rgb: table.titleColor } }, border: thinBorder, alignment: centerAlign },
      });
    }
    merges.push({ s: { r: row, c: 0 }, e: { r: row, c: colCount - 1 } });
    row++;

    // Column headers
    table.columns.forEach((col, c) => {
      setCell(row, c, {
        v: col.header,
        t: 's',
        s: {
          alignment: centerAlign,
          font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
          fill: { fgColor: { rgb: '4472C4' } },
          border: thinBorder,
        },
      });
    });
    row++;

    // Data rows (alternating colors)
    table.data.forEach((item, idx) => {
      const bgColor = idx % 2 === 0 ? 'F2F7FB' : 'FFFFFF';
      table.columns.forEach((col, c) => {
        const raw = item[col.key];
        const formatted = col.format ? col.format(raw) : (raw ?? '');
        const val = typeof formatted === 'number' ? formatted : String(formatted);
        setCell(row, c, styledCell(val, {
          fill: { fgColor: { rgb: bgColor } },
          font: { sz: 10, name: 'Calibri' },
        }));
      });
      row++;
    });
  });

  // Set worksheet range
  ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: row - 1, c: maxCol } });
  ws['!merges'] = merges;

  // Column widths (auto-fit approximately)
  const colWidths: number[] = [];
  for (let c = 0; c <= maxCol; c++) {
    let maxW = 10;
    for (let r = 0; r < row; r++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      if (ws[ref] && ws[ref].v != null) {
        const len = String(ws[ref].v).length;
        if (len > maxW) maxW = len;
      }
    }
    colWidths.push(Math.min(maxW + 4, 30));
  }
  ws['!cols'] = colWidths.map(w => ({ wch: w }));

  // Create workbook and download
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Report');
  XLSX.writeFile(wb, `${filename}.xlsx`);
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
