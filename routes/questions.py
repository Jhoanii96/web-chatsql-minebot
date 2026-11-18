import time 
import inspect
from flask import request, Blueprint, session, Response 
from routes.mainscript import save_system_error_log
from environment import SQL_TIMEOUT, SQL_SERVER_STR, SQL_SCHEMA, KEYVAULT_URL   
from classes.sqlconnection import QueryExecutor 

app_questions = Blueprint('app_questions', __name__, template_folder='templates')
executor_instance = QueryExecutor() 

@app_questions.route("/questions/ReadFrequentQuestionsTable", methods=["POST"])
def ReadFrequentQuestionsTable():
    try: 
        data = request.get_json() 
        question_chat_type = str(data["question_chat_type"]) 
        id_table = str(data["id_table"]) 
        if question_chat_type == "Sql":
            table_condition = f"fa.id_table = {id_table} AND " 
        else:
            table_condition = "ta.source_table IS NOT NULL" 

        query = f"""
            SELECT 
                fa.[id_faqs] AS Id, 
                ta.[table_description] AS [Table_Description], 
                ta.[source_table] AS [Source_Table], 
                se.[database_description] AS [Database_Description], 
                fa.[question] AS [Question], 
                FORMAT(fa.[created_at], 'yyyy-MM-dd HH:mm:ss.fff') AS [Created_At] 
            FROM [{SQL_SCHEMA}].[sql_faqs] fa 
            LEFT JOIN [{SQL_SCHEMA}].[sql_tables] ta 
            ON ta.id = fa.id_table 
            LEFT JOIN [{SQL_SCHEMA}].[sql_secrets] se 
            ON se.id = ta.id_secrets 
            WHERE {table_condition} fa.[chat_type] = '{question_chat_type}' AND fa.[deleted_at] IS NULL AND ta.[deleted_at] IS NULL  
            ORDER BY fa.[created_at] DESC; 
        """
        future_result = executor_instance.query_executor(query) 
        result = future_result.result(timeout=SQL_TIMEOUT)  
        return result[0] 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 




@app_questions.route("/questions/SaveQuestions", methods=["POST"])
def save_phasetype():
    try: 
        data = request.get_json() 
        #id_user = session.get("id_user") 
        question_chat_type = str(data["question_chat_type"])
        id_table = str(data["id_table"]) 
        input_question = str(data["input_question"])
        save_frequent_questions(question=input_question, chat_type=question_chat_type, id_table=int(id_table))
        time.sleep(1) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 


@app_questions.route("/questions/UpdateFrequentQuestionsTable", methods=["POST"])
def UpdateFrequentQuestionsTable():
    try: 
        data = request.get_json() 
        id_row = str(data["id_row"]) 
        question = str(data["question"]) 
        query = ("UPDATE [" + SQL_SCHEMA + "].[sql_faqs] " +  
                    "SET [question] = N'" + (question).replace("'", "''") + "' " + 
                " WHERE [id_faqs] = '" + id_row + "';") 
        executor_instance.query_executor(query, commit=True).result(timeout=SQL_TIMEOUT)  
        time.sleep(1) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

@app_questions.route("/questions/DeleteFrequentQuestionsTable", methods=["POST"])
def DeleteFrequentQuestionsTable():
    try: 
        data = request.get_json() 
        id_row = str(data["id_row"]) 
        query = ("UPDATE [" + SQL_SCHEMA + "].[sql_faqs] " +  
                    "SET [deleted_at] = GETDATE() " + 
                    "WHERE [id_faqs] = '" + id_row + "'; ") 
        executor_instance.query_executor(query, commit=True).result(timeout=SQL_TIMEOUT)  
        time.sleep(1)
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 
    




def save_frequent_questions(question: str, chat_type: str, id_table: int = -1):
    query = f"""
        EXECUTE [{SQL_SCHEMA}].[sp_save_frequent_questions] N'{question}', N'{chat_type}', {id_table};
    """
    try:
        executor_instance.query_executor(query, commit=True).result(timeout=SQL_TIMEOUT) 
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        raise Exception(f"An error occurred: {ex}")


