import base64
import json
import requests
from functions.openai import openai_chatcompletion 
from environment import SQL_TIMEOUT, PBI_TENANT_ID, PBI_CLIENT_ID, PBI_CLIENT_SECRET, PBI_WORKSPACE  

class PowerBIAPIRest:
    def __init__(self):
        self.tenant_id = PBI_TENANT_ID 
        self.client_id = PBI_CLIENT_ID 
        self.client_secret = PBI_CLIENT_SECRET 
        self.token = str()

    def response_powerbi_token(self):
        # Encode the client ID and client secret
        authorization = base64.b64encode(bytes(f"{self.client_id}:{self.client_secret}", "ISO-8859-1")).decode("ascii")
        headers = {
            "Authorization": f"Basic {authorization}",
            "Content-Type": "application/x-www-form-urlencoded"
        }
        body = {
            "grant_type": "client_credentials",
            "resource": "https://analysis.windows.net/powerbi/api"
        }
        token_response = requests.post(f"https://login.microsoftonline.com/{self.tenant_id}/oauth2/token", data=body, headers=headers)
        token_response.raise_for_status()  # Raise an exception for HTTP errors
        token = token_response.json()

        token_type = token["token_type"]
        access_token = token["access_token"]
        self.token = f"{token_type} {access_token}"

    def get_datasets(self):
        if not self.token:
            self.response_powerbi_token()
        #GET
        headers_query = {
            "Authorization": f"{self.token}",
            "Content-Type": "application/json"
        }
        response = requests.get(f"https://api.powerbi.com/v1.0/myorg/groups/{PBI_WORKSPACE}/datasets", 
                                headers=headers_query)     
        data = json.loads(response.text) 
        result = []
        for item in data["value"]: 
            result.append({ "id": item["id"], "name": str(item["name"]).capitalize() }) 
        result.sort(key=lambda x: x['name'], reverse = False) 

        return result
    
    def get_query_results(self, pbi_system_prompt: str, question: str, pbi_dataset: str, pbi_tablename: str, openai_object: list) -> str:
        if not self.token:
            self.response_powerbi_token()
        # Post ExecuteQueries
        headers_query = {
            "Authorization": self.token,
            "Content-Type": "application/json"
        }
        raw_data = json.dumps({
            "queries": [{
                "query": f'EVALUATE FILTER( SUMMARIZE(COLUMNSTATISTICS(), [Table Name], [Column Name]) , [Table Name] = "{pbi_tablename}")'
            }],
            "serializerSettings": {
                "includeNulls": True
            }
        })
        response = requests.post(
            f"https://api.powerbi.com/v1.0/myorg/datasets/{pbi_dataset}/executeQueries",
            data=raw_data,
            headers=headers_query,
            timeout=SQL_TIMEOUT
        )
        response.raise_for_status()  # Raise an exception for HTTP errors
        result = response.json()
        columns = []
        for item in result["results"][0]["tables"][0]["rows"]:
            if "RowNumber" not in item["[Column Name]"]:
                columns.append(item["[Column Name]"])
        schema_string = f"Table: {pbi_tablename}\nColumns: {', '.join(columns)}" 
        question = question.replace("listar", "seleccionar").replace("listame", "seleccioname").replace("list", "select")

        query = f"""
        Generate a DAX studio DAX code: 
        Use the table \"{pbi_tablename}\", {question}.

        Description:
        DAX should be written using this database schema:
        {schema_string}
        The query should be returned in plain text, not in JSON.
        Do not use new lines characters inside the query.
        Always return a table expression.
        If the Query DAX Studio syntaxis returns a whole number add a custom column name.
        Verify your answer step by step. Make sure you are no missing a comma.
        Answer in Spanish

        Example 1:
        EVALUATE
        SUMMARIZE(
            Table_name,
            "Average", AVERAGEX(Table_name, Table_name[Column_1])
        )
        Example 2:
        EVALUATE
        TOPN(10,
            SELECTCOLUMNS(
                Table_name,
                "Column_1", Table_name[Column_1],
                "Column_2", Table_name[Column_2],
                "Column_3", Table_name[Column_3]
            ),
            [Column_1]
        )
        Example 3:
        EVALUATE
        SELECTCOLUMNS(
            """ + "{1}" + """,
            "Rows", COUNTROWS(Table_name)
        )
        Example 4:
        EVALUATE
        SUMMARIZE(
            'Table_name',
            "Value", CALCULATE(
                MAX('Table_name'[MetricValue]),
                'Table_name'[MeasurementID_BK] = "101270",
                'Table_name'[DateKey] = "20230531",
                'Table_name'[ScenarioKey] = "4"
            )
        )
        """

        messages=[
                {"role": "system", "content": pbi_system_prompt},
                {"role": "user", "content": query}
        ]
        openai_object["messages"] = messages 
        openai_object["openai_stream"] = False 
        openai_object["azure_openai_stream"] = False 
        with openai_chatcompletion(**openai_object) as response:
            query_result = str(response["choices"][0]["message"]["content"]).strip() 
        return query_result 

    def get_pbi_answer(self, question: str, query_result: str, pbi_dataset: str, openai_object: list) -> str: 
        if not self.token:
            self.response_powerbi_token()
        #Post ExecuteQueries
        headers_query = {
            "Authorization": f"{self.token}",
            "Content-Type": "application/json"
        }
        clear_query_result = query_result.replace('"', '\\"')
        raw_data = '{"queries": [{"query": "' + clear_query_result + '"}],"serializerSettings": {"includeNulls": true}}'
        response = requests.post(f"https://api.powerbi.com/v1.0/myorg/datasets/{pbi_dataset}/executeQueries", 
                                data=raw_data, 
                                headers=headers_query, 
                                timeout=SQL_TIMEOUT) 
        
        messages = [
            {"role": "user", "content": question + ", describe and return as table format."},
            #{"role": "assistant", "content": None, "function_call": {"name": "json_function", "arguments": arguments}},
            {"role": "function", "name": "json_function", "content": str(response.text)}
        ]
        functions = [
            {
                "name": "json_function",
                "description": "Read the table",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "rows": {
                            "type": "string",
                            "description": "Table"
                        }
                    },
                    "required": ["rows"]
                }
            }
        ]
        openai_object["messages"] = messages 
        openai_object["openai_stream"] = False 
        openai_object["azure_openai_stream"] = False 
        openai_object["functions"] = functions 
        openai_object["function_call"] = "auto" 
        assistant_message = ""
        with openai_chatcompletion(**openai_object) as response:
            assistant_message = str(response["choices"][0]["message"]["content"]).strip() 
        return assistant_message 
    