import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://aadityaj-resume-screen-backend.hf.space/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface Candidate {
  candidate_id: string;
  candidate_name: string;
  email: string;
  category: string;
}

export interface MatchDetails {
  overall_match_percentage: number;
  skills_match_percentage: number;
  experience_match_percentage: number;
  education_match_percentage: number;
  project_match_percentage: number;
  strengths: string[];
  weaknesses: string[];
  missing_skills: string[];
  verdict_summary: string;
}

export interface ScreenResult {
  candidate_id: string;
  candidate_name: string;
  email: string;
  category: string;
  initial_score: number;
  rerank_score: number;
  rank: number;
  evaluation: MatchDetails;
}

export interface ScreenResponse {
  job_description: string;
  results: ScreenResult[];
  total_screened: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChunkScore {
  section_name: string;
  text: string;
  similarity: number;
}

export interface ExplainResponse {
  candidate_id: string;
  candidate_name: string;
  matching_chunks: ChunkScore[];
  evaluation: MatchDetails;
}

export interface DatabaseStats {
  indexed_resumes: number;
  total_resumes_available: number;
  dev_max_resumes: number;
}

export const api = {
  getCandidates: async (): Promise<Candidate[]> => {
    const response = await apiClient.get<Candidate[]>('/candidates');
    return response.data;
  },

  screenCandidates: async (jobDescription: string, category: string): Promise<ScreenResponse> => {
    const response = await apiClient.post<ScreenResponse>('/screen', {
      job_description: jobDescription,
      category: category,
    });
    return response.data;
  },

  chatWithCandidate: async (
    candidateId: string,
    message: string,
    history: ChatMessage[]
  ): Promise<string> => {
    const response = await apiClient.post<{ response: string }>('/chat', {
      candidate_id: candidateId,
      message,
      history,
    });
    return response.data.response;
  },

  getInterviewQuestions: async (candidateId: string, jd: string): Promise<string[]> => {
    const response = await apiClient.get<string[]>(`/candidates/${candidateId}/questions`, {
      params: { jd },
    });
    return response.data;
  },

  getExplainData: async (candidateId: string, jd: string): Promise<ExplainResponse> => {
    const response = await apiClient.get<ExplainResponse>(`/candidates/${candidateId}/explain`, {
      params: { jd },
    });
    return response.data;
  },

  getStats: async (): Promise<DatabaseStats> => {
    const response = await apiClient.get<DatabaseStats>('/stats');
    return response.data;
  },

  repopulateDatabase: async (maxResumes: number): Promise<{ status: string; message: string; indexed_resumes: number }> => {
    const response = await apiClient.post<{ status: string; message: string; indexed_resumes: number }>(
      '/settings/repopulate',
      null,
      { params: { max_resumes: maxResumes } }
    );
    return response.data;
  },

  uploadCandidateResume: async (file: File, category: string): Promise<{ status: string; message: string; candidate_id: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    const response = await apiClient.post<{ status: string; message: string; candidate_id: string }>(
      '/candidates/upload',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },
};
