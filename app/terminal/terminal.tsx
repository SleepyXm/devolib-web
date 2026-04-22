"use client";

import { useContext, useEffect } from "react";
import { useParams } from "next/navigation";
import { ProjectContext } from "@/app/dashboard/[project]/layout";
import { TerminalControls, Terminal } from "./terminalcomponents";
import DependencyInstallerPage from '@/app/terminal/DependencyZone/views/dependencyinstaller'

export default function TerminalPage() {
  const ctx = useContext(ProjectContext);
  const params = useParams();
  const projectId = Array.isArray(params?.project) ? params.project[0] : params?.project;
  const handleConnect = () => connect(projectId ?? undefined);

  if (!ctx) return <div>Project context not found</div>;

  const { logs, isConnected, isRunning, start, connect, stop, projectWS, setProjectId } = ctx;

  useEffect(() => {
    if (projectId) setProjectId(projectId);
  }, [projectId, setProjectId]);

  return (
  <div className="flex h-full p-4 gap-3 font-mono">
    {/* left: terminal */}
    <div className="flex flex-col flex-1 gap-3 min-w-0">
        <TerminalControls start={start} connect={handleConnect} stop={stop} isRunning={isRunning} isConnected={isConnected} />
      <Terminal
        logs={logs}
        isConnected={isConnected}
        onCommand={(cmd) => projectWS?.sendCommand(cmd)}
      />
    </div>

    {/* divider */}
    <div className="w-px bg-[#1e2228] self-stretch" />

    {/* right: dependency installer */}
    <div className="flex flex-col w-80 shrink-0 gap-3">
      <DependencyInstallerPage />
    </div>
  </div>
);
}