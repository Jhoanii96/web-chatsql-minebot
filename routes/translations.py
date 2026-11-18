import inspect
from flask import request, Blueprint
from routes.mainscript import save_system_error_log  
from environment import SQL_TIMEOUT, SQL_SCHEMA 
from classes.sqlconnection import QueryExecutor 

app_translations = Blueprint('app_translations', __name__, template_folder='templates')
executor_instance = QueryExecutor() 

@app_translations.route("/translations/ReadTranslationsTable", methods=["GET"])
def ReadTranslationsTable():
    try: 
        query = f"""
            SELECT 
                [id] AS [id], 
                [translation_key] AS [key], 
                [language] AS [lang], 
                [translation] AS [name] 
            FROM [{SQL_SCHEMA}].[translations] 
            ORDER BY [translation_key] ASC; 
        """
        future_result = executor_instance.query_executor(query) 
        result = future_result.result(timeout=SQL_TIMEOUT)  
        return result[0] 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)}  


@app_translations.route("/translations/UpdateTranslationsTable", methods=["POST"])
def UpdateTranslationsTable():
    try: 
        data = request.get_json() 
        id_row = str(data["id_row"]) 
        translation = str(data["translation"]) 
        query = f"""
            UPDATE [{SQL_SCHEMA}].[translations]   
            SET [translation] = N'{translation.replace("'", "''")}'
            WHERE [id] = {id_row};
        """
        executor_instance.query_executor(query, commit=True).result(timeout=SQL_TIMEOUT) 
        return 'OK' 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

