import { useState, useEffect } from 'react';
import { LayoutDashboard, Shield, ShieldAlert, Sun, Moon, FileText, Cpu, RefreshCw, Database } from 'lucide-react';
import { api, type Candidate, type ScreenResponse, type DatabaseStats } from './api';
import Dashboard from './pages/Dashboard';
import Screener from './pages/Screener';
import CandidateDetails from './pages/CandidateDetails';

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
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200/60 dark:border-slate-850 flex flex-col justify-between p-5 z-10 shadow-sm">
        <div className="space-y-7">
          {/* Logo */}
          <div className="flex items-center gap-3 px-2">
            <div className="bg-gradient-to-tr from-primary-500 to-teal-400 text-white p-2 rounded-xl shadow-md shadow-primary-500/20">
              <Cpu size={22} />
            </div>
            <div>
              <h1 className="font-extrabold text-base leading-tight bg-gradient-to-r from-primary-400 to-teal-400 bg-clip-text text-transparent">
                TalentVibe
              </h1>
              <span className="text-[9px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                AI Resume Screener
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="space-y-1.5">
            <button
              onClick={() => setCurrentView('dashboard')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                currentView === 'dashboard'
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutDashboard size={16} />
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView('screener')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 ${
                currentView === 'screener'
                  ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileText size={16} />
              Screen Resumes
            </button>
          </nav>
        </div>

        {/* Sidebar Footer */}
        <div className="space-y-4 pt-6 border-t border-slate-200/80 dark:border-slate-850">
          {/* Blind Screening Toggle */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/40 dark:border-slate-850/50">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {blindScreening ? (
                  <Shield className="text-primary-500" size={15} />
                ) : (
                  <ShieldAlert className="text-amber-500" size={15} />
                )}
                <span className="text-xs font-bold">Blind Screening</span>
              </div>
              <button
                onClick={() => setBlindScreening(!blindScreening)}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-250 ${
                  blindScreening ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-850'
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-250 ${
                    blindScreening ? 'translate-x-4.5' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal font-medium">
              Redacts candidate metadata (names, emails, and pronouns) to prevent unconscious bias.
            </p>
          </div>

          {/* Theme Control */}
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
              System Active
            </span>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-xl bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-850 transition-colors text-slate-500 dark:text-slate-400"
            >
              {darkMode ? <Sun size={15} /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 border-b border-slate-200/60 dark:border-slate-850 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-4">
            <h2 className="font-extrabold text-base tracking-tight">
              {currentView === 'dashboard' && 'Recruiter Overview'}
              {currentView === 'screener' && 'Resume Matching Workspace'}
              {currentView === 'details' && 'Candidate Evaluation deep dive'}
            </h2>
            {blindScreening && (
              <span className="bg-primary-500/10 text-primary-500 text-[9px] font-bold px-2 py-0.5 rounded-full border border-primary-500/25 uppercase tracking-wide">
                Blind Screening
              </span>
            )}
          </div>

          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
              <Database size={14} />
              <span>Resumes: <b className="text-slate-800 dark:text-slate-200">{totalIndexed}</b> / {totalAvailable}</span>
              {isLimitActive && (
                <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded ml-1">
                  Dev Limit Active
                </span>
              )}
            </div>
            <span className="h-4 w-px bg-slate-200 dark:bg-slate-850" />
            <button
              onClick={refreshData}
              disabled={loadingStats}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
              title="Refresh database connection stats"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </header>

        {/* Dynamic Panels */}
        <div className="flex-1 overflow-y-auto p-8">
          {currentView === 'dashboard' && (
            <Dashboard
              candidates={candidatesList}
              screenResults={screenResults}
              onSelectCandidate={handleSelectCandidate}
              blindScreening={blindScreening}
              stats={stats}
              refreshData={refreshData}
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
