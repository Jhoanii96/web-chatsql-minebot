import time 
import inspect 
from functions.tools import new_profile_color 
from flask import request, Blueprint, session 
from azure.identity import ManagedIdentityCredential  
from classes.sqlconnection import QueryExecutor 
from classes.password_manager import BCrypt 
from routes.mainscript import save_system_error_log 
from environment import SQL_TIMEOUT, SQL_SCHEMA  

app_user = Blueprint('app_user', __name__, template_folder='templates')
password_bcrypt = BCrypt()
executor_instance = QueryExecutor()  
credentials = ManagedIdentityCredential() 

@app_user.route("/user/ReadUserTable", methods=["GET"]) 
def ReadUserTable():
    try: 
        full_query = f"""
            SELECT [id_role], [role_name] 
            FROM [{SQL_SCHEMA}].[user_role] 
            WHERE [deleted_at] IS NULL ORDER BY [id] ASC; 

            SELECT [id_user], [email], [user_name], [last_name], [gender], 
            (CASE WHEN LEN([password]) > 0 THEN '•••••••••••••••' ELSE '' END) AS [password], 
            [id_role], [is_azure_user] 
            FROM [{SQL_SCHEMA}].[user_data] 
            WHERE [deleted_at] IS NULL; 
        """ 
        future_result = executor_instance.query_executor(full_query) 
        data_object = future_result.result() 
        return {'result': data_object} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

@app_user.route("/user/SaveUser", methods=["POST"])
def SaveUser():
    try: 
        data = request.get_json() 
        input_username = str(data["input_username"])
        input_lastname = str(data["input_lastname"])
        select_gender = str(data["select_gender"])
        input_email = str(data["input_email"])
        input_password = str(data["input_password"])
        select_role = str(data["select_role"]) 
        initial_name_color = new_profile_color(input_username) 
        initial_name = initial_name_color["initial_name"]
        profile_color = initial_name_color["color"]
        new_password = ('1' if input_password == '' else '0')
        password_hash = password_bcrypt.hash_password(input_password) 
        query = f"""
            DECLARE @id_user VARCHAR(50) = LOWER(NEWID());
            INSERT INTO [{SQL_SCHEMA}].[user_data]
                ([id_user]
                ,[email]
                ,[user_name]
                ,[last_name]
                ,[gender]
                ,[created_at]
                ,[password]
                ,[new_password]
                ,[is_azure_user]
                ,[id_global_configuration]
                ,[id_role]
                ,[initial_name]
                ,[profile_color]
                ,[updated_at])
            VALUES
                (@id_user
                ,'{input_email}'
                ,'{input_username}'
                ,'{input_lastname}'
                ,{select_gender}
                ,GETDATE()
                ,'{password_hash}'
                ,{new_password}
                ,0
                ,1
                ,'{select_role}'
                ,'{initial_name}'
                ,'{profile_color}'
                ,GETDATE());

            INSERT [{SQL_SCHEMA}].[app_user_openai_configuration] ([id_user], [chat_type]) VALUES (@id_user, N'chatsql');
            INSERT [{SQL_SCHEMA}].[app_user_openai_configuration] ([id_user], [chat_type]) VALUES (@id_user, N'chatflow');
            INSERT [{SQL_SCHEMA}].[app_user_openai_configuration] ([id_user], [chat_type]) VALUES (@id_user, N'dictionary');
        """ 
        executor_instance.query_executor(query, commit=True).result()  
        time.sleep(1)
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

@app_user.route("/user/UpdateUser", methods=["POST"])
def UpdateUser():
    try: 
        data = request.get_json() 
        id_user_guid = str(data["id_user_guid"]) 
        username_value = str(data["username_value"])
        lastname_value = str(data["lastname_value"])
        option_gender_value = str(data["option_gender_value"])
        email_value = str(data["email_value"])
        password_value = str(data["password_value"])
        role_select_value = str(data["role_select_value"]) 
        initial_name_color = new_profile_color(username_value) 
        initial_name = initial_name_color["initial_name"] 
        profile_color = initial_name_color["color"] 
        new_password = ('1' if password_value == '' else '0') 
        is_azure = session.get("is_azure") 
        if is_azure == 1:
            query = ("UPDATE [" + SQL_SCHEMA + "].[user_data] " +  
                        "SET [user_name] = '" + username_value + "' " + 
                        " ,[last_name] = '" + lastname_value + "' " + 
                        " ,[gender] = " + option_gender_value + " " + 
                        " ,[id_role] = '" + role_select_value + "' " + 
                        " ,[initial_name] = '" + initial_name + "' " + 
                        " ,[profile_color] = '" + profile_color + "' " + 
                        " ,[updated_at] = GETDATE() " + 
                    " WHERE [id_user] = '" + id_user_guid + "';") 
        else:
            query = ("UPDATE [" + SQL_SCHEMA + "].[user_data] " + 
                        "SET [email] = '" + email_value + "' " + 
                        " ,[user_name] = '" + username_value + "' " + 
                        " ,[last_name] = '" + lastname_value + "' " + 
                        " ,[gender] = " + option_gender_value + " " + 
                        " ,[new_password] = " + new_password + " " + 
                        " ,[id_role] = '" + role_select_value + "' " + 
                        " ,[initial_name] = '" + initial_name + "' " + 
                        " ,[profile_color] = '" + profile_color + "' " + 
                        " ,[updated_at] = GETDATE() " + 
                    " WHERE [id_user] = '" + id_user_guid + "';") 
        executor_instance.query_executor(query, commit=True).result()  
        time.sleep(1)
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

@app_user.route("/user/DeleteUser", methods=["POST"])
def DeleteUser():
    try: 
        data = request.get_json() 
        id_user = str(data["id_user"]) 
        query = ("UPDATE [" + SQL_SCHEMA + "].[user_data] " +  
                        "SET [deleted_at] = GETDATE() " + 
                        "WHERE [id_user] = '" + id_user + "'; ") 
        executor_instance.query_executor(query, commit=True).result()  
        time.sleep(1)
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 











@app_user.route("/user/SaveUserRole", methods=["POST"])
def SaveUserRole():
    try: 
        data = request.get_json() 
        role_name = str(data["role_name"])
        query = ("INSERT INTO [" + SQL_SCHEMA + "].[user_role] " +  
                    "([id_role],[role_name]) " + 
                    "VALUES " + 
                    "(LOWER(NEWID()), '" + role_name + "'); ") 
        executor_instance.query_executor(query, commit=True).result()  
        time.sleep(1)
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

@app_user.route("/user/UpdateUserRole", methods=["POST"])
def UpdateUserRole():
    try: 
        data = request.get_json() 
        id_role = str(data["id_role"]) 
        role_name = str(data["role_name"]) 
        role_name_en = str(data["role_name_en"]) 
        role_name_es = str(data["role_name_es"]) 
        query = f"""UPDATE [{SQL_SCHEMA}].[user_role]    
                    SET [role_name] = '{role_name}', 
                    [role_name_en] = '{role_name_en}', 
                    [role_name_es] = '{role_name_es}' 
                WHERE [id_role] = '{id_role}'; """ 
        executor_instance.query_executor(query, commit=True).result()  
        time.sleep(1)
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

@app_user.route("/user/DeleteUserRole", methods=["POST"])
def DeleteUserRole():
    try: 
        data = request.get_json() 
        id_role = str(data["id_role"]) 
        query = ("UPDATE [" + SQL_SCHEMA + "].[user_role] " +  
                    "SET [deleted_at] = GETDATE() " + 
                    "WHERE [id_role] = '" + id_role + "'; ") 
        executor_instance.query_executor(query, commit=True).result()  
        time.sleep(1) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

@app_user.route("/user/ReadUserRoleTable", methods=["GET"])
def ReadUserRoleTable():
    try: 
        query = f"""
        SELECT [id_role], [role_name], [role_name_en], [role_name_es] 
        FROM [{SQL_SCHEMA}].[user_role] 
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









@app_user.route("/user/SaveModule", methods=["POST"])
def SaveModule():
    try: 
        data = request.get_json() 
        module_name = str(data["module_name"])
        query = ("INSERT INTO [" + SQL_SCHEMA + "].[module] " +  
                    "([id_module],[module_name],[status]) " + 
                    "VALUES " + 
                    "(LOWER(NEWID()), '" + module_name + "', 1); ") 
        executor_instance.query_executor(query, commit=True).result()  
        time.sleep(1)
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 
    
@app_user.route("/user/UpdateModule", methods=["POST"])
def UpdateModule():
    try: 
        data = request.get_json() 
        id_module = str(data["id_module"]) 
        module_name = str(data["module_name"]) 
        status = str(data["status"]) 
        query = ("UPDATE [" + SQL_SCHEMA + "].[module] " +  
                    "SET [module_name] = '" + module_name + "' " + 
                    " ,[status] = " + status + " " + 
                " WHERE [id_module] = '" + id_module + "';") 
        executor_instance.query_executor(query, commit=True).result()  
        time.sleep(1)
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

@app_user.route("/user/DeleteModule", methods=["POST"])
def DeleteModule():
    try: 
        data = request.get_json() 
        id_module = str(data["id_module"]) 
        query = ("UPDATE [" + SQL_SCHEMA + "].[module] " +  
                    "SET [deleted_at] = GETDATE() " + 
                    "WHERE [id_module] = '" + id_module + "'; ") 
        executor_instance.query_executor(query, commit=True).result()  
        time.sleep(1) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 

@app_user.route("/user/ReadModuleTable", methods=["GET"])
def ReadModuleTable():
    try: 
        query = f"""
            SELECT [id_module]
                ,[module_name]
                ,[status]
            FROM [{SQL_SCHEMA}].[module] 
            WHERE [deleted_at] IS NULL; 
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










@app_user.route("/user/ReadPermissions", methods=["POST"])
def ReadPermissions():
    try: 
        data = request.get_json() 
        id_role = str(data["id_role"]) 
        query = f"""
            SELECT mo.[id_module] 
                ,mo.[module_name] 
                ,ISNULL(pe.[id_role], '') AS [id_role] 
                ,pe.[actived]  
            FROM [{SQL_SCHEMA}].[module] mo 
            LEFT JOIN [{SQL_SCHEMA}].[permission] pe 
            ON mo.id_module = pe.id_module AND pe.[id_role] = '{id_role}' 
            WHERE mo.[status] = 1 AND mo.[deleted_at] IS NULL; 
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

@app_user.route("/user/UpdatePermissions", methods=["POST"])
def UpdatePermissions():
    try: 
        data = request.get_json() 
        id_role = str(data["id_role"]) 
        permissions = dict(data["permissions"])  
        for key, value in permissions.items():
            if value == True:
                data_query = ("execute [" + SQL_SCHEMA + "].[sp_update_permissions] " +  
                        "'" + key + "', " +  
                        "1, " + 
                        "'" + id_role + "'; ") 
            else:
                data_query = ("execute [" + SQL_SCHEMA + "].[sp_update_permissions] " +  
                        "'" + key + "', " +  
                        "0, " + 
                        "'" + id_role + "'; ") 
            executor_instance.query_executor(data_query, commit=True).result()  
            time.sleep(1) 
        return {'result': 'OK'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 



@app_user.route("/user/UpdateFlowPermissions", methods=["POST"])
def UpdateFlowPermissions():
    try: 
        data = request.get_json() 
        id_role = str(data["id_role"]) 
        permissions = list(data["permissions"])  
        full_query = ""
        for row in permissions:
            id_flow = str(row['id_flow'])
            actived = str(row['actived'])
            full_query += f"('{id_role}', '{id_flow}', {actived}),\n"
        full_query = full_query.strip()[:-1] 

        data_query = f"""
            MERGE INTO [{SQL_SCHEMA}].[flow_permission] AS target
            USING (VALUES
                    {full_query}
                ) AS source ([id_role], [id_flow], [actived])
            ON target.[id_role] = source.[id_role] AND target.[id_flow] = source.[id_flow] 
            WHEN MATCHED THEN 
                UPDATE SET 
                    target.[actived] = source.[actived]  
            WHEN NOT MATCHED THEN
                INSERT ([id_role], [id_flow], [actived])
                VALUES (source.[id_role], source.[id_flow], source.[actived]);
        """ 
        executor_instance.query_executor(data_query, commit=True).result()  
        time.sleep(1) 
        return {'status': 'success'} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 






@app_user.route("/user/ReadFlowPermissions", methods=["POST"])
def ReadFlowPermissions():
    try: 
        data = request.get_json() 
        id_role = str(data["id_role"]) 
        query = f"""
            ;WITH Table_1 AS (
                SELECT 
                    [id],
                    [phase_category],
                    [phase_name]
                FROM 
                    (VALUES
                        ('11111111-1111-1111-1111-111111111111', 'New', 'New'),
                        ('22222222-2222-2222-2222-222222222222', 'Edit', 'Edit'),
                        ('33333333-3333-3333-3333-333333333333', 'Delete', 'Delete'),
                        ('44444444-4444-4444-4444-444444444444', 'Edit Table', 'Edit Table')
                    ) AS SimulatedTable([id], [phase_category], [phase_name]) 
                UNION ALL 
                SELECT 
                    cn.[id_chatsql_phase_name] AS [id] 
                    ,cc.[chatsql_phase_category] AS [phase_category]
                    ,cn.[chatsql_phase_name] AS [phase_name]
                FROM [{SQL_SCHEMA}].[chatsql_phase_name] cn 
                INNER JOIN [{SQL_SCHEMA}].[chatsql_phase_category] cc 
                ON cn.id_chatsql_phase_category = cc.id_chatsql_phase_category AND cc.deleted_at IS NULL 
                WHERE cn.[deleted_at] IS NULL 
            )
            SELECT 
                t1.[id] 
                ,t1.[phase_category]
                ,t1.[phase_name]
                ,ISNULL(pe.[actived], 0) AS [actived] 
            FROM Table_1 t1  
            LEFT JOIN [{SQL_SCHEMA}].[flow_permission] pe 
            ON t1.id = pe.id_flow AND pe.[id_role] = '{id_role}'; 
        """ 
        future_result = executor_instance.query_executor(query) 
        result = future_result.result() 
        data_object = result[0] 
        return data_object 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 












@app_user.route("/user/LoadUsers", methods=["GET"])
def LoadUsers():
    try: 
        query = """
            SELECT 
                ud.[id_user]
                ,ud.[email] as [user]
                ,ur.[role_name]
            FROM [bot].[user_data] ud
            LEFT JOIN [bot].[user_role] ur
            ON ud.id_role = ur.id_role
            WHERE ud.[deleted_at] IS NULL
            ORDER BY ud.[id] ASC; 
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
    

@app_user.route("/user/CopyUserDataset", methods=["POST"])
def CopyUserDataset():
    try: 
        data = request.get_json() 
        origin_user = str(data["origin_user"]) 
        destination_user = str(data["destination_user"]) 
        query = f"""
            EXECUTE [bot].[sp_copy_user_chateditor_dataset] '{origin_user}', '{destination_user}';
        """ 
        executor_instance.query_executor(query, commit=True).result()  
        return {'result': "OK"} 
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 
        return {'code_error': str(ex)} 
    


@app_user.route("/user/RefreshCopyHistoricalArea", methods=["GET"])
def RefreshCopyHistoricalArea():
    try: 
        query = """
            SELECT ud1.[user_name] as [user_origin], ud2.[user_name] as [user_destination], FORMAT(hc.[created_at], 'yyyy-MM-dd HH:mm:ss') AS [created_at]
            FROM [bot].[historical_copy] hc 
            LEFT JOIN [bot].[user_data] ud1 
            ON ud1.id_user = hc.[id_user_origin] 
            LEFT JOIN [bot].[user_data] ud2 
            ON ud2.id_user = hc.[id_user_destination] 
            ORDER BY hc.[id] ASC; 
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



