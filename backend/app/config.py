import os
from pathlib import Path
from dotenv import load_dotenv

# Load env variables
load_dotenv()

class Settings:
    # API Keys
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    CHROMA_DB_PATH: str = os.getenv("CHROMA_DB_PATH", str(BASE_DIR / "chroma_db"))
    CSV_DATASET_PATH: str = os.getenv("CSV_DATASET_PATH", str(BASE_DIR / "resumes" / "Resume Screening.csv"))
    
    # Models
    EMBEDDING_MODEL_NAME: str = "all-MiniLM-L6-v2"
    RERANKER_MODEL_NAME: str = "BAAI/bge-reranker-base"
    
    # App Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # Optimization Settings
    DEV_MAX_RESUMES: int = int(os.getenv("DEV_MAX_RESUMES", 25))
    TORCH_THREAD_LIMIT: int = int(os.getenv("TORCH_THREAD_LIMIT", 4))
    INGEST_THROTTLE_SLEEP: float = float(os.getenv("INGEST_THROTTLE_SLEEP", 0.0))
    CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", 1000))
    CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", 200))

settings = Settings()

# Ensure directories exist
os.makedirs(settings.CHROMA_DB_PATH, exist_ok=True)
