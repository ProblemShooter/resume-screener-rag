import json
import re
import logging
from groq import Groq
from backend.app.config import settings

logger = logging.getLogger(__name__)

class LlmService:
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self._client = None
        # Use llama-3.3-70b for heavy analysis, fallback to llama-3.1-8b for faster/cheaper chat
        self.analysis_model = "llama-3.3-70b-versatile"
        self.chat_model = "llama-3.1-8b-instant"

    @property
    def client(self):
        if self._client is None:
            if not self.api_key:
                logger.warning("GROQ_API_KEY is not set. LLM calls will fail.")
            self._client = Groq(api_key=self.api_key)
        return self._client

    def evaluate_candidate_vs_jd(self, candidate_name: str, resume_text: str, job_description: str) -> dict:
        """
        Uses Groq to compare a resume against a Job Description and output structured matching metrics.
        """
        logger.info(f"LLM evaluating candidate: {candidate_name}...")
        
        prompt = f"""
You are an expert technical recruiter. Analyze the following Candidate Resume against the Job Description and provide a highly detailed, honest evaluation.

JOB DESCRIPTION:
{job_description}

CANDIDATE RESUME:
{resume_text}

Provide your response in raw JSON format. Do not write any preamble, explanation, or markdown fences. The JSON must match the following structure:
{{
    "overall_match_percentage": <int, between 0 and 100>,
    "skills_match_percentage": <int, between 0 and 100>,
    "experience_match_percentage": <int, between 0 and 100>,
    "education_match_percentage": <int, between 0 and 100>,
    "project_match_percentage": <int, between 0 and 100>,
    "strengths": ["strength 1", "strength 2", ...],
    "weaknesses": ["weakness/gap 1", "weakness/gap 2", ...],
    "missing_skills": ["missing skill 1", "missing skill 2", ...],
    "verdict_summary": "An executive 2-3 sentence recommendation on whether to hire/shortlist this candidate."
}}
"""
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a professional HR intelligence agent. You always output valid, clean JSON without code blocks or additional text."},
                    {"role": "user", "content": prompt}
                ],
                model=self.analysis_model,
                temperature=0.2, # Low temperature for consistent grading
                response_format={"type": "json_object"}
            )
            
            response_text = chat_completion.choices[0].message.content
            data = json.loads(response_text)
            return data
            
        except Exception as e:
            logger.error(f"Error evaluating candidate {candidate_name}: {str(e)}")
            # Fallback grade if LLM fails
            return {
                "overall_match_percentage": 50,
                "skills_match_percentage": 50,
                "experience_match_percentage": 50,
                "education_match_percentage": 50,
                "project_match_percentage": 50,
                "strengths": ["Strong engineering interest"],
                "weaknesses": ["Requires manual evaluation due to API timeout"],
                "missing_skills": [],
                "verdict_summary": f"Could not perform complete AI evaluation. Error: {str(e)}"
            }

    def generate_custom_interview_questions(self, candidate_name: str, resume_text: str, job_description: str) -> list[str]:
        """
        Generates 3 to 5 customized technical and behavioral interview questions based on candidate skill gaps.
        """
        logger.info(f"LLM generating interview questions for candidate: {candidate_name}...")
        
        prompt = f"""
Analyze the Resume against the Job Description. Identify specific skill gaps, experience differences, or potential weaker areas for this candidate.
Generate 4 highly tailored interview questions (a mix of deep technical questions and scenario-based queries) that will help the interviewer assess these specific areas.
Do not ask generic questions like "Tell me about yourself." Focus on their gaps.

JOB DESCRIPTION:
{job_description}

CANDIDATE RESUME:
{resume_text}

Output the questions in JSON format. Do not write any markdown formatting or extra text.
Structure:
{{
  "questions": [
    "Question 1: ...",
    "Question 2: ...",
    "Question 3: ...",
    "Question 4: ..."
  ]
}}
"""
        try:
            chat_completion = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": "You are a senior engineering manager conducting interviews. You output valid JSON list of custom interview questions."},
                    {"role": "user", "content": prompt}
                ],
                model=self.chat_model,
                temperature=0.7,
                response_format={"type": "json_object"}
            )
            response_text = chat_completion.choices[0].message.content
            data = json.loads(response_text)
            return data.get("questions", [])
        except Exception as e:
            logger.error(f"Error generating questions: {str(e)}")
            return [
                "Could you walk us through a complex engineering project you spearheaded and the key challenges faced?",
                "How do you keep your technical skills up-to-date with emerging industry frameworks?",
                "Describe a situation where you had a technical disagreement with a teammate. How did you resolve it?"
            ]

    def chat_with_resume(self, candidate_name: str, resume_chunks: list[dict], message_history: list[dict]) -> str:
        """
        Conversational chat interface for a single candidate resume (Single Candidate RAG).
        Includes matching resume sections as reference.
        """
        # Format the resume chunks as context
        context_str = ""
        for chunk in resume_chunks:
            sec = chunk.get("section_name", "general").upper()
            context_str += f"[{sec} SECTION]:\n{chunk['text']}\n\n"
            
        system_prompt = f"""
You are an HR Assistant. You are answering questions from a recruiter about candidate: {candidate_name}.
Below is the candidate's resume content. You must answer questions based ONLY on this content.

CANDIDATE RESUME CONTEXT:
{context_str}

CRITICAL RULES:
1. Ground your answers ONLY on the provided context.
2. If the recruiter asks about something not mentioned in the resume (e.g. "Does he know Kubernetes?" when Kubernetes is not in the text), you must clearly say: "The candidate's resume does not contain any mention of Kubernetes." Do not make things up.
3. Be concise and professional.
4. Cite the section (e.g., "According to the Experience section...") in your response.
"""
        
        # Prepare messages array
        messages = [{"role": "system", "content": system_prompt}]
        for msg in message_history:
            messages.append({"role": msg["role"], "content": msg["content"]})
            
        try:
            chat_completion = self.client.chat.completions.create(
                messages=messages,
                model=self.chat_model,
                temperature=0.3
            )
            return chat_completion.choices[0].message.content
        except Exception as e:
            logger.error(f"Error chatting with candidate resume: {str(e)}")
            return f"I'm sorry, I encountered an issue retrieving the answer: {str(e)}"

llm_service = LlmService()
