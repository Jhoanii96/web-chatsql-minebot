# Chat SQL Mine Bot

Aplicacion web desarrollada con Flask que permite consultar datos, documentos y modelos analiticos mediante lenguaje natural.

## Que hace

El servicio centraliza varias fuentes de informacion y las combina con modelos de OpenAI o Azure OpenAI:

- Interpreta preguntas de usuarios y genera consultas SQL o DAX.
- Consulta Azure SQL Database y devuelve los resultados mediante tablas y respuestas en espanol.
- Usa Azure OpenAI para chat completions y embeddings.
- Puede usar Pinecone como indice vectorial para recuperacion de documentos.
- Guarda imagenes y archivos en Azure Blob Storage.
- Consulta datasets y tablas de Power BI mediante la API REST de Power BI.
- Autentica usuarios locales o con Microsoft Entra ID.
- Guarda sesiones de actividad, permisos y datos de usuario en Azure SQL Database.
- Puede recuperar secretos desde Azure Key Vault.

## Arquitectura

```text
Usuario
  |
  | HTTPS
  v
Azure Web App / Contenedor
  |
  +--> Microsoft Entra ID ----> inicio de sesion y permisos
  +--> Azure SQL Database ----> datos, usuarios y actividad
  +--> Azure OpenAI ----------> chat y embeddings
  +--> Pinecone --------------> busqueda vectorial de documentos
  +--> Azure Blob Storage ----> archivos e imagenes
  +--> Power BI REST API -----> datasets y consultas DAX
  +--> Azure Key Vault -------> secretos opcionales
```

## Funcionalidades principales

- Chat SQL para convertir preguntas a consultas contra Azure SQL Database.
- Chat de flujo para trabajar con consultas y resultados guardados.
- Consulta de modelos y datos de Power BI mediante DAX.
- Carga y consulta de PDF y otros documentos.
- Busqueda semantica con embeddings y Pinecone.
- Administracion de usuarios, permisos y chats guardados.
- Autenticacion local con contrasenas BCrypt o acceso mediante Entra ID.

## Tecnologias

- Python 3.11 y Flask
- SQLAlchemy y pyodbc con ODBC Driver 17 para SQL Server
- Azure OpenAI SDK y OpenAI SDK
- Azure Identity y Azure Key Vault
- Azure Blob Storage SDK
- Pinecone
- LangChain
- Power BI REST API
- Microsoft Identity para Flask

## Configuracion local

1. Cree un entorno virtual:

```powershell
python -m venv .venv
.\\.venv\\Scripts\\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

2. Cree el entorno local desde el ejemplo:

```powershell
Copy-Item .env.example .env
```

3. Complete los valores reales en `.env`.

4. Instale ODBC Driver 17 para SQL Server si trabaja fuera del contenedor.

5. Inicie la aplicacion:

```powershell
python app.py
```

La aplicacion queda disponible en `http://localhost:8000`.

> `.env` contiene secretos reales o locales y esta excluido de Git. Solo `.env.example` debe subir al repositorio. No sustituya ni registre secretos reales en los archivos de ejemplo.
