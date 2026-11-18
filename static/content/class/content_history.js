class ContentHistory {
    constructor(chatType = 'chatgpt') {
        this.chatTypes = ['chatgpt', 'chatpdf', 'chatsql', 'chatpbi', 'chatflow'];
        this.maxHistoryLength = 100; // Maximum messages to store
        this.maxStorageSize = 4.5 * 1024 * 1024; // 4.5MB (leaving buffer under 5MB limit)
        this.setChatType(chatType);
    }

    // Set and validate chat type
    setChatType(chatType) {
        if (!this.chatTypes.includes(chatType)) {
            throw new Error(`Invalid chat type. Must be one of: ${this.chatTypes.join(', ')}`);
        }
        this.chatType = `${chatType}_contenthistory`;
        this.loadHistory();
    }

    // Load history with error handling and data validation
    loadHistory() {
        try {
            const savedHistory = localStorage.getItem(this.chatType);
            this.history = savedHistory ? JSON.parse(savedHistory) : [];
            
            // Validate history structure
            if (!Array.isArray(this.history)) {
                console.warn('Corrupted history data - resetting');
                this.history = [];
                this.saveHistory();
                return;
            }
            
            // Ensure each item has required fields
            this.history = this.history.filter(item => 
                item && typeof item === 'object' && 
                ['user', 'assistant'].includes(item.role)
            );
        } catch (e) {
            console.error('Failed to load history:', e);
            this.history = [];
        }
    }

    // Save history with size checks and error handling
    saveHistory() {
        try {
            const historyString = JSON.stringify(this.history);
            
            // Check storage size
            if (this.calculateStorageSize(historyString) > this.maxStorageSize) {
                this.trimHistory();
                this.saveHistory(); // Retry with trimmed history
                return;
            }
            
            localStorage.setItem(this.chatType, historyString);
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                this.trimHistory();
                this.saveHistory(); // Retry with trimmed history
            } else {
                console.error('Failed to save history:', e);
                throw new Error('Failed to save history to storage');
            }
        }
    }

    // Calculate approximate storage size
    calculateStorageSize(data) {
        return new Blob([data]).size;
    }

    // Trim oldest messages when storage is full
    trimHistory() {
        while (this.history.length > this.maxHistoryLength / 2) {
            this.history.shift();
        }
    }

    // Add a message with comprehensive validation
    addMessage({
        id_message = this.generateId(),
        order_num = this.history.length,
        task_id = "",
        group_id = "",
        role = "",
        sql_mode = "",
        content = "",
        sql_query_markdown = "",
        usage_summary_markdown = "",
        table_result = [],
        question = "",
        full_date = new Date().toISOString(),
        short_time = new Date().toLocaleTimeString(),
        detailed_date = new Date().toString(),
        table_title = "",
        table_description = "",
        table_columns = "",
        phase_model = "",
        save_user_message = 0,
        save_id_table = 0,
        table_sql_server = "",
        table_sql_query = "",
        equipment_name = ""
    } = {}) {
        // Validate required fields
        if (!['user', 'assistant'].includes(role)) {
            throw new Error("Invalid role. Must be 'user' or 'assistant'");
        }
        
        if (typeof content !== 'string' || content.trim() === '') {
            throw new Error("Content must be a non-empty string");
        }
        
        // Create message object
        const message = {
            id_message,
            order_num: Number.isInteger(order_num) ? order_num : this.history.length,
            task_id,
            group_id,
            role,
            sql_mode,
            content: content.trim(),
            sql_query_markdown: typeof sql_query_markdown === 'string' ? sql_query_markdown : "",
            usage_summary_markdown: typeof usage_summary_markdown === 'string' ? usage_summary_markdown : "",
            table_result: Array.isArray(table_result) ? table_result : [],
            question,
            full_date,
            short_time,
            detailed_date,
            table_title,
            table_description,
            table_columns,
            table_sql_server,
            table_sql_query,
            phase_model,
            save_user_message,
            save_id_table,
            equipment_name
        };
        
        this.history.push(message);
        
        // Maintain history length limit
        if (this.history.length > this.maxHistoryLength) {
            this.history.shift();
        }
        
        this.saveHistory();
        return message.id_message;
    }

    // Generate a unique ID for messages
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    // Get history with optional filtering
    getHistory({
        limit = null,
        role = null,
        since = null,
        until = null,
        savedOnly = false,
        groupId = null
    } = {}) {
        let result = [...this.history];
        
        if (role) {
            result = result.filter(msg => msg.role === role);
        }
        
        if (since) {
            const sinceDate = new Date(since);
            result = result.filter(msg => new Date(msg.full_date) >= sinceDate);
        }
        
        if (until) {
            const untilDate = new Date(until);
            result = result.filter(msg => new Date(msg.full_date) <= untilDate);
        }
        
        if (savedOnly) {
            result = result.filter(msg => msg.saved_message === 1);
        }
        
        if (groupId) {
            result = result.filter(msg => msg.group_id === groupId);
        }
        
        if (limit && limit > 0) {
            result = result.slice(-limit);
        }
        
        return result;
    }

    // Update an existing message
    updateMessage(id, updates) {
        const index = this.history.findIndex(msg => msg.id_message === id);
        if (index === -1) {
            throw new Error('Message not found');
        }
        
        // Don't allow changing role or id
        if (updates.role || updates.id_message) {
            throw new Error('Cannot change message role or ID');
        }
        
        // Apply updates
        this.history[index] = {
            ...this.history[index],
            ...updates,
            full_date: new Date().toISOString() // Update timestamp
        };
        
        this.saveHistory();
        return true;
    }

    // Clear the history
    clearHistory() {
        this.history = [];
        localStorage.removeItem(this.chatType);
    }

    // Get storage statistics
    getStorageStats() {
        try {
            const historyString = JSON.stringify(this.history);
            return {
                messageCount: this.history.length,
                approximateSize: this.calculateStorageSize(historyString),
                sizeLimit: this.maxStorageSize,
                usagePercentage: (this.calculateStorageSize(historyString) / this.maxStorageSize * 100).toFixed(2) + '%'
            };
        } catch (e) {
            console.error('Could not calculate storage stats:', e);
            return null;
        }
    }
}

/*
// Example Usage
const content = new ContentHistory('chatgpt');

// Add a complex message
const messageId = content.addMessage({
    role: "user",
    content: "Analyze this sales data",
    content_detail: "Detailed analysis request",
    table_result: [{id: 1, value: 100}, {id: 2, value: 200}],
    table_title: "Sales Data",
    saved_message: 1
});

console.log("Added message ID:", messageId);

// Get filtered history
console.log("Saved messages:", content.getHistory({ savedOnly: true }));
console.log("Last 5 messages:", content.getHistory({ limit: 5 }));

// Update a message
content.updateMessage(messageId, {
    content: "Updated analysis request",
    saved_message: 0
});

// Check storage
console.log("Storage stats:", content.getStorageStats());

// Switch to PDF chat
content.setChatType('chatpdf');
content.addMessage({
    role: "user",
    content: "PDF analysis request"
});
console.log("PDF history:", content.getHistory());
*/