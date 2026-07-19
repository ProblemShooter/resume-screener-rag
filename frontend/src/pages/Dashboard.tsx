import { useState } from 'react';
import { Users, FileText, Award, BarChart3, ChevronRight, Database, RefreshCw } from 'lucide-react';
import { api, type Candidate, type ScreenResponse, type DatabaseStats } from '../api';

// Helper function to anonymize text client-side
export function anonymizeName(name: string, enabled: boolean): string {
  if (!enabled) return name;
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return `Candidate ${parts[0][0]}.`;
  return `Candidate ${parts.map(p => p[0].toUpperCase()).join('.')}`;
}

export function anonymizeEmail(email: string, enabled: boolean): string {
  if (!enabled) return email;
  return "candidate.redacted@talentvibe.ai";
}

interface DashboardProps {
  candidates: Candidate[];
  screenResults: ScreenResponse | null;
  onSelectCandidate: (id: string) => void;
  blindScreening: boolean;
  stats: DatabaseStats | null;
  refreshData: () => Promise<void>;
}

export default function Dashboard({
  candidates,
  screenResults,
  onSelectCandidate,
  blindScreening,
  stats,
  refreshData
}: DashboardProps) {
  const [repopulating, setRepopulating] = useState(false);
  const [selectedLimit, setSelectedLimit] = useState(stats?.dev_max_resumes ?? 25);

  const handleRepopulate = async () => {
    setRepopulating(true);
    try {
      await api.repopulateDatabase(selectedLimit);
      await refreshData();
    } catch (err) {
      console.error('Error repopulating database:', err);
    } finally {
      setRepopulating(false);
    }
  };

  // Aggregate categories
  const categoryCounts: Record<string, number> = {};
  candidates.forEach(c => {
    categoryCounts[c.category] = (categoryCounts[c.category] || 0) + 1;
  });

  const categories = Object.entries(categoryCounts).map(([name, count]) => ({ name, count }));

  // Metrics from last screening results
  const hasResults = screenResults && screenResults.results.length > 0;
  const totalScreened = hasResults ? screenResults.results.length : 0;
  const avgMatch = hasResults
    ? Math.round(screenResults.results.reduce((acc, r) => acc + r.rerank_score, 0) / totalScreened)
    : 0;
  const highestMatch = hasResults
    ? Math.max(...screenResults.results.map(r => r.rerank_score))
    : 0;

  const totalIndexed = stats?.indexed_resumes ?? candidates.length;
  const totalAvailable = stats?.total_resumes_available ?? 962;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-850 flex items-center gap-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="p-3.5 bg-primary-500/10 text-primary-500 rounded-xl">
            <Users size={22} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Resumes Indexed</span>
            <span className="text-xl font-black">{totalIndexed} <span className="text-xs font-normal text-slate-400">/ {totalAvailable}</span></span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-850 flex items-center gap-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="p-3.5 bg-indigo-500/10 text-indigo-500 rounded-xl">
            <FileText size={22} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Categories Indexed</span>
            <span className="text-xl font-black">{categories.length}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-850 flex items-center gap-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="p-3.5 bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Award size={22} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Highest Match</span>
            <span className="text-xl font-black text-emerald-500">{hasResults ? `${highestMatch}%` : 'N/A'}</span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-850 flex items-center gap-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
          <div className="p-3.5 bg-violet-500/10 text-violet-500 rounded-xl">
            <BarChart3 size={22} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider block mb-0.5">Average similarity</span>
            <span className="text-xl font-black text-violet-400">{hasResults ? `${avgMatch}%` : 'N/A'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Candidates Database List */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-850 p-6 shadow-sm lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-base">Indexed Resume Database</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Candidate records parsed and embedded inside the ChromaDB collection.</p>
            </div>
            <span className="bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 px-3 py-1 rounded-full text-xs font-bold text-slate-500 dark:text-slate-400">
              {candidates.length} candidates
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-850 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                  <th className="pb-3 font-bold">Candidate</th>
                  <th className="pb-3 font-bold">Role Category</th>
                  <th className="pb-3 font-bold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850/40">
                {candidates.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-xs font-bold text-slate-400 dark:text-slate-600">
                      No candidate resumes indexed. Click "Index Controls" on the right to load resumes.
                    </td>
                  </tr>
                ) : (
                  candidates.slice(0, 10).map((cand) => (
                    <tr key={cand.candidate_id} className="group hover:bg-slate-50/40 dark:hover:bg-slate-850/10 transition-colors">
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center font-black text-xs">
                            {cand.candidate_name[0]}
                          </div>
                          <div>
                            <span className="font-bold text-sm block group-hover:text-primary-500 transition-colors">
                              {anonymizeName(cand.candidate_name, blindScreening)}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-0.5 font-medium">
                              {anonymizeEmail(cand.email, blindScreening)}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-850 text-slate-500 dark:text-slate-400">
                          {cand.category}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <button
                          onClick={() => onSelectCandidate(cand.candidate_id)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-primary-500 hover:text-primary-600 transition-colors bg-primary-500/5 hover:bg-primary-500/10 px-3 py-1.5 rounded-xl border border-primary-500/10"
                        >
                          Profile
                          <ChevronRight size={13} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Category Breakdown & Control Panel */}
        <div className="space-y-8">
          {/* Index Control Widget */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-850 p-6 shadow-sm space-y-5">
            <div>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Database size={18} className="text-primary-500" />
                Index Controls
              </h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                Configure the local development memory limit and trigger a fresh index from the CSV.
              </p>
            </div>
            
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Target Candidates Ingestion Limit
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[25, 100, 250, 962].map((limit) => (
                  <button
                    key={limit}
                    onClick={() => setSelectedLimit(limit)}
                    disabled={repopulating}
                    className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all ${
                      selectedLimit === limit
                        ? 'bg-primary-500 border-primary-500 text-white shadow-md shadow-primary-500/10'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200/60 dark:border-slate-850 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-350'
                    }`}
                  >
                    {limit}
                  </button>
                ))}
              </div>

              <button
                onClick={handleRepopulate}
                disabled={repopulating}
                className="w-full mt-2 bg-slate-950 hover:bg-slate-900 dark:bg-slate-50 dark:hover:bg-slate-100 text-white dark:text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200/10 active:scale-98 transition-all"
              >
                {repopulating ? (
                  <>
                    <RefreshCw className="animate-spin text-primary-500" size={14} />
                    Indexing Resumes...
                  </>
                ) : (
                  <>
                    <RefreshCw size={14} />
                    Rebuild Local Index
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Categories Chart */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-850 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="font-extrabold text-base">Candidate Breakdown</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Distribution of candidates by technology category.</p>
            </div>
            
            <div className="space-y-4">
              {categories.length === 0 ? (
                <p className="text-xs font-medium text-slate-400 dark:text-slate-650">No categories indexed yet.</p>
              ) : (
                categories.slice(0, 6).map((cat) => {
                  const percentage = Math.round((cat.count / candidates.length) * 100);
                  return (
                    <div key={cat.name} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="truncate max-w-[180px]">{cat.name}</span>
                        <span className="text-slate-400 dark:text-slate-500">{cat.count} ({percentage}%)</span>
                      </div>
                      <div className="h-2 w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary-500 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
