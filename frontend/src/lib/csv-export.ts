function escapeCsvValue(value: unknown): string {
  const str = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function buildCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(escapeCsvValue).join(",")).join("\r\n");
}

/**
 * Triggers a browser download of a CSV string. Uses a temporary anchor with
 * a blob: URL and revokes it immediately after, since the artifact sandbox
 * (and some embedded webviews) blocks `download` on data:/blob: links that
 * stay in the DOM - a click-and-remove anchor works reliably everywhere.
 */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const csv = buildCsv(rows);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
