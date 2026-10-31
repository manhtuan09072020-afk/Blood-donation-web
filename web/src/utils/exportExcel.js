// Xuất báo cáo ra file Excel (.xlsx) theo mẫu văn bản hành chính: quốc hiệu, tiêu đề, kỳ báo cáo,
// khối chỉ số tổng hợp, bảng dữ liệu có định dạng (tiêu đề màu, kẻ khung, xen màu dòng, dòng tổng cộng)
// và phần ký tên người lập biểu. Thư viện exceljs được tải động để không làm nặng trang.
import dayjs from 'dayjs';

const ORG = 'TRUNG TÂM HIẾN MÁU NHÂN ĐẠO GIỌT HỒNG';
const FONT = 'Times New Roman';
const RED = 'FFC8102E';
const RED_SOFT = 'FFFDE8EB';
const ZEBRA = 'FFFFF7F8';
const BORDER = { style: 'thin', color: { argb: 'FFBFC5CF' } };
const BOX = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };

const NUM_FMT = {
  number: '#,##0',
  decimal: '#,##0.0',
  ml: '#,##0" ml"',
  percent: '0"%"',
  date: 'dd/mm/yyyy',
  datetime: 'dd/mm/yyyy hh:mm'
};

function cellValue(col, row) {
  const raw = typeof col.value === 'function' ? col.value(row) : row[col.value];
  if (raw == null || raw === '') return null;
  if (col.type === 'date' || col.type === 'datetime') {
    const d = dayjs(raw);
    // exceljs ghi Date theo UTC -> bù múi giờ để Excel hiển thị đúng giờ địa phương
    return d.isValid() ? new Date(d.valueOf() - d.toDate().getTimezoneOffset() * 60000) : String(raw);
  }
  if (['number', 'decimal', 'ml', 'percent'].includes(col.type)) {
    const n = Number(raw);
    return Number.isNaN(n) ? raw : n;
  }
  return String(raw);
}

function textWidth(v) {
  if (v == null) return 0;
  if (v instanceof Date) return 12;
  return String(v).length;
}

/**
 * @param {object} opt
 * @param {string} opt.fileName  tên file (không cần đuôi)
 * @param {string} opt.title     tiêu đề báo cáo (in hoa)
 * @param {string} [opt.subtitle] dòng phụ, ví dụ "Kỳ báo cáo: 01/10/2026 – 31/10/2026"
 * @param {Array<{label:string,value:any}>} [opt.summary] khối chỉ số tổng hợp
 * @param {Array<{heading?:string, columns:Array, rows:Array, totals?:boolean}>} [opt.sections] các bảng dữ liệu
 * @param {Array} [opt.columns] / [opt.rows] dạng rút gọn khi chỉ có một bảng
 *   cột: { title, value: key | (row)=>any, type: text|number|decimal|ml|percent|date|datetime, width?, total?: 'sum' }
 * @param {string} [opt.signer] họ tên người lập biểu
 */
export async function exportExcel(opt) {
  const { default: ExcelJS } = await import('exceljs');
  const sections = opt.sections || [{ columns: opt.columns, rows: opt.rows, totals: opt.totals }];
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Hệ thống Giọt Hồng';
  wb.created = new Date();
  const ws = wb.addWorksheet((opt.sheetName || 'Báo cáo').slice(0, 31), {
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.5, right: 0.5, top: 0.6, bottom: 0.6, header: 0.3, footer: 0.3 } },
    headerFooter: { oddFooter: `&L&8${ORG}&R&8Trang &P / &N` },
    views: [{ showGridLines: false }]
  });

  // Số cột của trang = bảng rộng nhất (+1 cột STT)
  const nCols = Math.max(4, ...sections.map((s) => s.columns.length + 1));
  const lastCol = ws.getColumn(nCols).letter;
  const half = Math.ceil(nCols / 2);
  const font = (extra = {}) => ({ name: FONT, size: 12, ...extra });

  // ===== Quốc hiệu & đơn vị =====
  const merge = (r1, c1, r2, c2) => { if (c2 > c1 || r2 > r1) ws.mergeCells(r1, c1, r2, c2); };
  merge(1, 1, 1, half - 1);
  ws.getCell(1, 1).value = ORG;
  ws.getCell(1, 1).font = font({ bold: true, size: 11, color: { argb: RED } });
  merge(2, 1, 2, half - 1);
  ws.getCell(2, 1).value = 'Hệ thống quản lý hiến máu nhân đạo';
  ws.getCell(2, 1).font = font({ italic: true, size: 10, color: { argb: 'FF64748B' } });
  ws.mergeCells(1, half, 1, nCols);
  ws.getCell(1, half).value = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
  ws.getCell(1, half).font = font({ bold: true, size: 11 });
  ws.mergeCells(2, half, 2, nCols);
  ws.getCell(2, half).value = 'Độc lập - Tự do - Hạnh phúc';
  ws.getCell(2, half).font = font({ bold: true, size: 11, underline: true });
  [1, 2].forEach((r) => {
    ws.getCell(r, 1).alignment = { horizontal: 'center' };
    ws.getCell(r, half).alignment = { horizontal: 'center' };
  });

  // ===== Tiêu đề =====
  ws.mergeCells(`A4:${lastCol}4`);
  ws.getCell('A4').value = opt.title.toUpperCase();
  ws.getCell('A4').font = font({ bold: true, size: 16, color: { argb: RED } });
  ws.getCell('A4').alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(4).height = 26;
  ws.mergeCells(`A5:${lastCol}5`);
  ws.getCell('A5').value = [opt.subtitle, `Ngày lập: ${dayjs().format('DD/MM/YYYY HH:mm')}`].filter(Boolean).join('   ·   ');
  ws.getCell('A5').font = font({ italic: true, size: 11, color: { argb: 'FF475569' } });
  ws.getCell('A5').alignment = { horizontal: 'center' };

  let r = 7;

  // ===== Khối chỉ số tổng hợp (2 chỉ số mỗi hàng) =====
  if (opt.summary?.length) {
    ws.getCell(r, 1).value = 'I. CHỈ SỐ TỔNG HỢP';
    ws.getCell(r, 1).font = font({ bold: true });
    r++;
    const pairCols = Math.max(2, Math.floor(nCols / 2));
    for (let i = 0; i < opt.summary.length; i += 2) {
      [opt.summary[i], opt.summary[i + 1]].forEach((s, j) => {
        if (!s) return;
        const c1 = 1 + j * pairCols;
        const labelEnd = c1 + Math.max(0, pairCols - 2);
        if (labelEnd > c1) ws.mergeCells(r, c1, r, labelEnd);
        const label = ws.getCell(r, c1);
        label.value = s.label;
        label.font = font({ size: 11, color: { argb: 'FF334155' } });
        label.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
        label.border = BOX;
        const val = ws.getCell(r, labelEnd + 1);
        val.value = s.value;
        val.font = font({ bold: true, size: 12, color: { argb: s.color || RED } });
        val.alignment = { horizontal: 'right' };
        val.border = BOX;
        if (typeof s.value === 'number') val.numFmt = NUM_FMT[s.type || 'number'];
      });
      r++;
    }
    r++;
  }

  // ===== Các bảng dữ liệu =====
  const widths = Array(nCols).fill(6);
  widths[0] = 6;
  sections.forEach((sec, si) => {
    const heading = sec.heading || (opt.summary?.length || sections.length > 1 ? `${['I', 'II', 'III', 'IV', 'V', 'VI'][si + (opt.summary?.length ? 1 : 0)]}. ${sec.title || 'CHI TIẾT'}` : null);
    if (heading) {
      ws.getCell(r, 1).value = heading;
      ws.getCell(r, 1).font = font({ bold: true });
      r++;
    }

    const cols = [{ title: 'STT', type: 'number', width: 6, align: 'center' }, ...sec.columns];
    const headerRow = ws.getRow(r);
    cols.forEach((c, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = c.title;
      cell.font = font({ bold: true, size: 11, color: { argb: 'FFFFFFFF' } });
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = BOX;
      widths[i] = Math.max(widths[i], Math.min(40, textWidth(c.title) + 2));
    });
    headerRow.height = 30;
    const headerIndex = r;
    r++;

    sec.rows.forEach((row, ri) => {
      const xr = ws.getRow(r);
      cols.forEach((c, i) => {
        const cell = xr.getCell(i + 1);
        cell.value = i === 0 ? ri + 1 : cellValue(c, row);
        cell.font = font({ size: 11 });
        cell.border = BOX;
        if (NUM_FMT[c.type]) cell.numFmt = NUM_FMT[c.type];
        const numeric = ['number', 'decimal', 'ml', 'percent'].includes(c.type);
        cell.alignment = { vertical: 'middle', horizontal: c.align || (i === 0 ? 'center' : numeric ? 'right' : (c.type === 'date' || c.type === 'datetime') ? 'center' : 'left'), wrapText: !numeric };
        if (ri % 2 === 1) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
        widths[i] = Math.max(widths[i], Math.min(c.maxWidth || 45, textWidth(cell.value) + (c.type === 'ml' ? 5 : 2)));
      });
      r++;
    });

    if (!sec.rows.length) {
      ws.mergeCells(r, 1, r, cols.length);
      ws.getCell(r, 1).value = 'Không có dữ liệu trong kỳ báo cáo';
      ws.getCell(r, 1).font = font({ italic: true, color: { argb: 'FF94A3B8' } });
      ws.getCell(r, 1).alignment = { horizontal: 'center' };
      ws.getCell(r, 1).border = BOX;
      r++;
    } else if (sec.totals !== false && cols.some((c) => c.total)) {
      const tr = ws.getRow(r);
      cols.forEach((c, i) => {
        const cell = tr.getCell(i + 1);
        cell.border = { ...BOX, top: { style: 'medium', color: { argb: RED } } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_SOFT } };
        cell.font = font({ bold: true, size: 11 });
        if (c.total === 'sum') {
          const colLetter = ws.getColumn(i + 1).letter;
          const values = sec.rows.map((row) => Number(cellValue(c, row)) || 0);
          cell.value = { formula: `SUM(${colLetter}${headerIndex + 1}:${colLetter}${r - 1})`, result: values.reduce((a, b) => a + b, 0) };
          cell.numFmt = NUM_FMT[c.type] || NUM_FMT.number;
          cell.alignment = { horizontal: 'right' };
        }
      });
      const firstLabel = cols.findIndex((c, i) => i > 0 && !c.total);
      if (firstLabel > 0) {
        ws.mergeCells(r, 1, r, firstLabel + 1);
        tr.getCell(1).value = 'TỔNG CỘNG';
        tr.getCell(1).alignment = { horizontal: 'center' };
      }
      r++;
    }

    if (sections.length === 1 && sec.rows.length) {
      ws.autoFilter = { from: { row: headerIndex, column: 1 }, to: { row: headerIndex, column: cols.length } };
      ws.views = [{ state: 'frozen', ySplit: headerIndex, showGridLines: false }];
    }
    r += 1;
  });

  sections.forEach((sec) => sec.columns.forEach((c, i) => { if (c.width) widths[i + 1] = c.width; }));
  widths.forEach((w, i) => { ws.getColumn(i + 1).width = Math.max(w, i === 0 ? 6 : 10); });

  // ===== Ký tên =====
  r += 1;
  const signCol = Math.max(1, nCols - Math.min(3, nCols - 1));
  ws.mergeCells(r, signCol, r, nCols);
  ws.getCell(r, signCol).value = `TP. Hồ Chí Minh, ngày ${dayjs().format('DD')} tháng ${dayjs().format('MM')} năm ${dayjs().format('YYYY')}`;
  ws.getCell(r, signCol).font = font({ italic: true, size: 11 });
  ws.getCell(r, signCol).alignment = { horizontal: 'center' };
  r++;
  ws.mergeCells(r, signCol, r, nCols);
  ws.getCell(r, signCol).value = 'NGƯỜI LẬP BIỂU';
  ws.getCell(r, signCol).font = font({ bold: true });
  ws.getCell(r, signCol).alignment = { horizontal: 'center' };
  r++;
  ws.mergeCells(r, signCol, r, nCols);
  ws.getCell(r, signCol).value = '(Ký, ghi rõ họ tên)';
  ws.getCell(r, signCol).font = font({ italic: true, size: 10, color: { argb: 'FF64748B' } });
  ws.getCell(r, signCol).alignment = { horizontal: 'center' };
  if (opt.signer) {
    r += 4;
    ws.mergeCells(r, signCol, r, nCols);
    ws.getCell(r, signCol).value = opt.signer;
    ws.getCell(r, signCol).font = font({ bold: true });
    ws.getCell(r, signCol).alignment = { horizontal: 'center' };
  }

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${opt.fileName}-${dayjs().format('YYYYMMDD-HHmm')}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
