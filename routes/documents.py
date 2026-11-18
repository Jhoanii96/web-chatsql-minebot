import time 
import unicodedata 
import io 
import PyPDF2 
import tempfile 
import json 
import inspect
from pptx import Presentation 
from langchain_community.document_loaders import Docx2txtLoader, WebBaseLoader 
from flask import request, Response, Blueprint 
from functions.blobstorage import get_list_containers, blobstorage_uploadblob, get_blob_bytes  
from environment import SQL_TIMEOUT, SQL_SCHEMA     
from classes.pinecone import PineconeHandler 
from classes.sqlconnection import QueryExecutor 
from routes.mainscript import save_system_error_log 

app_documents = Blueprint('app_documents', __name__, template_folder='templates')
pinecone_handler = PineconeHandler()
executor_instance = QueryExecutor() 

class DocumentFiles:
    def __init__(self, page_content, source='', title='', total_pages=1, format='pptx'):
        self.page_content = page_content
        self.metadata = {'source': source, 'title': title, 'total_pages': total_pages, 'format': format}

@app_documents.route("/documents/UploadDocumentToBlob", methods=["POST"])
def UploadDocumentToBlob():
    try:
        data = request.form
        file = request.files["file"]
        blob_container = data["blob_container"]
        blob_path = data["blob_path"]
        file_name = data["file_name"]
        file_unique_name = data["file_unique_name"]
        json_metadata = data["json_metadata"]

        file_extension = data["file_extension"]
        excel_sheet = data["excel_sheet"]
        input_url_path = data["input_url_path"]
        type_uploaded_file = data["type_uploaded_file"]
        file_namespace = unicodedata.normalize('NFD', file_name).encode('ascii', 'ignore').decode()
        
        document_content = ""
        if type_uploaded_file == "files":
            document_content = file 

        if type_uploaded_file == "url":
            loader = WebBaseLoader(input_url_path)
            docs = loader.load()
            for t in docs:
                document_content += t.page_content + "\n"

        if file_extension == "pdf":
            storage = "pinecone"
        else:
            storage = "blobstorage"

        if file_extension != "xlsx":
            excel_sheet = "-"

        image_file_name = blob_path + '/' + file_unique_name + '.' + file_extension 
        blobstorage_uploadblob(blob_container, image_file_name, document_content) 

        if file_extension == "xlsx" or file_extension == "csv": 
            sql_query = f"""INSERT INTO [{SQL_SCHEMA}].[documents_list] 
            ([document_name],[document_unique],[excel_sheet],[storage],[path],[extension],[metadata],[created_at]) 
            VALUES ('{file_namespace}', '{file_unique_name}', '{excel_sheet}', '{storage}', 
            '{blob_container + "|" + blob_path}', '{file_extension}', '{json_metadata.replace("'", "''")}', GETDATE()) """ 

            executor_instance.query_executor(sql_query, commit=True).result()  
        return {'result': file_namespace + "." + file_extension}
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'error': str(ex)}

@app_documents.route("/documents/UploadPdf", methods=["POST"])
def UploadPdf():
    data = request.get_json() 
    blob_container = data["blob_container"] 
    blob_path = data["blob_path"]
    file_name = data["file_name"]
    file_unique_name = data["file_unique_name"]
    json_metadata = data["json_metadata"]
    file_extension = data["file_extension"]
    type_uploaded_file = data["type_uploaded_file"]
    input_url_path = data["input_url_path"]
    is_all = int(data["is_all"])
    openai_object = data["openai_object"] 

    full_file_name = blob_path + '/' + file_unique_name + '.' + file_extension
    file_namespace = unicodedata.normalize('NFD', file_name).encode('ascii', 'ignore').decode()
    metadata = {
        "guid": str(file_unique_name), "filename": file_name 
    }

    def upload_pdf_files():
        try: 
            start_time = time.time() 
            yield "Document loading from blob storage..."
            file_bytes = get_blob_bytes(blob_container, full_file_name) 
            if type_uploaded_file == "files":
                if file_extension == "pdf":
                    #with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                    #    temp_file.write(file_bytes) 
                    #    loaders = {
                    #        'PyMuPDF': PyMuPDFLoader
                    #    }
                    #    loader = loaders.get('PyMuPDF')
                    #    pages = list(loader(temp_file.name).load())
                    p = io.BytesIO(file_bytes)
                    pdf = PyPDF2.PdfReader(p)
                    pages = pdf.pages

                elif file_extension == "docx":
                    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                        temp_file.write(file_bytes) 
                        loaders = {
                            'Docx2txtLoader': Docx2txtLoader
                        }
                        loader = loaders.get('Docx2txtLoader')
                        pages = list(loader(temp_file.name).load())

                elif file_extension == "pptx":
                    with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                        temp_file.write(file_bytes) 
                        presentation = Presentation(temp_file.name)
                        pages = []
                        # Process the PowerPoint file
                        document_content = ''
                        for slide_number, slide in enumerate(presentation.slides):
                            #print(f"Slide {}:")
                            for shape in slide.shapes:
                                if hasattr(shape, "text"):
                                    document_content += shape.text
                            
                            object = DocumentFiles(page_content=document_content, source='', title='', format='pptx', total_pages=slide_number + 1)
                            pages.append(object)
                            document_content = ''

            if type_uploaded_file == "url":
                loader = WebBaseLoader(input_url_path)
                pages = loader.load()
            
            time_1 = time.time()
            yield "Document loaded from blob storage. Time elapsed: " + str(time_1 - start_time)
            # PINECONE
            metadata = []
            pgnum = 0 
            metadata_list_base = json.loads(json_metadata)
            for t in pages:
                pgnum += 1 
                metadata_list = metadata_list_base.copy() 
                if 'Page Number' in metadata_list:
                    metadata_list['Page Number'] = str(metadata_list['Page Number']).replace("{pagenum}", str(pgnum))
                if 'File Name' in metadata_list:
                    metadata_list['File Name'] = str(metadata_list['File Name']).replace("{filename}", file_name + ".pdf")

                metadata.append(metadata_list)
            time.sleep(1)
            time_2 = time.time()
            yield 'Document uploading to Pinecone in "All documents"...' 

            if file_extension == "pdf":
                #pinecone_handler.upload_vector_documents(openai_object, pages, metadata)
                #time_3 = time.time()
                #yield 'Document uploaded to Pinecone "All documents". Time elapsed: ' + str(time_3 - time_2)
                #time.sleep(1)
                time_4 = time.time()
                yield "Document uploading to Pinecone in \"" + file_namespace + "\" namespace..."
                pinecone_handler.upload_vector_documents(openai_object, pages, metadata, file_namespace)
                end_time = time.time()
                yield "Document uploaded to Pinecone \"" + file_namespace + "\" namespace. Time elapsed: " + str(end_time - time_4)
                time.sleep(1)
                yield "Total Time elapsed: " + str(end_time - start_time)
                sql_query = f"""INSERT INTO [{SQL_SCHEMA}].[documents_list] 
                ([document_name],[document_unique],[excel_sheet],[storage],[path],[extension],[metadata],[created_at]) 
                VALUES ('{file_namespace}', '{file_unique_name}', '-', 'pinecone', 
                '{blob_container + "|" + blob_path}', '{file_extension}', '{json_metadata.replace("'", "''")}', GETDATE()) """ 
                executor_instance.query_executor(sql_query, commit=True).result()  
                time.sleep(1)
                yield "<b>Upload successfull.</b>"
            else:
                pinecone_handler.upload_vector_documents(openai_object, pages, metadata)
                time_3 = time.time()
                yield 'Document uploaded to Pinecone "All documents". Time elapsed: ' + str(time_3 - time_2)
                time.sleep(1)
                time_4 = time.time()
                yield "Document uploading to Pinecone in \"" + file_namespace + "\" namespace..."
                pinecone_handler.upload_vector_documents(openai_object, pages, metadata, file_namespace)
                end_time = time.time()
                yield "Document uploaded to Pinecone \"" + file_namespace + "\" namespace. Time elapsed: " + str(end_time - time_4)
                time.sleep(1)
                yield "Total Time elapsed: " + str(end_time - start_time)
                sql_query = f"""INSERT INTO [{SQL_SCHEMA}].[documents_list] 
                ([document_name],[document_unique],[excel_sheet],[storage],[path],[extension],[metadata],[created_at]) 
                VALUES ('{file_namespace}', '{file_unique_name}', '-', 'pinecone', 
                '{blob_container + "|" + blob_path}', '{file_extension}', '{json_metadata.replace("'", "''")}', GETDATE()) """ 
                executor_instance.query_executor(sql_query, commit=True).result()  
                time.sleep(1) 
                yield "<b>Upload successfull.</b>"
            
        except Exception as ex: 
            function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
            save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
            yield ("Error: " + str(ex))
    
    return Response(upload_pdf_files(), mimetype='text/event-stream')
    
    

@app_documents.route("/documents/GetListNamespaces", methods=["POST"])
def GetListNamespaces():
    try:
        #pinecone.init(api_key=PINECONE_KEY, environment=pinecone_enviroment) 
        #index = pinecone.Index(pinecone_index) 
        #data_namespace = index.describe_index_stats()['namespaces']
        #list_namespace = [] 
        #for key, value in data_namespace.items():
        #    list_namespace.append(key) 
        #list_namespace.sort(reverse = False) 
        namespace_query = f"""
        SELECT 
            [document_name],[document_unique],UPPER([extension]) AS [extension] 
        FROM [{SQL_SCHEMA}].[documents_list] 
        WHERE [deleted_at] IS NULL 
        ORDER BY [document_name] ASC; 
        """
        future_result = executor_instance.query_executor(namespace_query) 
        result = future_result.result() 
        data_object = result[0] 
        return {'result': data_object} 
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'error': str(ex)}


@app_documents.route("/documents/GetListContainers", methods=["POST"])
def GetListContainers():
    try:
        list_containers = get_list_containers()
        return {'result': list_containers}
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'error': str(ex)}


@app_documents.route("/documents/DeleteNamespace", methods=["POST"])
def DeleteNamespace():
    try:
        data = request.form
        namespace_name = data["namespace_name"]
        namespaceunique_name = data["namespaceunique_name"]
        sql_query = "UPDATE [" + SQL_SCHEMA + "].[documents_list] SET [deleted_at] = GETDATE() WHERE [document_unique] = '" + namespaceunique_name + "';" 
        executor_instance.query_executor(sql_query, commit=True).result()  
        pinecone_handler.delete_namespace(namespace_name)
        return {'result': "OK"}
    except Exception as ex:
        function_name = getattr(inspect.currentframe(), 'f_code', lambda: None).co_name or "unknown" 
        save_system_error_log(exception=ex, request=request, module_name=__name__, function_name=function_name) 
        print(str(ex))
        return {'error': str(ex)}

