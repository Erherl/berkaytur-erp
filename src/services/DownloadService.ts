/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Service to handle browser downloads for Excel/CSV, formatted text PDFs,
 * and receipts dynamically without heavy external dependencies.
 */
export const DownloadService = {
  /**
   * Downloads client-side generated CSV for Excel compatibility
   */
  downloadCSV(headers: string[], rows: string[][], filename: string) {
    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.map(cell => `"${(cell || '').replace(/"/g, '""')}"`).join(';'))
    ].join('\n');

    // Include UTF-8 BOM for proper Excel Turkish character encoding
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename.endsWith('.csv') ? filename : `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Downloads a formatted text transaction receipt document
   */
  downloadReceipt(title: string, details: Record<string, string | number>, filename: string) {
    let content = `==================================================\n`;
    content += `                BERKAYTUR SERVIS TIC. A.S.        \n`;
    content += `==================================================\n`;
    content += `   ISLEM: ${title.toUpperCase()}\n`;
    content += `   TARIH: ${new Date().toLocaleString('tr-TR')}\n`;
    content += `==================================================\n\n`;

    Object.entries(details).forEach(([key, value]) => {
      content += `   ${key.padEnd(25, '.')}: ${value}\n`;
    });

    content += `\n==================================================\n`;
    content += `   Bu belge Berkaytur SaaS Tasima Yonetim Sistemi  \n`;
    content += `   tarafindan dijital olarak uretilmistir.         \n`;
    content += `   E-Imza Barkod No: BKT-${Math.floor(100000 + Math.random() * 900000)}\n`;
    content += `==================================================\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename.endsWith('.txt') ? filename : `${filename}.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  /**
   * Safe print layout helper
   */
  printContent(elementId: string) {
    const printEl = document.getElementById(elementId);
    if (!printEl) {
      window.print();
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Yazdırma penceresi pop-up engelleyici tarafından engellendi!');
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Yazdır - Berkaytur</title>
          <style>
            body { font-family: sans-serif; padding: 20px; color: #1e293b; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
            th { background-color: #f1f5f9; }
            h2, h3 { margin-bottom: 5px; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          ${printEl.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
};
