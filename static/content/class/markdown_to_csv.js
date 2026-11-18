class AdvancedCSVExporter {
    static exportMarkdownTable(markdownTable, options = {}) {
        const {
            filename = 'export.csv',
            includeHeaders = true,
            delimiter = ',',
            addBOM = true, // Add Byte Order Mark for Excel
            timestamp = false
        } = options;
        
        let csvContent = this.convertMarkdownToCSV(markdownTable, {
            includeHeaders,
            delimiter
        });
        
        // Add timestamp to filename if requested
        let finalFilename = filename;
        if (timestamp) {
            finalFilename = this.addTimestampToFilename(filename);
        }
        
        // Add BOM for Excel compatibility
        if (addBOM) {
            csvContent = '\uFEFF' + csvContent;
        }
        
        this.downloadFile(csvContent, finalFilename, 'text/csv');
        return finalFilename;
    }
    
    static convertMarkdownToCSV(markdownTable, options = {}) {
        const { includeHeaders = true, delimiter = ',' } = options;
        const lines = markdownTable.trim().split('\n');
        const result = [];
        let isFirstLine = true;
        
        for (const line of lines) {
            const trimmedLine = line.trim();
            
            if (this.isSeparatorLine(trimmedLine) || !trimmedLine) {
                continue;
            }
            
            // Skip headers if requested
            if (!includeHeaders && isFirstLine) {
                isFirstLine = false;
                continue;
            }
            
            const cells = this.parseMarkdownLine(trimmedLine);
            const escapedCells = cells.map(cell => this.escapeCSVValue(cell, delimiter));
            result.push(escapedCells.join(delimiter));
            isFirstLine = false;
        }
        
        return result.join('\n');
    }
    
    static parseMarkdownLine(line) {
        const cleanLine = line.replace(/^\||\|$/g, '').trim();
        return cleanLine.split('|').map(cell => cell.trim());
    }
    
    static escapeCSVValue(value, delimiter = ',') {
        if (value.includes('"') || value.includes(delimiter) || value.includes('\n')) {
            return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
    }
    
    static isSeparatorLine(line) {
        return line.match(/^\|(\s*[-:]+\s*\|)+$/);
    }
    
    static addTimestampToFilename(filename) {
        const extension = filename.includes('.') ? filename.split('.').pop() : 'csv';
        const baseName = filename.includes('.') ? filename.split('.').slice(0, -1).join('.') : filename;
        const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        return `${baseName}_${timestamp}.${extension}`;
    }
    
    static downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.href = url;
        link.download = filename;
        link.style.display = 'none';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
}



class MarkdownTableConverter {
    static toCSV(markdownTable) {
        try {
            const lines = markdownTable.trim().split('\n');
            const result = [];
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                
                // Skip separator lines and empty lines
                if (this.isSeparatorLine(trimmedLine) || !trimmedLine) {
                    continue;
                }
                
                const cells = this.parseLine(trimmedLine);
                const csvLine = cells.map(cell => this.escapeCSV(cell)).join(',');
                result.push(csvLine);
            }
            
            return result.join('\n');
        } catch (error) {
            console.error('Error converting markdown table to CSV:', error);
            throw error;
        }
    }
    
    static isSeparatorLine(line) {
        return line.match(/^\|(\s*[-:]+\s*\|)+$/);
    }
    
    static parseLine(line) {
        // Remove leading/trailing pipes and trim
        const cleanLine = line.replace(/^\||\|$/g, '').trim();
        
        // Split by pipe and trim each cell
        return cleanLine.split('|').map(cell => cell.trim());
    }
    
    static escapeCSV(text) {
        // Escape quotes by doubling them and wrap in quotes if needed
        if (text.includes('"') || text.includes(',') || text.includes('\n')) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    }
    
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            showMessage('Table copied to clipboard!', 5);
            return true;
        } catch (err) {
            showMessage('Failed to copy:', 5);
            
            // Fallback for older browsers
            return this.fallbackCopyToClipboard(text);
        }
    }
    
    static fallbackCopyToClipboard(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful;
        } catch (err) {
            console.error('Fallback copy failed:', err);
            document.body.removeChild(textArea);
            return false;
        }
    }
}