import time 
import socket
import inspect
from flask import request, Blueprint, session, Response, current_app 
from functions.tools import id_guid, dict_to_markdown, cast_data_types 
from environment import SQL_TIMEOUT, SQL_SERVER_STR, SQL_SCHEMA, KEYVAULT_URL 
from azure.identity import ManagedIdentityCredential 
from azure.keyvault.secrets import SecretClient 
from routes.mainscript import save_chat_history, save_system_error_log 
from functions.openai import openai_chatcompletion, generate_tokens_price_usage 
from classes.sqlconnection import QueryExecutor 
from classes.azurekeyvault import AzureKeyVaultManager
from classes.secretstore import SqlSecretStore

app_sql = Blueprint('app_sql', __name__, template_folder='templates')
executor_instance = QueryExecutor() 

# Identity Credential 
#credentials = ManagedIdentityCredential() 
#vault_manager = AzureKeyVaultManager() 
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


def get_results_query(sql_server_str: str, openai_object: dict, sql_system_prompt: str, sql_data_dictionary: str, 
                      question: str, table_schema: str, table_name: str) -> dict:
    start_time = time.time()
    _sql_prompt = sql_system_prompt.replace("{{table_schema}}", table_schema).replace("{{table_name}}", table_name).replace("{{data_dictionary}}", sql_data_dictionary)
    messages = []
    messages.append({"role": "system", "content": _sql_prompt})
    messages.append({"role": "user", "content": "Question: " + question})
    openai_object["messages"] = messages 
    openai_object["openai_stream"] = False 
    openai_object["azure_openai_stream"] = False 

    sql_response = ''
    info_usage = {}
    with openai_chatcompletion(**openai_object) as assistant_response:
        sql_response = assistant_response.choices[0].message.content 
        info_usage = generate_tokens_price_usage(assistant_response)
    
    data_object = ""
    table_result = []
    result_object = {
        "info_usage": info_usage, 
        "sql_query": sql_response,
        "data_object": data_object,
        "table_result": table_result,
        "total_time": 0,
        "sql_error": ""
    }
    try:
        future_result = executor_instance.query_executor(sql_response, connection_string=sql_server_str) 
        result = future_result.result(timeout=SQL_TIMEOUT) 
        if len(result[0]) > 0:
            data_casted_datetime = cast_data_types(result[0]) 
            data_object = dict_to_markdown(data_casted_datetime) 
            table_result = result[0] 
            result_object["data_object"] = data_object 
            result_object["table_result"] = table_result  
        else:
            if session.get("lang", "es") == "en":
                data_object = "No records found."
            else:
                data_object = "No se encontraron registros."
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        result_object["sql_error"] = "[SqlError]: " + str(ex) 
    end_time = time.time() 
    result_object["total_time"] = (end_time - start_time) 
    return result_object 
    

@app_sql.route("/chatsql/chatsql", methods=["POST"])
def chatsql():
    try:
        sql_data_dictionary = ''
        sql_query_error = ''
        data = request.get_json() 
        id_user = session.get("id_user") 
        question = data["question"] 
        openai_object = data["openai_object"] 
        sql_system_prompt = data["sql_system_prompt"] 
        id_table = data["id_table"] 
        full_table_name = str(data["source_table"])  
        sql_server_table = data["sql_server"] 
        schema_name = full_table_name.split(".")[0] 
        table_name = full_table_name.split(".")[1] 
        list_openai_model = str(data["list_openai_model"])  
        openai_object["openai_type"] = list_openai_model.split("|")[0]   
        openai_object["list_model"] = list_openai_model.split("|")[1]   
        group_id = id_guid() 
        
        save_chat_history(group_id=group_id, 
            conversation=question, 
            id_user=id_user, 
            type_chat="Sql", 
            type_conversation="Question") 
        sql_data_dictionary = get_data_dictionary(id_table) 
        
        sql_server_str = secret_store.get_secret(sql_server_table)
        #sql_server_str = SecretClient(vault_url=KEYVAULT_URL, credential=credentials, logging_enable=False).get_secret(sql_server_table, logging_enable=False).value
        #sql_server_str="DRIVER={ODBC Driver 17 for SQL Server};SERVER=usaeu2velman-dev-sql.database.windows.net;DATABASE=GIGVELKPIDB;UID=velmanadm;PWD=usaeu2catA#!@733;"
        #sql_server_str="DRIVER={ODBC Driver 17 for SQL Server};SERVER=usaeu2velman-prod-sql.database.windows.net;DATABASE=USAEU2VELMAN-PROD-sqldb;UID=velmanadm;PWD=6XBhhpXRpGIIkCQRYy8L;"
        
        response = get_results_query(sql_server_str, openai_object, sql_system_prompt, sql_data_dictionary, question, schema_name, table_name)
        if response["sql_error"] != "":
            sql_query_error = response["sql_query"] 
            raise Exception(response["sql_error"]) 
        info_usage = response["info_usage"] 
        sql_query = str(response["sql_query"]).strip() 
        table_markdown = response["data_object"] 
        total_time = float(response["total_time"]) 
        table_result = response["table_result"] 
        column_keys = []
        if len(table_result) > 0:
            column_keys = list(table_result[0].keys())

        sql_query_markdown = (
            f"##### **Sql Query**\n"
            f"```sql\n"
            f"{sql_query}\n"
            f"```\n"
            f"---"
        )
        
        usage_summary_markdown = (
            f"---\n"
            f"##### **Usage Summary**\n"
            f"Input tokens used (System and user prompts): **{info_usage['total_input_tokens']}**\n"
            f"Output tokens used (Query Response): **{info_usage['total_output_tokens']}**\n"
            f"Total cost: **${info_usage['total_cost']}**\n"
            f"Total time: **{'{0:.5f}'.format(total_time)}**\n"
            f"---"
        )

        answer_detail_markdown = f"""{sql_query_markdown}\n\n{table_markdown}\n\n{usage_summary_markdown}"""
        
        #answer_detail = f"##### **Sql Query**\n```{sql_query}```\n\n" + "{{table_result}}" + "\n\n</br>" + info_usage["total_input_tokens"] + "</br>" + info_usage["total_output_tokens"] + "</br>" + info_usage["total_tokens"] + "</br>" + info_usage["total_cost"] + "</br>" + "Total time: " + '{0:.5f}'.format(total_time) 

        save_chat_history(group_id=group_id, 
              conversation=table_markdown, 
              conversation_detail=answer_detail_markdown, 
              id_user=id_user, 
              type_chat="Sql", 
              type_conversation="Answer") 
        
        #column_order = "" 
        #if len(table_result) > 0:
        #    column_order = '|'.join(table_result[0].keys())   
        
        return {
            'sql_query_markdown': sql_query_markdown, 
            'table_markdown': table_markdown,
            'usage_summary_markdown': usage_summary_markdown,
            'thought': question,
            'column_keys': column_keys,
            'sql_server': sql_server_table,
            'sql_query': sql_query
        }, 200
    except (ConnectionResetError, socket.error) as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        # Handle client disconnection
        print("Client disconnected:", str(ex))
        return str(ex), 499  # Use a custom status code to indicate a client disconnect
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex), "sql_query_error": sql_query_error}, 500

def client_connected():
    # This returns True if the client is still connected, False otherwise
    return not request.environ.get('werkzeug.request_shutdown', False)





@app_sql.route("/chatsql/chatgpt", methods=["POST"])
def chatgpt():
    data = request.get_json()
    gpt_messages = list(data["gpt_messages"])
    openai_object = data["openai_object"]
    list_openai_model = str(data["list_openai_model"])  
    openai_object["openai_type"] = list_openai_model.split("|")[0]   
    openai_object["list_model"] = list_openai_model.split("|")[1]   
    id_user = session.get("id_user")
    return Response(event_stream_gpt(id_user, openai_object, gpt_messages), mimetype='text/event-stream')


def event_stream_gpt(id_user, openai_object, gpt_messages):
    try:
        group_id = id_guid()
        content_question = gpt_messages[-1]['content']
        save_chat_history(group_id=group_id, 
                  conversation=content_question, 
                  id_user=id_user, 
                  type_chat="Gpt", 
                  type_conversation="Question")
        #save_frequent_questions(question=content_question, chat_type='Sql')
        answer = ''
        openai_object["messages"] = gpt_messages
        with openai_chatcompletion(**openai_object) as response:
            if (openai_object["openai_type"] == "open_ai" and openai_object["openai_stream"] == False) or (openai_object["openai_type"] == "azure" and openai_object["azure_openai_stream"] == False):
                text = response.choices[0].message.content 
                answer += text 
                if len(text): 
                    yield text 
            else:
                for line in response:
                    if len(line.choices) > 0:
                        text = (line.choices[0].delta.content or "") 
                        answer += text 
                        if len(text): 
                            yield text 
        save_chat_history(group_id=group_id, 
                  conversation=answer, 
                  id_user=id_user, 
                  type_chat="Gpt",
                  type_conversation="Answer")
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        yield ("Error: " + str(ex)) 




@app_sql.route("/chatsql/LoadDataDictionary", methods=["POST"]) 
def LoadDataDictionary():
    try:
        data = request.get_json() 
        id_table = data["id_table"] 
        data_dictionary = get_data_dictionary(id_table)
        return data_dictionary 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 

@app_sql.route("/chatsql/GetTablesFromDatabase", methods=["POST"]) 
def GetTablesFromDatabase():
    try:
        data = request.get_json() 
        sql_server_connection = data["sql_server_connection"] 
        query = f"""
            SELECT TABLE_SCHEMA, TABLE_NAME, TABLE_TYPE
            FROM INFORMATION_SCHEMA.TABLES
            WHERE TABLE_TYPE IN ('BASE TABLE', 'VIEW')
            ORDER BY TABLE_TYPE ASC, TABLE_SCHEMA ASC, TABLE_NAME ASC;
        """ 
        sql_server_str = secret_store.get_secret(sql_server_connection)
        #sql_server_str = SecretClient(vault_url=KEYVAULT_URL, credential=credentials, logging_enable=False).get_secret(sql_server_connection, logging_enable=False).value
        
        #sql_server_str="DRIVER={ODBC Driver 17 for SQL Server};SERVER=usaeu2velman-dev-sql.database.windows.net;DATABASE=GIGVELKPIDB;UID=velmanadm;PWD=usaeu2catA#!@733;"
        #sql_server_str="DRIVER={ODBC Driver 17 for SQL Server};SERVER=usaeu2velman-prod-sql.database.windows.net;DATABASE=USAEU2VELMAN-PROD-sqldb;UID=velmanadm;PWD=6XBhhpXRpGIIkCQRYy8L;"

        future_result = executor_instance.query_executor(query, connection_string=sql_server_str) 
        result = future_result.result(timeout=SQL_TIMEOUT) 
        data_object = result[0] 
        return data_object 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 



@app_sql.route("/chatsql/SqlExecuteTable", methods=["POST"]) 
def SqlExecuteTable():
    try:
        data = request.get_json() 
        sql_server_connection = data["sql_server_connection"] 
        sql_table_option = data["sql_table_option"] 
        sql_input_query = f"SELECT TOP 100 * FROM {sql_table_option}"
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




@app_sql.route("/chatsql/RefreshSqlDatabaseTable", methods=["GET"]) 
def RefreshSqlDatabaseTable():
    try:
        query = f"""
        SELECT 
             st.[id]
            ,ss.[id] as [id_secret]
            ,ss.[secrets]
            ,ss.[database_description]
            ,st.[source_table]
            ,st.[table_name]
            ,st.[table_description]
            ,st.[table_group]
        FROM [mbot].[sql_tables] st
        LEFT JOIN [mbot].[sql_secrets] ss
        ON ss.[id] = st.[id_secrets] 
        WHERE st.chat_type = 'Sql' AND st.object_type IN ('Table', 'View') AND st.[deleted_at] IS NULL;
        """
        future_result = executor_instance.query_executor(query=query) 
        result = future_result.result(timeout=SQL_TIMEOUT) 
        return result[0]   
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 




@app_sql.route("/chatsql/UpdateSqlDatabaseTable", methods=["POST"])
def UpdateSqlDatabaseTable():
    try: 
        data = request.get_json() 
        object_id = str(data["object_id"]) 
        sql_server_table = str(data["sql_server_table"]) 
        sql_source_table = str(data["sql_source_table"]) 
        sql_table_name = str(data["sql_table_name"]) 
        sql_table_group = str(data["sql_table_group"]) 
        sql_table_description = str(data["sql_table_description"]) 
        query = f"""
            EXECUTE [{SQL_SCHEMA}].[sp_UpdateSqlTable] 
            @object_id={object_id}, 
            @sql_server_table='{sql_server_table}', 
            @sql_source_table='{sql_source_table}', 
            @sql_table_name='{sql_table_name}', 
            @sql_table_group='{sql_table_group}',
            @sql_table_description=N'{sql_table_description.replace("'", "''")}';
        """ 
        executor_instance.query_executor(query, commit=True).result(timeout=SQL_TIMEOUT)  
        time.sleep(1)
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

@app_sql.route("/chatsql/DeleteSqlDatabaseTable", methods=["POST"])
def DeleteSqlDatabaseTable():
    try: 
        data = request.get_json() 
        object_id = str(data["object_id"]) 
        query = ("UPDATE [" + SQL_SCHEMA + "].[sql_tables] " +  
                    "SET [deleted_at] = GETDATE() " + 
                    "WHERE [id] = " + object_id + "; ") 
        executor_instance.query_executor(query, commit=True).result(timeout=SQL_TIMEOUT)  
        time.sleep(1) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 



@app_sql.route("/chatsql/SaveSqlDatabaseTable", methods=["POST"])
def SaveSqlDatabaseTable():
    try: 
        data = request.get_json() 
        sql_server_connection = str(data["sql_server_connection"]) 
        sql_table_option = str(data["sql_table_option"]) 
        sql_table_name = str(data["sql_table_name"]) 
        sql_source_table = sql_table_option.split('|')[0] 
        object_type = ('Table' if sql_table_option.split('|')[1] == 'BASE TABLE' else 'View') 
        sql_table_description = str(data["sql_table_description"]) 
        sql_table_group = str(data["sql_table_group"]) 
        query = f"""
        EXECUTE [{SQL_SCHEMA}].[sp_save_sqldatabase] '{sql_source_table}', '{sql_table_name}', '{sql_table_description}', '{sql_table_group}','{sql_server_connection}', '{object_type}';
        """ 
        executor_instance.query_executor(query, commit=True).result(timeout=SQL_TIMEOUT) 
        time.sleep(1) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 







@app_sql.route("/chatsql/GetSqlTablesNames", methods=["GET"]) 
def GetSqlTablesNames():
    try:
        query = f"""
        SELECT 
            st.id, 
            ss.secrets, 
            st.source_table, 
            st.table_name, 
            st.table_group, 
            ss.database_description, 
            st.table_description, 
            st.last_data_updated 
        FROM [{SQL_SCHEMA}].[sql_secrets] ss 
        INNER JOIN [{SQL_SCHEMA}].[sql_tables] st 
        ON ss.id = st.id_secrets
        WHERE  st.[chat_type] = 'Sql' AND st.[object_type] IN ('Table', 'View') AND st.[deleted_at] IS NULL  
        ORDER BY st.table_group ASC, st.table_name ASC;
        """
        future_result = executor_instance.query_executor(query=query) 
        result = future_result.result(timeout=SQL_TIMEOUT) 
        return result[0]   
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 



@app_sql.route("/chatsql/GetListFrequentQuestions", methods=["POST"]) 
def GetListFrequentQuestions():
    try:
        data = request.get_json() 
        id_table = str(data["id_table"])
        query = f"""
        SELECT 
            (CASE WHEN COUNT(*) = 1 THEN MAX(fa.id_faqs) ELSE '' END) AS id_faqs, 
            fa.question, 
            ta.source_table, 
            COUNT(*) AS frequency 
        FROM [{SQL_SCHEMA}].[sql_faqs] fa 
        LEFT JOIN [{SQL_SCHEMA}].[sql_tables] ta 
        ON ta.id = fa.id_table 
        WHERE fa.[id_table] = {id_table} AND fa.[deleted_at] IS NULL AND ta.[deleted_at] IS NULL  
        GROUP BY fa.question, ta.source_table 
        ORDER BY frequency DESC; 
        """
        future_result = executor_instance.query_executor(query=query) 
        result = future_result.result(timeout=SQL_TIMEOUT) 
        return result[0]   
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 


@app_sql.route("/chatsql/GetRecentHistoryConversations", methods=["GET"]) 
def GetRecentHistoryConversations():
    try:
        id_user = session.get("id_user")
        query = f"EXEC [mbot].[sp_GetRecentHistoryConversations] @id_user = '{id_user}';"
        future_result = executor_instance.query_executor(query=query) 
        result = future_result.result(timeout=SQL_TIMEOUT) 
        return result[0], 200   
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 
    
@app_sql.route("/chatsql/SearchHistoryConversations", methods=["POST"]) 
def SearchHistoryConversations():
    try:
        data = request.get_json() 
        id_user = session.get("id_user")
        history_search_input = str(data["history_search_input"])
        query = f"EXEC [mbot].[sp_SearchHistoryConversations] @id_user = '{id_user}', @search_conversation = N'{history_search_input}';"
        future_result = executor_instance.query_executor(query=query) 
        result = future_result.result(timeout=SQL_TIMEOUT) 
        return result[0], 200   
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 



@app_sql.route("/chatsql/UpdateQuestionContent", methods=["POST"])
def UpdateQuestionContent():
    try: 
        data = request.get_json() 
        id_faqs = str(data["id_faqs"]) 
        new_question = str(data["new_question"]) 
        query = f"""
            UPDATE [{SQL_SCHEMA}].[sql_faqs]
            SET [question] = '{new_question}' 
            WHERE [id_faqs] = '{id_faqs}' AND [deleted_at] IS NULL;  
        """ 
        executor_instance.query_executor(query, commit=True).result(timeout=SQL_TIMEOUT)  
        time.sleep(1) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

@app_sql.route("/chatsql/DeleteQuestionContent", methods=["POST"])
def DeleteQuestionContent():
    try: 
        data = request.get_json() 
        id_faqs = str(data["id_faqs"]) 
        query = f"""
            UPDATE [{SQL_SCHEMA}].[sql_faqs]
            SET [deleted_at] = GETDATE() 
            WHERE [id_faqs] = '{id_faqs}';   
        """ 
        executor_instance.query_executor(query, commit=True).result(timeout=SQL_TIMEOUT)  
        time.sleep(1) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 








@app_sql.route("/chatsql/SaveUserQuestion", methods=["POST"])
def SaveUserQuestion():
    try: 
        data = request.get_json() 
        id_message = str(data["id_message"]) 
        user_question = str(data["user_question"]) 
        question_saved = int(data["question_saved"]) 
        id_table = str(data["id_table"])  

        query_deleted = ''
        if question_saved == 1:
            query_deleted = 'GETDATE()'
        else:
            query_deleted = 'NULL' 

        full_query = f"""
            MERGE INTO [{SQL_SCHEMA}].[sql_faqs] AS target
            USING ( VALUES 
                ('{id_message}', {query_deleted}) 
            ) AS source ([id_faqs], [deleted_at]) 
            ON target.[id_faqs] = source.[id_faqs]
            WHEN MATCHED THEN 
                UPDATE SET 
                    target.[deleted_at] = source.[deleted_at]
            WHEN NOT MATCHED BY TARGET THEN
                INSERT ([id_faqs], [question], [chat_type], [id_table], [created_at], [deleted_at])
                VALUES (source.[id_faqs], '{user_question.replace("'", "''")}', 'Sql', {id_table}, GETDATE(), NULL); 
        """ 
        executor_instance.query_executor(full_query, commit=True).result(timeout=SQL_TIMEOUT)  
        time.sleep(1) 
        return 'OK' 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 





























@app_sql.route("/chatsql/SaveMainSetting", methods=["POST"]) 
def SaveMainSetting():
    try:
        data = request.get_json() 
        id_user = session.get("id_user") 
        sql_system_prompt = str(data["sql_system_prompt"]) 
        language = str(data["language"]) 
        openai_object = dict(data["openai_object"]) 
        main_config_query = ''
        if language == 'es':
            messages = []
            messages.append({"role": "user", "content": "Porfavor tradúceme a inglés: " + sql_system_prompt})
            openai_object["messages"] = messages 
            openai_object["openai_stream"] = False 
            openai_object["azure_openai_stream"] = False 
            with openai_chatcompletion(**openai_object) as assistant_response:
                sql_system_response_en = str(assistant_response.choices[0].message.content) 
            main_config_query = f"""
            EXEC [{SQL_SCHEMA}].[sp_UpdateAppUserChatSQLConfig]
                @sql_system_prompt = N'{sql_system_response_en.replace("'", "''")}',
                @sql_system_prompt_es = N'{sql_system_prompt.replace("'", "''")}',
                @id_user = '{id_user}';
            """ 
        if language == 'en':
            messages = []
            messages.append({"role": "user", "content": "Please translate to spanish: " + sql_system_prompt})
            openai_object["messages"] = messages 
            openai_object["openai_stream"] = False 
            openai_object["azure_openai_stream"] = False 
            with openai_chatcompletion(**openai_object) as assistant_response:
                sql_system_response_es = str(assistant_response.choices[0].message.content) 
            main_config_query = f"""
            EXEC [{SQL_SCHEMA}].[sp_UpdateAppUserChatSQLConfig]
                @sql_system_prompt = N'{sql_system_prompt.replace("'", "''")}',
                @sql_system_prompt_es = N'{sql_system_response_es.replace("'", "''")}',
                @id_user = '{id_user}';
            """ 
        
        executor_instance.query_executor(main_config_query, commit=True).result(timeout=SQL_TIMEOUT) 
        return {'result': 'OK'}
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)} 

@app_sql.route("/chatsql/SaveOpenAISetting", methods=["POST"]) 
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
        chat_type = "chatsql"
        
        openai_config_query = f"""EXECUTE [{SQL_SCHEMA}].[sp_update_openai]  
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
        executor_instance.query_executor(openai_config_query, commit=True).result(timeout=SQL_TIMEOUT) 
        return {'result': 'OK'}
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'code_error': str(ex)}



