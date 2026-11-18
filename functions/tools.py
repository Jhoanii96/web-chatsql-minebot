import string
import random 
import uuid 
import io 
import binascii 
import re 
import tiktoken 
import pandas as pd
import urllib.parse
from PIL import Image 
from datetime import datetime, date
from decimal import Decimal

encoding = tiktoken.get_encoding("cl100k_base")

def id_generator(size=10, chars=string.ascii_uppercase + string.digits):
    return ''.join(random.choice(chars) for _ in range(size))

def id_guid():
    return (uuid.uuid4().hex)

def reduce_image_size(image_bytes: bytes, resize: int):
    binary = binascii.unhexlify(image_bytes.hex()) 
    im = Image.open(io.BytesIO(binary))
    if im.size[0] > resize: 
        sizing = resize - im.size[0] 
        size_x = resize  
        size_y = im.size[1] - sizing 
    else:
        size_x = im.size[0]
        size_y = im.size[1]
    image_x = int(size_x) 
    image_y = int(size_y) 
    size = image_x, image_y 
    im.thumbnail(size, Image.Resampling.LANCZOS)
    buf = io.BytesIO() 
    buf.seek(0) 
    im.save(buf, format="PNG") 
    return buf.getvalue() 

def get_key_value_pairs(content):
    # Define regular expressions for Pinecone Prompt and Validation Prompt
    prompt_pattern = re.compile(r'\[([^]]+)\]\s*(.*?)(?=\[|$)', re.DOTALL)

    # Initialize a dictionary to store key-value pairs
    prompt_values = {}

    # Extract values from all prompts
    for match in prompt_pattern.finditer(content):
        key = match.group(1).strip()
        value = match.group(2).strip()
        prompt_values[key] = value

    return prompt_values


def remove_special_quotes(text):
    # Define the regular expression pattern
    pattern = r'"```markdown\n(.*?)```'

    # Use re.sub to remove the specified quotes
    result = re.sub(pattern, r'\1', text, flags=re.DOTALL)

    return result

def dict_clean(items):
    result = {}
    for key, value in items.items():
        if value is None:
            value = ''
        result[key] = value
    return result

def dict_to_markdown(data):
    # Extract headers from dictionary keys
    headers = data[0].keys()
    
    # Create the header row
    header_row = "| " + " | ".join(headers) + " |"
    
    # Create the separator row
    separator_row = "| " + " | ".join(["---"] * len(headers)) + " |"
    
    # Create the data rows
    data_rows = []
    for item in data:
        row = "| " + " | ".join(
            str(item[key]).replace("\n", "<br>") for key in headers
        ) + " |"
        data_rows.append(row)
    
    # Combine all parts into the final markdown table
    markdown_table = "\n".join([header_row, separator_row] + data_rows)
    return markdown_table

# Function to cast datetime or timestamp fields
def cast_data_types(data: list, datetime_format="%Y-%m-%d %H:%M:%S", date_format="%Y-%m-%d", decimal_places=2):
    for record in data:
        # Iterate through the keys in each record (dictionary)
        for key, value in record.items():
            # Check if the value is a string that looks like a datetime
            if isinstance(value, str):
                try:
                    # Attempt to parse the string as a datetime
                    parsed_datetime = datetime.strptime(value, datetime_format)
                    # Check if the time part is midnight (00:00:00)
                    if parsed_datetime.time() == datetime.min.time():
                        # Convert to date format if the time is zero
                        record[key] = parsed_datetime.date().strftime(date_format)
                    else:
                        record[key] = parsed_datetime.strftime(datetime_format)[:-3]
                except ValueError:
                    # If the string does not match the expected format, leave it unchanged
                    pass
            # Check if the value is a pandas Timestamp or a Python datetime
            if isinstance(value, pd.Timestamp) or isinstance(value, datetime):
                # Handle NaT values explicitly
                if pd.isna(value):
                    record[key] = None
                else:
                    # Check if the time part is midnight (00:00:00)
                    if value.time() == datetime.min.time():
                        # Convert to date format if the time is zero
                        record[key] = value.date().strftime(date_format)
                    else:
                        # Cast the value to the format 'yyyy-MM-dd HH:mm:ss'
                        record[key] = value.strftime(datetime_format)
            elif isinstance(value, date):  # Check if the value is a Python date
                # Cast the value to the format 'yyyy-MM-dd'
                record[key] = value.strftime(date_format)
            elif isinstance(value, (float, Decimal)):  # Check if the value is a float or Decimal
                # Round the value to the specified number of decimal places
                record[key] = float(round(value, decimal_places)) 
    return data 


def new_profile_color(first_name: str) -> list: 
    # For random color
    hex_color = random.randint(0, 0xffffff)
    color = "#{:06x}".format(hex_color)
    
    return {
        "initial_name": str(first_name[0]).upper(), 
        "color": color 
    }

def convert_to_float(value):
    try:
        return float(value)
    except ValueError:
        return 0


def odbc_to_sqlalchemy_url(odbc_string):
    # Parse the ODBC string components
    components = dict(item.split('=') for item in odbc_string.split(';') if item)
    
    driver = components.get('DRIVER', '').strip('{}')  # Remove braces around driver if present
    server = components.get('SERVER')
    database = components.get('DATABASE')
    uid = components.get('UID')
    pwd = components.get('PWD')
    
    # Construct the SQLAlchemy URI
    sqlalchemy_url = (
        f"mssql+pyodbc://{urllib.parse.quote(uid)}:{urllib.parse.quote(pwd)}"
        f"@{server}/{database}?driver={urllib.parse.quote(driver)}"
    )
    
    return sqlalchemy_url

def format_time_with_seconds(time_str):
    if not time_str or not isinstance(time_str, str):
        return "00:00:00"  # or raise an exception if you prefer
    
    parts = time_str.split(':')
    
    # Handle cases where time already has seconds
    if len(parts) == 3:
        return time_str  # already formatted with seconds
    
    # Handle HH:MM format
    if len(parts) == 2 and all(p.isdigit() for p in parts):
        if 0 <= int(parts[0]) <= 23 and 0 <= int(parts[1]) <= 59:
            return f"{time_str}:00"
    
    # Handle H:MM format (single digit hour)
    if len(parts) == 2 and len(parts[0]) == 1 and parts[0].isdigit() and parts[1].isdigit():
        if 0 <= int(parts[0]) <= 9 and 0 <= int(parts[1]) <= 59:
            return f"0{parts[0]}:{parts[1]}:00"
    
    # If we get here, the format was invalid
    return "00:00:00"  # or raise ValueError("Invalid time format")

def should_quote_field(field: str) -> bool:
    """Determine if a field needs to be quoted in CSV output."""
    return ',' in field or '"' in field or ' ' in field

def markdown_table_to_csv(text: str) -> str:
    """
    Converts the first Markdown table in the text to CSV format with selective quoting,
    while keeping the rest of the text. Only quotes fields containing commas, double quotes,
    or spaces. Returns the original text with the table replaced by its CSV version.
    """
    lines = text.splitlines()
    table_start = -1
    table_end = -1
    table_data = []
    
    # Find the start and end of the first Markdown table
    for i in range(len(lines)):
        line = lines[i].strip()
        if '|' not in line:
            continue
            
        parts = [part.strip() for part in line.split('|')]
        if parts and parts[0] == '':
            parts = parts[1:]
        if parts and parts[-1] == '':
            parts = parts[:-1]
        if len(parts) < 2:
            continue
            
        if i + 1 >= len(lines):
            continue
            
        next_line = lines[i + 1].strip()
        if '|' not in next_line:
            continue
            
        next_parts = [part.strip() for part in next_line.split('|')]
        if next_parts and next_parts[0] == '':
            next_parts = next_parts[1:]
        if next_parts and next_parts[-1] == '':
            next_parts = next_parts[:-1]
        if len(next_parts) < 2:
            continue
            
        is_separator = True
        for part in next_parts:
            if part == '':
                is_separator = False
                break
            if not all(c in '-:' for c in part):
                is_separator = False
                break
            if '-' not in part:
                is_separator = False
                break
                
        if not is_separator:
            continue
            
        table_start = i
        table_data.append(parts)
        j = i + 2
        while j < len(lines):
            data_line = lines[j].strip()
            if '|' not in data_line:
                break
                
            data_parts = [part.strip() for part in data_line.split('|')]
            if data_parts and data_parts[0] == '':
                data_parts = data_parts[1:]
            if data_parts and data_parts[-1] == '':
                data_parts = data_parts[:-1]
            if len(data_parts) < 2 or len(data_parts) != len(parts):
                break
                
            table_data.append(data_parts)
            j += 1
        table_end = j
        break
        
    if table_start == -1:
        return text
        
    # Convert the table data to CSV with selective quoting
    csv_lines = []
    for row in table_data:
        csv_row = []
        for cell in row:
            if should_quote_field(cell):
                escaped_cell = cell.replace('"', '""')
                csv_row.append(f'"{escaped_cell}"')
            else:
                csv_row.append(cell)
        csv_lines.append(','.join(csv_row))
    csv_table = '\n'.join(csv_lines)
    
    # Reconstruct the text with the CSV table
    before_table = '\n'.join(lines[:table_start]) if table_start > 0 else ''
    after_table = '\n'.join(lines[table_end:]) if table_end < len(lines) else ''
    
    result_parts = []
    if before_table:
        result_parts.append(before_table)
    result_parts.append(csv_table)
    if after_table:
        result_parts.append(after_table)
    
    return '\n'.join(result_parts)



def consolidate_chat_history(messages):
    # Extract system messages and conversation history
    system_messages = [msg['content'] for msg in messages if msg['role'] == 'system']
    conversation = [msg for msg in messages if msg['role'] != 'system']
    
    # Build consolidated content
    consolidated_content = ""
    
    # Add conversation history
    for i, item in enumerate(conversation, 1):
        if "content_markdown" in item:
            if item['sql_mode'] == "database" and item['content_markdown'] != "" and item["role"] == "assistant":
                #content = item['content_markdown']
                content = markdown_table_to_csv(item['content_markdown'])
                token_count = len(encoding.encode(content))
                print(f"Content table token: {token_count}")
                consolidated_content += f"==================\nTable: {item['table_title']}\nDescription: {item['table_description']}\n==================\n{content}\n\n"

            if item['sql_mode'] == "assistant":
                #content = item['content_markdown']
                prefix = "User Question" if item['role'] == 'user' else "Assistant Answer"
                header = f"{prefix}"
                content = markdown_table_to_csv(item['content'])
                token_count = len(encoding.encode(content))
                print(f"Content {prefix} token: {token_count}")
                consolidated_content += f"================== {header} ==================\n{item['content']}\n\n"
            
        if "content_markdown" not in item:
            prefix = "User Question" if item['role'] == 'user' else "Assistant Answer"
            header = f"{prefix} {i}"
            consolidated_content += f"================== {header} ==================\n{item['content']}\n\n"
    # Create final message structure
    result = []
    if system_messages:
        result.append({"role": "system", "content": "\n".join(system_messages)})
    
    token_count = len(encoding.encode(consolidated_content.strip()))
    print(f"Total tokens: {token_count}")
    result.append({"role": "user", "content": consolidated_content.strip()})

    result_object = {
        'chat_messages': result,
        'total_tokens': token_count
    }
    
    return result_object



def count_tokens(text: str) -> int:
    """Count the number of tokens in a given text using the cl100k_base encoding.
    
    Args:
        text: The input text to count tokens for.
        
    Returns:
        The number of tokens in the text.
    """
    stripped_text = text.strip()
    return len(encoding.encode(stripped_text))


def shorten_text(text, max_length):
    if len(text) > max_length:
        return text[:max_length] + "..."
    return text




def get_safe_json(request):
    """Safely extract JSON from Flask request with proper content-type checking"""
    if not hasattr(request, 'is_json') or not hasattr(request, 'get_json'):
        return {}  # Not a Flask request or missing required methods
    
    if not request.is_json:
        return {}  # Not a JSON request
    
    try:
        return request.get_json() or {}
    except:
        return {}  # JSON parsing failed











