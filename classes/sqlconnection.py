import threading
import pyodbc
import pandas as pd
import sys
import time
import multiprocessing
from concurrent.futures import ThreadPoolExecutor
from environment import SQL_TIMEOUT, SQL_SERVER_STR

num_workers = min(10, multiprocessing.cpu_count())

class QueryExecutor:
    _instance = None
    _lock = threading.Lock()
    _semaphore = threading.Semaphore(5)

    def __new__(cls, *args, **kwargs):
        if not cls._instance:
            with cls._lock:
                if not cls._instance:
                    cls._instance = super(QueryExecutor, cls).__new__(cls) 
        return cls._instance 

    def __init__(self):
        self.executor = ThreadPoolExecutor(max_workers=num_workers) 
        self.timeout = SQL_TIMEOUT 

    def query_executor(self, query, params=None, commit=False, connection_string = ""):
        if connection_string != "": 
            self.connection_string = connection_string 
        else: 
            self.connection_string = SQL_SERVER_STR 
        with self._semaphore:
            future = self.executor.submit(self.execute_query, query, params, commit)
            return future
    
    def execute_query(self, query, params, commit):
        max_retries = 3
        attempts = 0
        while attempts < max_retries:
            try:
                with pyodbc.connect(self.connection_string, timeout=self.timeout) as connection:
                    with connection.cursor() as cursor:
                        if params is None:
                            cursor.execute(query)
                        else:
                            cursor.execute(query, params)

                        if commit:
                            connection.commit()
                        else:
                            result_list = []
                            while True:
                                df = pd.DataFrame.from_records(cursor.fetchall(), columns=[col[0] for col in cursor.description])
                                df = df.fillna('')
                                data_dict = df.to_dict('records')
                                result_list.append(data_dict)
                                if not cursor.nextset():
                                    break
                            return result_list
                break  # If successful, break out of the loop
            except Exception as e:
                print(f"Error: {str(e)}")
                attempts += 1
                if attempts < max_retries:
                    time.sleep(2)  # Optional: wait for 2 seconds before retrying
                    continue
                else:
                    print(f"Critical error: {str(e)}") 
                    raise Exception(str(e)) 
                
    
# Usage example
# Ensure SQL_SERVER_STR is defined appropriately
"""
SQL_SERVER_STR = "your_connection_string_here"
executor_instance = QueryExecutor()
future_result = executor_instance.query_executor("SELECT * FROM your_table")
try:
    result = future_result.result(timeout=SQL_TIMEOUT)  # Wait for the result
    print(result)
except Exception as e:
    print(f"An error occurred: {e}")

    
future_result = executor_instance.query_executor("SELECT * FROM your_table")
result = future_result.result(timeout=SQL_TIMEOUT)

"""
