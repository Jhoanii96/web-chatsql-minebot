class ThoughtHistory {
    constructor(chatType = 'chatgpt') {
        this.chatTypes = ['chatgpt', 'chatpdf', 'chatsql', 'chatpbi', 'chatflow'];
        if (!this.chatTypes.includes(chatType)) {
            throw new Error(`Invalid chat type: ${chatType}. Supported types are ${this.chatTypes.join(', ')}.`);
        }
        this.chatType = chatType;
        this.localStorageKey = `${this.chatType}_thoughthistory`;
        this.history = this.loadHistory();
    }

    // Load chat history from localStorage
    loadHistory() {
        const storedHistory = localStorage.getItem(this.localStorageKey);
        return storedHistory ? JSON.parse(storedHistory) : [];
    }

    // Save chat history to localStorage
    saveHistory() {
        localStorage.setItem(this.localStorageKey, JSON.stringify(this.history));
    }

    // Add a conversation to the chat history
    addConversation(question, answer) {
        this.history.push({ question, answer });
        this.saveHistory();
    }

    // Clean chat history
    cleanHistory() {
        this.history = [];
        this.saveHistory();
    }

    // Switch chat type
    switchChatType(newType) {
        if (!this.chatTypes.includes(newType)) {
            throw new Error(`Invalid chat type: ${newType}. Supported types are ${this.chatTypes.join(', ')}.`);
        }
        // Save current history before switching
        this.saveHistory();

        // Update chatType and localStorage key
        this.chatType = newType;
        this.localStorageKey = `${this.chatType}_history`;

        // Load history for the new chat type
        this.history = this.loadHistory();
    }

    // Get current chat history
    getChatHistory() {
        return this.history;
    }
}
/*
// Example usage:

// Create a new instance of ChatHistory with 'chatgpt' type
const chatHistory = new ChatHistory('chatgpt');

// Add conversations to chat history
chatHistory.addConversation("What is ChatGPT?", "ChatGPT is an AI language model.");
chatHistory.addConversation("How does ChatGPT work?", "ChatGPT works by generating responses based on input.");

// Switch to 'chatsql' chat type
chatHistory.switchChatType('chatsql');

// Add conversations for 'chatsql'
chatHistory.addConversation("What is SQL?", "SQL stands for Structured Query Language.");
chatHistory.addConversation("How to query a database using SQL?", "You can query a database using SELECT, INSERT, UPDATE, DELETE statements.");

// Get current chat history
const history = chatHistory.getChatHistory();
console.log(history);

// Clean chat history
chatHistory.cleanHistory();

// Get chat history after cleaning
const newHistory = chatHistory.getChatHistory();
console.log(newHistory);
*/