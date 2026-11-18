import pyodbc
import logging
from environment import SQL_SERVER_STR

class SqlSecretStore:
    """Secure secret storage using SQL Server database"""
    
    def __init__(self):
        """
        Initialize SQL Server secret store
        
        :param server: SQL Server hostname or IP
        :param database: Database name containing secrets table
        :param table_name: Name of the secrets table (default: 'Secrets')
        """
        self.conn_str = SQL_SERVER_STR
        self._ensure_table_exists()

    def _ensure_table_exists(self):
        """Create secrets table if it doesn't exist"""
        create_table_sql = f"""
        IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = 'mbot' AND TABLE_NAME = 'secret_store')
        CREATE TABLE [mbot].[secret_store] (
            Name NVARCHAR(255) PRIMARY KEY,
            Value NVARCHAR(MAX) NOT NULL,
            CreatedAt DATETIME DEFAULT GETDATE(),
            UpdatedAt DATETIME DEFAULT GETDATE()
        )
        """
        try:
            with pyodbc.connect(self.conn_str) as conn:
                with conn.cursor() as cursor:
                    cursor.execute(create_table_sql)
                    conn.commit()
        except pyodbc.Error as e:
            logging.error(f"Table creation failed: {str(e)}")
            raise

    def get_secret(self, secret_name: str) -> str:
        """Retrieve a secret value by name"""
        query = f"SELECT Value FROM [mbot].[secret_store] WHERE Name = ?"
        
        try:
            with pyodbc.connect(self.conn_str) as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, (secret_name,))
                    row = cursor.fetchone()
                    if row:
                        return row.Value
                    raise KeyError(f"Secret '{secret_name}' not found")
        except pyodbc.Error as e:
            logging.error(f"Secret retrieval failed: {str(e)}")
            raise

    def set_secret(self, secret_name: str, secret_value: str):
        """Store or update a secret"""
        upsert_sql = f"""
        MERGE INTO [mbot].[secret_store] AS target
        USING (VALUES (?, ?)) AS source (Name, Value)
        ON target.Name = source.Name
        WHEN MATCHED THEN
            UPDATE SET Value = source.Value, UpdatedAt = GETDATE()
        WHEN NOT MATCHED THEN
            INSERT (Name, Value) VALUES (source.Name, source.Value);
        """
        try:
            with pyodbc.connect(self.conn_str) as conn:
                with conn.cursor() as cursor:
                    cursor.execute(upsert_sql, (secret_name, secret_value))
                    conn.commit()
        except pyodbc.Error as e:
            logging.error(f"Secret storage failed: {str(e)}")
            raise


class ApplicationDatabase:
    """Manages database connections using secrets from SQL storage"""
    
    def __init__(self, secret_store: SqlSecretStore, secret_name: str = 'sql_server_connection_string'):
        """
        Initialize application database connection
        
        :param secret_store: Initialized SqlSecretStore instance
        :param secret_name: Name of the connection string secret
        """
        self.secret_store = secret_store
        self.secret_name = secret_name
        self.conn_str = self._get_connection_string()

    def _get_connection_string(self) -> str:
        """Retrieve connection string from secret store"""
        try:
            return self.secret_store.get_secret(self.secret_name)
        except KeyError:
            logging.critical(f"Missing connection string secret: {self.secret_name}")
            raise
        except Exception as e:
            logging.error(f"Secret retrieval error: {str(e)}")
            raise

    def get_connection(self):
        """Get authenticated database connection"""
        try:
            return pyodbc.connect(self.conn_str)
        except pyodbc.Error as e:
            logging.error(f"Connection failed: {str(e)}")
            raise