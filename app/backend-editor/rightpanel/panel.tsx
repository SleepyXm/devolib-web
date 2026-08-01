import { useState, useContext } from "react";
import TestSuite from "../views/testsuite";
import RequestFlow from "../views/requestflow";
import ContextualDocs from "../views/contextualdocs/contextualdocs";
import { ProjectContext } from "@/app/dashboard/[project]/layout";
 
type PanelTab = "tests" | "flow" | "docs";
 
interface RightPanelProps {
  code: string;
}
 
const TABS: { id: PanelTab; label: string; icon: React.ReactNode; badge?: string }[] = [
  {
    id: "tests",
    label: "Tests",
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <rect x="1" y="1" width="11" height="11" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4 6.5l1.5 1.5L9 4.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "flow",
    label: "Flow",
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <circle cx="2.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
        <circle cx="10.5" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4 6.5h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M6.5 4l2.5 2.5-2.5 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "docs",
    label: "Docs",
    icon: (
      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
        <rect x="2" y="1" width="9" height="11" rx="2" stroke="currentColor" strokeWidth="1.2" />
        <path d="M4.5 4.5h4M4.5 6.5h4M4.5 8.5h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
    badge: "beta",
  },
];
 
export default function RightPanel({ code }: RightPanelProps) {
  const [activeTab, setActiveTab] = useState<PanelTab>("tests");
  const { projectWS } = useContext(ProjectContext)!;
 
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden border border-white/10 bg-[var(--dv-surface-inset)]">
      {/* Tab bar */}
      <div className="flex border-b border-gray-700 bg-gray-850 flex-shrink-0">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium transition-colors
              ${activeTab === tab.id
                ? "border-b-2 border-white/50 bg-white/[.06] text-white"
                : "text-gray-500 hover:text-gray-300 border-b-2 border-transparent dark:text-gray-300"
              }
            `}
          >
            <span className={activeTab === tab.id ? "text-white/80" : "text-gray-600 dark:text-gray-200"}>
              {tab.icon}
            </span>
            {tab.label}
            {tab.badge && (
              <span className="inline-flex items-center rounded border border-white/15 bg-white/[.06] px-1 py-px text-[9px] font-bold uppercase leading-none tracking-wide text-white/55">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
 
      {/* Panel content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "tests" && <TestSuite projectWS={projectWS} />}
        {activeTab === "flow" && <RequestFlow />}
        {activeTab === "docs" && <ContextualDocs code={code} />}
      </div>
    </div>
  );
}
 
