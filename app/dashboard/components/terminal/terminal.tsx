"use client";

import { useContext, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProjectContext } from "../../[project]/layout";
import { TerminalControls, LogOutput, TerminalInput } from "./terminalcomponents";


export default function Terminal() {
  const ctx = useContext(ProjectContext);
  const params = useParams();
  const projectId = Array.isArray(params?.project) ? params.project[0] : params?.project;
  const [command, setCommand] = useState("");

  if (!ctx) return <div>Project context not found</div>;

  const { logs, isConnected, isRunning, start, connect, stop, projectWS, setProjectId } = ctx;

  useEffect(() => {
    if (projectId) setProjectId(projectId);
  }, [projectId, setProjectId]);

  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && projectWS) {
      projectWS.sendCommand(command);
      setCommand("");
    }
  };

  return (
    <div className="flex flex-col h-full p-4 gap-3 font-mono">
      <TerminalControls start={start} connect={connect} stop={stop} isRunning={isRunning} isConnected={isConnected} />
      <LogOutput logs={logs} />
      <TerminalInput command={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={handleEnter} isConnected={isConnected} />
    </div>
  )
}