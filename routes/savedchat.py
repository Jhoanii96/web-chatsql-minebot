import inspect 
from flask import request, Blueprint, session 
from routes.mainscript import save_system_error_log 
from classes.sqlconnection import QueryExecutor 
from environment import SQL_TIMEOUT, SQL_SCHEMA 

app_saved = Blueprint('app_saved', __name__, template_folder='templates') 
executor_instance = QueryExecutor()

@app_saved.route('/savedchat/LoadConversation', methods=['POST'])
def LoadConversation():
    """Renders the home page."""
    try:
        data = request.get_json() 
        id_user = session.get("id_user") 
        type_chat = data["type_chat"] 
        created_at = data["created_at"] 
        time_zone = data["time_zone"] 
        if created_at == "":
            query_date = "CAST([created_at] AS date) = (SELECT TOP 1 CAST([created_at] AS date) FROM [" + SQL_SCHEMA + "].[historical_chat] WHERE [id_user] = '" + id_user + "' AND [type_chat] = '" + type_chat + "' ORDER BY [created_at] DESC)"
        else:
            query_date = "CAST(DATEADD(MINUTE, " + str(time_zone) + ", [created_at]) AS DATE) = CAST('" + created_at + "' AS date)"
        query = f""" 
            SELECT 
	            [conversation] 
               ,[conversation_detail] 
               ,[created_at] 
               ,[type_conversation] 
            FROM [{SQL_SCHEMA}].[historical_chat] 
            WHERE [id_user] = '{id_user}' AND [type_chat] = '{type_chat}' 
            AND {query_date} 
            ORDER BY [created_at] ASC 
        """
        future_result = executor_instance.query_executor(query) 
        result = future_result.result() 
        data_object = result[0] 
        return {'result': data_object}
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        return {'error': str(ex)}



@app_saved.route('/savedchat/LoadDates', methods=['POST'])
def LoadDates():
    """Renders the home page."""
    try:
        data = request.get_json() 
        id_user = session.get("id_user")  
        type_chat = data["type_chat"] 
        query = f"""
            SELECT DISTINCT 
	             [created_at]  
            FROM [{SQL_SCHEMA}].[historical_chat] 
            WHERE [id_user] = '{id_user}' AND [type_chat] = '{type_chat}' 
            ORDER BY [created_at] ASC 
        """
        future_result = executor_instance.query_executor(query) 
        result = future_result.result() 
        data_object = result[0] 
        return {'result': data_object}
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        return {'error': str(ex)}


@app_saved.route('/savedchat/LoadUsers', methods=['GET'])
def LoadUsers():
    """Renders the home page."""
    try:
        query = f"""SELECT [id], [user_name] FROM [{SQL_SCHEMA}].[user_data] WHERE [deleted_at] IS NULL ORDER BY [id_role] ASC;"""
        future_result = executor_instance.query_executor(query) 
        result = future_result.result() 
        data_object = result[0] 
        return {'result': data_object} 
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        return {'error': str(ex)}