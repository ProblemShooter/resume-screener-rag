import logging
from sentence_transformers import SentenceTransformer, CrossEncoder
from backend.app.config import settings

logger = logging.getLogger(__name__)

class EmbedService:
    def __init__(self):
        self._embed_model = None
        self._rerank_model = None

    @property
    def embed_model(self):
        if self._embed_model is None:
            logger.info(f"Loading embedding model: {settings.EMBEDDING_MODEL_NAME}...")
            # sentence-transformers downloads/caches this model automatically
            self._embed_model = SentenceTransformer(settings.EMBEDDING_MODEL_NAME)
            logger.info("Embedding model loaded successfully.")
        return self._embed_model

    @property
    def rerank_model(self):
        if self._rerank_model is None:
            logger.info(f"Loading reranking model: {settings.RERANKER_MODEL_NAME}...")
            # sentence-transformers downloads/caches this model automatically
            self._rerank_model = CrossEncoder(settings.RERANKER_MODEL_NAME)
            logger.info("Reranking model loaded successfully.")
        return self._rerank_model

    def get_embeddings(self, texts: list[str]) -> list[list[float]]:
        """
        Generates dense vector embeddings for a list of texts.
        """
        if not texts:
            return []
        embeddings = self.embed_model.encode(texts, show_progress_bar=False)
        return embeddings.tolist()

    def get_embedding(self, text: str) -> list[float]:
        """
        Generates a dense vector embedding for a single text.
        """
        return self.get_embeddings([text])[0]

    def rerank(self, query: str, documents: list[str], candidate_ids: list[str]) -> list[dict]:
        """
        Re-ranks a list of candidate documents against a query using a Cross-Encoder.
        Returns a list of dicts: {"index": int, "candidate_id": str, "score": float}
        """
        if not documents:
            return []
            
        logger.info(f"Reranking {len(documents)} documents against query: '{query[:50]}...'")
        
        # Prepare pairs: [ [query, doc1], [query, doc2], ... ]
        pairs = [[query, doc] for doc in documents]
        
        # Get relevance scores
        scores = self.rerank_model.predict(pairs)
        
        # Combine with candidate metadata
        ranked_results = []
        for idx, (score, cid) in enumerate(zip(scores, candidate_ids)):
            # Convert cross-encoder logit/raw score to a normalized probability-like score (0 to 1) for UI display
            # BGE Reranker output is typically a float. Sigmoid normalization helps bound it.
            import math
            normalized_score = 1 / (1 + math.exp(-score))
            
            ranked_results.append({
                "index": idx,
                "candidate_id": cid,
                "rerank_score": round(normalized_score * 100, 2),
                "raw_score": float(score)
            })
            
        # Sort by rerank score descending
        ranked_results = sorted(ranked_results, key=lambda x: x["rerank_score"], reverse=True)
        return ranked_results

embed_service = EmbedService()
