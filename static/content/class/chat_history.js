class ChatHistory {
    constructor(chatType = 'chatgpt') {
        this.chatTypes = ['chatgpt', 'chatpdf', 'chatsql', 'chatpbi', 'chatflow'];
        this.maxHistoryLength = 50; // Limit number of messages stored
        this.maxStorageSize = 4 * 1024 * 1024; // 4MB (leaving room under 5MB limit)
        this.setChatType(chatType);
    }

    // Validate and set chat type
    setChatType(chatType) {
        if (!this.chatTypes.includes(chatType)) {
            throw new Error(`Invalid chat type. Must be one of: ${this.chatTypes.join(', ')}`);
        }
        this.chatType = `${chatType}_chathistory`;
        this.loadHistory();
    }

    // Load chat history from localStorage with error handling
    loadHistory() {
        try {
            const savedHistory = localStorage.getItem(this.chatType);
            this.history = savedHistory ? JSON.parse(savedHistory) : [];
            
            // Ensure history is an array
            if (!Array.isArray(this.history)) {
                console.warn('Corrupted chat history - resetting to empty array');
                this.history = [];
                this.saveHistory();
            }
        } catch (e) {
            console.error('Failed to load chat history:', e);
            this.history = [];
        }
    }

    // Save chat history with size checks and error handling
    saveHistory() {
        try {
            const historyString = JSON.stringify(this.history);
            
            // Check if data would exceed storage limit
            if (this.calculateStorageSize(historyString) > this.maxStorageSize) {
                this.trimHistory();
                this.saveHistory(); // Try again with trimmed history
                return;
            }
            
            localStorage.setItem(this.chatType, historyString);
        } catch (e) {
            if (e.name === 'QuotaExceededError') {
                this.trimHistory();
                this.saveHistory(); // Try again with trimmed history
            } else {
                console.error('Failed to save chat history:', e);
            }
        }
    }

    // Calculate approximate storage size
    calculateStorageSize(data) {
        return new Blob([data]).size;
    }

    // Trim oldest messages to keep history manageable
    trimHistory() {
        // Remove oldest messages until we're under max length or size
        while (this.history.length > this.maxHistoryLength / 2) {
            this.history.shift();
        }
    }

    // Add a message to the chat history
    addMessage(role, content, timestamp = new Date().toISOString()) {
        if (role !== "user" && role !== "assistant") {
            throw new Error("Invalid role. Role must be either 'user' or 'assistant'.");
        }
        
        if (typeof content !== 'string' || content.trim() === '') {
            throw new Error("Message content must be a non-empty string");
        }
        
        this.history.push({ 
            role, 
            content: content.trim(),
            timestamp 
        });
        
        // Keep history to a reasonable length
        if (this.history.length > this.maxHistoryLength) {
            this.history.shift(); // Remove oldest message
        }
        
        this.saveHistory();
    }

    // Get the current chat history (optionally filtered)
    getHistory(filterOptions = {}) {
        let result = [...this.history];
        
        if (filterOptions.role) {
            result = result.filter(msg => msg.role === filterOptions.role);
        }
        
        if (filterOptions.since) {
            const sinceDate = new Date(filterOptions.since);
            result = result.filter(msg => new Date(msg.timestamp) >= sinceDate);
        }
        
        if (filterOptions.limit) {
            result = result.slice(-filterOptions.limit);
        }
        
        return result;
    }

    // Clear the chat history
    clearHistory() {
        this.history = [];
        localStorage.removeItem(this.chatType);
    }

    // Get storage usage statistics
    getStorageStats() {
        try {
            const historyString = JSON.stringify(this.history);
            return {
                messageCount: this.history.length,
                approximateSize: this.calculateStorageSize(historyString),
                sizeLimit: this.maxStorageSize
            };
        } catch (e) {
            console.error('Could not calculate storage stats:', e);
            return null;
        }
    }
}

/*
// Example usage
const chat = new ChatHistory('chatgpt');

// Adding messages
chat.addMessage("user", "Hello there!");
chat.addMessage("assistant", "Hi! How can I help you today?");
chat.addMessage("user", "Can you explain localStorage limits?");

// Get filtered history
console.log("Last 2 messages:", chat.getHistory({ limit: 2 }));
console.log("All assistant messages:", chat.getHistory({ role: "assistant" }));

// Check storage usage
console.log("Storage stats:", chat.getStorageStats());

// Test error handling
try {
    chat.addMessage("bot", "This should fail"); // Invalid role
} catch (e) {
    console.error("Caught error:", e.message);
}

// Switch chat type
chat.setChatType('chatpdf');
console.log("PDF chat history:", chat.getHistory());
*/