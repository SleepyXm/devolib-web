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
        <button onClick={start} disabled={isRunning} style={{ backgroundColor: "#50c878", color: "##0a1810", border: "2px solid", borderColor: "#0b130d77", padding: "8px 16px", borderRadius: "6px", cursor: isRunning ? "not-allowed" : "pointer" }}>▶ Start</button>
        <button onClick={connect} disabled={isConnected} style={{ backgroundColor: "#4a90e0", color: "#fff", border: "2px solid", borderColor: "#2a70c0", padding: "8px 16px", borderRadius: "6px", cursor: isConnected ? "not-allowed" : "pointer" }}>➤ Connect</button>
        <button onClick={stop} disabled={!isRunning} style={{ backgroundColor: "#c85050", color: "#fff", border: "2px solid", borderColor: "#47070777", padding: "8px 16px", borderRadius: "6px", fontSize: "18px", cursor: !isRunning ? "not-allowed" : "pointer" }}>■</button>
      </div>

      <pre style={{ background: "#11111a", color: "rgb(255, 255, 255)", fontFamily: "monaco", padding: "10px", height: "400px", width: "80vw", overflowY: "auto", borderRadius: "6px", marginBottom: "10px" }}>
        {logs || "Waiting for container output..."}
      </pre>


      <input
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        onKeyDown={handleEnter}
        placeholder={isConnected ? "Type command and hit Enter" : "Connect or start container first"}
        disabled={!isConnected}
        style={{ width: "80vw", fontFamily: "monaco", padding: "8px", borderRadius: "6px", border: "1px solid #444", backgroundColor: "#11111a", color: "rgb(255, 255, 255)" }}
      />
    </div>
  );
}