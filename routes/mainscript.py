import pandas as pd 
import sys
import json
import tiktoken
import traceback
import inspect
import logging
import uuid 
from datetime import datetime, timezone 
from flask import request, Blueprint, session   
from azure.keyvault.secrets import SecretClient  
from azure.identity import ManagedIdentityCredential  
from functions.tools import id_guid, get_safe_json 
from classes.sqlconnection import QueryExecutor 
from classes.secretstore import SqlSecretStore
from environment import SQL_TIMEOUT, KEYVAULT_URL, SQL_SCHEMA  

#credentials = ManagedIdentityCredential() 
executor_instance = QueryExecutor() 
secret_store = SqlSecretStore()
encoding = tiktoken.get_encoding("cl100k_base")

app_main = Blueprint('app_main', __name__, template_folder='templates')

def get_configuration(additional_query = ""):
    if "chat_type" in session: 
        chat_type = str(session.get("chat_type")) 
    else: 
        chat_type = 'chatgpt' 
    id_user = session.get("id_user") 
    query = f"""EXECUTE [{SQL_SCHEMA}].[sp_user_information] '{id_user}', '{chat_type}'; \n\n {additional_query}""" 
    future = executor_instance.query_executor(query) 
    results = dict() 
    try: 
        results = future.result(timeout=SQL_TIMEOUT) 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(f"Failed to execute: {ex}") 
        results["error"] = f"Failed to execute: {ex}"     
    return results 



@app_main.route("/main/SqlExecuteQuery", methods=["POST"]) 
def SqlExecuteQuery():
    try:
        data = request.get_json() 
        sql_server_connection = ""
        if "sql_server_connection" in data:
            sql_server_connection = data["sql_server_connection"] 
        sql_input_query = data["sql_input_query"] 
        if sql_server_connection != "":
            sql_server_str = secret_store.get_secret(sql_server_connection)
            #sql_server_str = SecretClient(vault_url=KEYVAULT_URL, credential=credentials, logging_enable=False).get_secret(sql_server_connection, logging_enable=False).value 
        else:
            sql_server_str = "" 
        #sql_server_str = "" 
        future_result = executor_instance.query_executor(query=sql_input_query, connection_string=sql_server_str) 
        result = future_result.result(timeout=SQL_TIMEOUT) 
        data_config = result[0] 
        for index, row in enumerate(data_config):
            for column in row.keys():
                if type(row[column]) is bytes:
                    data_config[index][column] = ("0x" + (data_config[index][column].hex()).upper())
        data_object = [] 
        if len(data_config) > 0:
            data_object.append(data_config)  
            data_object.append('|'.join(data_config[0].keys()))   
        return {'result': data_object} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 


@app_main.route("/main/SqlSaveQuery", methods=["POST"])
def SqlSaveQuery():
    try: 
        data = request.get_json() 
        event_incident_option = data["event_incident_option"]
        object_name = data["object_name"]
        id_object_option = data["id_object_option"] 
        server_connection = data["server_connection"] 
        input_query = data["input_query"]
        sql_tag_name = data["sql_tag_name"]
        query = ("execute [" + SQL_SCHEMA + "].[sp_update_sqlqueries] " +  
                        event_incident_option + ", " + 
                        "'" + str(server_connection) + "', " + 
                        str(id_object_option) + ", " + 
                        "'" + str(object_name).replace("'", "''") + "', " +  
                        "'" + str(sql_tag_name).replace("'", "''") + "', " +  
                        "'" + str(input_query).replace("'", "''") + "'; ") 
        executor_instance.query_executor(query, commit=True).result(timeout=SQL_TIMEOUT) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 




def save_chat_history(group_id = '', phase_id = None, conversation = '', 
              conversation_detail = '', id_user = '', type_chat = '', type_conversation = '', 
              json_data_table = '', question = '', task_id = '', order_num = 0, step_num = 0):
    
    set_phase_id = (phase_id if phase_id is not None else '')
    token_count = len(encoding.encode(conversation))
    #query = f"""INSERT INTO [{SQL_SCHEMA}].[historical_chat] (
    #                [group_id],
    #                [phase_id],
    #                [task_id],
    #                [conversation],
    #                [conversation_detail],
    #                [created_at],
    #                [id_user],
    #                [type_chat],
    #                [type_conversation],
    #                [aq_saved],
    #                [json_data_table],
    #                [num_tokens],
    #                [question],
    #                [order_num],
    #                [step_num]) 
    #            VALUES ('{group_id}',
    #            '{set_phase_id}',
    #            '{task_id}',
    #            N'{conversation.replace("'", "''")}',
    #            N'{conversation_detail.replace("'", "''")}',
    #            GETUTCDATE(),
    #            '{id_user}',
    #            '{type_chat}',
    #            '{type_conversation}',
    #            0, 
    #            N'{json_data_table.replace("'", "''")}', 
    #            {token_count},
    #            N'{question.replace("'", "''")}',
    #            {order_num}, 
    #            {step_num}) 
    #            """
    
    query = f"""INSERT INTO [{SQL_SCHEMA}].[historical_chat] (
                    [group_id],
                    [phase_id],
                    [task_id],
                    [conversation],
                    [conversation_detail],
                    [created_at],
                    [id_user],
                    [type_chat],
                    [type_conversation],
                    [aq_saved],
                    [json_data_table],
                    [num_tokens],
                    [question],
                    [order_num],
                    [step_num]) 
                VALUES (?, ?, ?, ?, ?, GETUTCDATE(), ?, ?, ?, 0, ?, ?, ?, ?, ?) 
                """

    # Parameters in the correct order
    params = (
        group_id,
        set_phase_id,
        task_id,
        conversation,  # No need for manual escaping with parameterized queries
        conversation_detail,
        id_user,
        type_chat,
        type_conversation,
        json_data_table,
        token_count,
        question,
        order_num,
        step_num
    )
    
    try:
        executor_instance.query_executor(query, params=params, commit=True) 
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(f"An error occurred: {ex}")
        raise Exception(f"An error occurred: {ex}")

    #with open_db_connection(SQL_SERVER_STR, True) as cursor:
    #    cursor.execute("INSERT INTO [" + SQL_SCHEMA + "].[historical_chat] ([group_id],[phase_id],[conversation],[conversation_detail],[created_at],[id_user],[type_chat],[type_conversation],[aq_saved]) VALUES (?,?,?,?,?,?,?,?,?)", 
    #               group_id, 
    #               phase_id, 
    #               conversation, 
    #               conversation_detail, 
    #               datetime.now(timezone.utc), 
    #               id_user, 
    #               type_chat, 
    #               type_conversation,
    #               0,
    #               order_num)




def save_chat_error_log(
    run_id: str = '',
    phase_id: str = None,
    flow_id: str = '',
    input_message: str = '',
    error_message: str = '',
    table_title: str = '',
    table_description: str = '',
    chat_option: str = '',
    id_user: str = '',
    type_chat: str = '',
    input_tokens: int = 0,
    tokens_limit: int = 0,
    openai_type: str = '',
    openai_model: str = '',
    order_num: int = 0,
    step_num: int = 0
):
    set_phase_id = phase_id if phase_id is not None else ''
    
    query = f"""
    INSERT INTO [{SQL_SCHEMA}].[chat_error_logs] (
        [error_id],
        [run_id],
        [phase_id],
        [flow_id],
        [input_message],
        [error_message],
        [table_title],
        [table_description],
        [chat_option],
        [id_user],
        [type_chat],
        [input_tokens],
        [tokens_limit],
        [openai_type],
        [openai_model],
        [order_num],
        [step_num],
        [created_at]) 
    VALUES (LOWER(NEWID()), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, GETUTCDATE())
    """
    
    # Parameters for the query - must match the order of ? placeholders
    params = (
        run_id,
        set_phase_id,
        flow_id,
        input_message,
        error_message,
        table_title,
        table_description,
        chat_option,
        id_user,
        type_chat,
        input_tokens,
        tokens_limit,
        openai_type,
        openai_model,
        order_num,
        step_num
    )
    
    try:
        executor_instance.query_executor(query, params=params, commit=True)
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        raise Exception(f"Failed to save/update error log: {ex}")





def save_system_error_log(
    exception,
    request=None,
    module_name='',
    function_name=''
):
    try:
        id_user = ''
        #if "id_user" in session:
        #    id_user = session.get("id_user", "")
        domain = 'unknown'
        full_url = 'unknown'
        additional_data = {}
        if request is not None:
            domain = getattr(request, 'host', 'unknown') 
            full_url = getattr(request, 'url', 'unknown') 
            additional_data = get_safe_json(request) 
        data_object = {
            'ModuleName': module_name,
            'AdditionalData': additional_data,
            'ProcessName': function_name,
            'AppDomainName': domain,
            'URL': full_url
        }

        exception_type = type(exception).__name__
        status_code = getattr(exception, 'status_code', None) or 500
        hash_code = abs(hash(exception_type)) % 9000 + 1000  # 4-digit code
        severity_level = ''
        warning_exceptions = [
            'ArgumentException',
            'ArgumentNullException'
        ]
        if exception_type in warning_exceptions:
            severity_level = 'Warning'
        else:
            severity_level = 'Error'

        source = exception.__class__.__module__
        stack_trace = ''.join(traceback.format_exception(*sys.exc_info()))
        inner_ex = str(exception.__cause__) if exception.__cause__ else ''
        inner_type = type(exception.__cause__).__name__ if exception.__cause__ else ''
        additional = json.dumps(data_object['AdditionalData']) if 'AdditionalData' in data_object else ''
        
        query = f"""
        INSERT INTO [{SQL_SCHEMA}].[system_error_logs]
                ([ModuleName]
                ,[ErrorType]
                ,[ErrorMessage]
                ,[StackTrace]
                ,[InnerExceptionMessage]
                ,[InnerExceptionType]
                ,[AdditionalData]
                --,[UserId]
                ,[ProcessName]
                ,[AppDomainName]
                ,[SeverityLevel]
                ,[ErrorCode]
                ,[HTTPStatusCode]
                ,[URL])
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """

        params = (
            data_object.get('ModuleName', 'Unknown'),
            exception_type,
            str(exception),
            stack_trace,
            inner_ex,
            inner_type,
            additional,
            #id_user,
            data_object.get('ProcessName', 'Unknown'),
            data_object.get('AppDomainName', 'Unknown'),
            severity_level,
            hash_code,
            status_code,
            data_object.get('URL', '')
        )

        executor_instance.query_executor(query, params=params, commit=True)

    except Exception as ex:
        error_message = f"Failed to save/update error log: {str(ex)}\n"
        print(error_message)
    
    


