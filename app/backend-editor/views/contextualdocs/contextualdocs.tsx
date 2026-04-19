import { useState, useRef } from "react";
 
interface DocResult {
  title: string;
  url: string;
  snippet: string;
  relevance: "high" | "medium" | "low";
  source: string;
}
 
interface DocSection {
  heading: string;
  content: string;
  code?: string;
}
 
interface DocsProps {
  code: string;
}
 
const RELEVANCE_COLORS = {
  high: "bg-emerald-900/30 border-emerald-700/50 text-emerald-400",
  medium: "bg-blue-900/30 border-blue-700/50 text-blue-400",
  low: "bg-gray-800/60 border-gray-700 text-gray-500",
};
 
const RELEVANCE_LABEL = {
  high: "High relevance",
  medium: "Medium",
  low: "Low",
};
 
function LoadingDots() {
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block w-1 h-1 rounded-full bg-current animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}
 
export default function ContextualDocs({ code }: DocsProps) {
  const [query, setQuery] = useState("");
  const [autoQuery, setAutoQuery] = useState("");
  const [results, setResults] = useState<DocResult[]>([]);
  const [sections, setSections] = useState<DocSection[]>([]);
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [expanded, setExpanded] = useState<Set<number>>(new Set([0]));
  const [mode, setMode] = useState<"auto" | "manual">("auto");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
 
  const toggleExpand = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(i) ? next.delete(i) : next.add(i);
      return next;
    });
  };
 
  const fetchDocs = async (searchQuery: string, isAuto = false) => {
    if (!searchQuery.trim()) return;
    if (isAuto) setAutoLoading(true);
    else setLoading(true);
 
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1000,
          system: `You are a documentation retrieval assistant. Given a query and/or code context, generate realistic documentation results.
Return JSON with:
{
  "results": [{ "title": "...", "url": "https://...", "snippet": "one sentence", "relevance": "high|medium|low", "source": "framework name" }],
  "sections": [{ "heading": "...", "content": "2-3 sentences of doc content", "code": "optional code snippet" }]
}
Max 4 results, max 3 sections. No markdown, no prose outside JSON.`,
          messages: [
            {
              role: "user",
              content: `Query: ${searchQuery}\n\nCode context:\n${code.slice(0, 500)}`,
            },
          ],
        }),
      });
      const data = await res.json();
      const raw = data.content?.[0]?.text ?? "{}";
      let parsed: { results: DocResult[]; sections: DocSection[] } = { results: [], sections: [] };
      try { parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()); } catch {}
      setResults(parsed.results ?? []);
      setSections(parsed.sections ?? []);
      setExpanded(new Set([0]));
    } catch (e) {
      console.error(e);
    } finally {
      if (isAuto) setAutoLoading(false);
      else setLoading(false);
    }
  };
 
  const handleCodeContext = () => {
    // Auto-extract query from code
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!code.trim() || mode !== "auto") return;
    debounceRef.current = setTimeout(() => {
      // Detect framework/lib from code
      const detectors: [RegExp, string][] = [
        [/flask/i, "Flask routing and blueprints"],
        [/fastapi/i, "FastAPI dependency injection and routes"],
        [/django/i, "Django views and URL patterns"],
        [/sqlalchemy/i, "SQLAlchemy ORM models and queries"],
        [/pydantic/i, "Pydantic models and validators"],
        [/asyncio/i, "Python asyncio async/await patterns"],
        [/aiohttp/i, "aiohttp client and server"],
      ];
      for (const [re, q] of detectors) {
        if (re.test(code)) {
          setAutoQuery(q);
          fetchDocs(q, true);
          return;
        }
      }
      setAutoQuery("Python best practices");
      fetchDocs("Python best practices", true);
    }, 800);
  };
 
  // Trigger auto-detect when code changes (component users should call this)
  // For now expose a button
  const handleAutoDetect = () => handleCodeContext();
 
  return (
    <div className="flex flex-col h-full bg-gray-900 text-gray-100 font-mono text-sm">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700 bg-gray-850 flex-shrink-0">
        <span className="text-xs text-gray-500 uppercase tracking-widest mr-1">Docs</span>
        {/* Mode toggle */}
        <div className="flex rounded overflow-hidden border border-gray-700 text-xs">
          {(["auto", "manual"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-2 py-1 transition-colors capitalize ${
                mode === m ? "bg-gray-700 text-white" : "text-gray-500 hover:text-gray-300"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        {mode === "auto" ? (
          <button
            onClick={handleAutoDetect}
            disabled={autoLoading || !code.trim()}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs transition-colors"
          >
            {autoLoading ? <span className="animate-spin inline-block w-3 h-3 border border-white border-t-transparent rounded-full" /> : null}
            {autoLoading ? "Detecting…" : "Auto-detect"}
          </button>
        ) : (
          <div className="flex flex-1 items-center gap-1.5">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchDocs(query)}
              placeholder="Search docs…"
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-600 focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={() => fetchDocs(query)}
              disabled={loading || !query.trim()}
              className="px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs transition-colors"
            >
              {loading ? <LoadingDots /> : "Search"}
            </button>
          </div>
        )}
      </div>
 
      {/* Auto-query indicator */}
      {mode === "auto" && autoQuery && (
        <div className="px-3 py-1.5 border-b border-gray-800 bg-gray-850 flex items-center gap-2">
          <span className="text-gray-600 text-[10px] uppercase tracking-widest">Context:</span>
          <span className="text-indigo-400 text-xs">{autoQuery}</span>
          {autoLoading && <LoadingDots />}
        </div>
      )}
 
      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {results.length === 0 && sections.length === 0 && !loading && !autoLoading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-600 select-none">
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="4" y="4" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="1.5" />
              <circle cx="16" cy="16" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M20 20l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-xs">Contextual docs from your code</p>
          </div>
        )}
 
        {(loading || autoLoading) && results.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-gray-500">
            <span className="animate-spin inline-block w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full" />
            <span className="text-xs">Retrieving docs…</span>
          </div>
        )}
 
        {results.length > 0 && (
          <div className="divide-y divide-gray-800/60">
            {/* Links */}
            <div className="p-3 space-y-2">
              <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">References</p>
              {results.map((result, i) => (
                <div key={i} className={`rounded border p-2.5 space-y-1 ${RELEVANCE_COLORS[result.relevance]}`}>
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={result.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-medium hover:underline text-gray-200 truncate"
                    >
                      {result.title}
                    </a>
                    <span className={`text-[10px] flex-shrink-0 ${RELEVANCE_COLORS[result.relevance].split(" ").pop()}`}>
                      {RELEVANCE_LABEL[result.relevance]}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 leading-relaxed">{result.snippet}</p>
                  <p className="text-[10px] text-gray-600">{result.source} · {result.url}</p>
                </div>
              ))}
            </div>
 
            {/* Sections */}
            {sections.length > 0 && (
              <div className="p-3 space-y-2">
                <p className="text-[10px] text-gray-600 uppercase tracking-widest mb-2">Documentation</p>
                {sections.map((section, i) => (
                  <div key={i} className="rounded border border-gray-700 bg-gray-800/40 overflow-hidden">
                    <button
                      onClick={() => toggleExpand(i)}
                      className="w-full flex items-center justify-between px-3 py-2 text-xs text-gray-300 hover:bg-white/5 transition-colors"
                    >
                      <span className="font-medium">{section.heading}</span>
                      <svg
                        width="10" height="10" viewBox="0 0 10 10" fill="none"
                        className={`text-gray-600 transition-transform ${expanded.has(i) ? "rotate-180" : ""}`}
                      >
                        <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                    </button>
                    {expanded.has(i) && (
                      <div className="px-3 pb-3 space-y-2 border-t border-gray-700/60">
                        <p className="text-xs text-gray-400 leading-relaxed mt-2">{section.content}</p>
                        {section.code && (
                          <pre className="bg-gray-950 rounded p-2 text-[11px] text-gray-300 overflow-x-auto whitespace-pre">
                            {section.code}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
 