export function exportCsv<T>(rows: T[], filename: string) {
    if (!rows.length) return;
  
    // Grab ordered column keys
    const keys = Object.keys(rows[0] as object);
  
    const csv = [
      keys.join(','),                             // header
      ...rows.map(r => keys.map(k => JSON.stringify((r as any)[k] ?? '')).join(',')),
    ].join('\n');
  
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    link.click();
    URL.revokeObjectURL(link.href);
  }  