import time 
import inspect
from flask import request, Blueprint, session, Response 
from azure.identity import ManagedIdentityCredential 
from azure.keyvault.secrets import SecretClient 
from environment import SQL_TIMEOUT, SQL_SERVER_STR, SQL_SCHEMA, KEYVAULT_URL   
from functions.tools import convert_to_float 
from functions.openai import openai_chatcompletion 
from classes.sqlconnection import QueryExecutor 
from classes.secretstore import SqlSecretStore 
from routes.mainscript import save_system_error_log

app_dictionary = Blueprint('app_dictionary', __name__, template_folder='templates')
executor_instance = QueryExecutor() 

# Identity Credential
#credentials = ManagedIdentityCredential() 
secret_store = SqlSecretStore()

def get_data_dictionary(sql_server_str: str, table_schema: str, table_name: str):
    full_query = """
    DECLARE @TableName NVARCHAR(128) = '[""" + table_schema + """].[""" + table_name + """]' 
    DECLARE @ColumnName NVARCHAR(128)
    DECLARE @DataType NVARCHAR(128)
    DECLARE @SQL NVARCHAR(MAX) = ''
    DECLARE @SchemaName NVARCHAR(128) = PARSENAME(@TableName, 2)
    DECLARE @TableOnly NVARCHAR(128) = PARSENAME(@TableName, 1)

    -- Cursor para iterar sobre las columnas
    DECLARE column_cursor CURSOR FOR
    SELECT COLUMN_NAME, DATA_TYPE
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_NAME = @TableOnly AND TABLE_SCHEMA = @SchemaName

    OPEN column_cursor
    FETCH NEXT FROM column_cursor INTO @ColumnName, @DataType

    WHILE @@FETCH_STATUS = 0
    BEGIN
        SET @SQL = @SQL + 'SELECT ''' + @ColumnName + ''' AS [Column], ''' + @DataType + ''' AS [DataType], '

        IF @DataType IN ('varchar', 'nvarchar', 'char', 'nchar', 'text', 'ntext')
        BEGIN
            SET @SQL = @SQL + '(SELECT STRING_AGG(CONVERT(NVARCHAR(MAX), CASE WHEN LEN(DISTINCT_VAL) > 50 THEN LEFT(DISTINCT_VAL, 47) + ''...'' ELSE DISTINCT_VAL END), '', '') FROM (SELECT DISTINCT TOP 50 [' + @ColumnName + '] AS DISTINCT_VAL FROM ' + @SchemaName + '.' + @TableOnly + ') AS DistinctValues) AS [ExampleContent]'
        END
        ELSE
        BEGIN
            SET @SQL = @SQL + 'NULL AS [ExampleContent]'
        END

        SET @SQL = @SQL + ' UNION ALL '

        FETCH NEXT FROM column_cursor INTO @ColumnName, @DataType
    END

    CLOSE column_cursor
    DEALLOCATE column_cursor

    -- Eliminar la última UNION ALL
    SET @SQL = LEFT(@SQL, LEN(@SQL) - 10)

    -- Ejecutar la consulta dinámica
    EXEC sp_executesql @SQL 
    """
    data_object = []
    try:
        future_result = executor_instance.query_executor(full_query, connection_string=sql_server_str) 
        result = future_result.result(timeout=SQL_TIMEOUT) 
        data_object = result[0] 
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(ex)
    return (data_object)


@app_dictionary.route("/dictionary/ReadDictionaryTable", methods=["POST"])
def ReadDictionaryTable():
    try: 
        data = request.get_json() 
        id_table = str(data["id_table"]) 
        query = f"""
            SELECT 
                 di.[id_dictionary] as [Id]
                ,di.[column_name] as [Column_Name]
                ,di.[data_type] as [Data_Type]
                ,di.[description] as [Description]
                ,(CASE WHEN ISNULL(di.[last_date_updated], 0) = 1 THEN 'checked' ELSE '' END) as [last_date_updated]
                ,di.[examples] as [Example]
                ,FORMAT(di.[created_at], 'yyyy-MM-dd HH:mm:ss') AS [Created_At] 
                ,FORMAT(di.[updated_at], 'yyyy-MM-dd HH:mm:ss') AS [Updated_At] 
            FROM [{SQL_SCHEMA}].[sql_dictionary] di  
            LEFT JOIN [{SQL_SCHEMA}].[sql_tables] ta  
            ON ta.id = di.id_table 
            WHERE di.id_table = {id_table} AND di.[deleted_at] IS NULL AND ta.[deleted_at] IS NULL; 
        """
        future_result = executor_instance.query_executor(query) 
        result = future_result.result(timeout=SQL_TIMEOUT)  
        return result[0] 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 


@app_dictionary.route("/dictionary/ReloadDataDictionary", methods=["POST"]) 
def ReloadDataDictionary():
    try:
        data = request.get_json() 
        id_table = data["id_table"]
        sql_server_table = str(data["sql_server"])   
        full_table_name = str(data["source_table"])  
        schema_name = full_table_name.split(".")[0] 
        table_name = full_table_name.split(".")[1] 
        
        sql_server_str = secret_store.get_secret(sql_server_table)
        #sql_server_str = SecretClient(vault_url=KEYVAULT_URL, credential=credentials, logging_enable=False).get_secret(sql_server_table, logging_enable=False).value
        #sql_server_str="DRIVER={ODBC Driver 17 for SQL Server};SERVER=usaeu2velman-dev-sql.database.windows.net;DATABASE=GIGVELKPIDB;UID=velmanadm;PWD=usaeu2catA#!@733;"
        #sql_server_str="DRIVER={ODBC Driver 17 for SQL Server};SERVER=usaeu2velman-prod-sql.database.windows.net;DATABASE=USAEU2VELMAN-PROD-sqldb;UID=velmanadm;PWD=6XBhhpXRpGIIkCQRYy8L;"

        data_dictionary = get_data_dictionary(sql_server_str, schema_name, table_name) 
        full_query = ""
        for row in data_dictionary:
            full_query += f"({id_table}, '{row['Column']}', '{row['DataType']}', '{row['ExampleContent']}'),\n"
        full_query = full_query.strip()[:-1]

        query = f"""
            MERGE INTO [{SQL_SCHEMA}].[sql_dictionary] AS target
            USING (VALUES
                    {full_query}
                ) AS source ([id_table], [column_name], [data_type], [examples])
            ON target.[id_table] = source.[id_table] AND target.[column_name] = source.[column_name] 
            WHEN MATCHED THEN 
                UPDATE SET 
                    target.[data_type] = source.[data_type],
                    target.[examples] = source.[examples],
                    target.[updated_at] = GETDATE(),  
                    target.[deleted_at] = NULL 
            WHEN NOT MATCHED THEN
                INSERT ([id_dictionary], [id_table], [column_name], [data_type], [examples], [created_at], [updated_at])
                VALUES (LOWER(NEWID()), source.[id_table], source.[column_name], source.[data_type], source.[examples], GETDATE(), GETDATE());
        """ 
        executor_instance.query_executor(query, commit=True).result(timeout=SQL_TIMEOUT) 
        return {'result': 'OK'}
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 






@app_dictionary.route("/dictionary/SaveAllDictionary", methods=["POST"]) 
def SaveAllDictionary():
    try:
        data = request.get_json() 
        id_table = data["id_table"] 
        data_dictionary = list(data["tableData"]) 

        full_query = ""
        for row in data_dictionary:
            id_dictionary = str(row['row_id'])
            column_name = str(row['column_name'])
            data_type = str(row['data_type']).replace("'", "''")
            description = str(row['description']).replace("'", "''")
            examples = str(row['examples']).replace("'", "''")
            last_date_updated = str(row['last_date_updated'])
            full_query += f"('{id_dictionary}', {id_table}, '{column_name}', '{data_type}', '{description}', '{examples}', {last_date_updated}),\n"
        full_query = full_query.strip()[:-1] 
        
        query = f"""
            MERGE INTO [{SQL_SCHEMA}].[sql_dictionary] AS target
            USING (VALUES
                    {full_query}
                ) AS source ([id_dictionary], [id_table], [column_name], [data_type], [description], [examples], [last_date_updated])
            ON target.[id_dictionary] = source.[id_dictionary] 
            WHEN MATCHED THEN 
                UPDATE SET 
                    target.[column_name] = source.[column_name],
                    target.[data_type] = source.[data_type],
                    target.[description] = source.[description],
                    target.[examples] = source.[examples],
                    target.[last_date_updated] = source.[last_date_updated], 
                    target.[updated_at] = GETDATE(),
                    target.[deleted_at] = NULL   
            WHEN NOT MATCHED THEN 
                INSERT ([id_dictionary], [id_table], [column_name], [data_type], [description], [examples], [last_date_updated], [created_at], [updated_at])
                VALUES (source.[id_dictionary], source.[id_table], source.[column_name], source.[data_type], source.[description], source.[examples], source.[last_date_updated], GETDATE(), GETDATE());
        """ 
        executor_instance.query_executor(query, commit=True).result(timeout=SQL_TIMEOUT) 
        return {'result': 'OK'}
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 







@app_dictionary.route("/dictionary/GenerateDescriptionChatgpt", methods=["POST"])
def GenerateDescriptionChatgpt():
    try: 
        data = request.get_json() 
        openai_object = data["openai_object"] 
        dictionary_user_prompt = str(data["dictionary_user_prompt"]) 
        full_table_name = str(data["full_table_name"]) 
        column_name = str(data["column_name"]) 
        data_type = str(data["data_type"]) 
        examples = str(data["examples"]) 
        language = str(data["language"]) 
        dictionary_user_prompt = dictionary_user_prompt.replace("{{table_name}}", full_table_name) 
        dictionary_user_prompt = dictionary_user_prompt.replace("{{column_name}}", column_name) 
        dictionary_user_prompt = dictionary_user_prompt.replace("{{data_type}}", data_type) 
        dictionary_user_prompt = dictionary_user_prompt.replace("{{examples}}", examples) 
        dictionary_user_prompt = dictionary_user_prompt.replace("{{language}}", language) 
        messages = []
        messages.append({"role": "user", "content": dictionary_user_prompt})
        openai_object["messages"] = messages 
        openai_object["openai_stream"] = False 
        openai_object["azure_openai_stream"] = False 
        response = ''
        with openai_chatcompletion(**openai_object) as assistant_response:
            response = assistant_response.choices[0].message.content 
        time.sleep(1) 
        return response 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 





@app_dictionary.route("/dictionary/UpdateDictionaryTable", methods=["POST"])
def UpdateDictionaryTable():
    try: 
        data = request.get_json() 
        id_row = str(data["id_row"]) 
        id_table = str(data["id_table"]) 
        column_name = str(data["column_name"]) 
        data_type = str(data["data_type"]) 
        description = str(data["description"]) 
        examples = str(data["examples"]) 
        
        query = f"""
            MERGE INTO [{SQL_SCHEMA}].[sql_dictionary] AS target 
            USING (VALUES
                    ('{id_row}', {id_table}, '{column_name}', N'{(data_type).replace("'", "''")}', N'{(description).replace("'", "''")}', N'{(examples).replace("'", "''")}')
                ) AS source ([id_dictionary], [id_table], [column_name], [data_type], [description], [examples])
            ON target.[id_dictionary] = source.[id_dictionary] 
            WHEN MATCHED THEN 
                UPDATE SET 
                    target.[column_name] = source.[column_name], 
                    target.[data_type] = source.[data_type], 
                    target.[description] = source.[description], 
                    target.[examples] = source.[examples], 
                    target.[updated_at] = GETDATE(), 
                    target.[deleted_at] = NULL 
            WHEN NOT MATCHED THEN 
                INSERT ([id_dictionary], [id_table], [column_name], [data_type], [description], [examples], [created_at], [updated_at])
                VALUES (source.[id_dictionary], source.[id_table], source.[column_name], source.[data_type], source.[description], source.[examples], GETDATE(), GETDATE());
        """ 

        executor_instance.query_executor(query, commit=True).result(timeout=SQL_TIMEOUT) 
        time.sleep(1) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

@app_dictionary.route("/dictionary/DeleteDictionaryTable", methods=["POST"])
def DeleteDictionaryTable():
    try: 
        data = request.get_json() 
        id_row = str(data["id_row"]) 
        query = f"""
        UPDATE [{SQL_SCHEMA}].[sql_dictionary]  
        SET [deleted_at] = GETDATE() 
        WHERE [id_dictionary] = '{id_row}'; 
        """ 
        executor_instance.query_executor(query, commit=True).result(timeout=SQL_TIMEOUT) 
        time.sleep(1)
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 
    



@app_dictionary.route("/dictionary/SaveMainSetting", methods=["POST"]) 
def SaveMainSetting():
    try:
        data = request.get_json() 
        id_user = session.get("id_user") 
        dictionary_user_prompt = str(data["dictionary_user_prompt"]) 
        main_config_query = f"""
            EXECUTE [{SQL_SCHEMA}].[sp_update_dictionary]  
            '{id_user}',  
            N'{dictionary_user_prompt.replace("'", "''")}';  
            """ 
        executor_instance.query_executor(main_config_query, commit=True).result(timeout=SQL_TIMEOUT) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 




@app_dictionary.route("/dictionary/SaveOpenAISetting", methods=["POST"]) 
def SaveOpenAISetting():
    try:
        data = request.get_json() 
        id_user = session.get("id_user") 
        openai_type = str(data["openai_type"])
        openai_model = str(data["openai_model"])
        openai_maxtoken = convert_to_float(data["openai_maxtokens"])
        openai_temperature = convert_to_float(data["openai_temperature"])
        azure_openai_model = str(data["azure_openai_model"])
        azure_openai_base = str(data["azure_openai_base"])
        azure_openai_version = str(data["azure_openai_version"])
        azure_openai_maxtoken = convert_to_float(data["azure_openai_maxtokens"])
        azure_openai_temperature = convert_to_float(data["azure_openai_temperature"])
        openai_embedded_model = str(data["openai_embedded_model"])
        openai_timeout = convert_to_float(data["openai_timeout"])
        openai_stream = convert_to_float(data["openai_stream"])
        azure_openai_embedded_model = str(data["azure_openai_embedded_model"])
        azure_openai_timeout = convert_to_float(data["azure_openai_timeout"])
        azure_openai_stream = convert_to_float(data["azure_openai_stream"])
        azure_openai_top_p = convert_to_float(data["azure_openai_top_p"])
        openai_top_p = convert_to_float(data["openai_top_p"]) 
        chat_type = "dictionary"
        
        openai_config_query = f"""EXECUTE [{SQL_SCHEMA}].[sp_update_openai]  
            '{id_user}', 
            '{openai_type}', 
            '{openai_model}', 
            {openai_maxtoken}, 
            '{openai_temperature}', 
            '{azure_openai_model}', 
            '{azure_openai_base}', 
            '{azure_openai_version}', 
            {azure_openai_maxtoken}, 
            '{azure_openai_temperature}', 
            '{openai_embedded_model}', 
            {openai_timeout}, 
            {openai_stream}, 
            '{azure_openai_embedded_model}', 
            {azure_openai_timeout},   
            {azure_openai_stream},   
            '{openai_top_p}',   
            '{azure_openai_top_p}',   
            '{chat_type}';    
            """ 
        executor_instance.query_executor(openai_config_query, commit=True).result(timeout=SQL_TIMEOUT) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)}





