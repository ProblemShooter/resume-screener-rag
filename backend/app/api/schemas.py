from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class ScreenRequest(BaseModel):
    job_description: str = Field(..., description="The job description to screen candidates against")
    category: str = Field("All", description="Filter candidates by Category before screening")

class ChatMessage(BaseModel):
    role: str = Field(..., description="Either 'user' or 'assistant'")
    content: str = Field(..., description="Content of the message")

class ChatRequest(BaseModel):
    candidate_id: str = Field(..., description="The unique candidate ID")
    message: str = Field(..., description="Recruiter message/question")
    history: List[ChatMessage] = Field(default=[], description="Message history for context")

class CandidateResponse(BaseModel):
    candidate_id: str
    candidate_name: str
    email: str
    category: str

class MatchDetails(BaseModel):
    overall_match_percentage: int
    skills_match_percentage: int
    experience_match_percentage: int
    education_match_percentage: int
    project_match_percentage: int
    strengths: List[str]
    weaknesses: List[str]
    missing_skills: List[str]
    verdict_summary: str

class ScreenResult(BaseModel):
    candidate_id: str
    candidate_name: str
    email: str
    category: str
    initial_score: float = Field(..., description="First stage cosine similarity score")
    rerank_score: float = Field(..., description="Second stage cross-encoder score")
    rank: int
    evaluation: MatchDetails

class ScreenResponse(BaseModel):
    job_description: str
    results: List[ScreenResult]
    total_screened: int

class ChatResponse(BaseModel):
    response: str

class ChunkScore(BaseModel):
    section_name: str
    text: str
    similarity: float

class ExplainResponse(BaseModel):
    candidate_id: str
    candidate_name: str
    matching_chunks: List[ChunkScore]
    evaluation: MatchDetails

class CandidateAddRequest(BaseModel):
    resume_text: str = Field(..., description="Raw text of the resume")
    category: str = Field("General", description="Category for the candidate")

