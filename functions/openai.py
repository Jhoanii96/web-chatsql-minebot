import requests 
from openai import OpenAI, AzureOpenAI, AsyncAzureOpenAI, AsyncOpenAI 
from classes.sqlconnection import QueryExecutor 
from contextlib import contextmanager, asynccontextmanager 
from environment import OPENAI_API_KEY, AZURE_OPENAI_KEY, AZURE_OPENAI_BASE, AZURE_OPENAI_URL_API_VERSION, SQL_TIMEOUT 
from langchain_openai import OpenAIEmbeddings, AzureOpenAIEmbeddings 

executor_instance = QueryExecutor() 

@contextmanager 
def openai_chatcompletion(**kwargs):
    if kwargs["openai_type"] == "open_ai":
        openai_key = OPENAI_API_KEY
    elif kwargs["openai_type"] == "azure":
        openai_key = AZURE_OPENAI_KEY
    else:
        openai_key = OPENAI_API_KEY
    openai_kwargs = []
    if kwargs["openai_type"] == "open_ai":
        openai_model = (kwargs["list_model"] if "list_model" in kwargs else kwargs["openai_model"])
        openai_kwargs = {
            # "model": kwargs["openai_model"],
            "model": openai_model,
            "messages": kwargs["messages"],
            "temperature": kwargs["openai_temperature"],
            "stream": kwargs["openai_stream"] 
        }
        if kwargs["openai_maxtoken"] != 0:
            openai_kwargs["max_tokens"] = kwargs["openai_maxtoken"]
        client = OpenAI(api_key=openai_key, timeout=kwargs.get("openai_timeout", (5, 30)))

    elif kwargs["openai_type"] == "azure":
        openai_kwargs = {
            #"model": kwargs["azure_openai_model"],
            "model": (kwargs["list_model"] if "list_model" in kwargs else kwargs["azure_openai_model"]),
            "messages": kwargs["messages"],
            "temperature": kwargs["azure_openai_temperature"],
            "stream": kwargs["azure_openai_stream"] 
        }
        if kwargs["azure_openai_maxtoken"] != 0:
            openai_kwargs["max_tokens"] = kwargs["azure_openai_maxtoken"]
        client = AzureOpenAI(api_key=openai_key, azure_endpoint=AZURE_OPENAI_BASE, api_version=kwargs["azure_openai_version"], timeout=kwargs.get("azure_openai_timeout", (5, 30)))

    else:
        openai_model = (
            kwargs["list_model"] if "list_model" in kwargs else kwargs["openai_model"])
        openai_kwargs = {
            "api_key": kwargs["openai_key"],
            # "model": kwargs["openai_model"],
            "model": openai_model,
            "messages": kwargs["messages"],
            "temperature": kwargs["openai_temperature"],
            "stream": kwargs["openai_stream"] 
        }
        if kwargs["openai_maxtoken"] != 0:
            openai_kwargs["max_tokens"] = kwargs["openai_maxtoken"]
        client = OpenAI(api_key=openai_key, timeout=kwargs.get("openai_timeout", (5, 30)))

        
    if "type_storage" in kwargs:
        if kwargs["type_storage"] == "document":
            openai_kwargs["top_p"] = kwargs["top_p"]
    if "openai_top_p" in kwargs:
        openai_kwargs["top_p"] = kwargs["openai_top_p"]
    if "azure_openai_top_p" in kwargs:
        openai_kwargs["top_p"] = kwargs["azure_openai_top_p"]
    if "functions" in kwargs:
        openai_kwargs["functions"] = kwargs["functions"]

    if openai_kwargs["model"] == 'gpt-5-mini':
        del openai_kwargs["temperature"]
        del openai_kwargs["top_p"]

    #print(openai_kwargs)

    try:
        yield client.chat.completions.create(**openai_kwargs) 
    except Exception as e:
        error_message = f"OpenAI Error: {str(e)}\n"
        raise Exception(error_message)

"""
@asynccontextmanager 
async def openai_chatcompletion(**kwargs):
    # Determine API key
    if kwargs["openai_type"] == "open_ai":
        openai_key = OPENAI_API_KEY
    elif kwargs["openai_type"] == "azure":
        openai_key = AZURE_OPENAI_KEY
    else:
        openai_key = OPENAI_API_KEY

    # Prepare common kwargs
    openai_kwargs = {
        "model": kwargs.get("list_model") or kwargs.get("openai_model") or kwargs.get("azure_openai_model"),
        "messages": kwargs["messages"],
        "temperature": kwargs.get("openai_temperature") or kwargs.get("azure_openai_temperature", 0.7),
        "stream": kwargs.get("openai_stream") or kwargs.get("azure_openai_stream", False)
    }

    # Add optional parameters
    if maxtokens := kwargs.get("openai_maxtoken") or kwargs.get("azure_openai_maxtoken"):
        if maxtokens != 0:
            openai_kwargs["max_tokens"] = maxtokens

    if "type_storage" in kwargs and kwargs["type_storage"] == "document":
        openai_kwargs["top_p"] = kwargs.get("top_p")
    elif "openai_top_p" in kwargs:
        openai_kwargs["top_p"] = kwargs["openai_top_p"]

    if "functions" in kwargs:
        openai_kwargs["tools"] = kwargs["functions"]  # Note: 'functions' is now 'tools' in v1.x

    # Initialize the appropriate client
    try:
        if kwargs["openai_type"] == "azure":
            client = AsyncAzureOpenAI(
                api_key=openai_key,
                azure_endpoint=kwargs["azure_openai_base"],
                api_version=kwargs["azure_openai_version"],
                timeout=kwargs.get("azure_openai_timeout", (5, 30))
            )
        else:
            client = AsyncOpenAI(
                api_key=openai_key,
                timeout=kwargs.get("openai_timeout", (5, 30))
            )

        # Yield the async completion
        completion = await client.chat.completions.create(**openai_kwargs)
        yield completion
        
    except Exception as e:
        error_message = f"OpenAI Error: {str(e)}"
        raise Exception(error_message)
    finally:
        # Ensure client is closed
        if 'client' in locals():
            await client.close()
"""


@contextmanager
def openai_embedding(**kwargs):
    if kwargs["openai_type"] == "open_ai":
        openai_key = OPENAI_API_KEY
    elif kwargs["openai_type"] == "azure":
        openai_key = AZURE_OPENAI_KEY
    else:
        openai_key = OPENAI_API_KEY

    kwargs["openai_key"] = openai_key
    
    openai_kwargs = []
    if kwargs["openai_type"] == "open_ai":
        openai_kwargs = {
            "model": kwargs["openai_embedded_model"],
            "input": kwargs["input"] 
        }
        client = OpenAI(api_key=openai_key, timeout=kwargs["openai_timeout"])

    elif kwargs["openai_type"] == "azure":
        openai_kwargs = {
            "model": kwargs["azure_openai_embedded_model"],
            "input": kwargs["input"]
        }
        client = AzureOpenAI(api_key=openai_key, azure_endpoint=kwargs["azure_openai_base"], api_version=kwargs["azure_openai_version"], timeout=kwargs["azure_openai_timeout"])
    else:
        openai_kwargs = {
            "model": kwargs["openai_embedded_model"],
            "input": kwargs["input"]
        }
        client = OpenAI(api_key=openai_key, timeout=kwargs["openai_timeout"])
    try:
        yield client.embeddings.create(**openai_kwargs) 
    except Exception as e:
        error_message = f"Error: {str(e)}\n"
        raise Exception(error_message)


def get_openai_embedding(**kwargs):
    if kwargs["openai_type"] == "open_ai":
        embeddings = OpenAIEmbeddings(
            openai_api_key=OPENAI_API_KEY,
            model=kwargs["openai_embedded_model"],
            timeout=(5, 30)
        )
    elif kwargs["openai_type"] == "azure":
        embeddings = AzureOpenAIEmbeddings(
            api_key=AZURE_OPENAI_KEY, 
            api_version=kwargs["azure_openai_version"],
            azure_endpoint=kwargs["azure_openai_base"],
            model=kwargs["azure_openai_embedded_model"],
            timeout=(5, 30)
        )
    else:
        embeddings = OpenAIEmbeddings(
            openai_api_key=OPENAI_API_KEY,
            model=kwargs["openai_embedded_model"],
            timeout=(5, 30)
        )
    return embeddings


def generate_tokens_price_usage(response):
    # Define costs per million tokens | gpt-4o-mini
    input_cost_per_million = 2.50
    output_cost_per_million = 10

    # Token usage details
    completion_tokens = response.usage.completion_tokens
    prompt_tokens = response.usage.prompt_tokens

    # Calculate the cost for input tokens and output tokens
    input_cost = (prompt_tokens / 1_000_000) * input_cost_per_million
    output_cost = (completion_tokens / 1_000_000) * output_cost_per_million

    # Calculate the total cost
    total_cost = input_cost + output_cost

    print(f"Total tokens used: {completion_tokens + prompt_tokens}")
    print(f"Total cost: ${total_cost:.5f}")

    return {
        "total_input_tokens": prompt_tokens,
        "total_output_tokens": completion_tokens,
        "total_tokens": completion_tokens + prompt_tokens,
        "total_cost": f"{total_cost:.5f}"
    }


def get_azure_api_versions(): 
    # Send a GET request to the GitHub API
    #response = requests.get(AZURE_OPENAI_URL_API_VERSION)
    #https://api.github.com/repos/Azure/azure-rest-api-specs/contents/specification/cognitiveservices/data-plane/AzureOpenAI/authoring/preview
    #https://api.github.com/repos/Azure/azure-rest-api-specs/contents/specification/cognitiveservices/data-plane/AzureOpenAI/authoring/stable
    query = f"""
        SELECT [Version] FROM [mbot].[azure_openai_versions] WHERE [DeletedAt] IS NULL ORDER BY [Version] DESC;
    """ 
    future_result = executor_instance.query_executor(query) 
    result = future_result.result(timeout=SQL_TIMEOUT) 
    data_object = [version['Version'] for version in result[0]] 

    # Check if the request was successful
    return data_object 

def get_openai_list_models():
    query = f"""
        SELECT DISTINCT [ModelName] FROM [mbot].[ai_models] WHERE ModelType = 'OpenAI' AND ModelCategory = 'Model' AND [DeletedAt] IS NULL;
        SELECT DISTINCT [ModelName] FROM [mbot].[ai_models] WHERE ModelType = 'OpenAI' AND ModelCategory = 'Embedding' AND [DeletedAt] IS NULL;
    """ 
    future_result = executor_instance.query_executor(query) 
    result = future_result.result(timeout=SQL_TIMEOUT) 
    openai_chat_completion = []
    openai_embeddings = []
    for model in result[0]:
        openai_chat_completion.append(model["ModelName"])

    for model in result[1]:
        openai_embeddings.append(model["ModelName"])

    return {'chat_completion': list(dict.fromkeys(openai_chat_completion)), 'embeddings': list(dict.fromkeys(openai_embeddings))}

def get_azure_list_models():
    query = f"""
        SELECT DISTINCT [ModelName] FROM [mbot].[ai_models] WHERE ModelType = 'Azure' AND ModelCategory = 'Model' AND [DeletedAt] IS NULL;
        SELECT DISTINCT [ModelName] FROM [mbot].[ai_models] WHERE ModelType = 'Azure' AND ModelCategory = 'Embedding' AND [DeletedAt] IS NULL;
    """ 
    future_result = executor_instance.query_executor(query) 
    result = future_result.result(timeout=SQL_TIMEOUT) 
    azure_chat_completion = []
    azure_embeddings = []
    for model in result[0]:
        azure_chat_completion.append(model["ModelName"])

    for model in result[1]:
        azure_embeddings.append(model["ModelName"])

    return {'chat_completion': list(dict.fromkeys(azure_chat_completion)), 'embeddings': list(dict.fromkeys(azure_embeddings))}

"""
def get_azure_list_models():
    # Initialize the AzureOpenAI client with necessary credentials
    client = AzureOpenAI(
        api_key=AZURE_OPENAI_KEY,
        azure_endpoint=AZURE_OPENAI_BASE,  # Replace with your Azure OpenAI resource URL
        api_version="2024-06-01",  # Replace with the correct API version
        timeout=(5, 30)
    )
    # List available models
    models = client.models.list()
    filtered_models = [model for model in models.data if model.status == 'succeeded' and model.lifecycle_status == 'generally-available']
    # Sort models by creation date in descending order
    sorted_models = sorted(filtered_models, key=lambda x: x.created_at, reverse=True)
    azure_chat_completion = []
    azure_embeddings = []
    for model in sorted_models:
        if model.capabilities["chat_completion"] == True:
            azure_chat_completion.append(model.id)

    for model in sorted_models:
        if model.capabilities["embeddings"] == True:
            azure_embeddings.append(model.id)

    return {'chat_completion': list(dict.fromkeys(azure_chat_completion)), 'embeddings': list(dict.fromkeys(azure_embeddings))}

def get_openai_list_models():
    # Initialize the AzureOpenAI client with necessary credentials
    client = OpenAI(
        api_key=OPENAI_API_KEY,
        timeout=(5, 30)
    )
    # List available models
    models = client.models.list()
    # Sort models by creation date in descending order
    sorted_models = sorted(models, key=lambda x: x.created, reverse=True)
    openai_chat_completion = []
    openai_embeddings = []
    for model in sorted_models:
        if 'gpt' in model.id:
            openai_chat_completion.append(model.id)

    for model in sorted_models:
        if 'embedding' in model.id:
            openai_embeddings.append(model.id)

    return {'chat_completion': list(dict.fromkeys(openai_chat_completion)), 'embeddings': list(dict.fromkeys(openai_embeddings))}
"""

