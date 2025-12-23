/**
 * Export data to CSV file
 * @param data - Array of objects to export
 * @param columns - Column definitions with key and header
 * @param filename - Name of the file (without extension)
 * @param title - Optional title for the report
 */
export function exportToCSV<T>(
  data: T[],
  columns: { key: string; header: string; render?: (item: T) => string | number }[],
  filename: string,
  title?: string
) {
  const rows: string[][] = [];
  
  // Add title and timestamp if provided
  if (title) {
    rows.push([title]);
    rows.push([`Generated: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}`]);
    rows.push([]);
  }
  
  // Add headers
  rows.push(columns.map(col => col.header));
  
  // Add data rows
  data.forEach((item, index) => {
    const row = columns.map(col => {
      if (col.render) {
        return String(col.render(item));
      }
      const value = (item as Record<string, unknown>)[col.key];
      return value !== null && value !== undefined ? String(value) : '';
    });
    rows.unshift; // Add index if needed
    rows.push(row);
  });
  
  // Convert to CSV string
  const csvContent = rows.map(row => 
    row.map(cell => {
      // Escape quotes and wrap in quotes if contains comma or newline
      const escaped = String(cell).replace(/"/g, '""');
      return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"') 
        ? `"${escaped}"` 
        : escaped;
    }).join(',')
  ).join('\n');
  
  // Create and download file
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format currency for export
 */
export function formatCurrencyForExport(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Format date for export
 */
export function formatDateForExport(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
