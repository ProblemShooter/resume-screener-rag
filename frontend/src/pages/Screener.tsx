import { useState } from 'react';
import { FileText, Play, Search, AlertCircle, RefreshCw, ChevronRight, Filter, Upload, CheckCircle2 } from 'lucide-react';
import { api, type ScreenResponse } from '../api';
import { anonymizeName } from './Dashboard';

interface ScreenerProps {
  screenResults: ScreenResponse | null;
  setScreenResults: (res: ScreenResponse) => void;
  jobDescription: string;
  setJobDescription: (jd: string) => void;
  onSelectCandidate: (id: string) => void;
  blindScreening: boolean;
  refreshData?: () => Promise<void>;
}

const CATEGORIES = [
  "All", "Data Science", "HR", "Advocate", "Arts", "Web Designing", "Mechanical Engineering",
  "Sales", "Health and fitness", "Civil Engineering", "Java Developer", "Business Analyst",
  "SAP Developer", "Automation Testing", "Electrical Engineering", "Operations Manager"
];

export default function Screener({
  screenResults,
  setScreenResults,
  jobDescription,
  setJobDescription,
  onSelectCandidate,
  blindScreening,
  refreshData
}: ScreenerProps) {
  const [category, setCategory] = useState<string>('All');
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // File Upload State
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadCategory, setUploadCategory] = useState<string>('Data Science');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleScreen = async () => {
    if (!jobDescription.trim()) {
      setError("Please paste a valid Job Description first.");
      return;
    }
    setError(null);
    setLoading(true);
    
    try {
      setLoadingStep("Retrieving candidate matches from ChromaDB (Stage 1)...");
      await new Promise(r => setTimeout(r, 700));
      
      setLoadingStep("Reranking candidates with Local BGE Cross-Encoder (Stage 2)...");
      await new Promise(r => setTimeout(r, 700));
      
      setLoadingStep("Evaluating skill matching and gaps via Groq AI (Stage 3)...");
      const results = await api.screenCandidates(jobDescription, category);
      
      setScreenResults(results);
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.detail || "An error occurred while screening candidates. Make sure Groq API key is valid.");
    } finally {
      setLoading(false);
      setLoadingStep('');
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    try {
      await api.uploadCandidateResume(selectedFile, uploadCategory);
      setUploadSuccess(`Successfully indexed "${selectedFile.name}" under "${uploadCategory}"`);
      setSelectedFile(null);
      const fileInput = document.getElementById('resume-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      if (refreshData) await refreshData();
    } catch (err: any) {
      console.error(err);
      setUploadError(err.response?.data?.detail || "Failed to process and index resume file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      {/* Left Input Panels: Match Criteria & Ingest Resume */}
      <div className="space-y-8 lg:col-span-1 h-fit">
        {/* Match Criteria */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-850 shadow-sm space-y-6">
          <div>
            <h3 className="font-extrabold text-base">Match Criteria</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Configure parameters for screening candidate pools.</p>
          </div>

          {/* Category filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
              <Filter size={13} />
              Filter Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 rounded-xl px-3 py-2.5 text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none font-bold text-slate-700 dark:text-slate-350"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Job Description input */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 uppercase tracking-wider">
              <FileText size={13} />
              Job Description (JD)
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste your job description requirements, skills, and qualifications here..."
              className="w-full h-72 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 rounded-xl p-4 text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none leading-relaxed resize-none font-medium"
            />
          </div>

          {error && (
            <div className="flex gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-xs font-medium">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleScreen}
            disabled={loading}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-slate-200 dark:disabled:bg-slate-850 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-primary-500/20 active:scale-98 transition-all"
          >
            {loading ? (
              <RefreshCw className="animate-spin text-white" size={14} />
            ) : (
              <Play size={13} fill="white" />
            )}
            {loading ? 'Processing Pipeline...' : 'Run Screening Engine'}
          </button>
        </div>

        {/* Upload Resume Incremental */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-850 shadow-sm space-y-5">
          <div>
            <h3 className="font-extrabold text-base flex items-center gap-2">
              <Upload size={17} className="text-primary-500" />
              Quick Ingestion
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Directly upload and index new resumes (PDF, DOCX, TXT) into the active database.
            </p>
          </div>

          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Ingestion Category
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 font-bold text-slate-700 dark:text-slate-350"
              >
                {CATEGORIES.filter(c => c !== "All").map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Resume File
              </label>
              <input
                id="resume-file-input"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                required
                className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border file:border-slate-200/55 dark:file:border-slate-800 file:text-[10px] file:font-black file:uppercase file:tracking-wider file:bg-slate-50 dark:file:bg-slate-950 file:text-slate-600 dark:file:text-slate-300 hover:file:bg-slate-100 cursor-pointer"
              />
            </div>

            {uploadError && (
              <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[11px] font-medium">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="flex gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl text-[11px] font-medium">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full bg-slate-950 hover:bg-slate-900 dark:bg-slate-50 dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200/10 active:scale-98 transition-all disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <RefreshCw className="animate-spin text-primary-500" size={13} />
                  Parsing Resume...
                </>
              ) : (
                <>
                  <Upload size={13} />
                  Ingest & Vectorize
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right Content Panel: Match Leaderboard / Results */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-850 shadow-sm lg:col-span-2 space-y-6 min-h-[450px] flex flex-col">
        {loading ? (
          /* Loading Pipeline State */
          <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-5">
            <div className="relative">
              <div className="w-14 h-14 border-4 border-primary-100 dark:border-primary-950 rounded-full animate-spin border-t-primary-500" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 animate-pulse">
                {loadingStep}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Retrieving contextual vectors and running deep neural re-ranking...</p>
            </div>
          </div>
        ) : screenResults ? (
          /* Results Scored State */
          <div className="space-y-6 flex-1 flex flex-col">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-base">Match Results</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500">Candidates sorted by cross-encoder neural match scores.</p>
              </div>
              <span className="bg-primary-500/10 text-primary-500 px-3 py-1 rounded-full text-xs font-bold border border-primary-500/20">
                {screenResults.results.length} Candidates Scored
              </span>
            </div>

            {screenResults.results.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-650">
                <Search size={44} strokeWidth={1.5} className="mb-2" />
                <p className="text-xs font-bold">No candidate matches found in this category.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {screenResults.results.map((res) => (
                  <div
                    key={res.candidate_id}
                    className="p-5 bg-slate-50/30 dark:bg-slate-950 hover:bg-slate-50/70 dark:hover:bg-slate-850/20 border border-slate-200/50 dark:border-slate-850 rounded-2xl flex flex-col md:flex-row justify-between gap-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm"
                  >
                    {/* Candidate Identity */}
                    <div className="flex gap-4">
                      <div className="w-12 h-12 bg-primary-500/10 border border-primary-500/20 text-primary-500 font-extrabold rounded-xl flex items-center justify-center shrink-0">
                        #{res.rank}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100">
                            {anonymizeName(res.candidate_name, blindScreening)}
                          </span>
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800 px-2 py-0.5 rounded font-bold uppercase tracking-wider text-slate-500">
                            {res.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                          <b className="text-slate-600 dark:text-slate-300">Verdict:</b> {res.evaluation.verdict_summary}
                        </p>
                      </div>
                    </div>

                    {/* Scores & Profile CTA */}
                    <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100 dark:border-slate-850">
                      <div className="flex gap-4 shrink-0">
                        {/* Vector Similarity */}
                        <div className="text-center">
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Cosine Sim</span>
                          <span className="block font-bold text-xs text-slate-500 dark:text-slate-400 mt-0.5">{res.initial_score.toFixed(0)}%</span>
                        </div>
                        {/* Neural Reranker Score */}
                        <div className="text-center">
                          <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Neural Rank</span>
                          <span className="block font-black text-sm text-primary-500 mt-0.5">{res.rerank_score.toFixed(0)}%</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onSelectCandidate(res.candidate_id)}
                        className="inline-flex items-center gap-1.5 bg-primary-500 hover:bg-primary-600 text-white font-bold px-3 py-2 rounded-xl text-xs shadow-md shadow-primary-500/10 active:scale-95 transition-all"
                      >
                        Deep Dive
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Empty / Unexecuted State */
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-650 space-y-3">
            <Search size={48} strokeWidth={1.5} className="text-slate-200 dark:text-slate-800" />
            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No Screening Run Yet</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-xs">
                Paste a Job Description and click "Run Screening Engine" to evaluate candidate matches.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
