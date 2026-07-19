import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, MessageSquare, Cpu, Sparkles, HelpCircle, FileText, CheckCircle2, AlertCircle, Copy, Send, Check, RefreshCw } from 'lucide-react';
import { api, type ExplainResponse, type ChatMessage } from '../api';
import { anonymizeName } from './Dashboard';

interface CandidateDetailsProps {
  candidateId: string;
  jobDescription: string;
  blindScreening: boolean;
  onBack: () => void;
}

export default function CandidateDetails({ candidateId, jobDescription, blindScreening, onBack }: CandidateDetailsProps) {
  const [activeTab, setActiveTab] = useState<'evaluation' | 'resume' | 'chat' | 'explain' | 'questions'>('evaluation');
  const [explainData, setExplainData] = useState<ExplainResponse | null>(null);
  const [questions, setQuestions] = useState<string[]>([]);
  const [loadingExplain, setLoadingExplain] = useState<boolean>(false);
  const [loadingQuestions, setLoadingQuestions] = useState<boolean>(false);
  
  // Chat States
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState<string>('');
  const [sendingChat, setSendingChat] = useState<boolean>(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Copy questions helper
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, sendingChat]);

  // Load Explainable AI and questions data on mount
  useEffect(() => {
    const loadDetails = async () => {
      setLoadingExplain(true);
      setLoadingQuestions(true);
      try {
        const jdQuery = jobDescription || "General background match";
        
        // Load Explain / Evaluation details
        const exp = await api.getExplainData(candidateId, jdQuery);
        setExplainData(exp);
        setLoadingExplain(false);

        // Load Custom Interview Questions
        const qList = await api.getInterviewQuestions(candidateId, jdQuery);
        setQuestions(qList);
        setLoadingQuestions(false);
      } catch (err) {
        console.error('Error loading details:', err);
        setLoadingExplain(false);
        setLoadingQuestions(false);
      }
    };
    
    // Reset Chat
    setChatMessages([
      { role: 'assistant', content: `Hello! I have indexed this candidate's resume. You can ask me specific questions about their experience, tools used, or projects. I will answer using only details from their resume.` }
    ]);
    
    loadDetails();
  }, [candidateId, jobDescription]);

  const handleSendChat = async () => {
    if (!inputMessage.trim() || sendingChat) return;
    
    const userMsg = inputMessage;
    setInputMessage('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setSendingChat(true);

    try {
      const response = await api.chatWithCandidate(candidateId, userMsg, chatMessages);
      setChatMessages(prev => [...prev, { role: 'assistant', content: response }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I had an issue retrieving that information. Please check your backend connection." }]);
    } finally {
      setSendingChat(false);
    }
  };

  const handleCopyQuestion = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const evalInfo = explainData?.evaluation;
  const nameDisplay = explainData ? anonymizeName(explainData.candidate_name, blindScreening) : 'Candidate';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Top Controls */}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors"
      >
        <ArrowLeft size={15} />
        Back to list
      </button>

      {/* Candidate Profile Header Card */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/60 dark:border-slate-850 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-gradient-to-tr from-primary-500 to-teal-400 text-white font-black text-xl rounded-2xl flex items-center justify-center shadow-lg shadow-primary-500/10">
            {explainData?.candidate_name[0] || 'C'}
          </div>
          <div>
            <h2 className="text-lg font-black">{nameDisplay}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 text-slate-500 dark:text-slate-400 text-xs px-2.5 py-0.5 rounded-full font-bold">
                {explainData?.evaluation.overall_match_percentage ? `${explainData.evaluation.overall_match_percentage}% Match` : 'N/A'}
              </span>
              <span className="bg-primary-500/10 text-primary-500 text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                {explainData?.matching_chunks[0]?.section_name || 'Resume'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Navigation buttons */}
        <div className="flex flex-wrap gap-1 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-250/20 dark:border-slate-850">
          {[
            { id: 'evaluation', label: 'Evaluation', icon: Sparkles },
            { id: 'explain', label: 'Explainable AI', icon: Cpu },
            { id: 'chat', label: 'Resume Chat', icon: MessageSquare },
            { id: 'questions', label: 'Interview Guide', icon: HelpCircle },
            { id: 'resume', label: 'Full Resume', icon: FileText }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-slate-900 text-primary-500 shadow-sm border border-slate-200/50 dark:border-slate-800'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-850/40'
                }`}
              >
                <Icon size={13} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Tab Panels */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/60 dark:border-slate-850 shadow-sm p-6 min-h-[450px]">
        {loadingExplain && activeTab === 'evaluation' ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
            <RefreshCw className="animate-spin mb-2" size={32} />
            <span className="text-xs font-bold">Computing deep evaluation metrics...</span>
          </div>
        ) : activeTab === 'evaluation' && evalInfo ? (
          /* TABS: EVALUATION DETAIL */
          <div className="space-y-8 animate-fade-in">
            {/* Match Percentages Grid */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Scoring Breakdown</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { label: 'Overall', val: evalInfo.overall_match_percentage, color: 'bg-primary-500' },
                  { label: 'Skills', val: evalInfo.skills_match_percentage, color: 'bg-indigo-500' },
                  { label: 'Experience', val: evalInfo.experience_match_percentage, color: 'bg-violet-500' },
                  { label: 'Projects', val: evalInfo.project_match_percentage, color: 'bg-emerald-500' },
                  { label: 'Education', val: evalInfo.education_match_percentage, color: 'bg-teal-500' }
                ].map(item => (
                  <div key={item.label} className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-850/50 text-center space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase block">{item.label}</span>
                    <div className="text-xl font-black text-slate-800 dark:text-slate-200">{item.val}%</div>
                    <div className="h-1.5 w-full bg-slate-200/50 dark:bg-slate-850 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.val}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Strengths and Weaknesses */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Strengths */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-850 pb-2">
                  <CheckCircle2 size={15} />
                  Candidate Strengths
                </h4>
                <ul className="space-y-3">
                  {evalInfo.strengths.map((str, idx) => (
                    <li key={idx} className="flex gap-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-350">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5" />
                      <span className="font-medium">{str}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Weaknesses / Gaps */}
              <div className="space-y-3.5">
                <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-850 pb-2">
                  <AlertCircle size={15} />
                  Skill Gaps & Discrepancies
                </h4>
                <ul className="space-y-3">
                  {evalInfo.weaknesses.map((weak, idx) => (
                    <li key={idx} className="flex gap-2.5 text-xs leading-relaxed text-slate-600 dark:text-slate-350">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                      <span className="font-medium">{weak}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Missing Skills */}
            {evalInfo.missing_skills.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Missing Core Skills</h4>
                <div className="flex flex-wrap gap-2">
                  {evalInfo.missing_skills.map((skill, idx) => (
                    <span key={idx} className="bg-red-500/10 text-red-500 px-2.5 py-1 rounded-xl text-xs font-bold border border-red-500/20">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-150 dark:border-slate-850 space-y-2">
              <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">AI Recommendation Verdict</h4>
              <p className="text-xs leading-relaxed font-semibold text-slate-600 dark:text-slate-300">
                {evalInfo.verdict_summary}
              </p>
            </div>
          </div>
        ) : activeTab === 'explain' ? (
          /* TABS: EXPLAINABLE AI */
          loadingExplain ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
              <RefreshCw className="animate-spin mb-2" size={32} />
              <span className="text-xs font-bold">Computing explainability vectors...</span>
            </div>
          ) : explainData ? (
            <div className="space-y-6 animate-fade-in">
              <div>
                <h3 className="font-extrabold text-base">Score Explainability Panel</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Exact mapping showing how candidate resume sections match your search criteria.</p>
              </div>

              <div className="space-y-4">
                {explainData.matching_chunks.slice(0, 5).map((chunk, idx) => (
                  <div key={idx} className="p-5 bg-slate-50/40 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 rounded-2xl space-y-3 shadow-xs">
                    <div className="flex justify-between items-center">
                      <span className="bg-primary-500/10 text-primary-500 text-[10px] px-2.5 py-0.5 rounded-lg font-extrabold uppercase tracking-wide border border-primary-500/20">
                        {chunk.section_name} section
                      </span>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        Relevance Score: <b className="text-primary-500">{chunk.similarity.toFixed(0)}%</b>
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-350 font-medium italic border-l-2 border-primary-500/30 pl-3.5">
                      "{chunk.text}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-xs font-bold text-slate-400">Could not load explainability data.</div>
          )
        ) : activeTab === 'chat' ? (
          /* TABS: RESUME CHAT */
          <div className="h-[460px] flex flex-col animate-fade-in border border-slate-200/80 dark:border-slate-850 rounded-2xl overflow-hidden bg-slate-50/40 dark:bg-slate-950/20">
            {/* Messages box */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] px-4 py-3 rounded-2xl text-xs leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-primary-500 text-white font-medium rounded-tr-none shadow-sm'
                        : 'bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850 rounded-tl-none text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
              {sendingChat && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-900 border border-slate-200/50 dark:border-slate-850 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1.5 items-center">
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-100" />
                    <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce delay-200" />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Input box */}
            <div className="p-3.5 bg-white dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-850 flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendChat()}
                placeholder={`Ask a question about ${nameDisplay}'s resume...`}
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-850 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary-500 font-bold text-slate-700 dark:text-slate-350"
              />
              <button
                onClick={handleSendChat}
                className="p-2.5 bg-primary-500 hover:bg-primary-600 text-white rounded-xl active:scale-95 transition-all shadow-md shadow-primary-500/10"
              >
                <Send size={15} />
              </button>
            </div>
          </div>
        ) : activeTab === 'questions' ? (
          /* TABS: CUSTOM QUESTIONS */
          <div className="space-y-6 animate-fade-in">
            <div>
              <h3 className="font-extrabold text-base">Customized Interview Guide</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-medium">Interview questions targeting the candidate's core weaknesses and gap areas relative to the JD.</p>
            </div>

            {loadingQuestions ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600">
                <RefreshCw className="animate-spin mb-2" size={32} />
                <span className="text-xs font-bold">Generating customized questions based on requirements gap...</span>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.length === 0 ? (
                  <p className="text-xs font-bold text-slate-450 dark:text-slate-600 py-4 text-center">No customization questions needed for this JD context.</p>
                ) : (
                  questions.map((q, idx) => (
                    <div key={idx} className="p-4 bg-slate-50/40 dark:bg-slate-950 border border-slate-200/65 dark:border-slate-850 rounded-2xl flex justify-between gap-4 items-center hover:bg-slate-50/80 dark:hover:bg-slate-850/10 transition-colors">
                      <p className="text-xs leading-relaxed font-bold text-slate-700 dark:text-slate-200">{q}</p>
                      <button
                        onClick={() => handleCopyQuestion(q, idx)}
                        className="p-2 bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 border border-slate-200/60 dark:border-slate-800 rounded-xl shrink-0 transition-colors text-slate-400 hover:text-slate-700 dark:hover:text-white"
                      >
                        {copiedIndex === idx ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ) : (
          /* TABS: FULL RESUME VIEW */
          <div className="animate-fade-in space-y-4">
            <div>
              <h3 className="font-extrabold text-base">Raw Resume Content</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Extracted and parsed text representation of the candidate resume.</p>
            </div>
            
            <div className="p-6 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-850 max-h-[500px] overflow-y-auto">
              <pre className="text-xs leading-relaxed font-mono whitespace-pre-wrap text-slate-500 dark:text-slate-400">
                {explainData?.matching_chunks
                  ? explainData.matching_chunks.map(c => c.text).join('\n\n')
                  : 'Loading resume text...'}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
