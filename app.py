"""
The flask application package.
"""
import inspect
from flask import Flask, render_template, redirect, url_for, jsonify, request, session, g
from typing import List, Optional 
#from flask_session import Session 
from sqlalchemy.exc import OperationalError, SQLAlchemyError
#from flask_sessionstore import Session 
from datetime import timedelta
from functions.authentication import requires_auth 
from azure.identity import DefaultAzureCredential, ManagedIdentityCredential 
from routes.chatsql import app_sql 
from routes.chatflow import app_flow 
from routes.documents import app_documents 
from routes.savedchat import app_saved
from routes.settings import app_settings
from routes.questions import app_questions
from routes.dictionary import app_dictionary 
from routes.user import app_user 
from routes.translations import app_translations 
from routes.mainscript import app_main, get_configuration, save_system_error_log 
from routes.login import app_login 
from functions.openai import get_azure_api_versions, get_azure_list_models, get_openai_list_models 
from classes.translation import TranslationManager 
# For session code
from functions.tools import odbc_to_sqlalchemy_url 
# Environment
from environment import FLASK_SECRET_KEY, WEB_APP_VERSION, SQL_SCHEMA, AZURE_OPENAI_BASE, VERSION  

app = Flask(__name__) 

app.register_blueprint(app_sql) 
app.register_blueprint(app_flow) 
app.register_blueprint(app_documents) 
app.register_blueprint(app_main) 
app.register_blueprint(app_saved) 
app.register_blueprint(app_settings) 
app.register_blueprint(app_questions) 
app.register_blueprint(app_dictionary) 
app.register_blueprint(app_user) 
app.register_blueprint(app_translations) 
app.register_blueprint(app_login) 
app.debug = True
# Old Session 
#app.config["SESSION_PERMANENT"] = True 
#app.config['SESSION_TYPE'] = 'filesystem' 
# New Session 
#app.config['SESSION_TYPE'] = 'sqlalchemy' 
#sqlalchemy_url = odbc_to_sqlalchemy_url(SQL_SERVER_STR) 
#app.config['SQLALCHEMY_DATABASE_URI'] = sqlalchemy_url
#app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7) 
#Session(app)
# New Session Coockie 
# Critical security settings 
app.config.update(
    # Generate with: python -c 'import secrets; print(secrets.token_hex())'
    SECRET_KEY = FLASK_SECRET_KEY,  # 64-character secret
    
    # Cookie security
    SESSION_COOKIE_HTTPONLY = True,      # Prevent JavaScript access
    SESSION_COOKIE_SECURE = True,         # Only send over HTTPS
    SESSION_COOKIE_SAMESITE = 'Lax',      # Prevent CSRF attacks
    PERMANENT_SESSION_LIFETIME = timedelta(days=30),  # Session expiration
    SESSION_COOKIE_NAME = '__Secure-session',  # Secure cookie prefix
    SESSION_REFRESH_EACH_REQUEST = True   # Extend session on activity
)

#Session(app)
# Create database tables
# Identity Credential
#credentials = ManagedIdentityCredential() 

# Initialize the TranslationManager with the database connection
translation_manager = TranslationManager(default_language='es')
# Register the 'trans' filter with Flask Jinja2 templates
translation_manager.register_context_processor(app)

@app.errorhandler(OperationalError)
def handle_session_expired(e):
    # Check if it's a session-related connection error
    if '08S01' in str(e) or 'communication link failure' in str(e).lower():
        session.clear()  # Clear invalid session
        return render_template('session_expired.html'), 401
    # For other database errors, re-raise
    return render_template('exception_error.html', result=str(e)), 500

# Route to set the language in the session
@app.route('/set_language/<lang_code>')
def set_language(lang_code):
    return translation_manager.set_language(lang_code)

@app.route('/set_theme', methods=['POST'])
def set_theme():
    theme = request.json.get('theme')
    session['theme'] = theme  # Store the theme in the session
    return jsonify({'status': 'success'})

@app.route('/set_sidebar', methods=['POST'])
def set_sidebar():
    data = request.get_json()
    if data.get('collapsed'):
        session['sidebar_state'] = 'sidebar-collapse'
    else:
        session['sidebar_state'] = ''
    return jsonify(success=True)

@app.route('/')
@app.route('/index')
@requires_auth 
def index():
    """Renders the index page."""
    message = '' 
    user_data = None 
    azure_api_version = []
    azure_list_models = []
    openai_list_models = []
    try:
        data = get_configuration() 
        user_data = data[0] 
        permission_array = str(user_data[0]['permission']).split("|") 
        if len(permission_array) > 0:
            list_permission = get_chat_pages_list() 
            # Find the first matching page name
            page_name = find_page_name(permission_array, list_permission)
            return redirect(url_for(page_name)) 
    except Exception as e:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=e, request=request, module_name=__name__, function_name=function_name) 
        return render_template('exception_error.html', result=str(e))
        
    return render_template(
        'home.html', 
        title='Home', 
        version=VERSION, 
        user_data=user_data[0], 
        azure_api_version=azure_api_version, 
        azure_list_models=azure_list_models, 
        openai_list_models=openai_list_models, 
        azure_openai_base=AZURE_OPENAI_BASE,
        message=message, 
        theme=session.get('theme', 'skin-white'), 
        sidebar_state=session.get('sidebar_state', ''), 
        WEB_APP_VERSION=WEB_APP_VERSION 
    )



def get_chat_pages_list() -> List[dict]:
    return [
        {"id": "a316482c-6544-4773-a0b9-f0454c8b140e", "name": "home"},
        {"id": "05a4b2cb-a94a-4633-975d-0567a4f59a57", "name": "chatsql"},
        {"id": "d37a6e81-100f-469c-9b95-e46b067d3711", "name": "chatflow"},
        {"id": "9973a807-6d72-4a03-9822-45284453c7e1", "name": "document"},
        {"id": "eb2608e4-dcd0-40f8-8170-d4cfab6a5748", "name": "settings"},
        {"id": "1e50ce2d-5488-42a6-9984-8fff8d5a18fa", "name": "savedchat"},
        {"id": "da8e7d5d-1abc-4632-bffa-0e989ed4d509", "name": "questions"} 
    ]

def find_page_name(permission_array: List[str], permissions: List[dict]) -> Optional[str]:
    """
    Iterates over permission_array and finds the first matching page name.
    
    Args:
        permission_array: A list of permission IDs to search for.
        permissions: A list of dictionaries containing page information.
        
    Returns:
        The name of the first matching page if found, otherwise None.
    """
    #for page_id in permission_array:
    #    page_name = next((item["name"] for item in permissions if item["id"] == page_id), None)
    #    if page_name:
    #        return page_name  # Return the first match
    # Iterate over the permissions list first
    for permission in permissions:
        if permission["id"] in permission_array:
            return permission["name"]  # Return the first matching name
        
    # Raise a general exception if no match is found 
    raise Exception("No matching permission found") 


@app.route('/home')
@requires_auth
def home():
    """Renders the home page."""
    message = '' 
    user_data = None 
    azure_api_version = []
    azure_list_models = []
    openai_list_models = []
    try:
        data = get_configuration() 
        user_data = data[0] 
    except Exception as e:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=e, request=request, module_name=__name__, function_name=function_name) 
        return render_template('exception_error.html', result=str(e))

    return render_template(
        'home.html',
        title='Home',
        version=VERSION, 
        user_data=user_data[0], 
        azure_api_version=azure_api_version, 
        azure_list_models=azure_list_models, 
        openai_list_models=openai_list_models, 
        azure_openai_base=AZURE_OPENAI_BASE,
        message=message, 
        theme=session.get('theme', 'skin-white'), 
        sidebar_state=session.get('sidebar_state', ''), 
        WEB_APP_VERSION=WEB_APP_VERSION 
    )






@app.route('/chatsql')
@requires_auth
def chatsql():
    """Renders the chatsql page."""
    if WEB_APP_VERSION == "Lite":
        return render_template('404.html')
    message = '' 
    user_data = None
    sql_list = None
    azure_api_version = []
    azure_list_models = []
    openai_list_models = []
    try:
        session["chat_type"] = "chatsql"
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
                
                SELECT * FROM [""" + SQL_SCHEMA + """].[sql_secrets] WHERE [deleted_at] IS NULL; 
                
                SELECT [Version] FROM [mbot].[azure_openai_versions] ORDER BY [Version] DESC;
                """ 
        data = get_configuration(query) 
        azure_api_version = get_azure_api_versions() 
        azure_list_models = get_azure_list_models() 
        openai_list_models = get_openai_list_models() 
        user_data = data[0] 
        sql_list = data[1] 
        sql_secrets = data[2] 
    except Exception as e:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=e, request=request, module_name=__name__, function_name=function_name) 
        return render_template('exception_error.html', result=str(e))

    return render_template(
        'chatsql.html',
        title='Chat SQL',
        version=VERSION, 
        user_data=user_data[0], 
        azure_api_version=azure_api_version, 
        azure_list_models=azure_list_models, 
        openai_list_models=openai_list_models, 
        azure_openai_base=AZURE_OPENAI_BASE,
        sql_list=sql_list,
        sql_secrets=sql_secrets, 
        message=message, 
        theme=session.get('theme', 'skin-white'), 
        sidebar_state=session.get('sidebar_state', ''), 
        WEB_APP_VERSION=WEB_APP_VERSION 
    )


@app.route('/chatflow')
@requires_auth
def chatflow():
    """Renders the chatflow page."""
    message = '' 
    user_data = None 
    category_data = None 
    azure_api_version = []
    azure_list_models = []
    openai_list_models = []
    try:
        session["chat_type"] = "chatflow"
        query = f"""
            SELECT 
                 [id_chatsql_phase_category] AS [id]
                ,[chatsql_phase_category] AS [name]
            FROM [{SQL_SCHEMA}].[chatsql_phase_category]
            WHERE [deleted_at] IS NULL 
            ORDER BY [chatsql_phase_category] ASC; 

            SELECT DISTINCT 
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
            INNER JOIN [mbot].[sql_dictionary] sd 
            ON sd.id_table = st.id 
            WHERE  st.[chat_type] = 'Sql' AND st.[object_type] IN ('Table', 'View') AND st.[deleted_at] IS NULL  
            ORDER BY st.table_group ASC, st.table_name ASC;

            SELECT 
                 [type]
                ,[name]
            FROM [velkpi].[equipment]
            WHERE [deleted_at] IS NULL AND [type] IN ('Truck', 'Shovel')
            ORDER BY [type] DESC, [name] ASC;
        """ 
        data = get_configuration(query) 
        azure_api_version = get_azure_api_versions() 
        azure_list_models = get_azure_list_models() 
        openai_list_models = get_openai_list_models() 
        user_data = data[0] 
        category_data = data[1] 
        sql_tables = data[2] 
        equipments = data[3] 
    except Exception as e:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=e, request=request, module_name=__name__, function_name=function_name) 
        return render_template('exception_error.html', result=str(e))

    return render_template(
        'chatflow.html',
        title='Chat Flow',
        version=VERSION, 
        user_data=user_data[0], 
        azure_api_version=azure_api_version, 
        azure_list_models=azure_list_models, 
        openai_list_models=openai_list_models, 
        azure_openai_base=AZURE_OPENAI_BASE, 
        category_data=category_data, 
        sql_tables=sql_tables, 
        equipments=equipments, 
        message=message, 
        theme=session.get('theme', 'skin-white'), 
        sidebar_state=session.get('sidebar_state', ''), 
        WEB_APP_VERSION=WEB_APP_VERSION  
    )


@app.route('/savedchat')
@requires_auth
def savedchat():
    """Renders the savedchat page."""
    if WEB_APP_VERSION == "Lite":
        return render_template('404.html')
    message = '' 
    user_data = None
    azure_api_version = []
    azure_list_models = []
    openai_list_models = []
    try:
        data = get_configuration() 
        user_data = data[0] 
    except Exception as e:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=e, request=request, module_name=__name__, function_name=function_name) 
        return render_template('exception_error.html', result=str(e))

    return render_template(
        'savedchat.html',
        title='Saved Chat',
        version=VERSION, 
        user_data=user_data[0], 
        azure_api_version=azure_api_version, 
        azure_list_models=azure_list_models, 
        openai_list_models=openai_list_models, 
        azure_openai_base=AZURE_OPENAI_BASE,
        message=message, 
        theme=session.get('theme', 'skin-white'), 
        sidebar_state=session.get('sidebar_state', ''), 
        WEB_APP_VERSION=WEB_APP_VERSION  
    )

@app.route('/document')
@requires_auth
def document():
    """Renders the document page."""
    if WEB_APP_VERSION == "Lite":
        return render_template('404.html')
    message = '' 
    user_data = None
    azure_api_version = []
    azure_list_models = []
    openai_list_models = []
    try:
        data = get_configuration() 
        user_data = data[0] 
    except Exception as e:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=e, request=request, module_name=__name__, function_name=function_name) 
        return render_template('exception_error.html', result=str(e))

    return render_template(
        'document.html',
        title='Upload Documents',
        version=VERSION, 
        user_data=user_data[0], 
        azure_api_version=azure_api_version, 
        azure_list_models=azure_list_models, 
        openai_list_models=openai_list_models, 
        azure_openai_base=AZURE_OPENAI_BASE,
        message=message, 
        theme=session.get('theme', 'skin-white'), 
        sidebar_state=session.get('sidebar_state', ''), 
        WEB_APP_VERSION=WEB_APP_VERSION  
    )

@app.route('/user')
@requires_auth
def user():
    """Renders the user page."""
    message = '' 
    user_data = None
    azure_api_version = []
    azure_list_models = []
    openai_list_models = []
    try:
        data = get_configuration() 
        user_data = data[0] 
    except Exception as e:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=e, request=request, module_name=__name__, function_name=function_name) 
        return render_template('exception_error.html', result=str(e))

    return render_template(
        'user.html',
        title='User Configuration',
        version=VERSION, 
        user_data=user_data[0], 
        azure_api_version=azure_api_version, 
        azure_list_models=azure_list_models, 
        openai_list_models=openai_list_models, 
        azure_openai_base=AZURE_OPENAI_BASE,
        message=message, 
        theme=session.get('theme', 'skin-white'), 
        sidebar_state=session.get('sidebar_state', ''), 
        WEB_APP_VERSION=WEB_APP_VERSION  
    )


@app.route('/settings')
@requires_auth
def settings():
    """Renders the settings page."""
    message = '' 
    user_data = None
    azure_api_version = []
    azure_list_models = []
    openai_list_models = []
    try:
        data = get_configuration() 
        user_data = data[0] 
    except Exception as e:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=e, request=request, module_name=__name__, function_name=function_name) 
        return render_template('exception_error.html', result=str(e))

    return render_template(
        'settings.html',
        title='Chat Settings',
        version=VERSION, 
        user_data=user_data[0], 
        azure_api_version=azure_api_version, 
        azure_list_models=azure_list_models, 
        openai_list_models=openai_list_models, 
        azure_openai_base=AZURE_OPENAI_BASE,
        message=message, 
        theme=session.get('theme', 'skin-white'), 
        sidebar_state=session.get('sidebar_state', ''), 
        WEB_APP_VERSION=WEB_APP_VERSION  
    )



@app.route('/questions') 
@requires_auth 
def questions():
    """Renders page."""
    message = '' 
    user_data = None 
    azure_api_version = []
    azure_list_models = []
    openai_list_models = []
    try:
        query = f"""
                SELECT DISTINCT 
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
                ORDER BY st.table_group ASC, st.table_name ASC; """ 
        data = get_configuration(query) 
        user_data = data[0] 
        sql_list = data[1] 
    except Exception as e:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=e, request=request, module_name=__name__, function_name=function_name) 
        return render_template('exception_error.html', result=str(e))

    return render_template(
        'questions.html',
        title='Frequent Questions',
        version=VERSION, 
        user_data=user_data[0], 
        azure_api_version=azure_api_version, 
        azure_list_models=azure_list_models, 
        openai_list_models=openai_list_models, 
        azure_openai_base=AZURE_OPENAI_BASE, 
        sql_list=sql_list, 
        theme=session.get('theme', 'skin-white'), 
        sidebar_state=session.get('sidebar_state', ''), 
        message=message 
    )






@app.route('/dictionary')
@requires_auth
def dictionary():
    """Renders page."""
    message = '' 
    user_data = None 
    azure_api_version = []
    azure_list_models = []
    openai_list_models = []
    try:
        session["chat_type"] = "dictionary"
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
                ORDER BY st.table_group ASC, st.table_name ASC; """ 
        data = get_configuration(query) 
        azure_api_version = get_azure_api_versions() 
        azure_list_models = get_azure_list_models() 
        openai_list_models = get_openai_list_models() 
        user_data = data[0] 
        sql_list = data[1] 
    except Exception as e:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=e, request=request, module_name=__name__, function_name=function_name) 
        return render_template('exception_error.html', result=str(e))

    return render_template(
        'dictionary.html',
        title='Sql Dictionary',
        version=VERSION, 
        user_data=user_data[0], 
        azure_api_version=azure_api_version, 
        azure_list_models=azure_list_models, 
        openai_list_models=openai_list_models, 
        azure_openai_base=AZURE_OPENAI_BASE, 
        sql_list=sql_list, 
        theme=session.get('theme', 'skin-white'), 
        sidebar_state=session.get('sidebar_state', ''), 
        message=message 
    )


@app.route('/translations')
@requires_auth
def translations():
    """Renders page."""
    message = '' 
    user_data = None 
    azure_api_version = []
    azure_list_models = []
    openai_list_models = []
    try:
        data = get_configuration() 
        user_data = data[0] 
    except Exception as e:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=e, request=request, module_name=__name__, function_name=function_name) 
        return render_template('exception_error.html', result=str(e))

    return render_template(
        'translations.html',
        title='Translations',
        version=VERSION, 
        user_data=user_data[0], 
        azure_api_version=azure_api_version, 
        azure_list_models=azure_list_models, 
        openai_list_models=openai_list_models, 
        azure_openai_base=AZURE_OPENAI_BASE, 
        theme=session.get('theme', 'skin-white'), 
        sidebar_state=session.get('sidebar_state', ''), 
        message=message 
    ) 




if __name__ == "__main__":
    app.run(host='0.0.0.0', port=8000)

#if __name__ == '__main__':
#    HOST = os.environ.get('SERVER_HOST', 'localhost')
#    try:
#        PORT = int(os.environ.get('SERVER_PORT', '5555'))
#    except ValueError:
#        PORT = 5555
#    print("please visit http://" + HOST + ":" + str(PORT) + "/ for demo")
#    app.run(HOST, PORT, debug=True)


















