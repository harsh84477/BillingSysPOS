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

export interface ExcelTableDef {
  title: string;
  titleColor: string; // hex without # e.g. '1F4E79'
  data: any[];
  columns: { key: string; header: string; format?: (v: unknown, key?: string, item?: any) => string | number }[];
}

export interface ExcelSummaryDef {
  title: string;
  items: { label: string; value: string | number }[];
}

/**
 * Export a beautifully styled multi-sheet .xlsx file.
 * — Sheet 1: "Summary"  (KPI dashboard)
 * — Sheets 2…N: one sheet per data table, with title banner, column headers,
 *   alternating row shading, status-colour cells, numeric formatting, and totals row.
 */
export function exportStyledExcel(
  tables: ExcelTableDef[],
  summary: ExcelSummaryDef | null,
  filename: string
) {
  const wb = XLSX.utils.book_new();

  // ── Helpers ──────────────────────────────────────────
  const usedNames = new Set<string>();

  function safeSheetName(raw: string): string {
    let name = raw
      .replace(/[^\w\s\-&()%/.,]/g, '') // strip emoji & Excel-invalid chars
      .replace(/[\\/*?:[\]]/g, '')
      .replace(/\s{2,}/g, ' ')
      .trim()
      .slice(0, 28) || 'Sheet';
    let final = name;
    let n = 1;
    while (usedNames.has(final.toLowerCase())) final = `${name.slice(0, 25)} ${++n}`;
    usedNames.add(final.toLowerCase());
    return final;
  }

  // Timestamp
  const d = new Date();
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const generatedAt = `${String(d.getDate()).padStart(2,'0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}  ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;

  // Palette
  const C = {
    titleBg:     '1F3864',
    subtitleBg:  '2E75B6',
    headerBg:    '4472C4',
    altRow:      'EDF3FB',
    whiteRow:    'FFFFFF',
    totalsBg:    'D6E4F7',
    totalsText:  '1F3864',
    labelBg:     'D6E4F7',
    valueBg:     'EDF3FB',
    kpiText:     '1F3864',
    statusGreenBg:  'E2EFDA', statusGreenText: '375623',
    statusOrangeBg: 'FFF2CC', statusOrangeText:'C65911',
    statusRedBg:    'FFE0E0', statusRedText:   'C00000',
  };

  // Border factories
  const thin   = (rgb = 'C5D5E8') => ({ style: 'thin',   color: { rgb } });
  const medium = (rgb = '2E75B6') => ({ style: 'medium', color: { rgb } });
  const tBorder = { top: thin(), bottom: thin(), left: thin(), right: thin() };
  const mBorder = (rgb?: string) => ({ top: medium(rgb), bottom: medium(rgb), left: medium(rgb), right: medium(rgb) });

  // Cell factory — merges defaults then caller styles
  function mkCell(v: string | number | null, s: any = {}): any {
    const val = v ?? '';
    return {
      v: val,
      t: typeof val === 'number' ? 'n' : 's',
      s: { border: tBorder, font: { sz: 10, name: 'Calibri' }, ...s },
    };
  }

  // ── SHEET 1: Summary ─────────────────────────────────
  if (summary && summary.items.length > 0) {
    const ws: any = {};
    const merges: any[] = [];
    const rowH: any[] = [];
    let r = 0;
    const NC = 4;

    const sc = (row: number, col: number, cell: any) => {
      ws[XLSX.utils.encode_cell({ r: row, c: col })] = cell;
    };
    const fillMerge = (row: number, cols: number, bg: string, bdr: any) => {
      for (let c = 1; c < cols; c++)
        sc(row, c, { v: '', t: 's', s: { fill: { fgColor: { rgb: bg } }, border: bdr } });
      merges.push({ s: { r: row, c: 0 }, e: { r: row, c: cols - 1 } });
    };

    // Row 0 — big title banner
    sc(r, 0, mkCell(summary.title, {
      font: { bold: true, sz: 20, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
      fill: { fgColor: { rgb: C.titleBg } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: mBorder(C.titleBg),
    }));
    fillMerge(r, NC, C.titleBg, mBorder(C.titleBg));
    rowH.push({ hpt: 40 }); r++;

    // Row 1 — generated timestamp
    sc(r, 0, mkCell(`Generated on: ${generatedAt}`, {
      font: { italic: true, sz: 9, color: { rgb: 'D0E8FF' }, name: 'Calibri' },
      fill: { fgColor: { rgb: C.subtitleBg } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: tBorder,
    }));
    fillMerge(r, NC, C.subtitleBg, tBorder);
    rowH.push({ hpt: 18 }); r++;

    // Row 2 — blank gap
    for (let c = 0; c < NC; c++) sc(r, c, { v: '', t: 's', s: {} });
    rowH.push({ hpt: 10 }); r++;

    // Row 3 — KPI section header
    sc(r, 0, mkCell('KEY PERFORMANCE INDICATORS', {
      font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
      fill: { fgColor: { rgb: C.headerBg } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: mBorder(),
    }));
    fillMerge(r, NC, C.headerBg, mBorder());
    rowH.push({ hpt: 24 }); r++;

    // KPI items: 2 per row — label | value | label | value
    const kpiStart = r;
    summary.items.forEach((item, i) => {
      const col = (i % 2) * 2;
      const row = kpiStart + Math.floor(i / 2);
      const isNum = typeof item.value === 'number';
      sc(row, col, mkCell(item.label, {
        font: { bold: true, sz: 10, color: { rgb: C.kpiText }, name: 'Calibri' },
        fill: { fgColor: { rgb: C.labelBg } },
        alignment: { horizontal: 'left', vertical: 'center', indent: 1 },
        border: tBorder,
      }));
      sc(row, col + 1, mkCell(item.value as any, {
        font: { bold: true, sz: 12, color: { rgb: '1A5276' }, name: 'Calibri' },
        fill: { fgColor: { rgb: C.valueBg } },
        alignment: { horizontal: isNum ? 'right' : 'left', vertical: 'center', indent: 1 },
        border: tBorder,
        numFmt: isNum ? '#,##0.00' : undefined,
      }));
    });
    const kpiRows = Math.ceil(summary.items.length / 2);
    for (let i = 0; i < kpiRows; i++) rowH.push({ hpt: 22 });
    r += kpiRows;

    // Footer row
    sc(r, 0, mkCell(`© Report by SPOS  |  ${generatedAt}`, {
      font: { italic: true, sz: 8, color: { rgb: 'AAAAAA' }, name: 'Calibri' },
      fill: { fgColor: { rgb: 'F5F5F5' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: tBorder,
    }));
    fillMerge(r, NC, 'F5F5F5', tBorder);
    rowH.push({ hpt: 14 }); r++;

    ws['!ref']    = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: NC - 1 } });
    ws['!merges'] = merges;
    ws['!rows']   = rowH;
    ws['!cols']   = [{ wch: 30 }, { wch: 22 }, { wch: 30 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Summary');
  }

  // ── DATA SHEETS (one per table) ─────────────────────
  tables.filter(t => t.data.length > 0).forEach(table => {
    const ws: any = {};
    const merges: any[] = [];
    const rowH: any[] = [];
    let r = 0;
    const CC = table.columns.length;
    const tcBorder = mBorder(table.titleColor);

    const sc = (row: number, col: number, cell: any) => {
      ws[XLSX.utils.encode_cell({ r: row, c: col })] = cell;
    };
    const fillMerge = (row: number, cols: number, bg: string, bdr: any) => {
      for (let c = 1; c < cols; c++)
        sc(row, c, { v: '', t: 's', s: { fill: { fgColor: { rgb: bg } }, border: bdr } });
      merges.push({ s: { r: row, c: 0 }, e: { r: row, c: cols - 1 } });
    };

    // Row 0 — table title banner  (strip emoji for clean display)
    const cleanTitle = table.title.replace(/[^\w\s\-&()%/.,]/g, '').trim() || table.title;
    sc(r, 0, mkCell(cleanTitle, {
      font: { bold: true, sz: 14, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
      fill: { fgColor: { rgb: table.titleColor } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: tcBorder,
    }));
    fillMerge(r, CC, table.titleColor, tcBorder);
    rowH.push({ hpt: 32 }); r++;

    // Row 1 — record count + timestamp
    const subtitle = `${table.data.length} records  |  Generated: ${generatedAt}`;
    sc(r, 0, mkCell(subtitle, {
      font: { italic: true, sz: 9, color: { rgb: 'D0E8FF' }, name: 'Calibri' },
      fill: { fgColor: { rgb: C.subtitleBg } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: tBorder,
    }));
    fillMerge(r, CC, C.subtitleBg, tBorder);
    rowH.push({ hpt: 16 }); r++;

    // Row 2 — column headers
    table.columns.forEach((col, c) => {
      sc(r, c, mkCell(col.header, {
        font: { bold: true, sz: 10, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
        fill: { fgColor: { rgb: C.headerBg } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top:    medium(), bottom: medium(),
          left:   c === 0      ? medium() : thin(),
          right:  c === CC - 1 ? medium() : thin(),
        },
      }));
    });
    rowH.push({ hpt: 24 }); r++;

    // Track numeric columns for totals row
    const numericCols = new Set<number>();
    const totals: number[] = new Array(CC).fill(0);

    // Data rows
    table.data.forEach((item, idx) => {
      const rowBg = idx % 2 === 1 ? C.altRow : C.whiteRow;
      table.columns.forEach((col, c) => {
        const raw       = item[col.key];
        const formatted = col.format ? col.format(raw, col.key, item) : (raw ?? '');
        const isNum     = typeof formatted === 'number';
        const val       = isNum ? (formatted as number) : String(formatted ?? '');

        if (isNum) { numericCols.add(c); totals[c] += formatted as number; }

        // Status-aware cell colouring
        let bg = rowBg, fg = '2C2C2C', bold = false;
        if (col.key === 'status' && typeof val === 'string') {
          if      (val === 'Out of Stock') { bg = C.statusRedBg;    fg = C.statusRedText;    bold = true; }
          else if (val === 'Low Stock')    { bg = C.statusOrangeBg; fg = C.statusOrangeText; bold = true; }
          else if (val === 'In Stock')     { bg = C.statusGreenBg;  fg = C.statusGreenText;  bold = true; }
        }
        // Green/red for profit or margin columns
        if ((col.header.toLowerCase().includes('profit') || col.header.toLowerCase().includes('margin')) && isNum) {
          fg = (formatted as number) >= 0 ? '375623' : 'C00000';
        }

        sc(r, c, {
          v: val, t: isNum ? 'n' : 's',
          s: {
            font:      { sz: 10, name: 'Calibri', color: { rgb: fg }, bold },
            fill:      { fgColor: { rgb: bg } },
            alignment: {
              horizontal: isNum ? 'right' : (c === 0 ? 'center' : 'left'),
              vertical:   'center',
              indent:     (!isNum && c !== 0) ? 1 : 0,
            },
            border: {
              top:   thin(), bottom: thin(),
              left:  c === 0      ? medium() : thin(),
              right: c === CC - 1 ? medium() : thin(),
            },
            numFmt: isNum ? '#,##0.00' : undefined,
          },
        });
      });
      rowH.push({ hpt: 16 }); r++;
    });

    // Totals row (only when there are numeric cols)
    if (numericCols.size > 0) {
      table.columns.forEach((_, c) => {
        const isNum = numericCols.has(c);
        sc(r, c, {
          v: c === 0 ? 'TOTAL' : (isNum ? totals[c] : ''),
          t: (c === 0 || !isNum) ? 's' : 'n',
          s: {
            font:      { bold: true, sz: 10, color: { rgb: C.totalsText }, name: 'Calibri' },
            fill:      { fgColor: { rgb: C.totalsBg } },
            alignment: { horizontal: (c === 0 || !isNum) ? 'center' : 'right', vertical: 'center' },
            border: {
              top:    medium(), bottom: medium(),
              left:   c === 0      ? medium() : thin(),
              right:  c === CC - 1 ? medium() : thin(),
            },
            numFmt: isNum ? '#,##0.00' : undefined,
          },
        });
      });
      rowH.push({ hpt: 20 }); r++;
    }

    // Footer
    sc(r, 0, mkCell(`© SPOS Report  |  ${generatedAt}`, {
      font: { italic: true, sz: 8, color: { rgb: 'AAAAAA' }, name: 'Calibri' },
      fill: { fgColor: { rgb: 'F5F5F5' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: tBorder,
    }));
    fillMerge(r, CC, 'F5F5F5', tBorder);
    rowH.push({ hpt: 14 }); r++;

    // Auto-fit column widths
    const colWidths: number[] = table.columns.map(col => col.header.length + 2);
    table.data.forEach(item => {
      table.columns.forEach((col, c) => {
        const raw       = item[col.key];
        const formatted = col.format ? col.format(raw, col.key, item) : (raw ?? '');
        const len       = String(formatted).length;
        if (len > colWidths[c]) colWidths[c] = len;
      });
    });

    ws['!ref']    = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: r - 1, c: CC - 1 } });
    ws['!merges'] = merges;
    ws['!rows']   = rowH;
    ws['!cols']   = colWidths.map(w => ({ wch: Math.min(w + 4, 42) }));
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(table.title));
  });

  // Safety net — workbook must have at least one sheet
  if (wb.SheetNames.length === 0) {
    const empty: any = { A1: { v: 'No data', t: 's' }, '!ref': 'A1:A1' };
    XLSX.utils.book_append_sheet(wb, empty, 'Report');
  }

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
