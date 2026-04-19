import { useState, useContext } from "react";
import { ProjectMetaContext } from "@/app/dashboard/[project]/layout";
import { METHOD_COLORS } from "../views/requestflow";
import { useTestSuiteManager, TestStatus } from "../models/testsuitemanager";
import { EmptyState, LoadingState } from "@/app/components/loader";

const STATUS_COLORS: Record<TestStatus, string> = {
  idle: "text-gray-400",
  running: "text-yellow-400 animate-pulse",
  pass: "text-green-400",
  fail: "text-red-400",
  error: "text-orange-400",
};

const STATUS_BG: Record<TestStatus, string> = {
  idle: "bg-gray-800",
  running: "bg-yellow-900/30",
  pass: "bg-green-900/20",
  fail: "bg-red-900/20",
  error: "bg-orange-900/20",
};

const STATUS_ICON: Record<TestStatus, string> = {
  idle: "○", running: "◌", pass: "✓", fail: "✗", error: "⚠",
};

const STATUS_BADGE: Record<TestStatus, string> = {
  idle: "bg-gray-700 text-gray-400",
  running: "bg-yellow-800 text-yellow-300",
  pass: "bg-green-800 text-green-300",
  fail: "bg-red-800 text-red-300",
  error: "bg-orange-800 text-orange-300",
};

interface TestSuiteProps {
  projectWS: any;
}

export default function TestSuite({ projectWS }: TestSuiteProps) {
  const { endpoints } = useContext(ProjectMetaContext)!;
  const { tests, generating, running, allDone, summary, generateTests, runTests } = useTestSuiteManager(projectWS);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="dv-panel-suite">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-700">
        <span className="text-xs text-gray-500 uppercase tracking-widest mr-1 dark:text-white">Tests</span>
        <button
          onClick={generateTests}
          disabled={generating || running || !endpoints.length}
          className="flex items-center gap-1.5 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs transition-colors"
        >
          {generating
            ? <span className="animate-spin inline-block w-3 h-3 border border-white border-t-transparent rounded-full" />
            : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 2L10 6L2 10V2Z" fill="currentColor" /></svg>
          }
          {generating ? "Generating…" : "Generate"}
        </button>

        {tests.length > 0 && (
          <button
            onClick={runTests}
            disabled={running || generating || !projectWS}
            className="flex items-center gap-1.5 px-3 py-1 rounded bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs transition-colors"
          >
            {running
              ? <span className="animate-spin inline-block w-3 h-3 border border-white border-t-transparent rounded-full" />
              : <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 2L7 6L1 10V2Z" fill="currentColor" /><path d="M9 2L11 2V10H9V2Z" fill="currentColor" /></svg>
            }
            {running ? "Running…" : "Run All"}
          </button>
        )}

        {allDone && (
          <div className="ml-auto flex items-center gap-3 text-xs">
            <span className="text-green-400">{summary.pass} passed</span>
            {summary.fail > 0 && <span className="text-red-400">{summary.fail} failed</span>}
            {summary.error > 0 && <span className="text-orange-400">{summary.error} errored</span>}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Endpoint list */}
        <div className="border-b border-gray-700">
          {endpoints.length === 0 ? (
            <p className="px-3 py-2 text-xs text-gray-600">No endpoints detected</p>
          ) : (
            endpoints.map((ep, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 border-b border-gray-800/60 last:border-0">
                <span className={`text-[10px] font-bold px-1.5 py-px rounded flex-shrink-0 ${METHOD_COLORS[ep.method] ?? "text-gray-400 bg-gray-800"}`}>
                  {ep.method}
                </span>
                <span className="text-gray-400 text-xs font-mono">{ep.path}</span>
                <span className="text-gray-700 text-[10px] ml-auto">{ep.file}</span>
              </div>
            ))
          )}
        </div>

        {/* Empty state */}
        {tests.length === 0 && !generating && (
          <EmptyState
          icon={
            <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
              <rect x="4" y="4" width="28" height="28" rx="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 18h12M18 12v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
          message="Generate tests from your endpoints"
          />
        )}

        {generating && (
          <LoadingState message="Generating tests…" />
        )}

        {/* Test cases */}
        {tests.map((test) => (
          <div key={test.id} className={`border-b border-gray-800 transition-colors ${STATUS_BG[test.status]}`}>
            <button
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 transition-colors text-left"
              onClick={() => toggleExpand(test.id)}
            >
              <span className={`text-sm font-bold w-4 text-center ${STATUS_COLORS[test.status]}`}>
                {STATUS_ICON[test.status]}
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-px rounded flex-shrink-0 ${METHOD_COLORS[test.method] ?? "text-gray-400 bg-gray-800"}`}>
                {test.method}
              </span>
              <span className="flex-1 text-gray-200 text-xs truncate">{test.name}</span>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono ${STATUS_BADGE[test.status]}`}>
                {test.status}
              </span>
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
                className={`text-gray-600 transition-transform flex-shrink-0 ${expanded.has(test.id) ? "rotate-180" : ""}`}>
                <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
            {expanded.has(test.id) && (
              <div className="px-4 pb-3 pt-0 text-xs space-y-2 border-t border-gray-800/60">
                <p className="text-gray-400 pt-2">{test.description}</p>
                {test.output && (
                  <pre className={`rounded p-2 whitespace-pre-wrap leading-relaxed ${
                    test.status === "pass" ? "bg-green-950/40 text-green-300"
                    : test.status === "fail" ? "bg-red-950/40 text-red-300"
                    : "bg-gray-950 text-gray-300"
                  }`}>
                    {test.output}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}