import json 
import pandas as pd 
from functions.tools import get_key_value_pairs 
from functions.blobstorage import get_blob_bytes 
from functions.openai import openai_chatcompletion 
from classes.sqlconnection import QueryExecutor 
from classes.pinecone import PineconeHandler 
from classes.secretstore import SqlSecretStore
from azure.keyvault.secrets import SecretClient  
from azure.identity import ManagedIdentityCredential  
from environment import SQL_TIMEOUT, SQL_SCHEMA, KEYVAULT_URL 

executor_instance = QueryExecutor() 
pinecone_handler = PineconeHandler() 
#credentials = ManagedIdentityCredential() 
secret_store = SqlSecretStore()

def chat_data_document(document_source: str, openai_object: list, query_pinecone: str, max_attempts: int, pinecone_top_k: int) -> str:
    namespace_query = f"""
        SELECT TOP 1
        [document_name],[document_unique],[extension],[storage],[path],[excel_sheet]
        FROM [{SQL_SCHEMA}].[documents_list]
        WHERE [deleted_at] IS NULL AND [document_unique] = '{document_source}'
    """
    future_result = executor_instance.query_executor(namespace_query)
    result = future_result.result()
    data_namespaces = result[0]
    document_name = data_namespaces[0]['document_name']
    document_unique = data_namespaces[0]['document_unique']
    extension = data_namespaces[0]['extension']
    storage = data_namespaces[0]['storage']
    excel_sheet = data_namespaces[0]['excel_sheet']
    blob_path = str(data_namespaces[0]['path'])
    container = blob_path.split("|")[0]
    all_results = ''
    for attempts in range(max_attempts):
        try:
            if storage == "pinecone":
                all_results = pinecone_handler.pinecone_query(openai_object, query_pinecone, document_name, pinecone_top_k)
            elif storage == "blobstorage":
                blob_file = blob_path.split(
                    "|")[1] + "/" + data_namespaces[0]['document_unique'] + "." + extension
                file_bytes = get_blob_bytes(container, blob_file)
                if extension == "xlsx" and excel_sheet != '-':
                    df = pd.read_excel(
                        file_bytes, sheet_name=excel_sheet, engine='openpyxl')
                    all_results = df.to_csv(encoding='utf-8', index=False)
                elif extension == "csv":
                    all_results = file_bytes.decode('utf-8')
            break
        except Exception as ex:
            if attempts == 2:
                raise Exception(str(ex))

    return all_results

def chat_data_sql(sql_query_value: str, sql_secrets_value: str) -> str:
    ## Start Sql Data 
    sql_server_connstr = secret_store.get_secret(sql_secrets_value)
    #sql_server_connstr = SecretClient(vault_url=KEYVAULT_URL, credential=credentials, logging_enable=False).get_secret(sql_secrets_value, logging_enable=False).value
    #sql_server_connstr = "DRIVER={ODBC Driver 17 for SQL Server};SERVER=usaeu2velman-prod-sql.database.windows.net;DATABASE=USAEU2VELMAN-PROD-sqldb;UID=velmanadm;PWD=6XBhhpXRpGIIkCQRYy8L;" 
    #sql_server_connstr = "DRIVER={ODBC Driver 17 for SQL Server};SERVER=usaeu2velman-dev-sql.database.windows.net;DATABASE=GIGVELKPIDB;UID=velmanadm;PWD=usaeu2catA#!@733;" 
    future_result = executor_instance.query_executor(query=sql_query_value, connection_string=sql_server_connstr) 
    result = future_result.result() 
    sql_df = pd.DataFrame(result[0]) 
    sql_results = str(sql_df.to_csv(sep='\t', index=False)).replace('"', '') 
    return sql_results