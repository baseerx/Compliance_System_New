# db.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from urllib.parse import quote_plus

username = "sa"
password = quote_plus("As@100")   # encode special chars
host = r"DESKTOP-MD8V8H2\SQLEXPRESS"
database = "Compliance_System"
driver = "ODBC+Driver+17+for+SQL+Server"

DATABASE_URL = (
    f"mssql+pyodbc://{username}:{password}@{host}/{database}"
    f"?driver={driver}&TrustServerCurertificate=yes"
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
