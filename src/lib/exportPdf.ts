// Export to PDF utilities using jsPDF.
// - exportPdf: Exports one or more data tables to a styled PDF report with title, summary KPIs, and business info.
// - Supports custom columns, summary boxes, and multi-table layouts for professional reporting.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

export interface PdfColumn {
  header: string;
  dataKey: string;
  format?: (value: unknown) => string;
}

export interface PdfSummaryItem {
  label: string;
  value: string;
}

export interface PdfTableDef {
  title: string;
  columns: PdfColumn[];
  data: Record<string, unknown>[];
}

/**
 * Export one or more data tables to a professional PDF report.
 *
 * @param reportTitle  Headline for the report (e.g. "Sales Report — This Month")
 * @param tables       Array of table definitions to render
 * @param summary      Optional KPI summary items rendered at the top
 * @param filename     Output filename (without .pdf extension)
 * @param businessName Optional business name shown under the title
 */
export function exportPdf(
  reportTitle: string,
  tables: PdfTableDef[],
  summary: PdfSummaryItem[] | null,
  filename: string,
  businessName?: string
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentW = pageW - margin * 2;
  let cursorY = margin;

  // ── Palette ────────────────────────────────────────────
  const primaryRgb:   [number, number, number] = [31, 62, 100];   // #1F3E64
  const accentRgb:    [number, number, number] = [46, 117, 182];  // #2E75B6
  const headerBgRgb:  [number, number, number] = [68, 114, 196];  // #4472C4
  const altRowRgb:    [number, number, number] = [237, 243, 251]; // #EDF3FB
  const totalsBgRgb:  [number, number, number] = [214, 228, 247]; // #D6E4F7
  const white:        [number, number, number] = [255, 255, 255];
  const lightGray:    [number, number, number] = [245, 245, 245];
  const textBold:     [number, number, number] = [31, 62, 100];
  const textMuted:    [number, number, number] = [100, 110, 130];

  // ── Title Banner ───────────────────────────────────────
  doc.setFillColor(...primaryRgb);
  doc.rect(0, 0, pageW, 22, 'F');

  doc.setFontSize(15);
  doc.setTextColor(...white);
  doc.setFont('helvetica', 'bold');
  doc.text(reportTitle, margin, 13);

  if (businessName) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(businessName, margin, 19);
  }

  const generatedStr = `Generated: ${format(new Date(), 'dd MMM yyyy  HH:mm')}`;
  doc.setFontSize(7);
  doc.setTextColor(200, 220, 240);
  doc.text(generatedStr, pageW - margin, 19, { align: 'right' });

  cursorY = 28;

  // ── Summary KPI Box ────────────────────────────────────
  if (summary && summary.length > 0) {
    const cols = 2;
    const cellH = 10;
    const labelW = contentW / (cols * 2) * 1.4;
    const valueW = contentW / (cols * 2) * 0.6;

    doc.setFillColor(...accentRgb);
    doc.roundedRect(margin, cursorY, contentW, 7, 2, 2, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...white);
    doc.text('KEY METRICS', margin + 4, cursorY + 5);
    cursorY += 8;

    const rows = Math.ceil(summary.length / cols);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const idx = r * cols + c;
        if (idx >= summary.length) break;
        const item = summary[idx];
        const x = margin + c * (contentW / cols);
        const y = cursorY;
        const cellW = contentW / cols;

        // Alternating bg
        doc.setFillColor(...(r % 2 === 0 ? altRowRgb : white));
        doc.rect(x, y, cellW, cellH, 'F');

        // Label
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...textMuted);
        doc.text(item.label, x + 3, y + 4);

        // Value
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...textBold);
        doc.text(String(item.value), x + 3, y + 8.5);
      }
      cursorY += cellH;
    }
    cursorY += 6;
  }

  // ── Tables ─────────────────────────────────────────────
  tables.forEach((table, tIdx) => {
    if (table.data.length === 0) return;

    // Table title
    doc.setFillColor(...totalsBgRgb);
    doc.rect(margin, cursorY, contentW, 7, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...textBold);
    doc.text(table.title, margin + 3, cursorY + 5);
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...textMuted);
    doc.text(`${table.data.length} records`, pageW - margin - 3, cursorY + 5, { align: 'right' });
    cursorY += 8;

    // Format rows
    const bodyRows = table.data.map(row =>
      table.columns.map(col => {
        const val = row[col.dataKey];
        return col.format ? col.format(val) : (val == null ? '' : String(val));
      })
    );

    autoTable(doc, {
      startY: cursorY,
      head: [table.columns.map(c => c.header)],
      body: bodyRows,
      margin: { left: margin, right: margin },
      tableWidth: contentW,
      styles: {
        fontSize: 7.5,
        cellPadding: 2.5,
        font: 'helvetica',
        overflow: 'linebreak',
        lineColor: [200, 215, 235],
        lineWidth: 0.2,
        textColor: [40, 50, 70],
      },
      headStyles: {
        fillColor: headerBgRgb,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
        halign: 'left',
      },
      alternateRowStyles: {
        fillColor: altRowRgb,
      },
      didDrawPage: (data) => {
        // Footer on every page
        const pCount = doc.getNumberOfPages();
        const pNum = (data as any).pageNumber ?? pCount;
        doc.setFontSize(7);
        doc.setTextColor(...textMuted);
        doc.setFont('helvetica', 'italic');
        const footerY = doc.internal.pageSize.getHeight() - 6;
        doc.text(reportTitle, margin, footerY);
        doc.text(`Page ${pNum}`, pageW - margin, footerY, { align: 'right' });
        doc.setDrawColor(...accentRgb);
        doc.setLineWidth(0.4);
        doc.line(margin, footerY - 2, pageW - margin, footerY - 2);
      },
    });

    cursorY = (doc as any).lastAutoTable.finalY + 8;
    if (tIdx < tables.length - 1 && cursorY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      cursorY = 20;
    }
  });

  doc.save(`${filename}.pdf`);
}
