import json 
import time
import pyodbc
import inspect 
import datetime
from classes.reportexecutive import ReportExecutive
from tenacity import retry, stop_after_attempt, wait_fixed, RetryError
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import Counter
from flask import request, Response, Blueprint, session, jsonify, send_file   
from azure.identity import ManagedIdentityCredential 
from azure.keyvault.secrets import SecretClient  
from environment import SQL_TIMEOUT, SQL_SCHEMA  
from routes.mainscript import save_chat_history, save_chat_error_log, save_system_error_log   
from functions.tools import id_guid, dict_to_markdown, cast_data_types, format_time_with_seconds, consolidate_chat_history, count_tokens, shorten_text  
from functions.openai import openai_chatcompletion, generate_tokens_price_usage 
from classes.sqlconnection import QueryExecutor 
from classes.pinecone import PineconeHandler 
from classes.secretstore import SqlSecretStore


app_flow = Blueprint('app_flow', __name__, template_folder='templates') 
executor_instance = QueryExecutor()
pinecone_handler = PineconeHandler()

# Identity Credential 
#credentials = ManagedIdentityCredential() 
secret_store = SqlSecretStore()

def get_data_dictionary(id_table: str) -> str:
    query = f"""
        SELECT 
             [column_name]
            ,[data_type]
            ,[description]
            ,[examples]
        FROM [mbot].[sql_dictionary] 
        WHERE [id_table] = {id_table} AND [deleted_at] IS NULL; 
    """ 
    future_result = executor_instance.query_executor(query) 
    result = future_result.result(timeout=SQL_TIMEOUT) 
    data_object = result[0] 
    if len(data_object) == 0: 
        raise Exception("Dictionary of this table does not exists.") 
    data_dictionary = ""
    for row in data_object:
        result = []
        result.append(f"{row['column_name']}:")
        if str(row['data_type']).strip():
            result.append(f"Data Type ({row['data_type']})")
        if str(row['description']).strip():
            result.append(f"{row['description']}")
        if str(row['examples']).strip():
            result.append(f"For example, {row['examples']}")
        
        formatted_result = (', '.join(result)).replace(",", "", 1)
        data_dictionary += formatted_result + '.\n'

    return (data_dictionary).strip() 

@app_flow.route("/chatflow/SaveNewCategory", methods=["POST"]) 
def SaveNewCategory():
    try:
        data = request.get_json() 
        phase_category = str(data["phase_category"]) 
        data_query = f"""
            INSERT INTO [{SQL_SCHEMA}].[chatsql_phase_category]
                ([id_chatsql_phase_category]
                ,[chatsql_phase_category]
                ,[created_at])
            VALUES
                (LOWER(NEWID())
                ,'{phase_category}'
                ,GETDATE())
        """ 
        executor_instance.query_executor(data_query, commit=True).result(timeout=SQL_TIMEOUT)  
        return {'result': 'OK'}
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 




@app_flow.route("/chatflow/UpdateFavorite", methods=["POST"]) 
def UpdateFavorite():
    try:
        data = request.get_json() 
        phase_id = str(data["phase_id"]) 
        favorite = int(data["favorite"]) 
        data_query = f"""
            UPDATE [{SQL_SCHEMA}].[chatsql_phase_name]
                SET [favorites] = {favorite}
            WHERE [id_chatsql_phase_name] = '{phase_id}'
        """ 
        executor_instance.query_executor(data_query, commit=True).result(timeout=SQL_TIMEOUT)  
        return {'result': 'OK'}
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 
    

@app_flow.route("/chatflow/UpdateCommentPhase", methods=["POST"]) 
def UpdateCommentPhase():
    try:
        data = request.get_json() 
        phase_id = str(data["phase_id"]) 
        comment_phase = int(data["comment_phase"]) 
        data_query = f"""
            UPDATE [{SQL_SCHEMA}].[chatsql_phase_name]
                SET [comments] = N'{comment_phase}'
            WHERE [id_chatsql_phase_name] = '{phase_id}'
        """ 
        executor_instance.query_executor(data_query, commit=True).result(timeout=SQL_TIMEOUT)  
        return {'result': 'OK'}
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 


@app_flow.route("/chatflow/UpdateCategory", methods=["POST"]) 
def UpdateCategory():
    try:
        data = request.get_json() 
        phase_category = str(data["phase_category"]) 
        new_phase_category = str(data["new_phase_category"]) 
        data_query = f"""
            UPDATE [{SQL_SCHEMA}].[chatsql_phase_category]
            SET [chatsql_phase_category] = '{new_phase_category}'   
            WHERE [id_chatsql_phase_category] = '{phase_category}';
        """ 
        executor_instance.query_executor(data_query, commit=True).result(timeout=SQL_TIMEOUT)  
        return {'result': 'OK'}
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 
    
@app_flow.route("/chatflow/DuplicatePhaseName", methods=["POST"]) 
def DuplicatePhaseName():
    try:
        data = request.get_json() 
        id_phase = str(data["id_phase"]) 
        new_phase_name = str(data["new_phase_name"]) 
        data_query = f"""
            EXECUTE [mbot].[sp_ChatSQLPhase_Copy] '{id_phase}', '{new_phase_name}'; 
        """ 
        executor_instance.query_executor(data_query, commit=True).result(timeout=SQL_TIMEOUT)  
        return {'result': 'OK'}
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 
    
    
@app_flow.route("/chatflow/UpdatePhaseName", methods=["POST"]) 
def UpdatePhaseName():
    try:
        data = request.get_json() 
        phase_name = str(data["phase_name"]) 
        new_phase_name = str(data["new_phase_name"]) 
        data_query = f"""
            UPDATE [{SQL_SCHEMA}].[chatsql_phase_name]   
            SET [chatsql_phase_name] = '{new_phase_name}'   
            WHERE [id_chatsql_phase_name] = '{phase_name}';   
        """ 
        executor_instance.query_executor(data_query, commit=True).result(timeout=SQL_TIMEOUT)  
        return {'result': 'OK'}
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 
    

    
@app_flow.route("/chatflow/RefreshCategory", methods=["GET"]) 
def RefreshCategory():
    try: 
        query = f"""
            SELECT 
                 [id_chatsql_phase_category] AS [id]
                ,[chatsql_phase_category] AS [name]
            FROM [{SQL_SCHEMA}].[chatsql_phase_category]
            WHERE [deleted_at] IS NULL 
            ORDER BY [chatsql_phase_category] ASC; 
        """ 
        future_result = executor_instance.query_executor(query) 
        result = future_result.result(timeout=SQL_TIMEOUT) 
        return result[0] 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 


@app_flow.route("/chatflow/DeleteCategory", methods=["POST"]) 
def DeleteCategory():
    try:
        data = request.get_json() 
        phase_category = str(data["phase_category"]) 
        data_query = f"""
            UPDATE [{SQL_SCHEMA}].[chatsql_phase_category]
            SET [deleted_at] = GETDATE()
            WHERE [id_chatsql_phase_category] = '{phase_category}'
        """ 
        executor_instance.query_executor(data_query, commit=True).result(timeout=SQL_TIMEOUT)  
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 


@app_flow.route("/chatflow/SaveNewPhaseName", methods=["POST"]) 
def SaveNewPhaseName():
    try:
        data = request.get_json() 
        phase_category = str(data["phase_category"]) 
        phase_name = str(data["phase_name"]) 
        data_query = f"""
        INSERT INTO [{SQL_SCHEMA}].[chatsql_phase_name]
            ([id_chatsql_phase_category]
            ,[id_chatsql_phase_name]
            ,[chatsql_phase_name]
            ,[created_at])
        VALUES
            ('{phase_category}'
            ,LOWER(NEWID())
            ,'{phase_name}'
            ,GETDATE())
        """ 
        executor_instance.query_executor(data_query, commit=True).result(timeout=SQL_TIMEOUT)  
        return {'result': 'OK'}
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 
    
@app_flow.route("/chatflow/RefreshPhaseName", methods=["POST"]) 
def RefreshPhaseName():
    try: 
        data = request.get_json() 
        id_user = session.get("id_user") 
        phase_category = str(data["phase_category"]) 
        query = f"""
            /*
            SELECT [id_chatsql_phase_name] AS [id]
                ,[chatsql_phase_name] AS [name]
                ,[favorites]
                ,[comments]
            FROM [{SQL_SCHEMA}].[chatsql_phase_name]
            WHERE [id_chatsql_phase_category] = '{phase_category}' AND [deleted_at] IS NULL 
            ORDER BY [id] ASC; 
            */ 
            
            ;WITH PhaseData AS (
                SELECT
                    [id_chatsql_phase_name] AS [id],
                    [chatsql_phase_name] AS [name],
                    (CASE WHEN [favorites] = 1 THEN '1' ELSE '0' END) AS [favorites],
                    [comments]
                FROM [{SQL_SCHEMA}].[chatsql_phase_name]
                WHERE 
                    [id_chatsql_phase_category] = '{phase_category}' 
                    AND [deleted_at] IS NULL
            )
            SELECT DISTINCT 
                PD.[id],
                PD.[name],
                PD.[favorites],
                PD.[comments]
            FROM [{SQL_SCHEMA}].[flow_permission] FP  
            LEFT JOIN PhaseData PD  
                ON (PD.[id] = FP.[id_flow] OR FP.[id_flow] = '00000000-0000-0000-0000-000000000000')  
            INNER JOIN [{SQL_SCHEMA}].[user_data] UD  
                ON UD.[id_role] = FP.[id_role] 
            WHERE UD.[id_user] = '{id_user}' 
                AND FP.[actived] = 1   
                AND PD.[id] IS NOT NULL 
            ORDER BY PD.[favorites] DESC, PD.[name] ASC;
        """ 
        future_result = executor_instance.query_executor(query) 
        result = future_result.result(timeout=SQL_TIMEOUT) 
        return result[0] 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 


@app_flow.route("/chatflow/DeletePhaseName", methods=["POST"]) 
def DeletePhaseName():
    try:
        data = request.get_json() 
        phase_name = str(data["phase_name"]) 
        data_query = f"""
            UPDATE [{SQL_SCHEMA}].[chatsql_phase_name]
            SET [deleted_at] = GETDATE()
            WHERE [id_chatsql_phase_name] = '{phase_name}'
        """ 
        executor_instance.query_executor(data_query, commit=True).result(timeout=SQL_TIMEOUT)  
        time.sleep(1) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 


@app_flow.route("/chatflow/LoadSqlTables", methods=["GET"])
def LoadSqlTables(): 
    try:
        full_query = f"""
            SELECT 
                st.id,
                ss.secrets, 
                st.source_table, 
                st.table_group, 
                ss.database_description, 
                st.table_description, 
                st.last_data_updated  
            FROM [{SQL_SCHEMA}].[sql_secrets] ss 
            INNER JOIN [{SQL_SCHEMA}].[sql_tables] st 
            ON ss.id = st.id_secrets
            WHERE  st.[chat_type] = 'Sql' AND st.[object_type] IN ('Table', 'View') AND st.[deleted_at] IS NULL  
            ORDER BY st.table_group ASC, st.table_description ASC;
        """
        future_result = executor_instance.query_executor(full_query) 
        result = future_result.result(timeout=SQL_TIMEOUT) 
        return result[0] 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

@app_flow.route("/chatflow/LoadPhasesTable", methods=["POST"])
def LoadPhasesTable(): 
    try:
        data = request.get_json() 
        id_user = str(session.get("id_user")) 
        phase_name = str(data["phase_name"]) 
        full_query = f"""
            SELECT 
                 [id_chatsql_phase_table] AS [id]
                ,[order_num]
                ,[id_chatsql_tables]
                ,[chatsql_phase_prompt]
                ,[document_source]
                ,[document_prompt]
                ,[document_options]
                ,[execute_document]
                ,[generate_report]
                ,[created_at]
                ,[id_user]
                ,[id_role_config]
                ,[list_openai_model]
            FROM [{SQL_SCHEMA}].[chatsql_phase_table]
            WHERE [id_chatsql_phase_name] = '{phase_name}' AND [deleted_at] IS NULL 
            ORDER BY [order_num] ASC; 

            SELECT [equipment_parameter]
                ,[startdate_parameter]
                ,[enddate_parameter]
                ,[starttime_parameter]
                ,[endtime_parameter]
                ,[report_title_parameter]
            FROM [{SQL_SCHEMA}].[chatsql_phase_name]
            WHERE [id_chatsql_phase_name] = '{phase_name}' AND [deleted_at] IS NULL; 
        """
        future_result = executor_instance.query_executor(full_query)
        result = future_result.result(timeout=SQL_TIMEOUT) 
        phase_table = result[0] 
        parameters = result[1] 
        return {"phase_table": phase_table, "parameters": parameters}   
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)}
    

@app_flow.route("/chatflow/SavePhases", methods=["POST"])
def SavePhases():    
    try:
        data = request.get_json() 
        id_user = session.get("id_user") 
        phase_name = str(data["phase_name"]) 
        equipment_parameter = str(data["equipment_parameter"]) 
        startdate_parameter = str(data["startdate_parameter"]) 
        enddate_parameter = str(data["enddate_parameter"]) 
        starttime_parameter = str(data["starttime_parameter"]) 
        endtime_parameter = str(data["endtime_parameter"]) 
        report_title = str(data["report_title"]) 
        tableData = list(data["tableData"]) 

        full_query = ""
        for row in tableData:
            row_id = str(row['row_id'])
            phase_number = str(row['phase_number'])
            #system_prompt = str(row['system_prompt']).replace("'", "''")
            sql_tables = str(row['sql_tables'])
            sql_prompt = str(row['sql_prompt']).replace("'", "''")
            openai_models = str(row['openai_models']) 
            generate_report = str(row['generate_report']) 
            full_query += f"('{phase_name}', '{row_id}', '', {phase_number}, '{sql_tables}', '{sql_prompt}', '{openai_models}', {generate_report}),\n"
        full_query = full_query.strip()[:-1] 

        data_query = f"""
            MERGE INTO [{SQL_SCHEMA}].[chatsql_phase_table] AS target
            USING (VALUES
                    {full_query}
                ) AS source ([id_chatsql_phase_name], [id_chatsql_phase_table], [id_user], [order_num], [id_chatsql_tables], [chatsql_phase_prompt], [list_openai_model], [generate_report])
            ON target.[id_chatsql_phase_name] = source.[id_chatsql_phase_name] 
                AND target.[id_chatsql_phase_table] = source.[id_chatsql_phase_table] 
            WHEN MATCHED THEN 
                UPDATE SET 
                    target.[order_num] = source.[order_num],
                    target.[id_chatsql_tables] = source.[id_chatsql_tables],
                    target.[chatsql_phase_prompt] = source.[chatsql_phase_prompt],
                    target.[list_openai_model] = source.[list_openai_model],
                    target.[generate_report] = source.[generate_report],
                    target.[id_user] = source.[id_user]  
            WHEN NOT MATCHED THEN 
                INSERT ([id_chatsql_phase_name], [id_chatsql_phase_table], [id_user], [order_num], [id_chatsql_tables], [chatsql_phase_prompt], [list_openai_model], [generate_report], [created_at])
                VALUES (source.[id_chatsql_phase_name], LOWER(NEWID()), source.[id_user], source.[order_num], source.[id_chatsql_tables], source.[chatsql_phase_prompt], source.[list_openai_model], source.[generate_report], GETDATE());

            UPDATE [{SQL_SCHEMA}].[chatsql_phase_name] 
            SET [equipment_parameter] = '{equipment_parameter}' 
                ,[startdate_parameter] = '{startdate_parameter}' 
                ,[enddate_parameter] = '{enddate_parameter}' 
                ,[starttime_parameter] = '{starttime_parameter}' 
                ,[endtime_parameter] = '{endtime_parameter}' 
                ,[report_title_parameter] = '{report_title}' 
            WHERE [id_chatsql_phase_name] = '{phase_name}' AND [deleted_at] IS NULL; 
        """ 
        executor_instance.query_executor(data_query, commit=True).result(timeout=SQL_TIMEOUT)  
        time.sleep(1) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 


@app_flow.route("/chatflow/DeletePhaseTable", methods=["POST"])
def DeletePhaseTable():
    try: 
        data = request.get_json() 
        id_user = session.get("id_user") 
        id_phase = str(data["id_phase"]) 
        query = f"""
            UPDATE [{SQL_SCHEMA}].[chatsql_phase_table] 
                SET [deleted_at] = GETDATE() 
            WHERE [id_chatsql_phase_table] = '{id_phase}'; 
        """
        executor_instance.query_executor(query, commit=True).result(timeout=SQL_TIMEOUT)  
        time.sleep(1) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 


def check_data_dictionary(array_table_id, sql_server):
    id_tables = "'" + "', '".join(array_table_id) + "'"
    query = f""" 
        SELECT 
            st.source_table AS FULL_TABLE 
            ,sd.[column_name] AS COLUMN_NAME 
        FROM [{SQL_SCHEMA}].[sql_dictionary] sd 
        INNER JOIN [{SQL_SCHEMA}].[sql_tables] st 
        ON st.id = sd.id_table 
		WHERE st.id in ({id_tables}) AND st.deleted_at IS NULL AND sd.deleted_at IS NULL; 
    """ 
    future_result = executor_instance.query_executor(query) 
    result = future_result.result(timeout=SQL_TIMEOUT) 
    listed_columns = result[0] 
    table_object = [{"FULL_TABLE": item['FULL_TABLE']} for item in listed_columns] 
    unique_table = [dict(t) for t in {tuple(d.items()) for d in table_object}] 

    unique_table_name = list(set([item['FULL_TABLE'] for item in unique_table]))
    joined_table_name = "'" + "', '".join(unique_table_name) + "'"
    array_tables = []
    for item in sql_server:
        query = f"""
            SELECT 
                CONCAT(isc.TABLE_SCHEMA, '.', isc.TABLE_NAME) AS FULL_TABLE, 
                isc.COLUMN_NAME AS COLUMN_NAME 
            FROM 
                INFORMATION_SCHEMA.COLUMNS isc 
            WHERE CONCAT(isc.TABLE_SCHEMA, '.', isc.TABLE_NAME) IN ({joined_table_name}); 
        """ 
        sql_server_str = secret_store.get_secret(item["secrets"])
        #sql_server_str = SecretClient(vault_url=KEYVAULT_URL, credential=credentials, logging_enable=False).get_secret(item["secrets"], logging_enable=False).value
        
        #sql_server_str="DRIVER={ODBC Driver 17 for SQL Server};SERVER=usaeu2velman-dev-sql.database.windows.net;DATABASE=GIGVELKPIDB;UID=velmanadm;PWD=usaeu2catA#!@733;"
        #sql_server_str="DRIVER={ODBC Driver 17 for SQL Server};SERVER=usaeu2velman-prod-sql.database.windows.net;DATABASE=USAEU2VELMAN-PROD-sqldb;UID=velmanadm;PWD=6XBhhpXRpGIIkCQRYy8L;"

        future_result = executor_instance.query_executor(query, connection_string=sql_server_str) 
        result = future_result.result(timeout=SQL_TIMEOUT) 
        if len(result[0]) > 0: 
            array_tables.extend(result[0]) 

    original_columns = [dict(t) for t in {tuple(d.items()) for d in array_tables}] 

    listed_columns_set = { (col["FULL_TABLE"], col["COLUMN_NAME"]) for col in listed_columns }
    original_columns_set = { (col["FULL_TABLE"], col["COLUMN_NAME"]) for col in original_columns }

    # Combine all elements into a single list to count matches
    all_columns = list(listed_columns_set) + list(original_columns_set)

    # Count occurrences of each tuple
    column_counts = Counter(all_columns)

    # Filter columns with more than 2 matches and retain the rest
    filtered_columns = {col for col, count in column_counts.items() if count < 2}

    missing_in_listed_formatted = [
        {"FULL_TABLE": table, "COLUMN_NAME": column}
        for table, column in filtered_columns
    ]
    
    print("\nMissing in listed_columns:") 
    print(missing_in_listed_formatted) 

    if len(missing_in_listed_formatted) == 1: 
        missing_in_listed_str = "<br>".join([f"Table: {item['FULL_TABLE']} | Column: {item['COLUMN_NAME']}" for item in missing_in_listed_formatted]) 
        raise Exception(f"There is {len(missing_in_listed_formatted)} incongruent column. see the dictionary [[here]]:<br><br>Column mismatch:<br>{missing_in_listed_str}") 
    if len(missing_in_listed_formatted) > 1: 
        missing_in_listed_str = "<br>".join([f"Table: {item['FULL_TABLE']} | Column: {item['COLUMN_NAME']}" for item in missing_in_listed_formatted]) 
        raise Exception(f"There are {len(missing_in_listed_formatted)} incongruent columns. see the dictionary [[here]]:<br><br>Columns mismatch:<br>{missing_in_listed_str}") 


@app_flow.route("/chatflow/ReadPhases", methods=["POST"])
def ReadPhases():
    data = request.get_json() 
    id_user = session.get("id_user") 
    id_phase = str(data["id_phase"]) 
    query = f"""
        WITH Table_1 AS (
            SELECT 
                 pt.[id_chatsql_phase_table] AS [id]
                ,pt.[id_chatsql_phase_name] AS [id_phase]
                ,pt.[order_num]
                ,pt.[id_chatsql_tables] AS [chatsql_tables] 
                ,pt.[id_chatsql_tables] AS [id_table]
                ,pt.[chatsql_phase_prompt] AS [phase_prompt] 
                ,pt.[document_source]
                ,pt.[document_prompt]
                ,pt.[document_options]
                ,pt.[execute_document]
                ,pt.[generate_report]
                ,pt.[created_at]
                ,pt.[id_user]
                ,pt.[id_role_config]
                ,pt.[list_openai_model] 
                ,REPLACE((SELECT TOP 1 value FROM STRING_SPLIT(pt.[list_openai_model], '|', 1) WHERE [ordinal] = 1), '_', '') AS [openai_type]
				,(SELECT TOP 1 value FROM STRING_SPLIT(pt.[list_openai_model], '|', 1) WHERE [ordinal] = 2) AS [openai_model]
                ,ta.[source_table] AS [full_table_name]  
                ,ta.[table_name] AS [table_title] 
                ,ta.[table_description] 
                ,se.[secrets] as [sql_server_table] 
            FROM [{SQL_SCHEMA}].[chatsql_phase_table] pt 
            LEFT JOIN [{SQL_SCHEMA}].[sql_tables] ta 
            ON ta.[id] = pt.[id_chatsql_tables] 
            LEFT JOIN [{SQL_SCHEMA}].[sql_secrets] se 
            ON se.id = ta.id_secrets 
            WHERE pt.[deleted_at] IS NULL AND pt.[generate_report] = 1  
        )
        SELECT 
            t1.* 
            ,t2.[table_description]  
            ,t3.[equipment_parameter]  
            ,t3.[startdate_parameter]  
            ,t3.[enddate_parameter]  
            ,t3.[starttime_parameter]  
            ,t3.[endtime_parameter]  
            ,t3.[sql_system_prompt]  
            ,t3.[sql_question_system_prompt]  
            ,t3.[final_question_prompt]  
            ,ISNULL(t3.[final_question_model], 'azure|gpt-4o') as [final_question_model] 
			,ISNULL(am.[InputTokenLimit], 0) as [input_token_limit] 
        FROM Table_1 t1  
        LEFT JOIN [{SQL_SCHEMA}].[sql_tables] t2  
        ON CAST(t1.id_table AS INT) = t2.id AND t2.deleted_at IS NULL  
        LEFT JOIN [{SQL_SCHEMA}].[chatsql_phase_name] t3  
        ON t1.id_phase = t3.id_chatsql_phase_name  
		LEFT JOIN [{SQL_SCHEMA}].[ai_models] am 
		ON LOWER(am.ModelType) = LOWER(t1.[openai_type]) AND LOWER(am.ModelValue) = LOWER(t1.[openai_model])  
        WHERE t1.[id_phase] = '{id_phase}'  
        ORDER BY t1.[order_num] ASC;  

        SELECT [dictionary_user_prompt]
            ,[dictionary_data_result]
        FROM [{SQL_SCHEMA}].[app_global_configuration]
        WHERE [id] = 1; 

        SELECT [flow_system_prompt], [after_question_prompt] AS [default_final_question_prompt]
        FROM [{SQL_SCHEMA}].[app_user_chatflow_configuration] 
        WHERE [id] = 1; 

        SELECT [secrets]
            ,[database_description]
        FROM [{SQL_SCHEMA}].[sql_secrets]
        WHERE [deleted_at] IS NULL;
    """ 
    try: 
        session["id_group"] = id_guid() 
        future_result = executor_instance.query_executor(query) 
        result = future_result.result(timeout=SQL_TIMEOUT) 

        phase_table = result[0] 
        sql_server = result[3] 
        array_table_id = [str(item['id_table']) for item in phase_table] 

        #check_data_dictionary(array_table_id, sql_server) 
        
        return {"phase_table": phase_table, "dictionary": result[1], "sql_system": result[2], "group_id": session["id_group"]} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 







def get_results_query(sql_server_str: str, openai_object: dict, sql_system_prompt: str, sql_data_dictionary: str, 
                      question: str, table_schema: str, table_name: str) -> dict:
    total_start_time = time.time()
    _sql_prompt = sql_system_prompt.replace("{{table_schema}}", table_schema).replace("{{table_name}}", table_name).replace("{{data_dictionary}}", sql_data_dictionary)
    messages = []
    messages.append({"role": "system", "content": _sql_prompt})
    messages.append({"role": "user", "content": "Question: " + question})
    openai_object["messages"] = messages 
    openai_object["openai_stream"] = False 
    openai_object["azure_openai_stream"] = False 
    
    sql_response = ''
    total_tokens_price = {}
    data_object = ""
    table_result = []
    query_start_time = time.time()
    with openai_chatcompletion(**openai_object) as assistant_response:
        sql_response = assistant_response.choices[0].message.content 
        total_tokens_price = generate_tokens_price_usage(assistant_response)
    query_end_time = time.time()
    result_object = {
        "total_info": total_tokens_price, 
        "sql_query": sql_response,
        "data_object": data_object,
        "table_result": table_result,
        "query_time": 0,
        "execution_time": 0,
        "total_time": 0,
        "sql_error": ""
    }
    result_object["query_time"] = (query_end_time - query_start_time) 
    try:
        execution_start_time = time.time()
        future_result = executor_instance.query_executor(sql_response, connection_string=sql_server_str) 
        result = future_result.result(timeout=SQL_TIMEOUT) 
        #df = pd.DataFrame()
        #result = []
        #with open_db_connection(sql_server_str) as cursor:
        #    cursor.execute(sql_response)
        #    df = pd.DataFrame.from_records(cursor.fetchall(), columns=[col[0] for col in cursor.description])
        #data_dict = df.to_dict('records') 
        #result.append(data_dict)
        execution_end_time = time.time()
        result_object["execution_time"] = (execution_end_time - execution_start_time) 
        if len(result[0]) > 0:
            data_casted_datetime = cast_data_types(result[0]) 
            table_markdown = dict_to_markdown(data_casted_datetime) 
            table_result = result[0] 
            result_object["table_markdown"] = table_markdown 
            result_object["table_result"] = table_result  
        else:
            if session.get("lang", "es") == "en":
                data_object = f"No records found."
            else:
                data_object = "No se encontraron registros."
            raise Exception("Information: " + data_object + "\n\nFull query: " + sql_response)
    except pyodbc.DatabaseError as db_err:
        result_object["sql_error"] = "[SqlError]: " + str(db_err) 
    except pyodbc.Error as err:
        result_object["sql_error"] = "[SqlError]: " + str(err) 
    except Exception as ex:
        result_object["sql_error"] = "[SqlError]: " + str(ex) 
    total_end_time = time.time() 
    result_object["total_time"] = (total_end_time - total_start_time) 
    return result_object 






@app_flow.route("/chatflow/chatflow", methods=["POST"]) 
def chatflow():
    data = request.get_json() 
    question = ''
    id_group = ''
    id_phase = ''
    id_flow = ''
    sql_query_error = '' 
    token_count = 0
    input_token_limit = 0
    openai_object = data["openai_object"] 
    id_user = session.get("id_user") 
    try:
        id_group = session.get("id_group") 
        question = str(data["phase_prompt"])   
        id_phase = str(data["id_phase"])   
        id_flow = str(data["id"])   
        list_openai_model = str(data["list_openai_model"])  
        openai_object["openai_type"] = list_openai_model.split("|")[0]   
        openai_object["list_model"] = list_openai_model.split("|")[1]   
        #table_name = data["chatsql_tables"] 
        id_table = data["id_table"] 
        table_title = data["table_title"] 
        table_description = data["table_description"] 
        default_system_prompt = data["flow_system_prompt"] 
        sql_system_prompt = str(data["sql_system_prompt"]) 
        if not sql_system_prompt:
            sql_system_prompt = default_system_prompt 
        equipment_parameter = data["equipment_parameter"] 
        startdate_parameter = data["startdate_parameter"] 
        enddate_parameter = data["enddate_parameter"] 
        input_token_limit = data["input_token_limit"] 
        starttime_parameter = format_time_with_seconds(data["starttime_parameter"]) 
        endtime_parameter = format_time_with_seconds(data["endtime_parameter"]) 
        sql_server_table = str(data["sql_server_table"])  
        full_table_name = str(data["full_table_name"])  
        schema_name = full_table_name.split(".")[0] 
        table_name = full_table_name.split(".")[1] 

        sql_data_dictionary = ''

        question = question.replace("{{equipment}}", equipment_parameter) 
        question = question.replace("{{startdate}}", startdate_parameter) 
        question = question.replace("{{enddate}}", enddate_parameter) 
        question = question.replace("{{starttime}}", starttime_parameter) 
        question = question.replace("{{endtime}}", endtime_parameter) 

        message_text = str(question)
        token_count = count_tokens(message_text)
        if input_token_limit == 0: 
            save_chat_error_log(
                run_id=id_group,
                phase_id=id_phase,
                flow_id=id_flow,
                input_message=str(question),
                error_message=f'This model {list_openai_model} does not have the token limit configured.',
                table_title=table_title,
                table_description=table_description,
                chat_option='ChatFlow - BatchQuestion',
                id_user=id_user,
                type_chat="SqlFlow",
                input_tokens=token_count,
                tokens_limit=input_token_limit,
                openai_type=list_openai_model.split("|")[0],
                openai_model=list_openai_model.split("|")[1]
            ) 
            return {'code_error': f"[Error] This model {list_openai_model} does not have the token limit configured."} 
        if token_count > input_token_limit:
            save_chat_error_log(
                run_id=id_group,
                phase_id=id_phase,
                flow_id=id_flow,
                input_message=str(question),
                error_message=f"[Error] Token limit exceeded. {token_count}/{input_token_limit} tokens used",
                chat_option='ChatFlow - SqlQuestion',
                id_user=id_user,
                type_chat="SqlFlow",
                input_tokens=token_count,
                tokens_limit=input_token_limit,
                openai_type=openai_object["openai_type"],
                openai_model='' 
            ) 
            return {'code_error': f"[Error] Token limit exceeded. {token_count}/{input_token_limit} tokens used"} 

        try:
            time.sleep(0.5)
            save_chat_history(group_id=id_group, 
                phase_id=id_flow, 
                conversation=question, 
                id_user=id_user, 
                type_chat="SqlFlow", 
                type_conversation="Question") 
                
            sql_data_dictionary = get_data_dictionary(id_table) 
        except Exception as ex:
            function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
            save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
            save_chat_error_log(
                run_id=id_group,
                phase_id=id_phase,
                flow_id=id_flow,
                input_message=str(question),
                error_message=str(ex),
                chat_option='ChatFlow - SqlQuestion',
                id_user=id_user,
                type_chat="SqlFlow",
                input_tokens=token_count,
                tokens_limit=input_token_limit,
                openai_type=openai_object["openai_type"],
                openai_model='' 
            ) 
            return {'code_error': str(ex)} 
        
        sql_server_str = secret_store.get_secret(sql_server_table)
        #sql_server_str = SecretClient(vault_url=KEYVAULT_URL, credential=credentials, logging_enable=False).get_secret(sql_server_table, logging_enable=False).value
        
        #sql_server_str="DRIVER={ODBC Driver 17 for SQL Server};SERVER=usaeu2velman-dev-sql.database.windows.net;DATABASE=GIGVELKPIDB;UID=velmanadm;PWD=usaeu2catA#!@733;"
        #sql_server_str="DRIVER={ODBC Driver 17 for SQL Server};SERVER=usaeu2velman-prod-sql.database.windows.net;DATABASE=USAEU2VELMAN-PROD-sqldb;UID=velmanadm;PWD=6XBhhpXRpGIIkCQRYy8L;"

        response = get_results_query(sql_server_str, openai_object, sql_system_prompt, sql_data_dictionary, question, schema_name, table_name)
        if response["sql_error"] != "":
            sql_query_error = response["sql_query"] 
            raise Exception(response["sql_error"]) 
        total_info = response["total_info"] 
        sql_query = str(response["sql_query"]).strip() 
        table_markdown = response["table_markdown"] 
        table_count_tokens = count_tokens(table_markdown)
        query_time = '{0:.5f}'.format(float(response["query_time"])) 
        execution_time = '{0:.5f}'.format(float(response["execution_time"])) 
        total_time = '{0:.5f}'.format(float(response["total_time"])) 
        table_result = response["table_result"] 
        column_keys = [] 
        if len(table_result) > 0: 
            column_keys = list(table_result[0].keys()) 
        json_data_table = json.dumps(table_result, ensure_ascii=False)  

        title_table_markdown = (
            f"#### **Sql Step {data['order_num']} – Table: {table_title}**\n"
        )

        sql_query_markdown = (
            f"##### **Sql Query**\n"
            f"```sql\n"
            f"{sql_query}\n"
            f"```\n"
            f"---"
        )
        
        usage_summary_markdown = (
            f"---\n"
            f"##### **Usage Summary**\n\n"
            f"- Input tokens used (System and user prompts): **{total_info['total_input_tokens']}**\n"
            f"- Output tokens used (Query Response): **{total_info['total_output_tokens']}**\n"
            f"- Output table tokens count: **{table_count_tokens}**\n"
            f"- Total cost: **${total_info['total_cost']}**\n"
            f"- OpenAI Query generation time: **{query_time}**\n"
            f"- SQL Query execution time: **{execution_time}**\n"
            f"- Total time: **{total_time}**\n\n"
            f"---"
        )

        answer_detail_markdown = f"""{sql_query_markdown}\n\n{table_markdown}\n\n{usage_summary_markdown}"""

        try:
            time.sleep(0.5)
            save_chat_history(group_id=id_group, 
                              phase_id=id_flow, 
                              conversation=table_markdown, 
                              conversation_detail=answer_detail_markdown, 
                              question=question, 
                              id_user=id_user, 
                              json_data_table=json_data_table, 
                              type_chat="SqlFlow", 
                              type_conversation="Answer") 
        except Exception as ex: 
            function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
            save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
            return {'code_error': str(ex)} 
        
        return {
            'id_group': id_group,
            'title_table_markdown': title_table_markdown,
            'sql_query_markdown': sql_query_markdown,
            'table_markdown': table_markdown,
            'usage_summary_markdown': usage_summary_markdown,
            'table_title': table_title, 
            'table_description': table_description, 
            'column_keys': column_keys,
            'sql_server': sql_server_table,
            'sql_query': sql_query
        } 
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        save_chat_history(group_id=id_group, 
                          phase_id=id_flow, 
                          conversation=str(ex), 
                          conversation_detail=str(ex), 
                          id_user=id_user, 
                          json_data_table='', 
                          type_chat="SqlFlow", 
                          type_conversation="Answer") 
        save_chat_error_log(
            run_id=id_group,
            phase_id=id_phase,
            flow_id=id_flow,
            input_message=str(question),
            error_message=str(ex),
            chat_option='ChatFlow - SqlQuestion',
            id_user=id_user,
            type_chat="SqlFlow",
            input_tokens=token_count,
            tokens_limit=input_token_limit,
            openai_type=openai_object["openai_type"],
            openai_model='' 
        ) 
        print(str(ex))
        return {'code_error': str(ex), "sql_query_error": sql_query_error}




        












def event_stream_gpt(id_user, openai_object, message_object, run_id = '', phase_id = '', flow_id = '', table_title = '', max_retries=2):
    token_count = 0
    if "chat_messages" in message_object:
        gpt_messages = message_object["chat_messages"]
    else:
        gpt_messages = message_object[-5:]
    content_question = gpt_messages[-1]['content']
    try:
        save_chat_history(group_id=run_id, 
                  conversation=content_question, 
                  id_user=id_user, 
                  type_chat="SqlFlow", 
                  type_conversation="Question")
        #save_frequent_questions(question=content_question, chat_type='Sql')
        answer = ''
        openai_object["messages"] = gpt_messages
        last_error = None

        if openai_object["openai_type"] == "azure":
            openai_model = (openai_object["list_model"] if "list_model" in openai_object else openai_object["azure_openai_model"])
            input_token_limit = GetTokensModel("azure", openai_model)
            message_text = str(content_question)
            token_count = count_tokens(message_text)
            if input_token_limit == 0: 
                save_chat_error_log(
                    run_id=run_id,
                    phase_id=phase_id,
                    flow_id=flow_id,
                    input_message=str(gpt_messages),
                    error_message=f'This model {openai_object["openai_type"]}|{openai_model} does not have the token limit configured.',
                    table_title=table_title,
                    table_description='',
                    chat_option='ChatFlow - Question',
                    id_user=id_user,
                    type_chat="SqlFlow",
                    input_tokens=token_count,
                    tokens_limit=input_token_limit,
                    openai_type=openai_object["openai_type"],
                    openai_model=openai_model
                ) 
                yield f'[Error]: This model {openai_object["openai_type"]}|{openai_model} does not have the token limit configured.'
            if token_count > input_token_limit:
                save_chat_error_log(
                    run_id=run_id,
                    phase_id=phase_id,
                    flow_id=flow_id,
                    input_message=str(gpt_messages),
                    error_message=f'Token limit exceeded. {token_count}/{input_token_limit} tokens used.',
                    chat_option='ChatFlow - Question',
                    table_title=table_title,
                    table_description='',
                    id_user=id_user,
                    type_chat="SqlFlow",
                    input_tokens=token_count,
                    tokens_limit=input_token_limit,
                    openai_type=openai_object["openai_type"],
                    openai_model=openai_model 
                ) 
                yield f"[Error]: Token limit exceeded. {token_count}/{input_token_limit} tokens used"
        else:
            openai_model = (openai_object["list_model"] if "list_model" in openai_object else openai_object["openai_model"])
            input_token_limit = GetTokensModel("openai", openai_model)
            message_text = str(content_question)
            token_count = count_tokens(message_text)
            if input_token_limit == 0: 
                save_chat_error_log(
                    run_id=run_id,
                    phase_id=phase_id,
                    flow_id=flow_id,
                    input_message=str(gpt_messages),
                    error_message=f'This model {openai_object["openai_type"]}|{openai_model} does not have the token limit configured.',
                    table_title=table_title,
                    table_description='',
                    chat_option='ChatFlow - Question',
                    id_user=id_user,
                    type_chat="SqlFlow",
                    input_tokens=token_count,
                    tokens_limit=input_token_limit,
                    openai_type=openai_object["openai_type"],
                    openai_model=openai_model
                ) 
                yield f'[Error]: This model {openai_object["openai_type"]}|{openai_model} does not have the token limit configured.'
            if token_count > input_token_limit:
                save_chat_error_log(
                    run_id=run_id,
                    phase_id=phase_id,
                    flow_id=flow_id,
                    input_message=str(gpt_messages),
                    error_message=f'Token limit exceeded. {token_count}/{input_token_limit} tokens used.',
                    chat_option='ChatFlow - Question',
                    table_title=table_title,
                    table_description='',
                    id_user=id_user,
                    type_chat="SqlFlow",
                    input_tokens=token_count,
                    tokens_limit=input_token_limit,
                    openai_type=openai_object["openai_type"],
                    openai_model=openai_model 
                ) 
                yield f"[Error]: Token limit exceeded. {token_count}/{input_token_limit} tokens used"

        # Retry mechanism with exponential backoff
        for attempt in range(max_retries):
            try:
                with openai_chatcompletion(**openai_object) as response:
                    is_non_streaming = (
                        (openai_object["openai_type"] == "open_ai" and not openai_object["openai_stream"]) or
                        (openai_object["openai_type"] == "azure" and not openai_object["azure_openai_stream"])
                    )
                    
                    if is_non_streaming:
                        text = response.choices[0].message.content
                        answer += text
                        if text:
                            yield text
                    else:
                        for line in response:
                            if line.choices:
                                text = line.choices[0].delta.content or ""
                                answer += text
                                if text:
                                    yield text
                
                # If we get here, the API call succeeded
                break
                    
            except Exception as ex:
                last_error = ex
                if attempt < max_retries - 1:  # Don't sleep on last attempt
                    wait_time = min(2 ** attempt, 10)  # Exponential backoff with max 10 seconds
                    time.sleep(wait_time)
                continue
                
        else:  # This executes if the for loop completes without breaking (all retries failed)
            raise last_error if last_error else Exception("All retry attempts failed")
        
        # Save answer after successful completion
        save_chat_history(
            group_id=run_id,
            conversation=answer,
            id_user=id_user,
            type_chat="SqlFlow",
            type_conversation="Answer"
        )
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        save_chat_error_log(
            run_id=run_id,
            phase_id=phase_id,
            flow_id=flow_id,
            input_message=str(content_question),
            error_message=str(ex),
            table_title=table_title,
            table_description='',
            chat_option='ChatFlow - Question',
            id_user=id_user,
            type_chat="SqlFlow",
            input_tokens=token_count,
            tokens_limit=0,
            openai_type=openai_object["openai_type"],
            openai_model=''
        ) 
        error_msg = (
            f"[Error]: {str(ex)}\n"
            f"Total input tokens: {token_count}\n"
            f"Please try again later."
        )
        print(error_msg)
        yield error_msg


@app_flow.route("/chatflow/chatgpt", methods=["POST"])
def chatgpt():
    data = request.get_json()
    gpt_messages = list(data["gpt_messages"])
    openai_object = data["openai_object"]
    if "list_openai_model" in data:
        list_openai_model = str(data["list_openai_model"])  
        openai_object["openai_type"] = list_openai_model.split("|")[0]  
        openai_object["list_model"] = list_openai_model.split("|")[1]   
        message_object = consolidate_chat_history(gpt_messages)
    else:
        message_object = gpt_messages.copy()

    run_id = ''
    phase_id = ''
    flow_id = ''
    table_title = ''
    if "phase_id" in data:
        phase_id = data["phase_id"]
    if "run_id" in data:
        run_id = data["run_id"]
    else:
        run_id = id_guid()
    if "flow_id" in data:
        flow_id = data["flow_id"]
    if "table_title" in data:
        table_title = data["table_title"]

    id_user = session.get("id_user")
    return Response(event_stream_gpt(id_user, openai_object, message_object, run_id=run_id, phase_id=phase_id, flow_id=flow_id, table_title=table_title), mimetype='text/event-stream')
    

















@retry(
    stop=stop_after_attempt(3),
    wait=wait_fixed(60)
)
def safe_openai_call(openai_object):
    try:
        with openai_chatcompletion(**openai_object) as response:
            if not response.choices:
                raise ValueError("No choices in response")
            return response.choices[0].message.content
    except Exception as ex:
        raise ValueError(f"[error]: {str(ex)}") 

@app_flow.route("/chatflow/chatgpt_parallel", methods=["POST"])
def chatgpt_parallel():
    data = request.get_json()
    gpt_messages = data["gpt_messages"]
    openai_object = data["openai_object"]
    openai_object["messages"] = gpt_messages
    
    try:
        response = safe_openai_call(openai_object)
        return {"response": response}
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        return {"error": str(ex)}, 500

@app_flow.route("/chatflow/chatgpt_batch", methods=["POST"])
def chatgpt_batch():
    data = request.get_json()
    all_requests = data["batch"]
    id_user = session.get("id_user")
    results = []
    
    def process_request(req):
        openai_object = req["openai_object"] 
        run_id = req["run_id"] 
        phase_id = req["phase_id"] 
        flow_id = req["flow_id"] 
        task_id = req["task_id"] 
        list_openai_model = str(req["list_openai_model"]) 
        openai_object["openai_type"] = list_openai_model.split("|")[0] 
        openai_object["list_model"] = list_openai_model.split("|")[1] 
        #openai_model = req["openai_model"] 
        #system_prompt = req["system_prompt"] 
        step_num = req["step_num"] 
        order_num = req["order_num"] 
        #content_system_prompt = ''
        input_token_limit = int(req["input_token_limit"])
        question = str(req["question"])
        table_title = str(req["table_title"])
        table_description = str(req["table_description"])
        messages = list(req.get('gpt_messages', []))
        message_text = "\n\n".join([msg["content"] for msg in messages])
        token_count = count_tokens(message_text)
        try:
            #if system_prompt:
            #    content_system_prompt=system_prompt
            #    system_prompt = {"role": "system", "content": system_prompt}
            #    messages.insert(0, system_prompt) 
            if input_token_limit == 0: 
                save_chat_error_log(
                    run_id=run_id,
                    phase_id=phase_id,
                    flow_id=flow_id,
                    input_message=(message_text).strip(),
                    error_message=f'The model {list_openai_model} does not have the token limit configured.',
                    table_title=table_title,
                    table_description=table_description,
                    chat_option='ChatFlow - BatchQuestion',
                    id_user=id_user,
                    type_chat="SqlFlow",
                    input_tokens=token_count,
                    tokens_limit=input_token_limit,
                    openai_type=list_openai_model.split("|")[0],
                    openai_model=list_openai_model.split("|")[1],
                    order_num=int(order_num),
                    step_num=int(step_num) 
                )
                return {"error": f"[error] This model {list_openai_model} does not have the token limit configured.[breakline]Message: {shorten_text(question, 150)}", "request": messages} 
            if token_count > input_token_limit: 
                save_chat_error_log(
                    run_id=run_id,
                    phase_id=phase_id,
                    flow_id=flow_id,
                    input_message=(message_text).strip(),
                    error_message=f'Token limit exceeded. {token_count}/{input_token_limit} tokens used.',
                    table_title=table_title,
                    table_description=table_description,
                    chat_option='ChatFlow - BatchQuestion',
                    id_user=id_user,
                    type_chat="SqlFlow",
                    input_tokens=token_count,
                    tokens_limit=input_token_limit,
                    openai_type=list_openai_model.split("|")[0],
                    openai_model=list_openai_model.split("|")[1],
                    order_num=int(order_num),
                    step_num=int(step_num) 
                ) 
                return {"error": f"[error] Token limit exceeded. {token_count}/{input_token_limit} tokens used.[breakline]Message: {shorten_text(question, 150)}", "request": messages} 
            
            save_chat_history( 
                group_id=run_id, 
                phase_id=phase_id, 
                task_id=task_id,
                question=question,
                step_num=int(step_num), 
                conversation=(message_text).strip(), 
                id_user=id_user, 
                type_chat="SqlFlow - StepAnalysis", 
                type_conversation="Question",
                order_num=int(order_num))
            openai_object["messages"] = req['gpt_messages'] 
            response = safe_openai_call(openai_object) 
            final_response = (
                f"Source Table: {table_title}\n"
                f"Table Description: {table_description}\n\n"
                f"Response Generated:\n"
                f"{response}\n"
            )
            save_chat_history(
                group_id=run_id,
                phase_id=phase_id,
                task_id=task_id,
                question=question,
                step_num=int(step_num),
                conversation=final_response,
                id_user=id_user,
                type_chat="SqlFlow - StepAnalysis",
                type_conversation="Answer",
                order_num=int(order_num)
            ) 
            return {"response": final_response, "order_num": order_num} 
        except RetryError as retry_err: 
            function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
            save_system_error_log(exception=retry_err, request=request, module_name=__name__, function_name=function_name) 
            # Extract the original error from RetryError 
            original_error = retry_err.last_attempt.exception() 
            save_chat_error_log(
                    run_id=run_id,
                    phase_id=phase_id,
                    flow_id=flow_id,
                    input_message=str(messages),
                    error_message=str(original_error),
                    table_title=table_title,
                    table_description=table_description,
                    chat_option='ChatFlow - BatchQuestion',
                    id_user=id_user,
                    type_chat="SqlFlow",
                    input_tokens=token_count,
                    tokens_limit=input_token_limit,
                    openai_type=list_openai_model.split("|")[0],
                    openai_model=list_openai_model.split("|")[1],
                    order_num=int(order_num),
                    step_num=int(step_num) 
                ) 
            return {"error": str(original_error), "request": messages}
        except Exception as ex: 
            function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
            save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
            save_chat_error_log(
                    run_id=run_id,
                    phase_id=phase_id,
                    flow_id=flow_id,
                    input_message=str(messages),
                    error_message=str(ex),
                    table_title=table_title,
                    table_description=table_description,
                    chat_option='ChatFlow - BatchQuestion',
                    id_user=id_user,
                    type_chat="SqlFlow",
                    input_tokens=token_count,
                    tokens_limit=input_token_limit,
                    openai_type=list_openai_model.split("|")[0],
                    openai_model=list_openai_model.split("|")[1],
                    order_num=int(order_num),
                    step_num=int(step_num) 
                ) 
            return {"error": str(ex), "request": messages} 
    
    # Use ThreadPoolExecutor for better resource management
    with ThreadPoolExecutor(max_workers=3) as executor:
        futures = [executor.submit(process_request, req) for req in all_requests]
        
        for future in as_completed(futures):
            try:
                results.append(future.result())
            except Exception as ex:
                function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
                save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
                save_chat_error_log(
                    run_id='',
                    phase_id='',
                    flow_id='',
                    input_message='',
                    error_message=str(ex),
                    table_title='',
                    table_description='',
                    chat_option='ChatFlow - BatchQuestion',
                    id_user=id_user,
                    type_chat="SqlFlow",
                    input_tokens=0,
                    tokens_limit=0,
                    openai_type='',
                    openai_model='',
                    order_num=0,
                    step_num=0 
                ) 
                results.append({"error": str(ex)})
    
    return jsonify(results)


















































@app_flow.route("/chatflow/GenerateExcel", methods=["POST"])
def GenerateExcel():
    try:
        data = request.get_json() 
        id_user = session.get("id_user") 
        #id_group = session.get("id_group") 
        id_report = data["id_report"] 
        conversation_query = f"""
            EXECUTE [{SQL_SCHEMA}].[sp_list_tables_for_excel] @group_id = '{id_report}', @id_user = '{id_user}';
        """
        future_result = executor_instance.query_executor(conversation_query) 
        result = future_result.result(timeout=SQL_TIMEOUT) 
        conversation = result[0] 
        return conversation 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)}
    


@app_flow.route("/chatflow/GenerateWord", methods=["POST"])
def GenerateWord():
    try:
        data = request.get_json() 
        id_user = session.get("id_user") 
        #id_group = session.get("id_group") 
        id_report = data["id_report"] 
        conversation_query = f"""
            SELECT  
                 hc.[conversation]
                ,hc.[created_at]
                ,hc.[type_chat]
                ,hc.[type_conversation]
                ,hc.[step_num] 
            FROM [{SQL_SCHEMA}].[historical_chat] hc 
            LEFT JOIN [{SQL_SCHEMA}].[chatsql_phase_table] pt 
            ON pt.[id_chatsql_phase_table] = hc.[phase_id] and pt.[id_chatsql_tables] = -1 and pt.deleted_at is null and pt.[generate_report] = 1 
            LEFT JOIN [{SQL_SCHEMA}].[chatsql_phase_name] pn 
            ON pn.[id_chatsql_phase_name] = pt.[id_chatsql_phase_name] 
            LEFT JOIN [{SQL_SCHEMA}].[sql_tables] ta 
            ON ta.[id] = pt.[id_chatsql_tables] 
            WHERE 1=1 
            AND hc.[group_id] = '{id_report}' 
            --AND hc.[id_user] = '{id_user}' 
            AND hc.[type_chat] IN ('SqlFlow', 'SqlFlow - StepAnalysis')  
            AND hc.[type_conversation] = 'Answer' 
            AND hc.[conversation_detail] = '' 
            AND hc.[json_data_table] = '' 
            ORDER BY hc.[step_num] ASC; 
        """
        future_result = executor_instance.query_executor(conversation_query) 
        result = future_result.result(timeout=SQL_TIMEOUT) 
        conversation = result[0] 
        return conversation 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)}


@app_flow.route("/chatflow/TranslateConversation", methods=["POST"]) 
def TranslateConversation():
    data = request.get_json() 

    keyvault_name = data["keyvault_name"] 
    conversation = data["conversation"] 
    flow_language_report = data["flow_language_report"] 

    openai_object = data["openai_object"]

    try:
        messages = [] 
        messages.append({"role": "user", "content": "Translate this to " + str(flow_language_report) + ": \n\n" + conversation}) 

        data_object = [] 
        conversation = {} 

        try:
            answer = ''
            openai_object["messages"] = messages 
            with openai_chatcompletion(**openai_object) as response:
                if (openai_object["openai_type"] == "open_ai" and openai_object["openai_stream"] == False) or (openai_object["openai_type"] == "azure" and openai_object["azure_openai_stream"] == False):
                    text = response.choices[0].message.content 
                    answer += text 
                else:
                    for line in response:
                        if len(line.choices) > 0:
                            text = (line.choices[0].delta.content or "") 
                            answer += text
            conversation["conversation"] = answer 
        except Exception as ex:
            function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
            save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
            return {'code_error': str(ex)}

        data_object.append(conversation) 
        return {'result': data_object} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 


@app_flow.route("/chatflow/GenerateExecutive", methods=["POST"])
def GenerateExecutive():
    try:
        data = request.form 
        id_user = session.get("id_user") 
        #id_group = session.get("id_group") 
        id_report = data.get("id_report", "UNKNOWN") 
        conversation_query = f"""
            SELECT  
                 hc.[conversation]
                ,hc.[created_at]
                ,hc.[type_chat]
                ,hc.[type_conversation]
                ,hc.[step_num] 
                ,pn.[equipment_parameter] 
			    ,pn.[chatsql_phase_name] 
			    ,pn.[report_title_parameter] 
            FROM [{SQL_SCHEMA}].[historical_chat] hc 
            LEFT JOIN [{SQL_SCHEMA}].[chatsql_phase_table] pt 
            ON pt.[id_chatsql_phase_name] = hc.[phase_id] and pt.[id_chatsql_tables] = -1 and pt.deleted_at is null and pt.[generate_report] = 1 
            LEFT JOIN [{SQL_SCHEMA}].[chatsql_phase_name] pn 
            ON pn.[id_chatsql_phase_name] = pt.[id_chatsql_phase_name] 
            LEFT JOIN [{SQL_SCHEMA}].[sql_tables] ta 
            ON ta.[id] = pt.[id_chatsql_tables] 
            WHERE 1=1 
            AND hc.[group_id] = '{id_report}' 
            --AND hc.[id_user] = '{id_user}' 
            AND hc.[type_chat] IN ('SqlFlow', 'SqlFlow - StepAnalysis')  
            AND hc.[type_conversation] = 'Answer' 
            AND hc.[conversation_detail] = '' 
            AND hc.[json_data_table] = '' 
            ORDER BY hc.[step_num] ASC; 
        """
        future_result = executor_instance.query_executor(conversation_query) 
        result = future_result.result(timeout=SQL_TIMEOUT) 
        conversation = result[0] 
        
        report = ReportExecutive()
        doc_io = report.generate_report(conversation)
        
        # Send as attachment
        filename = f"report_{id_report}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.docx"
        # Flask >= 2.0 uses download_name; older Flask uses attachment_filename
        return send_file(
            doc_io,
            as_attachment=True,
            download_name=filename,
            mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )

    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)}


    































































@app_flow.route("/chatflow/SavePhaseResponse", methods=["POST"]) 
def SavePhaseResponse():
    try:
        data = request.get_json() 

        uid_phase = data["uid_phase"] 
        phase_checked = data["phase_checked"] 
        data_query = ("UPDATE [" + SQL_SCHEMA + "].[historical_chat] SET " +  
                    "[aq_saved] = " + str(phase_checked) + " "
                    "WHERE [phase_id] = '" + str(uid_phase) + "' AND [type_conversation] = 'Answer';") 
        executor_instance.query_executor(data_query, commit=True).result(timeout=SQL_TIMEOUT)  
        time.sleep(1) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 


@app_flow.route("/chatflow/SavePhaseAllResponses", methods=["POST"]) 
def SavePhaseAllResponses():
    try:
        data = request.get_json() 

        uid_group = data["uid_group"] 
        group_checked = data["group_checked"] 
        data_query = ("UPDATE [" + SQL_SCHEMA + "].[historical_chat] SET " +  
                    "[aq_saved] = " + str(group_checked) + " "
                    "WHERE [group_id] = '" + str(uid_group) + "';") 
        executor_instance.query_executor(data_query, commit=True).result(timeout=SQL_TIMEOUT)  
        time.sleep(1) 
        return {'result': 'OK'}
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 


@app_flow.route("/chatflow/SaveMainSetting", methods=["POST"]) 
def SaveMainSetting():
    try:
        data = request.get_json() 
        id_user = session.get("id_user")
        system_prompt = str(data["system_prompt"])
        after_question = str(data["after_question"])
        language_report = str(data["language_report"])
        global_config_query = f"""EXECUTE [{SQL_SCHEMA}].[sp_update_chatflow]  
            '{id_user}', 
            N'{system_prompt.replace("'", "''")}',
            N'{after_question.replace("'", "''")}',
            '{language_report}'; 
        """ 
        executor_instance.query_executor(global_config_query, commit=True).result(timeout=SQL_TIMEOUT)  
        return {'result': 'OK'}
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 


@app_flow.route("/chatflow/SaveOpenAISetting", methods=["POST"]) 
def SaveOpenAISetting():
    try:
        data = request.get_json() 
        id_user = session.get("id_user")
        openai_type = data["openai_type"]
        openai_model = data["openai_model"]
        openai_maxtoken = data["openai_maxtokens"]
        openai_temperature = data["openai_temperature"]
        azure_openai_model = data["azure_openai_model"]
        azure_openai_base = data["azure_openai_base"]
        azure_openai_version = data["azure_openai_version"]
        azure_openai_maxtoken = data["azure_openai_maxtokens"]
        azure_openai_temperature = data["azure_openai_temperature"]
        openai_embedded_model = data["openai_embedded_model"]
        openai_timeout = data["openai_timeout"]
        openai_stream = data["openai_stream"]
        azure_openai_embedded_model = data["azure_openai_embedded_model"]
        azure_openai_timeout = data["azure_openai_timeout"]
        azure_openai_stream = data["azure_openai_stream"]
        azure_openai_top_p = data["azure_openai_top_p"]
        openai_top_p = data["openai_top_p"] 
        chat_type = "chatflow"
        global_config_query = f"""EXECUTE [{SQL_SCHEMA}].[sp_update_openai]  
            '{str(id_user)}', 
            '{str(openai_type)}', 
            '{str(openai_model)}', 
            {str(openai_maxtoken)}, 
            '{str(openai_temperature)}', 
            '{str(azure_openai_model)}', 
            '{str(azure_openai_base)}', 
            '{str(azure_openai_version)}', 
            {str(azure_openai_maxtoken)}, 
            '{str(azure_openai_temperature)}', 
            '{str(openai_embedded_model)}', 
            {str(openai_timeout)}, 
            {str(openai_stream)}, 
            '{str(azure_openai_embedded_model)}', 
            {str(azure_openai_timeout)},   
            {str(azure_openai_stream)},   
            '{str(openai_top_p)}',   
            '{str(azure_openai_top_p)}',   
            '{chat_type}';    
        """ 
        executor_instance.query_executor(global_config_query, commit=True).result(timeout=SQL_TIMEOUT)  
        return {'result': 'OK'}
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)}

@app_flow.route("/chatflow/SaveDefaultSetting", methods=["POST"]) 
def SaveDefaultSetting():
    try:
        data = request.get_json() 
        id_user = session.get("id_user") 
        default_image_prompt = data["default_image_prompt"]
        default_sqljigsaw_query = data["default_sqljigsaw_query"]
        default_sqlvisionlink_query = data["default_sqlvisionlink_query"]
        default_sqlpresionaceite_query = data["default_sqlpresionaceite_query"]
        default_sqltasks_query = data["default_sqltasks_query"]
        default_sqlinspection_query = data["default_sqlinspection_query"]
        default_sqloil_query = data["default_sqloil_query"]
        default_sqlshiftalarm_query = data["default_sqlshiftalarm_query"]
        
        default_query = f"""
        EXECUTE [{SQL_SCHEMA}].[sp_update_chatflow_default]   
            '{str(id_user)}', 
            '{str(default_image_prompt).replace("'", "''")}', 
            '{str(default_sqljigsaw_query).replace("'", "''")}', 
            '{str(default_sqlvisionlink_query).replace("'", "''")}', 
            '{str(default_sqlpresionaceite_query).replace("'", "''")}', 
            '{str(default_sqltasks_query).replace("'", "''")}', 
            '{str(default_sqlinspection_query).replace("'", "''")}', 
            '{str(default_sqloil_query).replace("'", "''")}', 
            '{str(default_sqlshiftalarm_query).replace("'", "''")}' ;    
        """ 
        executor_instance.query_executor(default_query, commit=True).result(timeout=SQL_TIMEOUT)  
        return {'result': 'OK'}
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)}



















@app_flow.route("/chatflow/GetHistoryChat", methods=["POST"])
def GetHistoryChat():
    try:
        data = request.get_json() 
        id_user = session.get("id_user") 
        group_id = data["group_id"] 
        query_conversation = f"""
            EXEC [{SQL_SCHEMA}].[sp_GetConversationPrompts] @group_id = '{group_id}';

            WITH Table_01 AS (
                SELECT 
                    ce.[run_id] as [group_id], 
                    conv.conversation,
                    conv.[type_conversation] as [type_conversation],
                    ce.[created_at],
                    conv.[num_tokens] AS [NumTokens],
                    ce.[order_num],
                    ce.[step_num],
                    'Failed' AS [Process]
                FROM [mbot].[chat_error_logs] ce
                CROSS APPLY (
                    VALUES 
                        ('Question', ce.input_message, ce.[input_tokens]),
                        ('Answer', ce.error_message, 0)
                ) AS conv([type_conversation], conversation, [num_tokens])
                WHERE 1=1
                    AND ce.[run_id] = '{group_id}'
                    AND ce.chat_option = 'ChatFlow - BatchQuestion'
                    AND conv.conversation IS NOT NULL
            )
            ,Table_02 AS (
                SELECT 
                    hc.[group_id]
                    ,hc.[conversation]
                    ,hc.[type_conversation]
                    ,hc.[created_at]
                    ,(CASE 
                        WHEN hc.[type_conversation] = 'Answer' THEN hc.[num_tokens]
                        WHEN hc.[type_conversation] = 'Question' THEN hc.[num_tokens]
                        ELSE 0 
                    END) AS [NumTokens]
                    ,ISNULL(hc.[order_num], 0) AS [order_num] 
                    ,ISNULL(hc.[step_num], 0) AS [step_num] 
                    ,'Success' AS [Process]
                FROM [mbot].[historical_chat] hc
                WHERE hc.[type_chat] = 'SqlFlow - StepAnalysis' 
                    AND hc.[group_id] = '{group_id}' 
            )
            ,Result AS (
                SELECT
                    [group_id],
                    [conversation],
                    [type_conversation],
                    [created_at],
                    [NumTokens],
                    [order_num],
                    [step_num],
                    [Process]
                FROM Table_01
                UNION ALL
                SELECT
                    [group_id],
                    [conversation],
                    [type_conversation],
                    [created_at],
                    [NumTokens],
                    [order_num],
                    [step_num],
                    [Process]
                FROM Table_02
            )
            SELECT * FROM Result r
            ORDER BY r.[order_num] ASC, r.[step_num] ASC, r.[created_at] ASC;

            SELECT * FROM [{SQL_SCHEMA}].[chat_error_logs]
            WHERE [run_id] = '{group_id}'
            ORDER BY created_at ASC;
        """
        future_result = executor_instance.query_executor(query_conversation) 
        result = future_result.result() 
        data_conversation = result[0] 
        step_analysis = result[1] 
        data_error = result[2] 
        return {'data_conversation': data_conversation, 'step_analysis': step_analysis, 'data_error': data_error} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)}
    



@app_flow.route("/chatflow/EditSqlSystemPrompt", methods=["POST"])
def EditSqlSystemPrompt():
    try: 
        data = request.get_json() 
        id_user = session.get("id_user") 
        id_phase = data["id_phase"] 
        query = f"""
            SELECT 
                ISNULL([sql_system_prompt], '') AS [sql_system_prompt] 
            FROM [{SQL_SCHEMA}].[chatsql_phase_name] 
            WHERE [id_chatsql_phase_name] = '{id_phase}' 
            AND [deleted_at] IS NULL; 
        """ 
        future_result = executor_instance.query_executor(query) 
        result = future_result.result(timeout=60) 
        return result[0]  
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 
    

@app_flow.route("/chatflow/SaveSqlSystemPrompt", methods=["POST"])
def SaveSqlSystemPrompt():
    try: 
        data = request.get_json()  
        id_user = session.get("id_user")  
        id_phase = str(data["id_phase"])  
        sql_system_prompt = str(data["sql_system_prompt"])  
        query = f"""
            UPDATE [{SQL_SCHEMA}].[chatsql_phase_name]
                SET [sql_system_prompt] = '{sql_system_prompt.replace("'", "''")}' 
            WHERE [id_chatsql_phase_name] = '{id_phase}' 
            AND [deleted_at] IS NULL;  
        """ 
        executor_instance.query_executor(query, commit=True).result(timeout=60)  
        return 'OK'  
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 





@app_flow.route("/chatflow/EditQuestionSystemPrompt", methods=["POST"])
def EditQuestionSystemPrompt():
    try: 
        data = request.get_json() 
        id_user = session.get("id_user") 
        id_phase = data["id_phase"] 
        query = f"""
            SELECT 
                ISNULL([sql_question_system_prompt], '') AS [sql_question_system_prompt] 
            FROM [{SQL_SCHEMA}].[chatsql_phase_name] 
            WHERE [id_chatsql_phase_name] = '{id_phase}' 
            AND [deleted_at] IS NULL; 
        """ 
        future_result = executor_instance.query_executor(query) 
        result = future_result.result(timeout=60) 
        return result[0]  
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 
    

@app_flow.route("/chatflow/SaveQuestionSystemPrompt", methods=["POST"])
def SaveQuestionSystemPrompt():
    try: 
        data = request.get_json()  
        id_user = session.get("id_user")  
        id_phase = str(data["id_phase"])  
        question_system_prompt = str(data["question_system_prompt"])  
        query = f"""
            UPDATE [{SQL_SCHEMA}].[chatsql_phase_name]
                SET [sql_question_system_prompt] = '{question_system_prompt.replace("'", "''")}' 
            WHERE [id_chatsql_phase_name] = '{id_phase}' 
            AND [deleted_at] IS NULL;  
        """ 
        executor_instance.query_executor(query, commit=True).result(timeout=60)  
        return 'OK'  
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 





@app_flow.route("/chatflow/GetCommentPhase", methods=["POST"]) 
def GetCommentPhase(): 
    try: 
        data = request.get_json() 
        id_user = session.get("id_user") 
        id_phase = data["id_phase"] 
        query = f""" 
            SELECT 
                ISNULL([comments], '') AS [comments]
            FROM [{SQL_SCHEMA}].[chatsql_phase_name] 
            WHERE [id_chatsql_phase_name] = '{id_phase}' 
            AND [deleted_at] IS NULL; 
        """ 
        future_result = executor_instance.query_executor(query) 
        result = future_result.result(timeout=60) 
        return result[0] 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 
    



@app_flow.route("/chatflow/EditFinalQuestionPrompt", methods=["POST"]) 
def EditFinalQuestionPrompt(): 
    try: 
        data = request.get_json() 
        id_user = session.get("id_user") 
        id_phase = data["id_phase"] 
        query = f""" 
            SELECT 
                ISNULL([final_question_prompt], '') AS [final_question_prompt], 
                [final_question_model] 
            FROM [{SQL_SCHEMA}].[chatsql_phase_name] 
            WHERE [id_chatsql_phase_name] = '{id_phase}' 
            AND [deleted_at] IS NULL; 
        """ 
        future_result = executor_instance.query_executor(query) 
        result = future_result.result(timeout=60) 
        return result[0] 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 
    



@app_flow.route("/chatflow/SaveCommentPhase", methods=["POST"]) 
def SaveCommentPhase():
    try: 
        data = request.get_json()  
        id_user = session.get("id_user")  
        id_phase = str(data["id_phase"])  
        comment_phase_input = str(data["comment_phase_input"])  
        query = f"""
            UPDATE [{SQL_SCHEMA}].[chatsql_phase_name]
                SET [comments] = '{comment_phase_input.replace("'", "''")}' 
            WHERE [id_chatsql_phase_name] = '{id_phase}' 
            AND [deleted_at] IS NULL; 
        """ 
        executor_instance.query_executor(query, commit=True).result(timeout=60)  
        return 'OK'  
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 



@app_flow.route("/chatflow/SaveFinalQuestionPrompt", methods=["POST"])
def SaveFinalQuestionPrompt():
    try: 
        data = request.get_json()  
        id_user = session.get("id_user")  
        id_phase = str(data["id_phase"])  
        final_question_prompt = str(data["final_question_prompt"])  
        final_question_model = str(data["final_question_model"])  
        query = f"""
            UPDATE [{SQL_SCHEMA}].[chatsql_phase_name]
                SET [final_question_prompt] = '{final_question_prompt.replace("'", "''")}', 
                    [final_question_model] = '{final_question_model}' 
            WHERE [id_chatsql_phase_name] = '{id_phase}' 
            AND [deleted_at] IS NULL; 
        """ 
        executor_instance.query_executor(query, commit=True).result(timeout=60)  
        return 'OK'  
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 














def GetTokensModel(model_type: str, model_value: str) -> int:
    try:
        query_conversation = f"""
		SELECT TOP 1 [InputTokenLimit] FROM [{SQL_SCHEMA}].[ai_models] am 
		WHERE LOWER(am.ModelType) = LOWER('{model_type}') AND LOWER(am.ModelValue) = LOWER('{model_value}')  
        """
        future_result = executor_instance.query_executor(query_conversation) 
        result = future_result.result() 
        data_conversation = result[0] 
        return data_conversation[0]['InputTokenLimit']
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        return {'code_error': str(ex)}



