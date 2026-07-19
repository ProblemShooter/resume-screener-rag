import { useState, useEffect } from 'react';
import { LayoutDashboard, Shield, ShieldAlert, Sun, Moon, FileText, Briefcase, RefreshCw, Database, Menu, X } from 'lucide-react';
import { api, type Candidate, type ScreenResponse, type DatabaseStats } from './api';
import Dashboard from './pages/Dashboard';
import Screener from './pages/Screener';
import CandidateDetails from './pages/CandidateDetails';

export interface ActivityLog {
  id: string;
  type: 'upload' | 'screen' | 'status_change' | 'report_generation';
  message: string;
  timestamp: string;
}

export type CandidateStatus = 'New' | 'Reviewed' | 'Shortlisted' | 'Interview' | 'Rejected';

export default function App() {
  const [currentView, setCurrentView] = useState<'dashboard' | 'screener' | 'details'>('dashboard');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [blindScreening, setBlindScreening] = useState<boolean>(false);
  const [darkMode, setDarkMode] = useState<boolean>(true);
  const [screenResults, setScreenResults] = useState<ScreenResponse | null>(null);
  const [jobDescription, setJobDescription] = useState<string>('');
  const [candidatesList, setCandidatesList] = useState<Candidate[]>([]);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [loadingStats, setLoadingStats] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);

  // Recruiter ATS States
  const [candidateStatuses, setCandidateStatuses] = useState<Record<string, CandidateStatus>>({});
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([
    { id: '1', type: 'screen', message: 'Screened candidate pool against Java Developer requirements', timestamp: '10 mins ago' },
    { id: '2', type: 'upload', message: 'Ingested profile for Rohan Gupta (Java Developer)', timestamp: '1 hour ago' },
    { id: '3', type: 'status_change', message: 'Shortlisted Priya Patel for Python Lead interview', timestamp: '2 hours ago' }
  ]);

  const addActivity = (type: ActivityLog['type'], message: string) => {
    setActivityLog(prev => [
      {
        id: Date.now().toString(),
        type,
        message,
        timestamp: 'Just now'
      },
      ...prev
    ]);
  };

  const updateCandidateStatus = (id: string, status: CandidateStatus) => {
    setCandidateStatuses(prev => ({ ...prev, [id]: status }));
    const candidate = candidatesList.find(c => c.candidate_id === id);
    const name = candidate ? candidate.candidate_name : 'Candidate';
    addActivity('status_change', `Status of ${name} updated to ${status}`);
  };

  // Apply dark mode class to HTML
  useEffect(() => {
    const root = window.document.documentElement;
    if (darkMode) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [darkMode]);

  // Load stats and candidate list on mount
  const refreshData = async () => {
    setLoadingStats(true);
    try {
      const [list, dbStats] = await Promise.all([
        api.getCandidates(),
        api.getStats()
      ]);
      setCandidatesList(list);
      setStats(dbStats);

      // Populate missing statuses deterministically
      setCandidateStatuses(prev => {
        const next = { ...prev };
        let changed = false;
        list.forEach(c => {
          if (!next[c.candidate_id]) {
            // Deterministic status selection
            const num = parseInt(c.candidate_id.replace(/\D/g, '')) || 0;
            const statuses: CandidateStatus[] = ['New', 'Reviewed', 'Shortlisted', 'Interview', 'Rejected'];
            next[c.candidate_id] = statuses[num % statuses.length];
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    } catch (err) {
      console.error('Error loading database info:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSelectCandidate = (candidateId: string) => {
    setSelectedCandidateId(candidateId);
    setCurrentView('details');
  };

  const totalAvailable = stats?.total_resumes_available ?? 962;
  const totalIndexed = stats?.indexed_resumes ?? candidatesList.length;
  const isLimitActive = totalIndexed < totalAvailable;

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-60 bg-white dark:bg-slate-950 border-r border-slate-200/60 dark:border-slate-700 flex flex-col justify-between p-4 z-30 transition-transform duration-300 transform md:relative md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="space-y-6">
          {/* Logo & Mobile Close */}
          <div className="flex items-center justify-between">
            <div 
              onClick={() => { setCurrentView('dashboard'); setSelectedCandidateId(null); setSidebarOpen(false); }}
              className="flex items-center gap-2.5 px-1.5 py-1 cursor-pointer hover:opacity-85 transition-opacity"
            >
              <div className="bg-primary-500 text-slate-950 p-1.5 rounded-lg">
                <Briefcase size={18} />
              </div>
              <div>
                <h1 className="font-semibold text-sm tracking-tight text-slate-900 dark:text-white">
                  TalentLens
                </h1>
                <span className="block text-[9px] font-medium tracking-widest text-slate-400 dark:text-slate-500 uppercase">
                  Talent Acquisition
                </span>
              </div>
            </div>
            
            <button
              onClick={() => setSidebarOpen(false)}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white md:hidden"
              aria-label="Close sidebar"
            >
              <X size={16} />
            </button>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1">
            <button
              onClick={() => { setCurrentView('dashboard'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 ${
                currentView === 'dashboard'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/60'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <LayoutDashboard size={14} className="opacity-80" />
              Dashboard
            </button>
            <button
              onClick={() => { setCurrentView('screener'); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 ${
                currentView === 'screener'
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700/60'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900/60 hover:text-slate-900 dark:hover:text-white border border-transparent'
              }`}
            >
              <FileText size={14} className="opacity-80" />
              Screen Candidates
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-3.5 pt-4 border-t border-slate-200/80 dark:border-slate-700">
          {/* Blind Screening Toggle */}
          <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-lg border border-slate-200/40 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                {blindScreening ? (
                  <Shield className="text-primary-500" size={13} />
                ) : (
                  <ShieldAlert className="text-amber-500/90" size={13} />
                )}
                <span className="text-[11px] font-semibold">Blind Screening</span>
              </div>
              <button
                onClick={() => setBlindScreening(!blindScreening)}
                className={`relative inline-flex h-4 w-7.5 items-center rounded-full transition-colors duration-150 ${
                  blindScreening ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-3 w-3 transform rounded-full bg-white shadow-sm transition-transform duration-150 ${
                    blindScreening ? 'translate-x-3.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal font-normal">
              Redacts candidate metadata to prevent unconscious bias.
            </p>
          </div>

          {/* Theme Control */}
          <div className="flex items-center justify-between px-1.5">
            <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              System Active
            </span>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-slate-500 dark:text-slate-400"
            >
              {darkMode ? <Sun size={13} /> : <Moon size={13} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-13 border-b border-slate-200/60 dark:border-slate-700 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 z-10">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1.5 rounded-md bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 md:hidden"
              aria-label="Open sidebar"
            >
              <Menu size={16} />
            </button>
            <h2 className="font-semibold text-xs sm:text-sm tracking-tight truncate max-w-[150px] sm:max-w-none">
              {currentView === 'dashboard' && 'Recruiter Dashboard'}
              {currentView === 'screener' && 'Talent Screening Workspace'}
              {currentView === 'details' && 'Candidate Evaluation Deep Dive'}
            </h2>
            {blindScreening && (
              <span className="bg-primary-500/10 text-primary-500 text-[8px] sm:text-[9px] font-semibold px-1.5 py-0.5 rounded border border-primary-500/25 uppercase tracking-wider shrink-0">
                Blind
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs">
            <div className="flex items-center gap-1 sm:gap-1.5 text-slate-400 dark:text-slate-500">
              <Database size={12} className="shrink-0" />
              <span className="hidden xs:inline">Profiles: </span>
              <span><b className="text-slate-800 dark:text-slate-200 font-semibold">{totalIndexed}</b> / {totalAvailable}</span>
              {isLimitActive && (
                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[8px] sm:text-[9px] font-semibold px-1 py-0.5 rounded ml-0.5 shrink-0">
                  Capacity Limit
                </span>
              )}
            </div>
            <span className="h-3.5 w-px bg-slate-200 dark:bg-slate-700" />
            <button
              onClick={refreshData}
              disabled={loadingStats}
              className="p-1.5 rounded bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              title="Refresh database connection stats"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Dynamic Panels */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8">
          {currentView === 'dashboard' && (
            <Dashboard
              candidates={candidatesList}
              screenResults={screenResults}
              onSelectCandidate={handleSelectCandidate}
              blindScreening={blindScreening}
              stats={stats}
              refreshData={refreshData}
              candidateStatuses={candidateStatuses}
              updateCandidateStatus={updateCandidateStatus}
              activityLog={activityLog}
              addActivity={addActivity}
              setCurrentView={setCurrentView}
            />
          )}

          {currentView === 'screener' && (
            <Screener
              screenResults={screenResults}
              setScreenResults={setScreenResults}
              jobDescription={jobDescription}
              setJobDescription={setJobDescription}
              onSelectCandidate={handleSelectCandidate}
              blindScreening={blindScreening}
              refreshData={refreshData}
              addActivity={addActivity}
            />
          )}

          {currentView === 'details' && selectedCandidateId && (
            <CandidateDetails
              candidateId={selectedCandidateId}
              jobDescription={jobDescription}
              blindScreening={blindScreening}
              onBack={() => setCurrentView(screenResults ? 'screener' : 'dashboard')}
            />
          )}
        </div>
      </main>
    </div>
  );
}
