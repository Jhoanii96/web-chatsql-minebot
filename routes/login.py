import pandas as pd 
import socket
import uuid 
import identity.web 
import inspect
from datetime import datetime
from classes.password_manager import BCrypt 
from flask import Flask, request, Blueprint, render_template, redirect, url_for, session 
from classes.sqlconnection import QueryExecutor
from routes.mainscript import save_system_error_log  
from environment import SQL_TIMEOUT, SQL_SCHEMA, VERSION
from environment import AD_CLIENT_ID, AD_CLIENT_SECRET, AD_AUTHORITY, AD_REDIRECT_PATH, AD_SCOPE, AUTHENTICATE_WITH_AZURE  

app = Flask(__name__)
app_login = Blueprint('app_login', __name__, template_folder='templates')
password_bcrypt = BCrypt()
executor_instance = QueryExecutor() 

if AUTHENTICATE_WITH_AZURE == 1:
    auth = identity.web.Auth(
        session=session,
        authority=AD_AUTHORITY,
        client_id=AD_CLIENT_ID,
        client_credential=AD_CLIENT_SECRET,
    )

@app_login.route('/login')
def login():
    try:
        if AUTHENTICATE_WITH_AZURE == 1:
            flow = auth.log_in(
                scopes=AD_SCOPE, 
                redirect_uri=url_for("app_login.auth_response", _external=True), 
                prompt="select_account",  
            )
            auth_uri = flow['auth_uri']
        else:
            auth_uri = ""
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        return render_template("exception_error.html", result=str(ex))
    return render_template(
        'login.html',
        title='Login',
        version=VERSION,
        current_year=datetime.now().year,
        AUTHENTICATE_WITH_AZURE=AUTHENTICATE_WITH_AZURE,
        auth_uri=auth_uri,
        theme=session.get('theme', 'skin-white'), 
        message=''
    )

@app_login.route(AD_REDIRECT_PATH)
def auth_response():
    try:
        result = auth.complete_log_in(request.args)
        if "error" in result:
            return render_template("auth_error.html", result=result)
        email = result['preferred_username']
        user_name = result['name']
        id_user = result['oid']
        query = f"""
            EXECUTE [{SQL_SCHEMA}].[sp_save_new_user] '{id_user}', '{email}', '{user_name}';
        """
        executor_instance.query_executor(query, commit=True).result()  
        session["id_session"] = str(uuid.uuid4())
        session["user"] = result['preferred_username']
        session["id_user"] = result['oid']
        session["is_azure"] = 1 
        user_activity_log() 
        return redirect("/")
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        return render_template("exception_error.html", result=str(ex))

@app_login.route('/logout')
def logout():
    is_azure = session.get("is_azure")
    if is_azure == 1:
        session.pop("id_session", None)
        session.pop("user", None)
        session.pop("id_user", None)
        session.pop("is_azure", None)
        return redirect(auth.log_out(url_for("index", _external=True)))
    else:
        session.pop("id_session", None)
        session.pop("user", None)
        session.pop("id_user", None)
        session.pop("is_azure", None)
        return redirect("/login")

@app_login.route('/keepalive', methods=['POST'])
def set_offline():
    user = session.get('user')
    if user:
        keepalive_activity_log() 
    #SELECT * FROM [mbot].[v_user_online_status]
    return '', 204

@app_login.route('/set-online', methods=['POST'])
def set_online():
    user = session.get('user')
    if user:
        user_activity_log()
    return '', 204


@app_login.route('/login/verifyaccount', methods=['GET', 'POST'])
def verifyaccount():
    """Render page."""
    try:
        data = request.get_json() 
        acc = str(data["acc"]) 
        query = f"""
            SELECT TOP 1 
                [email], 
                [new_password] 
            FROM [{SQL_SCHEMA}].[user_data] 
            WHERE [email] = '{acc}' AND [deleted_at] IS NULL;
        """
        future_result = executor_instance.query_executor(query) 
        result = future_result.result() 
        data_df = result[0] 
        return {'result': data_df} 
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        return {'code_error': str(ex)} 
    
@app_login.route('/login/registerpasswordaccount', methods=['GET', 'POST'])
def registerpasswordaccount():
    """Renders the page."""
    try:
        data = request.get_json() 
        account = str(data["acc"]) 
        password = password_bcrypt.hash_password(str(data["pass"])) 
        query = f"""
        UPDATE [{SQL_SCHEMA}].[user_data]
		SET  [password] = '{password}'
			,[new_password] = 0
		WHERE [email] = '{account}' AND [new_password] = 1 AND [deleted_at] IS NULL;"""
        executor_instance.query_executor(query, commit=True).result()  
        return {'result': "OK"} 
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        return {'code_error': str(ex)} 
    
@app_login.route('/login/signin', methods=['GET', 'POST'])
def signin():
    """Renders the page."""
    try:
        data = request.get_json() 
        account = str(data["acc"]) 
        password = str(data["pass"]) 
        query = f"""
            SELECT [id_user], [email], [password] FROM [{SQL_SCHEMA}].[user_data] WHERE [email] = '{account}' AND [deleted_at] IS NULL;
        """
        future_result = executor_instance.query_executor(query) 
        result = future_result.result() 
        data_df = result[0] 
        if len(data_df) > 0: 
            if password_bcrypt.check_password(password, data_df[0]['password']):
                session["id_session"] = str(uuid.uuid4())
                session["user"] = data_df[0]['email']
                session["id_user"] = data_df[0]['id_user']
                session["is_azure"] = 0 
                user_activity_log() 
                return {'result': 1} 
            else:
                return {'result': 0} 
        else:
            return {'result': 0} 
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        return {'code_error': str(ex)} 


def user_activity_log():
    try:
        # Capture login details 
        id_session = session.get("id_session") 
        if not id_session:
            id_session = str(session.get("id_session")) 
        id_user = str(session.get("id_user")) 
        full_query = f"""
            MERGE INTO [{SQL_SCHEMA}].[user_activity_log] AS target
            USING (VALUES
                    ('{id_session}', '{id_user}', GETDATE())
                ) AS source ([id_session], [id_user], [login_time])
            ON target.[id_session] = source.[id_session] AND target.[id_user] = source.[id_user]
            WHEN MATCHED THEN 
                UPDATE SET 
                    target.[last_session_time] = GETDATE() 
            WHEN NOT MATCHED THEN
                INSERT ([id_session], [id_user], [login_time], [last_session_time])
                VALUES (source.[id_session], source.[id_user], source.[login_time], GETDATE());
        """
        executor_instance.query_executor(full_query, commit=True)
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 



def keepalive_activity_log():
    try:
        # Capture login details 
        id_session = str(session.get("id_session")) 
        id_user = str(session.get("id_user")) 
        full_query = f"""
            UPDATE [{SQL_SCHEMA}].[user_activity_log]
            SET [last_session_time] = GETDATE() 
            WHERE [id_session] = '{id_session}' AND [id_user] = '{id_user}'  
        """
        executor_instance.query_executor(full_query, commit=True)
    except Exception as ex: 
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex)) 

