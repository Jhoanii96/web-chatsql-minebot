import datetime 
import urllib.parse 
import filetype
from werkzeug.datastructures import FileStorage
from azure.storage.blob import BlobServiceClient, generate_blob_sas, BlobSasPermissions, ContentSettings 
from classes.blob_connection_string import ConnectionString
from environment import BLOB_CONNECTION_STRING

def blobstorage_uploadblob(container: str, image_file_name: str, file: FileStorage | bytes | str, overwrite: bool = True) -> None:
    if isinstance(file, bytes):
        kind = filetype.guess(file) 
        content_type = kind.mime
        content_settings = ContentSettings(content_type=content_type) 
    elif isinstance(file, FileStorage):
        content_type = file.content_type 
        content_settings = ContentSettings(content_type=content_type) 
    else:
        content_settings = ContentSettings(content_type='text/plain')

    blob_service_client = BlobServiceClient.from_connection_string(BLOB_CONNECTION_STRING) 
    # Initialise container
    blob_container_client = blob_service_client.get_container_client(container)
    # Get blob
    blob_client = blob_container_client.get_blob_client(image_file_name) 
    blob_client.upload_blob(file, content_settings=content_settings, overwrite=overwrite) 

def get_blob_sas(container_name: str, file_path_name: str) -> str:
    conn_parsed = ConnectionString(BLOB_CONNECTION_STRING) 
    account_name = conn_parsed.get("AccountName") 
    account_key = conn_parsed.get("AccountKey") 
    data_file_blob = generate_blob_sas(account_name=account_name, 
                                container_name=container_name,
                                blob_name=file_path_name,
                                account_key=account_key,
                                permission=BlobSasPermissions(read=True),
                                expiry=datetime.datetime.now(datetime.UTC) + datetime.timedelta(hours=1)) 
    
    file_path_name = urllib.parse.quote(file_path_name.encode('utf8'))
    data_file_url = 'https://'+account_name+'.blob.core.windows.net/'+container_name+'/'+file_path_name+'?'+data_file_blob
    return data_file_url 

def get_blob_bytes(container_name: str, file_path_name: str) -> bytes:
    blob_service_client = BlobServiceClient.from_connection_string(BLOB_CONNECTION_STRING)
    blob_client = blob_service_client.get_blob_client(container=container_name, blob=file_path_name)
    file_bytes = blob_client.download_blob().content_as_bytes()
    return file_bytes 

def get_list_containers():
    blob_service_client = BlobServiceClient.from_connection_string(BLOB_CONNECTION_STRING)
    list_containers = [] 
    containers = blob_service_client.list_containers()
    for container in containers: 
        list_containers.append(container.name) 
    list_containers.sort(reverse = False) 
    return list_containers 