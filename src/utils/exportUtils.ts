// Utility functions for exporting and printing data in government dashboards

/**
 * Export data to CSV and trigger download
 */
export const exportToCSV = (data: any[], filename: string, columns?: { key: string; header: string }[]) => {
    if (!data || data.length === 0) {
        alert('No data to export');
        return;
    }

    // Get headers from columns or from first data item keys
    const headers = columns
        ? columns.map(col => col.header)
        : Object.keys(data[0]);

    const keys = columns
        ? columns.map(col => col.key)
        : Object.keys(data[0]);

    // Create CSV content
    const csvRows = [];

    // Add header row
    csvRows.push(headers.join(','));

    // Add data rows
    for (const row of data) {
        const values = keys.map(key => {
            const value = row[key];
            // Handle values with commas, quotes, or newlines
            if (value === null || value === undefined) return '';
            const stringValue = String(value);
            if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
                return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
        });
        csvRows.push(values.join(','));
    }

    const csvContent = csvRows.join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Export data to JSON and trigger download
 */
export const exportToJSON = (data: any, filename: string) => {
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

/**
 * Print a specific section of the page
 */
export const printSection = (title: string, contentRef?: HTMLElement | null) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to print');
        return;
    }

    // Get content to print
    let content = '';
    if (contentRef) {
        content = contentRef.innerHTML;
    } else {
        // Print the main content area
        const mainContent = document.querySelector('main') || document.querySelector('.govt-section');
        content = mainContent?.innerHTML || '';
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body {
                    font-family: 'Noto Sans', Arial, sans-serif;
                    padding: 20px;
                    color: #333;
                }
                h1 {
                    font-size: 18px;
                    margin-bottom: 20px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #1a365d;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 15px 0;
                }
                th, td {
                    border: 1px solid #ccc;
                    padding: 8px;
                    text-align: left;
                    font-size: 12px;
                }
                th {
                    background-color: #f0f0f0;
                    font-weight: 600;
                }
                tr:nth-child(even) {
                    background-color: #f9f9f9;
                }
                .header-info {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 15px;
                    font-size: 11px;
                    color: #666;
                }
                .footer-info {
                    margin-top: 30px;
                    padding-top: 10px;
                    border-top: 1px solid #ccc;
                    font-size: 10px;
                    color: #888;
                }
                @media print {
                    body { -webkit-print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <div class="header-info">
                <span>TraceSafe - Government Portal</span>
                <span>Generated: ${new Date().toLocaleString()}</span>
            </div>
            <h1>${title}</h1>
            ${content}
            <div class="footer-info">
                This document was generated from TraceSafe Government Portal. 
                For official records, please contact the relevant authority.
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    // Wait for content to load before printing
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
};

/**
 * Generate and download a PDF-like HTML report
 */
export const downloadPDFReport = (title: string, data: any, type: 'farmer' | 'batch' | 'compliance') => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to generate PDF');
        return;
    }

    let content = '';

    if (type === 'farmer') {
        content = `
            <div class="profile-section">
                <h2>Farmer Profile</h2>
                <table>
                    <tr><td><strong>Farmer ID:</strong></td><td>${data.farmer_id || 'N/A'}</td></tr>
                    <tr><td><strong>Name:</strong></td><td>${data.name || 'N/A'}</td></tr>
                    <tr><td><strong>Land:</strong></td><td>${data.land || 'N/A'}</td></tr>
                    <tr><td><strong>Crops:</strong></td><td>${data.crops || 'N/A'}</td></tr>
                    <tr><td><strong>Registry Status:</strong></td><td>${data.registry_status || 'N/A'}</td></tr>
                    <tr><td><strong>Verification:</strong></td><td>${data.verified ? 'Verified' : 'Pending'}</td></tr>
                </table>
            </div>
        `;
    } else if (type === 'compliance') {
        content = `
            <div class="compliance-section">
                <h2>Compliance Report</h2>
                <table>
                    <tr><td><strong>Batch ID:</strong></td><td>${data.batchId || 'N/A'}</td></tr>
                    <tr><td><strong>Commodity:</strong></td><td>${data.commodity || 'N/A'}</td></tr>
                    <tr><td><strong>Status:</strong></td><td>${data.status || 'N/A'}</td></tr>
                    <tr><td><strong>Risk Assessment:</strong></td><td>${data.riskAssessment || 'N/A'}</td></tr>
                    <tr><td><strong>Last Updated:</strong></td><td>${data.lastUpdated || 'N/A'}</td></tr>
                </table>
            </div>
        `;
    }

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body {
                    font-family: 'Noto Sans', Arial, sans-serif;
                    padding: 40px;
                    color: #333;
                    max-width: 800px;
                    margin: 0 auto;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    padding-bottom: 20px;
                    border-bottom: 3px solid #1a365d;
                }
                .header h1 {
                    margin: 0;
                    color: #1a365d;
                }
                .header p {
                    color: #666;
                    margin-top: 5px;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                }
                td {
                    padding: 10px;
                    border-bottom: 1px solid #eee;
                }
                td:first-child {
                    width: 40%;
                    color: #666;
                }
                .profile-section, .compliance-section {
                    margin: 20px 0;
                }
                h2 {
                    color: #1a365d;
                    border-bottom: 2px solid #eee;
                    padding-bottom: 10px;
                }
                .footer {
                    margin-top: 50px;
                    text-align: center;
                    font-size: 11px;
                    color: #888;
                    border-top: 1px solid #eee;
                    padding-top: 20px;
                }
                .download-btn {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #1a365d;
                    color: white;
                    padding: 10px 20px;
                    border: none;
                    cursor: pointer;
                    border-radius: 4px;
                }
                @media print {
                    .download-btn { display: none; }
                }
            </style>
        </head>
        <body>
            <button class="download-btn" onclick="window.print()">Print / Save as PDF</button>
            <div class="header">
                <h1>TraceSafe - Government Portal</h1>
                <p>${title}</p>
            </div>
            ${content}
            <div class="footer">
                <p>Generated on ${new Date().toLocaleString()}</p>
                <p>This document is for informational purposes only.</p>
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
};

/**
 * Print table data directly
 */
export const printTableData = (title: string, columns: { key: string; header: string }[], data: any[]) => {
    if (!data || data.length === 0) {
        alert('No data to print');
        return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        alert('Please allow popups to print');
        return;
    }

    const tableRows = data.map(row => {
        const cells = columns.map(col => `<td>${row[col.key] ?? 'N/A'}</td>`).join('');
        return `<tr>${cells}</tr>`;
    }).join('');

    const tableHeaders = columns.map(col => `<th>${col.header}</th>`).join('');

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>${title}</title>
            <style>
                body {
                    font-family: 'Noto Sans', Arial, sans-serif;
                    padding: 20px;
                    color: #333;
                }
                h1 {
                    font-size: 16px;
                    color: #1a365d;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 2px solid #1a365d;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 11px;
                }
                th, td {
                    border: 1px solid #ccc;
                    padding: 6px 8px;
                    text-align: left;
                }
                th {
                    background-color: #1a365d;
                    color: white;
                    font-weight: 600;
                }
                tr:nth-child(even) {
                    background-color: #f5f5f5;
                }
                .meta {
                    font-size: 10px;
                    color: #888;
                    margin-top: 15px;
                }
                @media print {
                    body { -webkit-print-color-adjust: exact; }
                }
            </style>
        </head>
        <body>
            <h1>${title}</h1>
            <table>
                <thead><tr>${tableHeaders}</tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
            <div class="meta">
                TraceSafe Government Portal | Generated: ${new Date().toLocaleString()} | Records: ${data.length}
            </div>
        </body>
        </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 250);
};
