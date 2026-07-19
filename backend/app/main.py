import os
import logging
import uvicorn
import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.config import settings

# Programmatically limit CPU threads to avoid high CPU load and thermal throttling
os.environ["OMP_NUM_THREADS"] = str(settings.TORCH_THREAD_LIMIT)
os.environ["MKL_NUM_THREADS"] = str(settings.TORCH_THREAD_LIMIT)
os.environ["OPENBLAS_NUM_THREADS"] = str(settings.TORCH_THREAD_LIMIT)
os.environ["VECLIB_MAXIMUM_THREADS"] = str(settings.TORCH_THREAD_LIMIT)
os.environ["NUMEXPR_NUM_THREADS"] = str(settings.TORCH_THREAD_LIMIT)

torch.set_num_threads(settings.TORCH_THREAD_LIMIT)

from backend.app.services.db_service import db_service
from backend.app.api.routes import router

# Setup Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="AI Resume Screener API",
    description="Production-ready API for semantic resume screening and evaluation.",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, restrict to frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Include Router
app.include_router(router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "AI Resume Screener API is running.", "status": "healthy"}

@app.on_event("startup")
def startup_event():
    logger.info("Starting up FastAPI application...")
    try:
        # Prepopulate vector database with resumes from the CSV file
        db_service.load_initial_dataset(max_rows=150)
    except Exception as e:
        logger.error(f"Failed to populate database on startup: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(
        "backend.app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=True
    )
