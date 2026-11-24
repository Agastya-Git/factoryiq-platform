import { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Wrench,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Tag
} from 'lucide-react';
import { KNOWLEDGE_BASE_ARTICLES, type KnowledgeArticle } from '@/data/knowledgeBase';

export function KnowledgeBase() {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string | null>(KNOWLEDGE_BASE_ARTICLES[0].id);

  const categories = ['All', 'Mechanical', 'Electrical', 'Power Transmission', 'Hydraulics & Seals'];

  const filteredArticles = useMemo(() => {
    return KNOWLEDGE_BASE_ARTICLES.filter((art) => {
      if (selectedCategory !== 'All' && art.category !== selectedCategory) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const inTitle = art.title.toLowerCase().includes(q);
        const inSymptoms = art.symptoms.some((s) => s.toLowerCase().includes(q));
        const inCauses = art.possibleCauses.some((c) => c.toLowerCase().includes(q));
        const inDiagnostics = art.diagnosticSteps.some((d) => d.toLowerCase().includes(q));
        const inActions = art.correctiveActions.some((a) => a.toLowerCase().includes(q));
        const inSafety = art.safetyPrecautions.some((sp) => sp.toLowerCase().includes(q));
        return inTitle || inSymptoms || inCauses || inDiagnostics || inActions || inSafety;
      }
      return true;
    });
  }, [search, selectedCategory]);

  return (
    <div className="space-y-5">
      {/* Search & Category Filter */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3.5">
        <div className="relative">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symptoms, faults, or solutions (e.g. vibration, bearing, overheating, belt)..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 shrink-0">
            Category:
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Articles List */}
      <div className="space-y-3.5">
        {filteredArticles.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-xl border border-slate-200">
            <BookOpen size={28} className="mx-auto text-slate-300" />
            <p className="text-sm font-semibold text-slate-600 mt-2">No maintenance articles found</p>
            <p className="text-xs text-slate-400 mt-1">Try different search keywords or select 'All'.</p>
          </div>
        ) : (
          filteredArticles.map((article) => {
            const isExpanded = expandedId === article.id;
            return (
              <div
                key={article.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Header */}
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : article.id)}
                  className="w-full p-4 flex items-center justify-between gap-3 text-left bg-white hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                      <BookOpen size={16} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-snug">{article.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded flex items-center gap-1">
                          <Tag size={10} />
                          {article.category}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {article.symptoms.length} Symptoms • {article.diagnosticSteps.length} Diagnostic Steps
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-slate-400 shrink-0">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </div>
                </button>

                {/* Expanded Article Body */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-2 border-t border-slate-100 space-y-4 bg-slate-50/50">
                    {/* Symptoms & Possible Causes Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
                      {/* Symptoms */}
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
                          <AlertTriangle size={15} />
                          <span>Symptoms & Observable Signs</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
                          {article.symptoms.map((s, idx) => (
                            <li key={idx} className="leading-relaxed">{s}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Possible Causes */}
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700">
                          <HelpCircle size={15} />
                          <span>Root Causes & Failure Mechanisms</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-700 list-disc pl-4">
                          {article.possibleCauses.map((c, idx) => (
                            <li key={idx} className="leading-relaxed">{c}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Diagnostic Steps */}
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-700">
                        <Search size={15} />
                        <span>Step-by-Step Diagnostic Procedures</span>
                      </div>
                      <ol className="space-y-2 text-xs text-slate-700 list-decimal pl-4">
                        {article.diagnosticSteps.map((d, idx) => (
                          <li key={idx} className="leading-relaxed font-medium">{d}</li>
                        ))}
                      </ol>
                    </div>

                    {/* Corrective Actions */}
                    <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                        <CheckCircle2 size={15} />
                        <span>Standard Operating Procedure (SOP) Corrective Actions</span>
                      </div>
                      <ul className="space-y-2 text-xs text-emerald-950 list-disc pl-4">
                        {article.correctiveActions.map((a, idx) => (
                          <li key={idx} className="leading-relaxed font-medium">{a}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Safety Precautions & LOTO */}
                    <div className="p-3.5 bg-rose-50/70 rounded-xl border border-rose-200 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                        <ShieldAlert size={15} />
                        <span>Mandatory Safety Precautions & LOTO Protocols</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-rose-950 list-disc pl-4">
                        {article.safetyPrecautions.map((sp, idx) => (
                          <li key={idx} className="leading-relaxed font-semibold">{sp}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
