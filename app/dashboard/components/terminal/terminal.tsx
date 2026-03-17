"use client";

import { useContext, useEffect } from "react";
import { useParams } from "next/navigation";
import { ProjectContext } from "../../[project]/layout";
import { TerminalControls, Terminal } from "./terminalcomponents";

export default function TerminalPage() {
  const ctx = useContext(ProjectContext);
  const params = useParams();
  const projectId = Array.isArray(params?.project) ? params.project[0] : params?.project;

  if (!ctx) return <div>Project context not found</div>;

  const { logs, isConnected, isRunning, start, connect, stop, projectWS, setProjectId } = ctx;

  useEffect(() => {
    if (projectId) setProjectId(projectId);
  }, [projectId, setProjectId]);

  return (
    <div className="flex flex-col h-full p-4 gap-3 font-mono">
      <TerminalControls start={start} connect={connect} stop={stop} isRunning={isRunning} isConnected={isConnected} />
      <Terminal
        logs={logs}
        isConnected={isConnected}
        onCommand={(cmd) => projectWS?.sendCommand(cmd)}
      />
    </div>
  )
}