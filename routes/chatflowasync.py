import json 
import re 
import time
import base64 
import pandas as pd 
import io 
import pyodbc
import threading 
import asyncio
from tenacity import retry, stop_after_attempt, wait_exponential, RetryError
from PIL import Image 
from io import BytesIO  
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import Counter
from flask import request, Response, Blueprint, session, jsonify   
from azure.identity import ManagedIdentityCredential 
from azure.keyvault.secrets import SecretClient  
from environment import SQL_TIMEOUT, SQL_SCHEMA, KEYVAULT_URL, BLOB_DEFAULT_IMAGE_CONTAINER, BLOB_IMAGE_PATH  
from environment import OPENAI_API_KEY, AZURE_OPENAI_KEY, AZURE_OPENAI_BASE, AZURE_OPENAI_URL_API_VERSION, SQL_TIMEOUT
from routes.mainscript import save_chat_history 
from functions.context_sqlconnection import open_db_connection 
from functions.tools import id_guid, dict_to_markdown, cast_data_types, format_time_with_seconds, consolidate_chat_history, count_tokens     
from functions.openai import openai_chatcompletion, generate_price_usage 
from functions.blobstorage import blobstorage_uploadblob, get_blob_sas   
from classes.sqlconnection import QueryExecutor 
from classes.pinecone import PineconeHandler 
from classes.secretstore import SqlSecretStore
from functions.chat_data import chat_data_document, chat_data_sql 
from openai import OpenAI, AzureOpenAI, AsyncAzureOpenAI, AsyncOpenAI 

app_flowasync = Blueprint('app_flowasync', __name__, template_folder='templates') 


@app_flowasync.route("/chatflow/chatgpt_batch", methods=["POST"])
async def chatgpt_batch():
    data = request.get_json()
    all_requests = data["batch"]
    
    async def process_request(req):
        messages = req.get('gpt_messages', [])
        try:
            # Token count validation
            message_text = str(messages)
            token_count = count_tokens(message_text)
            input_token_limit = req["input_token_limit"]
            if token_count > input_token_limit:
                return {
                    "error": f"Token limit exceeded. {token_count}/{input_token_limit} tokens used",
                    "request": messages
                }

            # Prepare OpenAI request
            openai_object = req["openai_object"]
            openai_object["messages"] = messages
            
            # Use async context manager properly
            client = None
            try:
                # Determine API key
                if openai_object["openai_type"] == "open_ai":
                    openai_key = OPENAI_API_KEY
                elif openai_object["openai_type"] == "azure":
                    openai_key = AZURE_OPENAI_KEY
                else:
                    openai_key = OPENAI_API_KEY

                # Prepare common kwargs
                openai_kwargs = {
                    "model": openai_object.get("list_model") or openai_object.get("openai_model") or openai_object.get("azure_openai_model"),
                    "messages": openai_object["messages"],
                    "temperature": openai_object.get("openai_temperature") or openai_object.get("azure_openai_temperature", 0.7),
                    "stream": openai_object.get("openai_stream") or openai_object.get("azure_openai_stream", False)
                }

                # Add optional parameters
                if maxtokens := openai_object.get("openai_maxtoken") or openai_object.get("azure_openai_maxtoken"):
                    if maxtokens != 0:
                        openai_kwargs["max_tokens"] = maxtokens

                if "type_storage" in openai_object and openai_object["type_storage"] == "document":
                    openai_kwargs["top_p"] = openai_object.get("top_p")
                elif "openai_top_p" in openai_object:
                    openai_kwargs["top_p"] = openai_object["openai_top_p"]

                if "functions" in openai_object:
                    openai_kwargs["tools"] = openai_object["functions"]  # Note: 'functions' is now 'tools' in v1.x

                # Initialize the appropriate client
                if openai_object["openai_type"] == "azure":
                    client = AsyncAzureOpenAI(
                        api_key=openai_key,
                        azure_endpoint=openai_object["azure_openai_base"],
                        api_version=openai_object["azure_openai_version"],
                        timeout=openai_object.get("azure_openai_timeout", (5, 30))
                    )
                else:
                    client = AsyncOpenAI(
                        api_key=openai_key,
                        timeout=openai_object.get("openai_timeout", (5, 30))
                    )
                # Yield the async completion
                response = await client.chat.completions.create(**openai_kwargs)
                return {"response": response.choices[0].message.content}
                
            finally:
                if client:
                    await client.close()
                    
        except RetryError as retry_err:
            original_error = retry_err.last_attempt.exception()
            return {"error": str(original_error), "request": messages}
        except Exception as ex:
            return {"error": str(ex), "request": messages}
    
    # Process all requests concurrently
    tasks = [process_request(req) for req in all_requests]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Convert exceptions to error responses
    final_results = []
    for r in results:
        if isinstance(r, Exception):
            final_results.append({"error": str(r), "request": []})
        else:
            final_results.append(r)
    
    return jsonify(final_results)









