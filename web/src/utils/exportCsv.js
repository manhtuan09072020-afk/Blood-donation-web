// Xuất dữ liệu bảng ra file CSV (mở được bằng Excel, giữ đúng tiếng Việt nhờ BOM UTF-8)
export function exportCsv(filename, columns, rows) {
  const escape = (value) => {
    if (value == null) return '';
    const s = String(value).replace(/"/g, '""');
    return /[",\n;]/.test(s) ? `"${s}"` : s;
  };
  const header = columns.map((c) => escape(c.title)).join(',');
  const body = rows.map((row) => columns.map((c) => escape(typeof c.value === 'function' ? c.value(row) : row[c.value])).join(','));
  const csv = '﻿' + [header, ...body].join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
