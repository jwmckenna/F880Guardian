
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Link, useNavigate, useLocation, useParams } from 'react-router-dom';
import { ShieldCheck, Plus, BarChart3, History, ChevronRight, AlertTriangle, CheckCircle, Settings, Save, MapPin, ChevronDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { AuditRecord, AuditStatus, AuditResponse, AuditQuestion, AUDIT_CATEGORIES, ComplianceRating } from './types';
import { AuditCard } from './components/AuditCard';
import { SettingsModal } from './components/SettingsModal';
import { generateQAPISummary } from './services/geminiService';
import { fetchAuditsFromSheet, saveAuditToSheet, exportToGoogleSheetsCSV, getScriptUrl } from './services/storageService';

// --- Constants & Mock Data ---
const FACILITIES = [
  "Chrucho Creek",
  "Becky's Gardens",
  "Oklahoma House",
  "Quilters Home",
  "Sunset Senior Living"
];

const QUESTIONS: AuditQuestion[] = [
  { id: 'hh-1', category: 'Hand Hygiene', text: 'Staff performs hand hygiene before patient contact.' },
  { id: 'hh-2', category: 'Hand Hygiene', text: 'Staff performs hand hygiene after body fluid exposure risk.' },
  { id: 'ppe-1', category: 'PPE Usage', text: 'Gowns are worn correctly when indicated.' },
  { id: 'ppe-2', category: 'PPE Usage', text: 'Masks cover both nose and mouth.' },
  { id: 'env-1', category: 'Environmental Cleaning', text: 'High-touch surfaces appear clean and sanitary.' },
  { id: 'env-2', category: 'Environmental Cleaning', text: 'Disinfectant wipes are readily available and lids are closed.' },
  { id: 'iso-1', category: 'Isolation Precautions', text: 'Signage indicating precautions is clearly posted on door.' },
];

// --- Helper Components ---

const Layout: React.FC<{ 
  children: React.ReactNode, 
  currentFacility: string, 
  onFacilityChange: (f: string) => void,
  onExport: () => void,
  onOpenSettings: () => void
}> = ({ children, currentFacility, onFacilityChange, onExport, onOpenSettings }) => {
  const location = useLocation();
  
  const getLinkClass = (path: string) => {
    const isActive = location.pathname === path;
    return `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`;
  };

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-sm z-10 sticky top-0">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg shadow-sm">
              <ShieldCheck className="text-white w-5 h-5" />
            </div>
            <div className="flex flex-col justify-center">
               <h1 className="font-bold text-gray-900 text-sm leading-none mb-0.5">F880 Guardian</h1>
               <div className="relative group flex items-center">
                  <MapPin className="w-3 h-3 text-indigo-500 mr-1" />
                  <select 
                    value={currentFacility}
                    onChange={(e) => onFacilityChange(e.target.value)}
                    className="appearance-none bg-transparent text-xs font-semibold text-gray-600 hover:text-indigo-600 pr-5 cursor-pointer focus:outline-none transition-colors"
                  >
                    {FACILITIES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                  <ChevronDown className="w-3 h-3 text-gray-400 absolute right-0 pointer-events-none" />
               </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={onExport}
              className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-medium transition-colors border border-green-200"
              title="Export to CSV for Google Sheets"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span className="hidden sm:inline">Export</span>
            </button>
            <button 
              onClick={onOpenSettings}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-20">
        <div className="max-w-3xl mx-auto w-full">
          {children}
        </div>
      </main>

      <nav className="bg-white border-t border-gray-200 h-16 fixed bottom-0 w-full z-20 safe-area-pb">
        <div className="max-w-3xl mx-auto h-full flex justify-around items-center">
          <Link to="/" className={getLinkClass('/')}>
            <BarChart3 className="w-6 h-6" />
            <span className="text-[10px] font-medium">Dashboard</span>
          </Link>
          <Link to="/audit/new" className="relative -top-5">
            <div className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full p-4 shadow-lg transition-transform active:scale-95 border-4 border-gray-50 ring-1 ring-indigo-100">
              <Plus className="w-7 h-7" />
            </div>
          </Link>
          <Link to="/history" className={getLinkClass('/history')}>
            <History className="w-6 h-6" />
            <span className="text-[10px] font-medium">History</span>
          </Link>
        </div>
      </nav>
    </div>
  );
};

// --- Pages ---

const Dashboard: React.FC<{ audits: AuditRecord[], currentFacility: string, isLoading: boolean }> = ({ audits, currentFacility, isLoading }) => {
  const completedAudits = audits.filter(a => a.status === AuditStatus.COMPLETED);
  
  const averageScore = completedAudits.length > 0 
    ? Math.round(completedAudits.reduce((acc, curr) => acc + curr.overallScore, 0) / completedAudits.length) 
    : 0;

  let ratingColor = ComplianceRating.GREEN;
  let ratingColorHex = "#22c55e"; // tailwind green-500
  if (averageScore < 80) {
    ratingColor = ComplianceRating.RED;
    ratingColorHex = "#ef4444"; // tailwind red-500
  } else if (averageScore < 95) {
    ratingColor = ComplianceRating.YELLOW;
    ratingColorHex = "#eab308"; // tailwind yellow-500
  }

  const data = [
    { name: 'Compliance', value: averageScore },
    { name: 'Gap', value: 100 - averageScore },
  ];

  const barData = completedAudits.slice(-5).map(a => ({
    name: new Date(a.timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric'}),
    score: a.overallScore
  }));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-3">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Syncing with Google Sheets...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      {/* Welcome / Facility Header */}
      <div className="flex items-center justify-between px-2">
         <div>
           <h2 className="text-xl font-bold text-gray-800">{currentFacility}</h2>
           <p className="text-xs text-gray-500">Infection Control Overview</p>
         </div>
         <div className="text-xs font-medium bg-white px-3 py-1 rounded-full shadow-sm border border-gray-200 text-gray-600">
           {completedAudits.length} Rounds
         </div>
      </div>

      {/* Score Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-gray-500 text-sm font-medium uppercase tracking-wide mb-4">Facility Compliance Score</h2>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-5xl font-bold text-gray-900 mb-1">{averageScore}%</div>
            <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
              ${ratingColor === 'GREEN' ? 'bg-green-100 text-green-800' : 
                ratingColor === 'YELLOW' ? 'bg-yellow-100 text-yellow-800' : 
                'bg-red-100 text-red-800'}`}>
              {ratingColor === 'GREEN' ? 'Target Met' : 'Needs Improvement'}
            </div>
          </div>
          <div className="h-24 w-24 relative">
             <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={45}
                    startAngle={90}
                    endAngle={-270}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    <Cell fill={ratingColorHex} />
                    <Cell fill="#f3f4f6" />
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <BarChart3 className="w-5 h-5" />
              </div>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Based on surveillance rounds over the last 30 days at this facility.
        </p>
      </div>

      {/* Trend */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h3 className="text-gray-800 font-bold mb-4">Process Trend</h3>
        {completedAudits.length > 0 ? (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                <YAxis hide domain={[0, 100]} />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="score" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-48 w-full flex items-center justify-center text-gray-400 text-sm bg-gray-50 rounded-xl">
            Not enough data for trends
          </div>
        )}
      </div>

      {/* Recent Actions */}
      <div>
        <h3 className="text-gray-800 font-bold mb-3 px-1">Recent Rounds</h3>
        <div className="space-y-3">
          {completedAudits.length === 0 ? (
             <div className="text-center py-8 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
                No rounds completed yet for {currentFacility}.
             </div>
          ) : completedAudits.slice(0, 3).map(audit => (
            <Link to={`/audit/${audit.id}`} key={audit.id} className="block bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-indigo-200 transition-colors">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold text-gray-800">{audit.location}</div>
                  <div className="text-xs text-gray-500">
                    {new Date(audit.timestamp).toLocaleDateString()} • {audit.auditorName}
                  </div>
                </div>
                <div className={`text-sm font-bold ${audit.overallScore >= 95 ? 'text-green-600' : audit.overallScore >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {audit.overallScore}%
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
};

const AuditHistory: React.FC<{ audits: AuditRecord[], currentFacility: string }> = ({ audits, currentFacility }) => {
  const completed = audits.filter(a => a.status === AuditStatus.COMPLETED).sort((a, b) => b.timestamp - a.timestamp);
  return (
    <div className="p-4 space-y-4">
      <div className="flex justify-between items-end">
        <h2 className="text-2xl font-bold text-gray-800">History</h2>
        <span className="text-xs text-gray-500 font-medium mb-1">{currentFacility}</span>
      </div>
      
      <div className="space-y-3">
        {completed.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
            No history available for this location.
          </div>
        ) : (
          completed.map(audit => (
            <Link to={`/audit/${audit.id}`} key={audit.id} className="block bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-600 mb-1">{new Date(audit.timestamp).toLocaleDateString()}</span>
                  <h3 className="font-bold text-gray-800">{audit.location}</h3>
                </div>
                <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${audit.overallScore >= 90 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {audit.overallScore}
                </div>
              </div>
              <div className="text-xs text-gray-500 flex justify-between items-center mt-2">
                <span>Auditor: {audit.auditorName}</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

const NewAudit: React.FC<{ onSave: (audit: AuditRecord) => void, facilityName: string }> = ({ onSave, facilityName }) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<number>(1); // 1: Setup, 2: Audit
  const [auditorName, setAuditorName] = useState('');
  const [location, setLocation] = useState('');
  const [responses, setResponses] = useState<AuditResponse[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(AUDIT_CATEGORIES[0]);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateResponse = (resp: AuditResponse) => {
    setResponses(prev => {
      const filtered = prev.filter(r => r.questionId !== resp.questionId);
      return [...filtered, resp];
    });
  };

  const calculateScore = () => {
    const applicable = responses.filter(r => r.status !== 'na');
    if (applicable.length === 0) return 100;
    const passed = applicable.filter(r => r.status === 'pass');
    return Math.round((passed.length / applicable.length) * 100);
  };

  const finishAudit = async () => {
    setIsSaving(true);
    const score = calculateScore();
    const newAudit: AuditRecord = {
      id: Date.now().toString(),
      facilityName: facilityName, // Associate with current facility
      timestamp: Date.now(),
      auditorName,
      location,
      responses,
      status: AuditStatus.COMPLETED,
      overallScore: score,
      aiAnalysis: undefined // Will be populated in view
    };
    await onSave(newAudit);
    setIsSaving(false);
    navigate('/');
  };

  // Step 1: Setup
  if (step === 1) {
    return (
      <div className="p-6 min-h-full flex flex-col justify-center">
        <div className="space-y-6">
          <div>
            <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-2 py-1 rounded text-xs font-semibold mb-3">
              <MapPin className="w-3 h-3" /> {facilityName}
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Start New Round</h2>
            <p className="text-gray-500 text-sm">F880 Infection Control Surveillance</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Auditor Name</label>
              <input 
                type="text" 
                value={auditorName}
                onChange={e => setAuditorName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow"
                placeholder="e.g., Jane Doe, IP"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location / Unit</label>
              <select 
                value={location}
                onChange={e => setLocation(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-shadow bg-white"
              >
                <option value="">Select Location...</option>
                <option value="Unit A - Memory Care">Unit A - Memory Care</option>
                <option value="Unit B - Rehab">Unit B - Rehab</option>
                <option value="Main Dining Hall">Main Dining Hall</option>
                <option value="Therapy Gym">Therapy Gym</option>
                <option value="Kitchen / Dietary">Kitchen / Dietary</option>
                <option value="Laundry">Laundry</option>
              </select>
            </div>
          </div>

          <button 
            onClick={() => setStep(2)}
            disabled={!auditorName || !location}
            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
          >
            Begin Round
          </button>
        </div>
      </div>
    );
  }

  // Step 2: Checklist
  const categoryQuestions = QUESTIONS.filter(q => q.category === selectedCategory);
  const progress = Math.round((responses.length / QUESTIONS.length) * 100);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      {/* Top Bar: Progress */}
      <div className="bg-white px-4 py-3 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1">
             {location} <span className="text-gray-300">|</span> {facilityName}
          </span>
          <span className="text-sm font-medium text-indigo-600">{progress}% Completed</span>
        </div>
        <button 
          onClick={finishAudit}
          disabled={isSaving}
          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {isSaving ? 'Saving...' : 'Finish'}
        </button>
      </div>

      {/* Category Selector */}
      <div className="overflow-x-auto py-3 px-4 bg-gray-50 whitespace-nowrap hide-scrollbar">
        <div className="flex gap-2">
          {AUDIT_CATEGORIES.map(cat => {
            const isActive = selectedCategory === cat;
            // Check if all questions in this category are answered
            const catQIds = QUESTIONS.filter(q => q.category === cat).map(q => q.id);
            const isComplete = catQIds.every(id => responses.some(r => r.questionId === id));

            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all border ${
                  isActive 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' 
                    : isComplete 
                      ? 'bg-white text-green-700 border-green-200' 
                      : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Questions */}
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <div className="space-y-2">
          {categoryQuestions.map(q => (
            <AuditCard 
              key={q.id}
              question={q}
              response={responses.find(r => r.questionId === q.id)}
              onUpdate={handleUpdateResponse}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

const AuditDetail: React.FC<{ audits: AuditRecord[], updateAudit: (id: string, data: Partial<AuditRecord>) => void }> = ({ audits, updateAudit }) => {
  const { id } = useParams(); 
  const audit = audits.find(a => a.id === id);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);

  const handleGenerateReport = async () => {
    if (!audit) return;
    setIsGeneratingAI(true);
    const summary = await generateQAPISummary(audit, QUESTIONS);
    
    // Save locally
    updateAudit(audit.id, { aiAnalysis: summary });
    
    // Attempt to save to cloud too (update)
    saveAuditToSheet({ ...audit, aiAnalysis: summary });
    
    setIsGeneratingAI(false);
  };

  if (!audit) return <div className="p-8 text-center">Audit not found</div>;

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-gray-900">{audit.location}</h1>
            <span className="text-xs text-gray-400 border border-gray-200 rounded px-1">{audit.facilityName}</span>
          </div>
          <p className="text-gray-500 text-sm">{new Date(audit.timestamp).toLocaleString()}</p>
          <p className="text-gray-500 text-sm">Auditor: {audit.auditorName}</p>
        </div>
        <div className={`text-3xl font-bold ${audit.overallScore >= 95 ? 'text-green-600' : audit.overallScore >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>
          {audit.overallScore}%
        </div>
      </div>

      {/* AI QAPI Report Section */}
      <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-indigo-600 p-1 rounded text-white">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h2 className="font-bold text-indigo-900">AI QAPI Summary</h2>
        </div>
        
        {audit.aiAnalysis ? (
          <div className="prose prose-sm text-indigo-900 max-w-none">
            <div dangerouslySetInnerHTML={{ 
              __html: audit.aiAnalysis.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') 
            }} />
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-indigo-700 text-sm mb-4">Generate a QAPI-ready summary identifying F880 root causes and corrective actions.</p>
            <button 
              onClick={handleGenerateReport}
              disabled={isGeneratingAI}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg shadow-sm hover:bg-indigo-700 text-sm font-medium disabled:opacity-50"
            >
              {isGeneratingAI ? 'Analyzing Findings...' : 'Generate Report'}
            </button>
          </div>
        )}
      </div>

      {/* Findings List */}
      <div>
        <h3 className="font-bold text-gray-800 mb-3">Detailed Findings</h3>
        <div className="space-y-3">
          {audit.responses.map((resp, idx) => {
            const q = QUESTIONS.find(qu => qu.id === resp.questionId);
            return (
              <div key={idx} className={`bg-white p-4 rounded-lg border-l-4 shadow-sm ${resp.status === 'pass' ? 'border-l-green-500' : resp.status === 'fail' ? 'border-l-red-500' : 'border-l-gray-300'}`}>
                <p className="text-sm font-medium text-gray-900 mb-1">{q?.text}</p>
                <div className="flex justify-between items-start">
                  <span className={`text-xs font-bold uppercase ${resp.status === 'pass' ? 'text-green-600' : resp.status === 'fail' ? 'text-red-600' : 'text-gray-500'}`}>
                    {resp.status === 'pass' ? 'Compliant' : resp.status === 'fail' ? 'Non-Compliant' : 'N/A'}
                  </span>
                </div>
                {resp.comment && (
                  <div className="mt-2 bg-gray-50 p-2 rounded text-xs text-gray-600 italic">
                    "{resp.comment}"
                  </div>
                )}
                {resp.imageUri && (
                  <div className="mt-2">
                    <img src={resp.imageUri} alt="finding" className="h-20 rounded border border-gray-200" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---

const App: React.FC = () => {
  const [currentFacility, setCurrentFacility] = useState(FACILITIES[0]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Load audits (initially from network or storage)
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        // This fetches from Google Sheets if URL is set, or falls back to local
        const data = await fetchAuditsFromSheet();
        
        // If empty (first run or cleared storage), populate defaults for demo
        if (data.length === 0 && !getScriptUrl()) {
           setAudits([
              {
                id: '1',
                facilityName: "Chrucho Creek",
                timestamp: Date.now() - 86400000 * 2,
                auditorName: 'Sarah Jenkins, IP',
                location: 'Unit B - Rehab',
                status: AuditStatus.COMPLETED,
                overallScore: 75,
                responses: [
                   { questionId: 'hh-1', status: 'fail', comment: 'Nurse did not sanitize hands before entering Room 204.'},
                   { questionId: 'env-1', status: 'pass' },
                   { questionId: 'iso-1', status: 'fail', comment: 'Contact isolation sign fell off door.' }
                ]
              },
              {
                id: '2',
                facilityName: "Becky's Gardens",
                timestamp: Date.now() - 86400000 * 5,
                auditorName: 'Mike Ross, DON',
                location: 'Main Dining Hall',
                status: AuditStatus.COMPLETED,
                overallScore: 95,
                responses: []
              },
              {
                id: '3',
                facilityName: "Oklahoma House",
                timestamp: Date.now() - 86400000 * 1,
                auditorName: 'Karen Smith, ADON',
                location: 'Unit A - Memory Care',
                status: AuditStatus.COMPLETED,
                overallScore: 88,
                responses: [
                   { questionId: 'ppe-2', status: 'fail', comment: 'Mask under nose observed in hallway.' }
                ]
              },
              {
                id: '4',
                facilityName: "Quilters Home",
                timestamp: Date.now() - 86400000 * 10,
                auditorName: 'John Doe, IP',
                location: 'Kitchen / Dietary',
                status: AuditStatus.COMPLETED,
                overallScore: 92,
                responses: []
              },
              {
                id: '5',
                facilityName: "Sunset Senior Living",
                timestamp: Date.now() - 86400000 * 15,
                auditorName: 'Emily White, Admin',
                location: 'Lobby',
                status: AuditStatus.COMPLETED,
                overallScore: 100,
                responses: []
              }
           ]);
        } else {
          setAudits(data);
        }
      } catch (e) {
        console.error("Load failed", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  const addAudit = async (audit: AuditRecord) => {
    // Optimistic Update
    setAudits(prev => [audit, ...prev]);
    // Save to DB
    await saveAuditToSheet(audit);
  };

  const updateAudit = (id: string, data: Partial<AuditRecord>) => {
    setAudits(prev => prev.map(a => a.id === id ? { ...a, ...data } : a));
    // Note: Full save happens in the generateReport function or similar
  };

  const handleExport = () => {
    exportToGoogleSheetsCSV(audits);
  };

  // Filter audits based on selected facility
  const filteredAudits = audits.filter(a => a.facilityName === currentFacility);

  return (
    <HashRouter>
      <Layout 
        currentFacility={currentFacility} 
        onFacilityChange={setCurrentFacility}
        onExport={handleExport}
        onOpenSettings={() => setIsSettingsOpen(true)}
      >
        <Routes>
          <Route path="/" element={<Dashboard audits={filteredAudits} currentFacility={currentFacility} isLoading={isLoading} />} />
          <Route path="/history" element={<AuditHistory audits={filteredAudits} currentFacility={currentFacility} />} />
          <Route path="/audit/new" element={<NewAudit onSave={addAudit} facilityName={currentFacility} />} />
          <Route path="/audit/:id" element={<AuditDetail audits={audits} updateAudit={updateAudit} />} />
        </Routes>
        
        <SettingsModal 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)} 
        />
      </Layout>
    </HashRouter>
  );
};

export default App;
