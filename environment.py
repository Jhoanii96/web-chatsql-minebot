import os 
from dotenv import load_dotenv 

load_dotenv(".env", override=True) 

VERSION='4.5.3' 
SQL_TIMEOUT=int(os.environ.get("SQL_TIMEOUT", "120")) 

FLASK_SECRET_KEY=os.environ.get("FLASK_SECRET_KEY", "") 

SQL_SERVER_STR=os.environ.get("SQL_SERVER_STR", "") 
SQL_SCHEMA=os.environ.get("SQL_SCHEMA", "") 

OPENAI_API_KEY=os.environ.get("OPENAI_API_KEY", "") 
AZURE_OPENAI_KEY=os.environ.get("AZURE_OPENAI_KEY", "") 
AZURE_OPENAI_BASE=os.environ.get("AZURE_OPENAI_BASE", "") 
AZURE_OPENAI_URL_API_VERSION=os.environ.get("AZURE_OPENAI_URL_API_VERSION", "") 

PINECONE_KEY=os.environ.get("PINECONE_KEY", "") 
PINECONE_INDEX=os.environ.get("PINECONE_INDEX", "") 

BLOB_CONNECTION_STRING=os.environ.get("BLOB_CONNECTION_STRING", "") 
BLOB_DEFAULT_IMAGE_CONTAINER=os.environ.get("BLOB_DEFAULT_IMAGE_CONTAINER", "") 
BLOB_DEFAULT_DATA_CONTAINER=os.environ.get("BLOB_DEFAULT_DATA_CONTAINER", "") 
BLOB_IMAGE_PATH=os.environ.get("BLOB_IMAGE_PATH", "") 

WEATHER_API_KEY=os.environ.get("WEATHER_API_KEY", "") 

PBI_TENANT_ID=os.environ.get("PBI_TENANT_ID", "") 
PBI_CLIENT_ID=os.environ.get("PBI_CLIENT_ID", "") 
PBI_CLIENT_SECRET=os.environ.get("PBI_CLIENT_SECRET", "") 
PBI_WORKSPACE=os.environ.get("PBI_WORKSPACE", "") 

KEYVAULT_URL=os.environ.get("KEYVAULT_URL", "") 
# Version available: Full, Lite 
WEB_APP_VERSION=os.environ.get("WEB_APP_VERSION", "Full") 

# Azure AD configuration 
AUTHENTICATE_WITH_AZURE=int(os.environ.get("AUTHENTICATE_WITH_AZURE", 0)) 
AD_CLIENT_ID=os.environ.get("AD_CLIENT_ID", "") 
AD_CLIENT_SECRET=os.environ.get("AD_CLIENT_SECRET", "") 
AD_TENANT_ID=os.environ.get("AD_TENANT_ID", "") 
AD_AUTHORITY=f"https://login.microsoftonline.com/{AD_TENANT_ID}" 
AD_REDIRECT_PATH="/getAToken" 
AD_ENDPOINT='https://graph.microsoft.com/v1.0/me' 
AD_SCOPE=["User.Read"] 





