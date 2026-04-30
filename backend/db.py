
# db.py
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from urllib.parse import quote_plus

username = os.getenv("DB_USER")
password = quote_plus(os.getenv("DB_PASSWORD"))   # encode special chars
host = os.getenv("DB_HOST")
database = os.getenv("DB_NAME")
port = os.getenv("DB_PORT")
driver = os.getenv("DB_DRIVER", "ODBC Driver 17 for SQL Server")

DATABASE_URL = (
    f"mssql+pyodbc://{username}:{password}@{host}:{port}/{database}"
    f"?driver={quote_plus(driver)}&TrustServerCertificate=yes"
)

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=1800,
    connect_args={
        "timeout": 30,
        "ConnectionTimeout": 30,
    }
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)