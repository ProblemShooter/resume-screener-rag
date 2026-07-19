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
  addActivity?: (type: 'upload' | 'screen' | 'status_change' | 'report_generation', message: string) => void;
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
  refreshData,
  addActivity
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
      setLoadingStep("Scanning candidate pool...");
      await new Promise(r => setTimeout(r, 100));
      
      setLoadingStep("Analyzing qualifications and matching criteria...");
      await new Promise(r => setTimeout(r, 100));
      
      setLoadingStep("Evaluating candidate profile alignment...");
      const results = await api.screenCandidates(jobDescription, category);
      
      setScreenResults(results);
      if (addActivity) {
        addActivity('screen', `Screened candidates against Job Description for category: ${category}`);
      }
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
      setUploadSuccess(`Successfully ingested "${selectedFile.name}" under category "${uploadCategory}"`);
      setSelectedFile(null);
      const fileInput = document.getElementById('resume-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      if (refreshData) await refreshData();
      if (addActivity) {
        addActivity('upload', `Ingested candidate profile from ${selectedFile.name}`);
      }
    } catch (err: any) {
      console.error(err);
      setUploadError(err.response?.data?.detail || "Failed to process and ingest resume file.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
      {/* Left Input Panels: Match Criteria & Ingest Resume */}
      <div className="space-y-6 lg:col-span-1 h-fit">
        {/* Match Criteria */}
        <div className="bg-white dark:bg-slate-850 p-5 rounded-lg border border-slate-200/60 dark:border-slate-700 space-y-5">
          <div>
            <h3 className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white">Screening Criteria</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Configure target category and job requirements.</p>
          </div>

          {/* Category filter */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-450 dark:text-slate-500 flex items-center gap-1.5 uppercase tracking-widest">
              <Filter size={12} />
              Filter Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-md px-3 py-2 text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none font-medium text-slate-700 dark:text-slate-250"
            >
              {CATEGORIES.map(c => (
                <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{c}</option>
              ))}
            </select>
          </div>

          {/* Job Description input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-slate-450 dark:text-slate-500 flex items-center gap-1.5 uppercase tracking-widest">
              <FileText size={12} />
              Job Description (JD)
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleScreen();
                }
              }}
              placeholder="Paste your job description requirements, skills, and qualifications here..."
              className="w-full h-72 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-md p-3.5 text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none leading-relaxed resize-none font-normal"
            />
          </div>

          {error && (
            <div className="flex gap-2.5 p-3.5 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-xs font-medium">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={handleScreen}
            disabled={loading}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-slate-200 dark:disabled:bg-slate-800 text-slate-950 font-semibold py-2 px-4 rounded text-xs flex items-center justify-center gap-2 transition-colors"
          >
            {loading ? (
              <RefreshCw className="animate-spin text-slate-950" size={13} />
            ) : (
              <Play size={12} fill="currentColor" />
            )}
            {loading ? 'Screening Candidates...' : 'Run Candidate Screen'}
          </button>
        </div>

        {/* Upload Resume Incremental */}
        <div className="bg-white dark:bg-slate-850 p-5 rounded-lg border border-slate-200/60 dark:border-slate-700 space-y-4">
          <div>
            <h3 className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <Upload size={14} className="text-primary-500" />
              Quick Ingestion
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Directly upload and index new resumes (PDF, DOCX, TXT) into the active database.
            </p>
          </div>

          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-widest block">
                Ingestion Category
              </label>
              <select
                value={uploadCategory}
                onChange={(e) => setUploadCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-700 rounded-md px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 font-medium text-slate-700 dark:text-slate-250"
              >
                {CATEGORIES.filter(c => c !== "All").map(c => (
                  <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-semibold text-slate-450 dark:text-slate-500 uppercase tracking-widest block">
                Resume File
              </label>
              <input
                id="resume-file-input"
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                required
                className="block w-full text-xs text-slate-500 dark:text-slate-450 file:mr-3 file:py-1 file:px-2.5 file:rounded file:border file:border-slate-200 dark:file:border-slate-700 file:text-[11px] file:font-medium file:bg-slate-50 dark:file:bg-slate-900 file:text-slate-700 dark:file:text-slate-300 hover:file:bg-slate-100 dark:hover:file:bg-slate-800 file:cursor-pointer"
              />
            </div>

            {uploadError && (
              <div className="flex gap-2 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded text-[11px] font-medium">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{uploadError}</span>
              </div>
            )}

            {uploadSuccess && (
              <div className="flex gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-550 rounded text-[11px] font-medium">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                <span>{uploadSuccess}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="w-full mt-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-semibold py-2 px-4 rounded text-xs flex items-center justify-center gap-2 border border-slate-200/10 transition-colors disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <RefreshCw className="animate-spin text-primary-500" size={13} />
                  Ingesting Profile...
                </>
              ) : (
                <>
                  <Upload size={13} />
                  Ingest Candidate Profile
                </>
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Right Content Panel: Match Leaderboard / Results */}
      <div className="bg-white dark:bg-slate-850 p-5 rounded-lg border border-slate-200/60 dark:border-slate-700 lg:col-span-2 space-y-5 min-h-[450px] flex flex-col">
        {loading ? (
          /* Loading Pipeline State */
          <div className="flex-1 flex flex-col items-center justify-center py-20 space-y-4">
            <div className="relative">
              <div className="w-12 h-12 border-3 border-primary-100 dark:border-primary-950 rounded-full animate-spin border-t-primary-500" />
            </div>
            <div className="text-center space-y-1.5">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-405 animate-pulse">
                {loadingStep}
              </p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Evaluating qualifications against job description criteria...</p>
            </div>
          </div>
        ) : screenResults ? (
          /* Results Scored State */
          <div className="space-y-5 flex-1 flex flex-col">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white">Screening Match Results</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Candidates ranked by overall qualification match score.</p>
              </div>
              <span className="bg-primary-500/10 text-primary-500 px-2.5 py-0.5 rounded text-[11px] font-medium border border-primary-500/20">
                {screenResults.results.length} Candidates Scored
              </span>
            </div>

            {screenResults.results.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-605">
                <Search size={40} strokeWidth={1.5} className="mb-2" />
                <p className="text-xs font-medium">No candidate matches found in this category.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                {screenResults.results.map((res) => (
                  <div
                    key={res.candidate_id}
                    className="p-4 bg-slate-50/30 dark:bg-slate-900 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 border border-slate-200/50 dark:border-slate-700 rounded-lg flex flex-col md:flex-row justify-between gap-4 transition-colors"
                  >
                    {/* Candidate Identity */}
                    <div className="flex gap-3.5">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-350 font-semibold rounded-lg flex items-center justify-center shrink-0">
                        #{res.rank}
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm text-slate-900 dark:text-white">
                            {anonymizeName(res.candidate_name, blindScreening)}
                          </span>
                          <span className="text-[9px] bg-slate-100 dark:bg-slate-800 border border-slate-200/50 dark:border-slate-750 px-1.5 py-0.2 rounded font-medium uppercase tracking-wider text-slate-550 dark:text-slate-400">
                            {res.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed">
                          <b className="text-slate-655 dark:text-slate-300 font-medium">Verdict:</b> {res.evaluation.verdict_summary}
                        </p>
                      </div>
                    </div>

                    {/* Scores & Profile CTA */}
                    <div className="flex items-center justify-between md:justify-end gap-5 border-t md:border-t-0 pt-2.5 md:pt-0 border-slate-100 dark:border-slate-800">
                      <div className="flex gap-3.5 shrink-0">
                        {/* Base Relevance Score */}
                        <div className="text-center">
                          <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Base Score</span>
                          <span className="block font-medium text-xs text-slate-500 dark:text-slate-400 mt-0.5">{res.initial_score.toFixed(0)}%</span>
                        </div>
                        {/* Talent Match Score */}
                        <div className="text-center">
                          <span className="text-[9px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wider">Talent Match</span>
                          <span className="block font-semibold text-sm text-primary-500 mt-0.5">{res.rerank_score.toFixed(0)}%</span>
                        </div>
                      </div>

                      <button
                        onClick={() => onSelectCandidate(res.candidate_id)}
                        className="inline-flex items-center gap-1 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-semibold px-2.5 py-1.5 rounded text-xs transition-colors"
                      >
                        View Analysis
                        <ChevronRight size={12} className="opacity-80" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Empty / Unexecuted State */
          <div className="flex-1 flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600 space-y-2.5">
            <Search size={44} strokeWidth={1.5} className="text-slate-200 dark:text-slate-800" />
            <div className="text-center space-y-1">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">No Screening Run Yet</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-xs">
                Paste a Job Description and click "Run Candidate Screen" to evaluate candidate matches.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
