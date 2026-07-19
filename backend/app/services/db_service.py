import os
import re
import csv
import time
import logging
import chromadb
from backend.app.config import settings
from backend.app.utils.text_utils import chunk_resume_by_sections
from backend.app.services.embed_service import embed_service

logger = logging.getLogger(__name__)

# Sample realistic names to assign if email/resume does not contain a name
SAMPLE_NAMES = [
    "Aaditya Sharma", "Priya Patel", "Rohan Gupta", "Ananya Iyer", "Karan Malhotra",
    "Sanya Reddy", "Amit Verma", "Sneha Rao", "Vikram Singh", "Divya Joshi",
    "Rahul Nair", "Neha Kapoor", "Siddharth Bose", "Aditi Saxena", "Manish Choudhury",
    "Ritu Mishra", "Sanjay Dutt", "Pooja Hegde", "Arjun Rampal", "Deepika Padukone",
    "Ranbir Kapoor", "Alia Bhatt", "Varun Dhawan", "Kriti Sanon", "Kartik Aaryan"
]

class DbService:
    def __init__(self):
        # Initialize Persistent Chroma Client
        self.chroma_client = chromadb.PersistentClient(path=settings.CHROMA_DB_PATH)
        self.collection_name = "resumes"
        self.collection = self.chroma_client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"} # Use cosine similarity
        )

    def extract_email_and_name(self, text: str, index: int) -> tuple[str, str]:
        """
        Attempts to extract an email and a name from a raw resume text.
        If email is found, names are generated from the email username or a fallback sample list.
        """
        # Find email using regex
        email_match = re.search(r'\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b', text)
        email = email_match.group(0) if email_match else f"candidate_{index}@example.com"
        
        # Determine name
        name = ""
        # 1. Look for name indicator (e.g., "Name: John Doe" or "Name - John Doe")
        name_match = re.search(r'\bname[:\-]\s*([a-zA-Z\s]{3,25})\b', text, re.IGNORECASE)
        if name_match:
            name = name_match.group(1).split('\n')[0].strip()
        # 2. Extract name from email username
        elif email_match:
            username = email.split('@')[0]
            # Replace dots/underscores and title-case it (e.g. bhawana.chd -> Bhawana Chd)
            name_parts = re.split(r'[._-]', username)
            name = " ".join([p.capitalize() for p in name_parts if len(p) > 1])
            # If name is just numbers or weird, clear it
            if not re.match(r'^[a-zA-Z\s]+$', name):
                name = ""
                
        # 3. Fallback to a realistic sample name
        if not name or len(name) < 3:
            name = SAMPLE_NAMES[index % len(SAMPLE_NAMES)]
            
        return email, name

    def add_candidate(self, resume_text: str, category: str, index: int) -> dict:
        """
        Processes a raw resume: extracts basic info, chunks it, embeds it, and stores it in ChromaDB.
        """
        email, name = self.extract_email_and_name(resume_text, index)
        
        # Avoid duplicate ingestion by checking if this email already exists
        existing = self.collection.get(where={"email": email})
        if existing and existing["ids"]:
            candidate_id = existing["metadatas"][0]["candidate_id"]
            name = existing["metadatas"][0]["candidate_name"]
            logger.info(f"Candidate {name} ({email}) already exists in ChromaDB. Skipping embedding generation.")
            return {
                "candidate_id": candidate_id,
                "candidate_name": name,
                "email": email,
                "category": category,
                "chunks_count": len(existing["ids"]),
                "status": "already_exists"
            }
            
        candidate_id = f"cand_{index:04d}"
        
        # Segment into sections using project settings
        chunks = chunk_resume_by_sections(
            resume_text, 
            chunk_size=settings.CHUNK_SIZE, 
            overlap=settings.CHUNK_OVERLAP
        )
        
        chunk_texts = [c["text"] for c in chunks]
        chunk_embeddings = embed_service.get_embeddings(chunk_texts)
        
        ids = []
        metadatas = []
        
        # Save all chunks for this candidate
        for i, chunk in enumerate(chunks):
            chunk_id = f"{candidate_id}_chunk_{i}"
            ids.append(chunk_id)
            metadatas.append({
                "candidate_id": candidate_id,
                "candidate_name": name,
                "email": email,
                "category": category,
                "chunk_id": chunk["chunk_id"],
                "section_name": chunk["section"]
            })
            
        self.collection.add(
            ids=ids,
            embeddings=chunk_embeddings,
            metadatas=metadatas,
            documents=chunk_texts
        )
        
        return {
            "candidate_id": candidate_id,
            "candidate_name": name,
            "email": email,
            "category": category,
            "chunks_count": len(chunks)
        }

    def search(self, query_text: str, category: str = None, limit: int = 15) -> list[dict]:
        """
        Queries ChromaDB for chunks matching the query text.
        Optionally filters by job category.
        """
        query_embedding = embed_service.get_embedding(query_text)
        
        where_filter = {}
        if category and category != "All":
            where_filter = {"category": category}
            
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=limit * 3,  # Fetch more chunks initially, we will group them by candidate
            where=where_filter if where_filter else None
        )
        
        # Process and structure the query results
        chunks = []
        if results and results["documents"]:
            docs = results["documents"][0]
            metas = results["metadatas"][0]
            ids = results["ids"][0]
            distances = results["distances"][0] if "distances" in results else [0.0] * len(docs)
            
            for i in range(len(docs)):
                # ChromaDB cosine distance: 0 is identical, 2 is opposite. 
                # Convert to similarity percentage: (1 - distance) * 100
                sim_score = (1.0 - distances[i]) * 100
                sim_score = max(0.0, min(100.0, sim_score)) # Clamp between 0 and 100
                
                chunks.append({
                    "chunk_id": ids[i],
                    "text": docs[i],
                    "similarity": round(sim_score, 2),
                    "candidate_id": metas[i]["candidate_id"],
                    "candidate_name": metas[i]["candidate_name"],
                    "email": metas[i]["email"],
                    "category": metas[i]["category"],
                    "section_name": metas[i]["section_name"]
                })
        return chunks

    def get_candidate_chunks(self, candidate_id: str) -> list[dict]:
        """
        Retrieves all text chunks belonging to a single candidate.
        """
        results = self.collection.get(
            where={"candidate_id": candidate_id}
        )
        
        chunks = []
        if results and results["documents"]:
            docs = results["documents"]
            metas = results["metadatas"]
            ids = results["ids"]
            
            for i in range(len(docs)):
                chunks.append({
                    "chunk_id": ids[i],
                    "text": docs[i],
                    "section_name": metas[i]["section_name"],
                    "chunk_id_int": metas[i]["chunk_id"]
                })
                
        # Sort by chunk_id index
        chunks = sorted(chunks, key=lambda x: x["chunk_id_int"])
        return chunks

    def get_all_candidates(self) -> list[dict]:
        """
        Scans all records and aggregates unique candidates.
        """
        results = self.collection.get()
        
        candidates = {}
        if results and results["metadatas"]:
            for meta in results["metadatas"]:
                cid = meta["candidate_id"]
                if cid not in candidates:
                    candidates[cid] = {
                        "candidate_id": cid,
                        "candidate_name": meta["candidate_name"],
                        "email": meta["email"],
                        "category": meta["category"]
                    }
        return list(candidates.values())

    def add_new_candidate(self, resume_text: str, category: str) -> dict:
        """
        Indexes a single candidate resume incrementally by finding the next index number.
        """
        candidates = self.get_all_candidates()
        indices = []
        for c in candidates:
            cid = c["candidate_id"]
            if cid.startswith("cand_"):
                try:
                    indices.append(int(cid.split("_")[1]))
                except ValueError:
                    pass
        next_index = max(indices) + 1 if indices else 0
        return self.add_candidate(resume_text, category, next_index)

    def load_initial_dataset(self, max_rows: int = None):
        """
        Reads lines from resumes/Resume Screening.csv and populates ChromaDB if empty.
        Uses settings.DEV_MAX_RESUMES as fallback limit.
        """
        if max_rows is None:
            max_rows = settings.DEV_MAX_RESUMES
            
        # Check if already populated
        existing = self.collection.count()
        if existing > 0:
            logger.info(f"Existing ChromaDB index found with {existing} records. Skipping CSV load.")
            return
            
        csv_path = settings.CSV_DATASET_PATH
        if not os.path.exists(csv_path):
            logger.error(f"Initial CSV not found at {csv_path}. Cannot pre-populate database.")
            return
            
        logger.info(f"Pre-populating ChromaDB with resumes from {csv_path} (max: {max_rows} rows)...")
        
        try:
            with open(csv_path, mode="r", encoding="utf-8") as file:
                reader = csv.DictReader(file)
                count = 0
                for row in reader:
                    category = row.get("Category", "General")
                    resume_text = row.get("Resume", "")
                    if not resume_text:
                        continue
                        
                    res = self.add_candidate(resume_text, category, count)
                    
                    # Apply cooling sleep pause to prevent CPU spikes if candidate was actually indexed
                    if res.get("status") != "already_exists":
                        time.sleep(settings.INGEST_THROTTLE_SLEEP)
                        
                    count += 1
                    
                    if count >= max_rows:
                        break
            
            # Explicit garbage collection to free up memory
            import gc
            gc.collect()
            logger.info(f"Successfully pre-populated database with {count} candidates.")
        except Exception as e:
            logger.error(f"Failed to load CSV: {str(e)}")

    def get_csv_total_count(self) -> int:
        """
        Counts the total candidate records in the CSV file.
        """
        csv_path = settings.CSV_DATASET_PATH
        if not os.path.exists(csv_path):
            return 0
        try:
            with open(csv_path, mode="r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                return sum(1 for row in reader)
        except Exception as e:
            logger.error(f"Error counting CSV rows: {str(e)}")
            return 0

    def clear_and_repopulate_database(self, max_rows: int) -> dict:
        """
        Clears the ChromaDB collection and re-populates it with the specified number of records.
        """
        logger.info(f"Clearing collection '{self.collection_name}' for database repopulation...")
        try:
            # Delete all documents in collection
            self.chroma_client.delete_collection(self.collection_name)
            self.collection = self.chroma_client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            logger.info(f"Collection cleared. Starting re-population of {max_rows} rows...")
            
            # Re-populate using the load_initial_dataset method
            self.load_initial_dataset(max_rows=max_rows)
            
            # Force garbage collection
            import gc
            gc.collect()
            
            return {
                "status": "success",
                "message": f"Successfully cleared and repopulated collection with {max_rows} candidate resumes.",
                "indexed_resumes": len(self.get_all_candidates())
            }
        except Exception as e:
            logger.error(f"Failed to clear and repopulate database: {str(e)}", exc_info=True)
            raise e

db_service = DbService()
