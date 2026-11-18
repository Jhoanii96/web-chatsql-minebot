FROM ubuntu:22.04

# Install system dependencies first (including curl)
RUN apt-get update && apt-get install -y \
    curl \
    gnupg2 \
    python3.11 \
    python3.11-dev \
    python3.11-venv \
    python3-pip \
    unixodbc-dev \
    && rm -rf /var/lib/apt/lists/*

# Install MS SQL Server ODBC driver
RUN curl https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor -o /usr/share/keyrings/microsoft-prod.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/microsoft-prod.gpg] https://packages.microsoft.com/ubuntu/22.04/prod jammy main" > /etc/apt/sources.list.d/mssql-release.list \
    && apt-get update \
    && ACCEPT_EULA=Y apt-get install -y msodbcsql17

# Create and activate virtual environment
RUN python3.11 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install cffi

COPY . .

ENV PORT=8000
EXPOSE 8000

# Comman to start Flask
CMD ["python", "app.py"]

