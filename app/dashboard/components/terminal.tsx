"use client";

import { useContext, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProjectContext } from "../[project]/layout";

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
    <div style={{ padding: "20px", fontFamily: "monaco" }}>

      <div style={{ marginBottom: "15px", display: "flex", gap: "10px" }}>
        <button onClick={start} disabled={isRunning} style={{ backgroundColor: "#34d696ff", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: isRunning ? "not-allowed" : "pointer" }}>▶ Start</button>
        <button onClick={connect} disabled={isConnected} style={{ backgroundColor: "#007bff", color: "#fff", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: isConnected ? "not-allowed" : "pointer" }}>➤ Connect</button>
        <button onClick={stop} disabled={!isRunning} style={{ backgroundColor: "#dc3545", color: "#fff", border: "none", padding: "0px 14px", borderRadius: "50%", width: "40px", height: "40px", fontSize: "18px", cursor: !isRunning ? "not-allowed" : "pointer" }}>■</button>
      </div>

      <pre style={{ background: "#111", color: "rgb(255, 255, 255)", fontFamily: "monaco", padding: "10px", height: "400px", width: "80vw", overflowY: "auto", borderRadius: "6px", marginBottom: "10px" }}>
        {logs || "Waiting for container output..."}
      </pre>


      <input
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        onKeyDown={handleEnter}
        placeholder={isConnected ? "Type command and hit Enter" : "Connect or start container first"}
        disabled={!isConnected}
        style={{ width: "80vw", fontFamily: "monaco", padding: "8px", borderRadius: "6px", border: "1px solid #444", backgroundColor: "#111", color: "rgb(255, 255, 255)" }}
      />
    </div>
  );
}