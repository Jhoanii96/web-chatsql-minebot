import time
import json
import inspect
import pandas as pd 
from datetime import datetime, timezone 
from flask import request, Blueprint, session, Response, stream_with_context    
from azure.keyvault.secrets import SecretClient 
from azure.identity import ManagedIdentityCredential  
from functions.tools import cast_data_types 
from routes.mainscript import save_system_error_log 
from environment import SQL_TIMEOUT, SQL_SCHEMA, KEYVAULT_URL   
from classes.sqlconnection import QueryExecutor 
from classes.secretstore import SqlSecretStore 

app_settings = Blueprint('app_settings', __name__, template_folder='templates') 
#credentials = ManagedIdentityCredential() 
executor_instance = QueryExecutor()
secret_store = SqlSecretStore()

@app_settings.route("/settings/save_sqlserver", methods=["POST"])
def save_sqlserver():
    try: 
        data = request.get_json() 
        secrets = str(data["secrets"])
        database_description = str(data["database_description"])
        query = ("INSERT INTO [" + SQL_SCHEMA + "].[sql_secrets] " +  
                        "([secrets],[database_description]) " + 
                        "VALUES " + 
                        "('" + secrets + "','" + database_description + "'); ") 
        executor_instance.query_executor(query, commit=True).result()  
        time.sleep(1)
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

@app_settings.route("/settings/delete_sqlsecret", methods=["POST"])
def delete_sqlsecret():
    try: 
        data = request.get_json() 
        secret_id = str(data["secret_id"]) 
        query = ("UPDATE [" + SQL_SCHEMA + "].[sql_secrets] " +  
                        "SET [deleted_at] = GETDATE() " + 
                        "WHERE [id] = " + secret_id + "; ") 
        executor_instance.query_executor(query, commit=True).result()  
        time.sleep(1)
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

@app_settings.route("/settings/ReadSqlTable", methods=["GET"])
def ReadSqlTable():
    try: 
        query = f"""
        SELECT [id], [secrets], [database_description] 
        FROM [{SQL_SCHEMA}].[sql_secrets] 
        WHERE [deleted_at] IS NULL 
        ORDER BY [id] ASC;
        """ 
        future_result = executor_instance.query_executor(query) 
        result = future_result.result() 
        data_object = result[0] 
        return {'result': data_object} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 


@app_settings.route("/settings/save_phasetype", methods=["POST"])
def save_phasetype():
    try: 
        data = request.get_json() 
        id_user = session.get("id_user") 
        settings_phase_name = str(data["settings_phase_name"])
        settings_chat_type = str(data["settings_chat_type"])
        query = ("INSERT INTO [" + SQL_SCHEMA + "].[chat_phase_type] " +  
                    "([phase_name],[created_at],[chat_type],[id_user]) " + 
                    "VALUES " + 
                    "('" + settings_phase_name + "', GETDATE(), '" + settings_chat_type + "', '" + id_user + "'); ") 
        executor_instance.query_executor(query, commit=True).result()  
        time.sleep(1) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

@app_settings.route("/settings/update_phasetype", methods=["POST"])
def update_phasetype():
    try: 
        data = request.get_json() 
        phase_id = str(data["phase_id"]) 
        settings_phase_name = str(data["settings_phase_name"]) 
        settings_chat_type = str(data["settings_chat_type"]) 
        query = ("UPDATE [" + SQL_SCHEMA + "].[chat_phase_type] " +  
                    "SET [phase_name] = '" + settings_phase_name + "' " + 
                    " ,[chat_type] = '" + settings_chat_type + "' " + 
                " WHERE [id] = " + phase_id + ";") 
        executor_instance.query_executor(query, commit=True).result()  
        time.sleep(1) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

@app_settings.route("/settings/delete_phasetype", methods=["POST"])
def delete_phasetype():
    try: 
        data = request.get_json() 
        phase_id = str(data["phase_id"]) 
        query = ("UPDATE [" + SQL_SCHEMA + "].[chat_phase_type] " +  
                    "SET [deleted_at] = GETDATE() " + 
                    "WHERE [id] = " + phase_id + "; ") 
        executor_instance.query_executor(query, commit=True).result()  
        time.sleep(1)
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 
    

@app_settings.route("/settings/ReadPhaseTypeTable", methods=["GET"])
def ReadPhaseTypeTable():
    try: 
        query = f"""
        SELECT [id], [phase_name], [chat_type] 
        FROM [{SQL_SCHEMA}].[chat_phase_type] 
        WHERE [deleted_at] IS NULL 
        ORDER BY [id] ASC; 
        """ 
        future_result = executor_instance.query_executor(query) 
        result = future_result.result() 
        data_object = result[0] 
        return {'result': data_object} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 









@app_settings.route("/settings/save_roleconfiguration", methods=["POST"])
def save_roleconfiguration():
    try: 
        data = request.get_json() 
        id_user = session.get("id_user") 
        settings_role_name = str(data["settings_role_name"])
        settings_role_prompt = str(data["settings_role_prompt"])
        settings_phase_type = str(data["settings_phase_type"])
        settings_role_image = str(data["settings_role_image"])
        query = f"""
        INSERT INTO [{SQL_SCHEMA}].[chat_role_config] 
        ([role_name],[role_description],[id_user],[id_phase_type],[role_image],[created_at]) 
        VALUES 
        ('{settings_role_name}','{settings_role_prompt}','{id_user}','{settings_phase_type}','{settings_role_image}',GETDATE());
        """
        executor_instance.query_executor(query, commit=True).result()  
        time.sleep(1)
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 
    
@app_settings.route("/settings/update_roleconfiguration", methods=["POST"])
def update_roleconfiguration():
    try: 
        data = request.get_json() 
        role_id = str(data["role_id"]) 
        settings_role_name = str(data["settings_role_name"]) 
        settings_role_prompt = str(data["settings_role_prompt"]) 
        settings_phase_type = str(data["settings_phase_type"]) 
        settings_role_image = str(data["settings_role_image"]) 
        query = ("UPDATE [" + SQL_SCHEMA + "].[chat_role_config] " +  
                    "SET [role_name] = '" + settings_role_name + "' " + 
                    " ,[role_description] = '" + settings_role_prompt.replace("'", "''") + "' " + 
                    " ,[id_phase_type] = " + settings_phase_type + " " + 
                    " ,[role_image] = '" + settings_role_image.replace("'", "''") + "' " + 
                " WHERE [id] = " + role_id + ";") 
        executor_instance.query_executor(query, commit=True).result()  
        time.sleep(1)
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

@app_settings.route("/settings/delete_roleconfiguration", methods=["POST"])
def delete_roleconfiguration():
    try: 
        data = request.get_json() 
        role_id = str(data["role_id"]) 
        query = ("UPDATE [" + SQL_SCHEMA + "].[chat_role_config] " +  
                    "SET [deleted_at] = GETDATE() " + 
                    "WHERE [id] = " + role_id + "; ") 
        executor_instance.query_executor(query, commit=True).result()  
        time.sleep(1) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

@app_settings.route("/settings/ReadRoleConfigurationTable", methods=["GET"])
def ReadRoleConfigurationTable():
    try: 
        full_query = f"""
            SELECT [id] AS [id_role] 
                ,[role_name] 
                ,[role_description] 
                ,[id_phase_type] 
                ,[role_image] 
            FROM [{SQL_SCHEMA}].[chat_role_config] 
            WHERE [deleted_at] IS NULL; 

            SELECT [id] AS [id_phase], 
                [phase_name], 
                [chat_type] 
            FROM [{SQL_SCHEMA}].[chat_phase_type] 
            WHERE [deleted_at] IS NULL ORDER BY [id] ASC; 
        """ 
        future_result = executor_instance.query_executor(full_query) 
        data_object = future_result.result() 
        return {'result': data_object} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 



@app_settings.route("/settings/RefreshLastDataUpdated", methods=["GET"])
def RefreshLastDataUpdated():
    def generate():
        try:
            # Initialize query
            full_query = """
                SELECT 
                     sd.id_table,
                     ss.secrets,
                     st.source_table,
                     sd.column_name 
                FROM [mbot].[sql_dictionary] sd 
                INNER JOIN [mbot].[sql_tables] st ON sd.id_table = st.id 
                INNER JOIN [mbot].[sql_secrets] ss ON st.id_secrets = ss.id 
                WHERE sd.last_date_updated = 1 
                AND sd.deleted_at IS NULL 
                AND st.deleted_at IS NULL 
                AND ss.deleted_at IS NULL; 
            """
            future_result = executor_instance.query_executor(full_query)
            data_object = future_result.result(timeout=SQL_TIMEOUT)

            # Iterate over fetched data
            for index, item in enumerate(data_object[0], start=1):
                yield f"Processing table {index}/{len(data_object[0])}: {item['source_table']}"

                sql_server_str = secret_store.get_secret(item["secrets"])
                #sql_server_str = SecretClient(vault_url=KEYVAULT_URL, credential=credentials, logging_enable=False).get_secret(item["secrets"], logging_enable=False).value
                #sql_server_str="DRIVER={ODBC Driver 17 for SQL Server};SERVER=usaeu2velman-dev-sql.database.windows.net;DATABASE=GIGVELKPIDB;UID=velmanadm;PWD=usaeu2catA#!@733;"
                #sql_server_str="DRIVER={ODBC Driver 17 for SQL Server};SERVER=usaeu2velman-prod-sql.database.windows.net;DATABASE=USAEU2VELMAN-PROD-sqldb;UID=velmanadm;PWD=6XBhhpXRpGIIkCQRYy8L;"

                table_query = f"""
                SELECT TOP 1 
                    CASE 
                        WHEN TRY_CAST([{item["column_name"]}] AS DATE) IS NOT NULL 
                        THEN TRY_CAST([{item["column_name"]}] AS DATE)
                        ELSE CAST([{item["column_name"]}] AS VARCHAR(MAX))
                    END AS DateResult
                FROM {item["source_table"]}
                ORDER BY 
                    CASE 
                        WHEN TRY_CAST([{item["column_name"]}] AS DATE) IS NOT NULL 
                        THEN TRY_CAST([{item["column_name"]}] AS DATE)
                        ELSE NULL
                    END DESC;
                """
                future_table = executor_instance.query_executor(query=table_query, connection_string=sql_server_str)
                data_table = future_table.result(timeout=SQL_TIMEOUT)

                result_date = cast_data_types(data_table[0])
                if result_date:
                    date_query = f"""
                        UPDATE [{SQL_SCHEMA}].[sql_tables]
                        SET [last_data_updated] = '{result_date[0]['DateResult']}'
                        WHERE [id] = {item["id_table"]};
                    """
                    executor_instance.query_executor(date_query, commit=True).result(timeout=SQL_TIMEOUT)

                yield f"Completed processing for {item['source_table']}."

            yield json.dumps({'result': 'OK'})
        except Exception as ex:
            function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
            save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
            yield json.dumps({'code_error': str(ex)})

    return Response(generate(), mimetype='text/event-stream')


