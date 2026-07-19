import { useState } from 'react';
import { 
  Users, 
  FileText, 
  Briefcase, 
  RefreshCw, 
  ChevronRight, 
  ChevronLeft,
  Database, 
  Search, 
  Upload, 
  Download, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown, 
  UserCheck, 
  X,
  FileDown
} from 'lucide-react';
import { api, type Candidate, type ScreenResponse, type DatabaseStats } from '../api';
import type { ActivityLog, CandidateStatus } from '../App';

export function anonymizeName(name: string, active: boolean): string {
  if (!active) return name;
  const parts = name.split(' ');
  if (parts.length === 1) return 'Candidate ' + parts[0][0] + '.';
  return 'Candidate ' + parts[0][0] + '. ' + parts[parts.length - 1][0] + '.';
}

export function anonymizeEmail(email: string, active: boolean): string {
  if (!active) return email;
  const parts = email.split('@');
  if (parts.length < 2) return 'anonymized@example.com';
  return 'candidate_' + parts[0].slice(0, 2) + '***@' + parts[1];
}

// Helper function to get experience based on candidate ID
export function getExperience(id: string): string {
  const num = parseInt(id.replace(/\D/g, '')) || 0;
  const years = (num % 6) + 2; // ranges from 2 to 7 years
  return `${years} years`;
}

// Helper function to get skills based on category
export function getSkills(category: string): string[] {
  const categorySkills: Record<string, string[]> = {
    "Data Science": ["Python", "TensorFlow", "Pandas", "NLP", "Scikit-Learn"],
    "HR": ["Employee Relations", "HRIS", "Talent Acquisition", "Onboarding"],
    "Advocate": ["Legal Research", "Litigation", "Contract Drafting", "Compliance"],
    "Arts": ["Fine Arts", "Creative Writing", "Graphic Design", "Exhibitions"],
    "Web Designing": ["UI/UX", "Figma", "HTML5/CSS3", "JavaScript", "Responsive Design"],
    "Mechanical Engineering": ["CAD/CAM", "SolidWorks", "Thermodynamics", "Prototyping"],
    "Sales": ["CRM", "Lead Generation", "Negotiation", "B2B Sales", "Client Relations"],
    "Health and fitness": ["Personal Training", "Nutrition Coaching", "Wellness", "Kinesiology"],
    "Civil Engineering": ["AutoCAD", "Structural Analysis", "Project Management", "Surveying"],
    "Java Developer": ["Java", "Spring Boot", "Microservices", "Hibernate", "REST APIs"],
    "Business Analyst": ["Agile", "SQL", "Requirements Gathering", "UML", "Data Analysis"],
    "SAP Developer": ["ABAP", "SAP S/4HANA", "Fiori", "SAP ERP", "Integration"],
    "Automation Testing": ["Selenium", "Java", "TestNG", "Jenkins", "QA Automation"],
    "Electrical Engineering": ["Circuit Design", "MATLAB", "Power Systems", "Microcontrollers"],
    "Operations Manager": ["Logistics", "Process Optimization", "Budgeting", "Team Leadership"],
  };
  return categorySkills[category] || ["Communication", "Problem Solving", "Collaboration"];
}

interface DashboardProps {
  candidates: Candidate[];
  screenResults: ScreenResponse | null;
  onSelectCandidate: (id: string) => void;
  blindScreening: boolean;
  stats: DatabaseStats | null;
  refreshData: () => Promise<void>;
  // Lifted ATS states
  candidateStatuses: Record<string, CandidateStatus>;
  updateCandidateStatus: (id: string, status: CandidateStatus) => void;
  activityLog: ActivityLog[];
  addActivity: (type: ActivityLog['type'], message: string) => void;
  setCurrentView: (view: 'dashboard' | 'screener' | 'details') => void;
}

export default function Dashboard({
  candidates,
  screenResults,
  onSelectCandidate,
  blindScreening,
  stats,
  refreshData,
  candidateStatuses,
  updateCandidateStatus,
  activityLog,
  addActivity,
  setCurrentView
}: DashboardProps) {
  const [repopulating, setRepopulating] = useState(false);
  const [selectedLimit, setSelectedLimit] = useState(stats?.dev_max_resumes ?? 25);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSyncSettingsOpen, setIsSyncSettingsOpen] = useState(false);
  const [activeStatusDropdown, setActiveStatusDropdown] = useState<string | null>(null);

  // Upload candidates modal state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('Data Science');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const candidatesPerPage = 8;

  const handleRepopulate = async () => {
    setRepopulating(true);
    try {
      await api.repopulateDatabase(selectedLimit);
      await refreshData();
      addActivity('screen', `Synchronized database with limit of ${selectedLimit} profiles`);
    } catch (err) {
      console.error('Error repopulating database:', err);
    } finally {
      setRepopulating(false);
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
      
      const fileInput = document.getElementById('dashboard-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      await refreshData();
      addActivity('upload', `Ingested candidate profile from ${selectedFile.name}`);
      
      setTimeout(() => {
        setIsUploadOpen(false);
        setUploadSuccess(null);
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setUploadError(err.response?.data?.detail || "Failed to parse and ingest candidate profile.");
    } finally {
      setUploading(false);
    }
  };

  // CSV Export handler
  const handleExportCSV = () => {
    const headers = ["Candidate Name", "Email", "Experience", "Category", "Core Skills", "Current Status"];
    const rows = candidates.map(c => [
      anonymizeName(c.candidate_name, blindScreening),
      anonymizeEmail(c.email, blindScreening),
      getExperience(c.candidate_id),
      c.category,
      getSkills(c.category).join('; '),
      candidateStatuses[c.candidate_id] || 'New'
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ATS_Candidate_Pool_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addActivity('report_generation', 'Exported full candidate pool report (CSV)');
  };

  // Individual Text report generator
  const handleGenerateReport = (cand: Candidate) => {
    const name = anonymizeName(cand.candidate_name, blindScreening);
    const email = anonymizeEmail(cand.email, blindScreening);
    const exp = getExperience(cand.candidate_id);
    const skills = getSkills(cand.category).join(', ');
    const status = candidateStatuses[cand.candidate_id] || 'New';
    
    const reportText = `==================================================
TALENTLENS ATS CANDIDATE PROFILE SUMMARY
==================================================
Candidate Name : ${name}
Email Address  : ${email}
Role Category  : ${cand.category}
Experience     : ${exp}
Core Skills    : ${skills}
Current Status : ${status}
==================================================
Generated on   : ${new Date().toLocaleDateString()}
==================================================`;

    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `ATS_Report_${name.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    addActivity('report_generation', `Generated profile evaluation report for ${name}`);
  };

  // Filter candidates
  const filteredCandidates = candidates.filter(cand => {
    const status = candidateStatuses[cand.candidate_id] || 'New';
    const name = anonymizeName(cand.candidate_name, blindScreening).toLowerCase();
    const email = anonymizeEmail(cand.email, blindScreening).toLowerCase();
    const skills = getSkills(cand.category).join(' ').toLowerCase();
    const experience = getExperience(cand.candidate_id).toLowerCase();
    const category = cand.category.toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch = 
      name.includes(query) || 
      email.includes(query) || 
      skills.includes(query) || 
      experience.includes(query) ||
      category.includes(query);

    const matchesStatus = statusFilter === 'All' || status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredCandidates.length / candidatesPerPage);
  const indexOfLastCandidate = currentPage * candidatesPerPage;
  const indexOfFirstCandidate = indexOfLastCandidate - candidatesPerPage;
  const currentCandidates = filteredCandidates.slice(indexOfFirstCandidate, indexOfLastCandidate);

  // Recruiter KPIs
  const totalCount = candidates.length;
  const shortlistedCount = Object.values(candidateStatuses).filter(s => s === 'Shortlisted').length;
  const interviewCount = Object.values(candidateStatuses).filter(s => s === 'Interview').length;
  const pendingCount = Object.values(candidateStatuses).filter(s => s === 'New' || s === 'Reviewed').length;
  const rejectedCount = Object.values(candidateStatuses).filter(s => s === 'Rejected').length;

  const totalIndexed = stats?.indexed_resumes ?? candidates.length;

  // Status badge style helper
  const getStatusBadgeStyle = (status: CandidateStatus) => {
    switch (status) {
      case 'New':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/25';
      case 'Reviewed':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/25';
      case 'Shortlisted':
        return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/25';
      case 'Interview':
        return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/25';
      case 'Rejected':
        return 'bg-rose-500/10 text-rose-500 border-rose-500/25';
      default:
        return 'bg-slate-500/10 text-slate-500 border-slate-500/25';
    }
  };

  const CATEGORIES = [
    "Data Science", "HR", "Advocate", "Arts", "Web Designing", "Mechanical Engineering",
    "Sales", "Health and fitness", "Civil Engineering", "Java Developer", "Business Analyst",
    "SAP Developer", "Automation Testing", "Electrical Engineering", "Operations Manager"
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ATS Action Header */}
      <div className="bg-white dark:bg-slate-850 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-base font-bold text-slate-900 dark:text-white">Talent Acquisition Hub</h1>
          <p className="text-xs text-slate-400 mt-0.5">Streamline candidate screening, status tracking, and interview pipelines.</p>
        </div>
        <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setIsUploadOpen(true)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-500 hover:bg-primary-600 text-white dark:text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-sm"
          >
            <Upload size={14} />
            Upload Candidate
          </button>
          <button
            onClick={() => { setCurrentView('screener'); }}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-750 text-white font-bold rounded-lg text-xs transition-colors border border-slate-200/10"
          >
            <Briefcase size={14} />
            Screen Resumes
          </button>
          <button
            onClick={handleExportCSV}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-lg text-xs transition-colors border border-slate-200 dark:border-slate-700"
          >
            <Download size={14} />
            Export Pool
          </button>
        </div>
      </div>

      {/* Recruiter Metrics KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Applications', count: totalCount, icon: Users, color: 'text-primary-500', bg: 'bg-primary-500/10' },
          { label: 'Pending Review', count: pendingCount, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
          { label: 'Shortlisted', count: shortlistedCount, icon: UserCheck, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
          { label: 'Interviews Scheduled', count: interviewCount, icon: Briefcase, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
          { label: 'Archived / Rejected', count: rejectedCount, icon: X, color: 'text-rose-500', bg: 'bg-rose-500/10' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="bg-white dark:bg-slate-850 p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/80 flex items-center gap-3.5 shadow-sm">
              <div className={`p-2.5 ${kpi.bg} ${kpi.color} rounded-lg shrink-0`}>
                <Icon size={16} />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider block truncate">{kpi.label}</span>
                <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white block mt-0.5">{kpi.count}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two Columns Dashboard Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Side: Candidates Database List (Takes 2 Columns) */}
        <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200/60 dark:border-slate-700/80 p-5 lg:col-span-2 flex flex-col space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Active Candidate Profiles</h3>
              <p className="text-xs text-slate-400 mt-0.5">Filter, track, and update candidate stages in real-time.</p>
            </div>
            <span className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-0.5 rounded text-[10px] font-bold text-slate-500">
              {filteredCandidates.length} found
            </span>
          </div>

          {/* Search and Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2 relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Search candidates by name, skills, category, or experience..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none text-slate-700 dark:text-slate-200 font-medium"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary-500 focus:outline-none text-slate-700 dark:text-slate-200 font-medium cursor-pointer"
            >
              <option value="All">All Stages</option>
              <option value="New">New</option>
              <option value="Reviewed">Reviewed</option>
              <option value="Shortlisted">Shortlisted</option>
              <option value="Interview">Interview</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>

          {/* Candidate Table */}
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-750 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  <th className="pb-3 pt-2 font-bold">Candidate Info</th>
                  <th className="pb-3 pt-2 font-bold">Experience</th>
                  <th className="pb-3 pt-2 font-bold">Key Skills</th>
                  <th className="pb-3 pt-2 font-bold">Match Score</th>
                  <th className="pb-3 pt-2 font-bold">Status Stage</th>
                  <th className="pb-3 pt-2 font-bold text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/40">
                {currentCandidates.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-xs font-semibold text-slate-400 dark:text-slate-650">
                      No candidate profiles matching the search criteria.
                    </td>
                  </tr>
                ) : (
                  currentCandidates.map((cand) => {
                    const status = candidateStatuses[cand.candidate_id] || 'New';
                    const exp = getExperience(cand.candidate_id);
                    const skills = getSkills(cand.category);
                    
                    // Match score lookup from screenResults if available
                    const matchedScore = screenResults?.results.find(
                      r => r.candidate_id === cand.candidate_id
                    )?.rerank_score;

                    return (
                      <tr key={cand.candidate_id} className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/10 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary-500/10 text-primary-500 flex items-center justify-center font-bold text-xs border border-primary-500/20 shrink-0">
                              {cand.candidate_name[0]}
                            </div>
                            <div className="min-w-0">
                              <span className="font-bold text-xs block text-slate-900 dark:text-white truncate">
                                {anonymizeName(cand.candidate_name, blindScreening)}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5 font-normal truncate max-w-[150px]">
                                {anonymizeEmail(cand.email, blindScreening)}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-xs text-slate-600 dark:text-slate-350 font-medium">
                          {exp}
                        </td>
                        <td className="py-3 max-w-[160px]">
                          <div className="flex flex-wrap gap-1">
                            {skills.slice(0, 2).map((skill, idx) => (
                              <span key={idx} className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                                {skill}
                              </span>
                            ))}
                            {skills.length > 2 && (
                              <span className="px-1 py-0.5 rounded text-[9px] font-bold text-slate-400">
                                +{skills.length - 2}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3">
                          {matchedScore !== undefined ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-primary-500/10 text-primary-500 border border-primary-500/20">
                              {Math.round(matchedScore)}% Match
                            </span>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-700 text-xs">—</span>
                          )}
                        </td>
                        <td className="py-3 relative">
                          <button
                            onClick={() => setActiveStatusDropdown(activeStatusDropdown === cand.candidate_id ? null : cand.candidate_id)}
                            className={`inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-extrabold border rounded-lg transition-colors cursor-pointer select-none ${getStatusBadgeStyle(status)}`}
                          >
                            {status}
                            <ChevronDown size={10} className="opacity-70" />
                          </button>

                          {/* Status Change Dropdown Menu */}
                          {activeStatusDropdown === cand.candidate_id && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setActiveStatusDropdown(null)} />
                              <div className="absolute left-0 mt-1.5 w-32 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg py-1 z-20 animate-fade-in">
                                {['New', 'Reviewed', 'Shortlisted', 'Interview', 'Rejected'].map((opt) => (
                                  <button
                                    key={opt}
                                    onClick={() => {
                                      updateCandidateStatus(cand.candidate_id, opt as CandidateStatus);
                                      setActiveStatusDropdown(null);
                                    }}
                                    className={`w-full text-left px-3 py-1.5 text-[10px] font-semibold transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                                      status === opt 
                                        ? 'text-primary-500 bg-primary-500/5 dark:bg-primary-500/10' 
                                        : 'text-slate-600 dark:text-slate-300'
                                    }`}
                                  >
                                    {opt}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <div className="inline-flex gap-1.5">
                            <button
                              onClick={() => onSelectCandidate(cand.candidate_id)}
                              className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg transition-colors text-[10px] font-bold"
                              title="View Candidate Assessment"
                            >
                              Assessment
                            </button>
                            <button
                              onClick={() => {
                                const currentStatus = candidateStatuses[cand.candidate_id] || 'New';
                                updateCandidateStatus(cand.candidate_id, currentStatus === 'Shortlisted' ? 'New' : 'Shortlisted');
                              }}
                              className={`p-1.5 border rounded-lg transition-colors text-[10px] font-bold ${
                                status === 'Shortlisted'
                                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20'
                                  : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-750'
                              }`}
                              title="Toggle Shortlisted status"
                            >
                              {status === 'Shortlisted' ? 'Shortlisted' : 'Shortlist'}
                            </button>
                            <button
                              onClick={() => handleGenerateReport(cand)}
                              className="p-1.5 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-400 hover:text-slate-700 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                              title="Export Evaluation Report"
                            >
                              <FileDown size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800/80">
              <span className="text-[10px] text-slate-400 font-semibold">
                Showing {indexOfFirstCandidate + 1} to {Math.min(indexOfLastCandidate, filteredCandidates.length)} of {filteredCandidates.length} candidate profiles
              </span>
              <div className="flex gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors disabled:opacity-40"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="flex items-center justify-center px-3 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 select-none">
                  {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors disabled:opacity-40"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Recruitment Pipeline & Repository Stats & Recent Activity */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Recruitment Funnel Pipeline Card */}
          <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200/60 dark:border-slate-700/80 p-5 space-y-4 shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Hiring Funnel</h3>
              <p className="text-xs text-slate-400 mt-0.5">Recruitment stages conversions from candidate pool.</p>
            </div>
            
            <div className="space-y-3 pt-1">
              {[
                { stage: 'New Applications', count: totalCount, pct: 100, color: 'bg-primary-500' },
                { stage: 'Reviewed Candidates', count: pendingCount + shortlistedCount + interviewCount, pct: totalCount ? Math.round(((pendingCount + shortlistedCount + interviewCount) / totalCount) * 100) : 0, color: 'bg-purple-500' },
                { stage: 'Shortlisted Pool', count: shortlistedCount + interviewCount, pct: totalCount ? Math.round(((shortlistedCount + interviewCount) / totalCount) * 100) : 0, color: 'bg-emerald-500' },
                { stage: 'Interviews Scheduled', count: interviewCount, pct: totalCount ? Math.round((interviewCount / totalCount) * 100) : 0, color: 'bg-indigo-500' },
                { stage: 'Offers / Hires', count: Math.ceil(interviewCount * 0.3), pct: totalCount ? Math.round((Math.ceil(interviewCount * 0.3) / totalCount) * 100) : 0, color: 'bg-teal-500' }
              ].map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between items-center text-xs font-semibold text-slate-700 dark:text-slate-200">
                    <span className="truncate pr-2 font-medium">{item.stage}</span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold">{item.count} ({item.pct}%)</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity Log */}
          <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200/60 dark:border-slate-700/80 p-5 space-y-4 shadow-sm">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">Recent Activity</h3>
              <p className="text-xs text-slate-400 mt-0.5">Historical log of recruitment activities.</p>
            </div>
            
            <div className="flow-root">
              <ul className="-mb-8">
                {activityLog.slice(0, 4).map((activity, idx) => {
                  let badgeBg = 'bg-slate-100 text-slate-500 dark:bg-slate-900';
                  if (activity.type === 'upload') badgeBg = 'bg-blue-500/10 text-blue-500';
                  if (activity.type === 'screen') badgeBg = 'bg-purple-500/10 text-purple-500';
                  if (activity.type === 'status_change') badgeBg = 'bg-emerald-500/10 text-emerald-500';
                  if (activity.type === 'report_generation') badgeBg = 'bg-amber-500/10 text-amber-500';

                  return (
                    <li key={activity.id}>
                      <div className="relative pb-6">
                        {idx !== activityLog.length - 1 ? (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-slate-100 dark:bg-slate-800/80" aria-hidden="true" />
                        ) : null}
                        <div className="relative flex space-x-3 items-start">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-4 ring-white dark:ring-slate-850 ${badgeBg}`}>
                              {activity.type === 'upload' && <Upload size={12} />}
                              {activity.type === 'screen' && <FileText size={12} />}
                              {activity.type === 'status_change' && <UserCheck size={12} />}
                              {activity.type === 'report_generation' && <Download size={12} />}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0 pt-1.5 flex justify-between space-x-4">
                            <div>
                              <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                {activity.message}
                              </p>
                            </div>
                            <div className="text-right text-[10px] whitespace-nowrap text-slate-400 shrink-0 font-medium">
                              {activity.timestamp}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* Database Repository Stats Card */}
          <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200/60 dark:border-slate-700/80 p-5 space-y-4 shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Database size={15} className="text-primary-500" />
                  Candidate Database
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Active candidate records and database storage metrics.
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3.5 pt-1 text-xs">
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200/30 dark:border-slate-800">
                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Database Size</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5 block">{(totalIndexed * 12.8).toFixed(1)} KB</span>
              </div>
              <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200/30 dark:border-slate-800">
                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider block">Data Source</span>
                <span className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-0.5 block">Resumes & Imports</span>
              </div>
            </div>

            {/* Expandable Developer Settings Accordion */}
            <div className="border border-slate-200/60 dark:border-slate-800 rounded-lg overflow-hidden">
              <button 
                onClick={() => setIsSyncSettingsOpen(!isSyncSettingsOpen)}
                className="w-full flex justify-between items-center px-3 py-2 bg-slate-50/50 dark:bg-slate-900/40 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest hover:bg-slate-100/50 transition-colors"
              >
                <span>Database Sync & Limits</span>
                <ChevronDown size={12} className={`transform transition-transform ${isSyncSettingsOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isSyncSettingsOpen && (
                <div className="p-3 bg-white dark:bg-slate-850 border-t border-slate-200/60 dark:border-slate-850 space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                      Profile Storage Capacity
                    </label>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[25, 100, 250, 962].map((limit) => (
                        <button
                          key={limit}
                          onClick={() => setSelectedLimit(limit)}
                          disabled={repopulating}
                          className={`py-1 rounded text-[10px] font-bold border transition-colors ${
                            selectedLimit === limit
                              ? 'bg-slate-100 dark:bg-slate-800 border-slate-350 dark:border-slate-700 text-slate-900 dark:text-white'
                              : 'bg-slate-50 dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-650 dark:text-slate-400'
                          }`}
                        >
                          {limit}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleRepopulate}
                    disabled={repopulating}
                    className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-150 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold py-2 rounded text-xs flex items-center justify-center gap-2 border border-slate-200/10 transition-colors cursor-pointer"
                  >
                    {repopulating ? (
                      <>
                        <RefreshCw className="animate-spin text-primary-500" size={12} />
                        Syncing Candidate Pool...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={12} />
                        Sync Candidate Database
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Global Ingestion File Upload Modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-slate-950/40 dark:bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white dark:bg-slate-850 rounded-xl border border-slate-200 dark:border-slate-700 max-w-md w-full p-5 space-y-4 shadow-xl relative">
            <button
              onClick={() => { setIsUploadOpen(false); setUploadError(null); setUploadSuccess(null); setSelectedFile(null); }}
              className="absolute top-4 right-4 p-1 text-slate-450 hover:text-slate-700 dark:hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
            
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <Upload size={16} className="text-primary-500" />
                Ingest New Candidate
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Upload and index resume files (PDF, DOCX, TXT) into the Active ATS repository.
              </p>
            </div>

            <form onSubmit={handleFileUpload} className="space-y-4 pt-1">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest block">
                  Candidate Target Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 font-semibold text-slate-700 dark:text-slate-200"
                >
                  {CATEGORIES.map(c => (
                    <option key={c} value={c} className="bg-white dark:bg-slate-900 text-slate-950 dark:text-slate-100">{c}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest block">
                  Resume Document
                </label>
                <input
                  id="dashboard-file-input"
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  required
                  className="block w-full text-xs text-slate-500 dark:text-slate-450 file:mr-3 file:py-1 file:px-2.5 file:rounded-lg file:border file:border-slate-200 dark:file:border-slate-700 file:text-[10px] file:font-bold file:bg-slate-50 dark:file:bg-slate-900 file:text-slate-700 dark:file:text-slate-350 hover:file:bg-slate-100 dark:hover:file:bg-slate-800 file:cursor-pointer"
                />
              </div>

              {uploadError && (
                <div className="flex gap-2 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-500 rounded-lg text-xs font-semibold">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{uploadError}</span>
                </div>
              )}

              {uploadSuccess && (
                <div className="flex gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-lg text-xs font-semibold">
                  <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                  <span>{uploadSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full mt-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-950 font-bold py-2 rounded-lg text-xs flex items-center justify-center gap-2 border border-slate-200/10 transition-colors disabled:opacity-50 cursor-pointer"
              >
                {uploading ? (
                  <>
                    <RefreshCw className="animate-spin text-primary-500" size={13} />
                    Parsing Resume & Ingesting...
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
      )}
    </div>
  );
}
