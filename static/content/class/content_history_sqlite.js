class ContentHistorySQLite {
    constructor(chatType = 'chatgpt') {
        this.chatTypes = ['chatgpt', 'chatpdf', 'chatsql', 'chatpbi', 'chatflow'];
        this.maxHistoryLength = 100;
        this.db = null;
        this.chatType = chatType;
        
        if (!this.chatTypes.includes(chatType)) {
            throw new Error(`Invalid chat type. Must be one of: ${this.chatTypes.join(', ')}`);
        }
        
        this.initDatabase();
    }

    async initDatabase() {
        try {
            if (typeof initSqlJs === 'undefined') {
                console.error('SQL.js not loaded');
                this.useLocalStorageFallback = true;
                this.loadHistory();
                return;
            }

            const SQL = await initSqlJs({
                locateFile: file => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.8.0/${file}`
            });

            // Load existing database from localStorage or create new one
            const savedDatabase = localStorage.getItem(`${this.chatType}_sqlite_db`);
            
            if (savedDatabase) {
                // Convert base64 back to Uint8Array
                const binaryString = atob(savedDatabase);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                this.db = new SQL.Database(bytes);
                console.log('Loaded existing SQLite database from localStorage');
            } else {
                // Create new database
                this.db = new SQL.Database();
                console.log('Created new SQLite database');
            }

            this.createTables();
            
        } catch (error) {
            console.error('Failed to initialize SQLite database:', error);
            this.useLocalStorageFallback = true;
            this.loadHistory();
        }
    }

    // Save database to localStorage
    saveDatabase() {
        if (!this.db || this.useLocalStorageFallback) return;
        
        try {
            // Export database to Uint8Array
            const exported = this.db.export();
            // Convert to base64 for localStorage storage
            const binaryString = String.fromCharCode(...exported);
            const base64 = btoa(binaryString);
            
            localStorage.setItem(`${this.chatType}_sqlite_db`, base64);
        } catch (error) {
            console.error('Failed to save database to localStorage:', error);
        }
    }

    createTables() {
        if (!this.db) return;
        
        this.db.run(`
            CREATE TABLE IF NOT EXISTS chat_messages (
                id_message TEXT PRIMARY KEY,
                chat_type TEXT NOT NULL,
                order_num INTEGER NOT NULL,
                task_id TEXT,
                group_id TEXT,
                role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
                sql_mode TEXT,
                content TEXT NOT NULL,
                sql_query_markdown TEXT,
                usage_summary_markdown TEXT,
                table_result TEXT,
                question TEXT,
                full_date TEXT NOT NULL,
                short_time TEXT,
                detailed_date TEXT,
                table_title TEXT,
                table_description TEXT,
                table_columns TEXT,
                phase_model TEXT,
                save_user_message INTEGER DEFAULT 0,
                save_id_table INTEGER DEFAULT 0,
                table_sql_server TEXT,
                table_sql_query TEXT,
                equipment_name TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        this.db.run(`CREATE INDEX IF NOT EXISTS idx_chat_type ON chat_messages(chat_type)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_group_id ON chat_messages(group_id)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_role ON chat_messages(role)`);
        this.db.run(`CREATE INDEX IF NOT EXISTS idx_full_date ON chat_messages(full_date)`);
        
        // Save the database after creating tables
        this.saveDatabase();
    }

    // FALLBACK to localStorage if SQLite not available
    loadHistory() {
        if (this.useLocalStorageFallback) {
            try {
                const savedHistory = localStorage.getItem(`${this.chatType}_contenthistory`);
                this.history = savedHistory ? JSON.parse(savedHistory) : [];
                
                if (!Array.isArray(this.history)) {
                    this.history = [];
                }
            } catch (e) {
                console.error('Failed to load history from localStorage:', e);
                this.history = [];
            }
        }
    }

    saveHistory() {
        if (this.useLocalStorageFallback) {
            try {
                localStorage.setItem(`${this.chatType}_contenthistory`, JSON.stringify(this.history));
            } catch (e) {
                console.error('Failed to save history to localStorage:', e);
            }
        }
    }

    // SYNCHRONOUS getNextOrderNum - no async/await
    getNextOrderNum() {
        if (!this.db || this.useLocalStorageFallback) {
            return this.history ? this.history.length : 0;
        }
        
        try {
            const result = this.db.exec(`
                SELECT COALESCE(MAX(order_num), -1) + 1 as next_order 
                FROM chat_messages 
                WHERE chat_type = '${this.chatType}'
            `);
            
            return result.length > 0 ? result[0].values[0][0] : 0;
        } catch (error) {
            console.error('Error getting next order number:', error);
            return 0;
        }
    }

    // MAIN addMessage method - handles both SQLite and fallback
    async addMessage(messageData = {}) {
        const {
            id_message = this.generateId(),
            order_num = this.getNextOrderNum(),
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
        } = messageData;

        // Validation
        if (!['user', 'assistant'].includes(role)) {
            throw new Error("Invalid role. Must be 'user' or 'assistant'");
        }
        
        if (typeof content !== 'string' || content.trim() === '') {
            throw new Error("Content must be a non-empty string");
        }

        let messageId;

        // Use SQLite if available
        if (this.db && !this.useLocalStorageFallback) {
            messageId = this.addMessageToSQLite({
                id_message, order_num, task_id, group_id, role, sql_mode,
                content, sql_query_markdown, usage_summary_markdown, table_result,
                question, full_date, short_time, detailed_date, table_title,
                table_description, table_columns, phase_model, save_user_message,
                save_id_table, table_sql_server, table_sql_query, equipment_name
            });
        } else {
            // Fallback to localStorage
            messageId = this.addMessageToLocalStorage({
                id_message, order_num, task_id, group_id, role, sql_mode,
                content, sql_query_markdown, usage_summary_markdown, table_result,
                question, full_date, short_time, detailed_date, table_title,
                table_description, table_columns, phase_model, save_user_message,
                save_id_table, table_sql_server, table_sql_query, equipment_name
            });
        }

        return messageId;
    }

    // SQLite-specific add message
    addMessageToSQLite(message) {
        if (!this.db) return message.id_message;

        const stmt = this.db.prepare(`
            INSERT INTO chat_messages (
                id_message, chat_type, order_num, task_id, group_id, role, sql_mode, 
                content, sql_query_markdown, usage_summary_markdown, table_result, 
                question, full_date, short_time, detailed_date, table_title, 
                table_description, table_columns, phase_model, save_user_message, 
                save_id_table, table_sql_server, table_sql_query, equipment_name
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        try {
            stmt.run([
                message.id_message,
                this.chatType,
                message.order_num,
                message.task_id,
                message.group_id,
                message.role,
                message.sql_mode,
                message.content.trim(),
                typeof message.sql_query_markdown === 'string' ? message.sql_query_markdown : "",
                typeof message.usage_summary_markdown === 'string' ? message.usage_summary_markdown : "",
                JSON.stringify(message.table_result),
                message.question,
                message.full_date,
                message.short_time,
                message.detailed_date,
                message.table_title,
                message.table_description,
                message.table_columns,
                message.phase_model,
                message.save_user_message,
                message.save_id_table,
                message.table_sql_server,
                message.table_sql_query,
                message.equipment_name
            ]);

            this.enforceHistoryLimit();
            
            // SAVE DATABASE AFTER ADDING MESSAGE
            this.saveDatabase();

            return message.id_message;

        } catch (error) {
            console.error('Error adding message to SQLite:', error);
            return this.addMessageToLocalStorage(message);
        } finally {
            if (stmt) stmt.free();
        }
    }

    // localStorage fallback
    addMessageToLocalStorage(message) {
        if (!this.history) this.history = [];
        
        this.history.push(message);
        
        if (this.history.length > this.maxHistoryLength) {
            this.history.shift();
        }
        
        this.saveHistory();
        return message.id_message;
    }

    // SYNCHRONOUS enforceHistoryLimit
    enforceHistoryLimit() {
        if (!this.db) return;
        
        try {
            const result = this.db.exec(`
                SELECT COUNT(*) as count FROM chat_messages WHERE chat_type = '${this.chatType}'
            `);
            
            const count = result[0].values[0][0];
            
            if (count > this.maxHistoryLength) {
                const toDelete = count - this.maxHistoryLength;
                
                this.db.run(`
                    DELETE FROM chat_messages 
                    WHERE chat_type = '${this.chatType}' 
                    AND id_message IN (
                        SELECT id_message FROM chat_messages 
                        WHERE chat_type = '${this.chatType}' 
                        ORDER BY order_num ASC 
                        LIMIT ${toDelete}
                    )
                `);
                
                // SAVE DATABASE AFTER DELETING MESSAGES
                this.saveDatabase();
            }
        } catch (error) {
            console.error('Error enforcing history limit:', error);
        }
    }

    // CLEAR HISTORY
    clearHistory() {
        if (this.db && !this.useLocalStorageFallback) {
            // Clear from SQLite
            try {
                this.db.run(`DELETE FROM chat_messages WHERE chat_type = ?`, [this.chatType]);
                console.log(`Cleared all messages for chat type: ${this.chatType}`);
                
                // Also remove the entire database from localStorage
                localStorage.removeItem(`${this.chatType}_sqlite_db`);
                
                // Recreate tables
                this.createTables();
                
            } catch (error) {
                console.error('Error clearing history from SQLite:', error);
                return false;
            }
        } else {
            // Clear from localStorage fallback
            this.history = [];
            try {
                localStorage.removeItem(`${this.chatType}_contenthistory`);
                console.log(`Cleared localStorage history for: ${this.chatType}`);
            } catch (error) {
                console.error('Error clearing history from localStorage:', error);
                return false;
            }
        }
        
        return true;
    }

    // Get history
    getHistory(options = {}) {
        const {
            limit = null,
            role = null,
            since = null,
            until = null,
            savedOnly = false,
            groupId = null
        } = options;

        if (this.db && !this.useLocalStorageFallback) {
            return this.getHistoryFromSQLite(limit, role, since, until, savedOnly, groupId);
        } else {
            return this.getHistoryFromLocalStorage(limit, role, since, until, savedOnly, groupId);
        }
    }

    getHistoryFromSQLite(limit, role, since, until, savedOnly, groupId) {
        if (!this.db) return [];

        let query = `SELECT * FROM chat_messages WHERE chat_type = '${this.chatType}'`;
        const conditions = [];
        const params = [];

        if (role) {
            conditions.push("role = ?");
            params.push(role);
        }
        
        if (since) {
            conditions.push("full_date >= ?");
            params.push(new Date(since).toISOString());
        }
        
        if (until) {
            conditions.push("full_date <= ?");
            params.push(new Date(until).toISOString());
        }
        
        if (savedOnly) {
            conditions.push("save_user_message = 1");
        }
        
        if (groupId) {
            conditions.push("group_id = ?");
            params.push(groupId);
        }

        if (conditions.length > 0) {
            query += " AND " + conditions.join(" AND ");
        }

        query += " ORDER BY order_num ASC";

        if (limit && limit > 0) {
            query += ` LIMIT ${limit}`;
        }

        try {
            const stmt = this.db.prepare(query);
            const results = [];
            
            if (params.length > 0) {
                stmt.bind(params);
            }
            
            while (stmt.step()) {
                const row = stmt.getAsObject();
                if (row.table_result) {
                    try {
                        row.table_result = JSON.parse(row.table_result);
                    } catch (e) {
                        row.table_result = [];
                    }
                }
                results.push(row);
            }
            
            stmt.free();
            return results;
        } catch (error) {
            console.error('Error getting history from SQLite:', error);
            return [];
        }
    }

    getHistoryFromLocalStorage(limit, role, since, until, savedOnly, groupId) {
        if (!this.history) return [];
        
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
            result = result.filter(msg => msg.save_user_message === 1);
        }
        
        if (groupId) {
            result = result.filter(msg => msg.group_id === groupId);
        }
        
        if (limit && limit > 0) {
            result = result.slice(-limit);
        }
        
        return result;
    }

    // Update message
    async updateMessage(id, updates) {
        if (updates.role || updates.id_message) {
            throw new Error('Cannot change message role or ID');
        }

        let success;

        if (this.db && !this.useLocalStorageFallback) {
            success = this.updateMessageInSQLite(id, updates);
        } else {
            success = this.updateMessageInLocalStorage(id, updates);
        }

        return success;
    }

    updateMessageInSQLite(id, updates) {
        if (!this.db) return false;

        const allowedFields = [
            'task_id', 'group_id', 'sql_mode', 'content', 'sql_query_markdown',
            'usage_summary_markdown', 'table_result', 'question', 'table_title',
            'table_description', 'table_columns', 'phase_model', 'save_user_message',
            'save_id_table', 'table_sql_server', 'table_sql_query', 'equipment_name'
        ];

        const setClauses = [];
        const params = [];

        allowedFields.forEach(field => {
            if (field in updates) {
                setClauses.push(`${field} = ?`);
                params.push(field === 'table_result' ? JSON.stringify(updates[field]) : updates[field]);
            }
        });

        setClauses.push("full_date = ?");
        params.push(new Date().toISOString());

        params.push(id);
        params.push(this.chatType);

        const query = `UPDATE chat_messages SET ${setClauses.join(', ')} WHERE id_message = ? AND chat_type = ?`;

        try {
            const stmt = this.db.prepare(query);
            stmt.run(params);
            stmt.free();

            // SAVE DATABASE AFTER UPDATE
            this.saveDatabase();

            return true;
        } catch (error) {
            console.error('Error updating message in SQLite:', error);
            return false;
        }
    }

    updateMessageInLocalStorage(id, updates) {
        const index = this.history.findIndex(msg => msg.id_message === id);
        if (index === -1) return false;

        this.history[index] = {
            ...this.history[index],
            ...updates,
            full_date: new Date().toISOString()
        };

        this.saveHistory();
        return true;
    }

    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }

    close() {
        if (this.db) {
            this.db.close();
        }
    }

    // Get database size info
    getDatabaseStats() {
        if (!this.db) return null;
        
        try {
            const sizeResult = this.db.exec("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()");
            const countResult = this.db.exec(`SELECT COUNT(*) as count FROM chat_messages WHERE chat_type = '${this.chatType}'`);
            
            return {
                databaseSize: sizeResult[0].values[0][0],
                messageCount: countResult[0].values[0][0],
                storageKey: `${this.chatType}_sqlite_db`
            };
        } catch (error) {
            console.error('Error getting database stats:', error);
            return null;
        }
    }
}