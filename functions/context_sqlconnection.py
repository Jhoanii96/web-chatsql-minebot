import sys 
import pyodbc 
from contextlib import contextmanager

@contextmanager
def open_db_connection(connection_string, commit=False):
    connection = pyodbc.connect(connection_string)
    connection.timeout = 300 
    cursor = connection.cursor()
    try:
        yield cursor
    except pyodbc.DatabaseError as err:
        error = err.args
        error = str(error)
        sys.stderr.write(error)
        cursor.execute("ROLLBACK")
        raise err
    except Exception as ex:
        cursor.execute("ROLLBACK")
        raise str(ex)
    else:
        if commit:
            cursor.execute("COMMIT")
        else:
            cursor.execute("ROLLBACK")
    finally:
        connection.close()
