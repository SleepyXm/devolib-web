"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { startProject, connectToProject, stopProject, ProjectWS } from "@/app/handlers/projects";

export default function ProjectPage() {
  const params = useParams();
  const project = Array.isArray(params?.project) ? params.project[0] : params?.project;

  const [logs, setLogs] = useState("");
  const [command, setCommand] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const projectWS = useRef<ProjectWS | null>(null);

  if (!project) return <div>Project not found</div>;

  const handleStart = async () => {
    try {
      const res = await startProject(project);
      console.log("Container started:", res);
      setIsRunning(true);
    } catch (err) {
      console.error("Failed to start container:", err);
    }
  };

  const handleConnect = () => {
    try {
      projectWS.current = connectToProject(project);
      projectWS.current.onOutput((data) => setLogs((prev) => prev + data));
      setIsConnected(true);
    } catch (err) {
      console.error("Failed to connect to container:", err);
    }
  };

  const handleStop = async () => {
    try {
      await stopProject(project);
      projectWS.current?.close();
      setIsConnected(false);
      setIsRunning(false);
    } catch (err) {
      console.error("Failed to stop container:", err);
    }
  };

  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && projectWS.current) {
      projectWS.current.sendCommand(command);
      setCommand("");
    }
  };

  useEffect(() => {
    return () => projectWS.current?.close();
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>

      <div style={{ marginBottom: "15px", display: "flex", gap: "10px" }}>
        <button
          onClick={handleStart}
          disabled={isRunning}
          style={{
            backgroundColor: "#28a745",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: "6px",
            cursor: isRunning ? "not-allowed" : "pointer",
          }}
        >
          ▶ Start
        </button>

        <button
          onClick={handleConnect}
          disabled={isConnected}
          style={{
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: "6px",
            cursor: isConnected ? "not-allowed" : "pointer",
          }}
        >
          ➤ Connect
        </button>

        <button
          onClick={handleStop}
          disabled={!isRunning}
          style={{
            backgroundColor: "#dc3545",
            color: "#fff",
            border: "none",
            padding: "8px 16px",
            borderRadius: "50%",
            width: "40px",
            height: "40px",
            fontSize: "18px",
            cursor: !isRunning ? "not-allowed" : "pointer",
          }}
        >
          ■
        </button>
      </div>


      <pre
        style={{
          background: "#111",
          color: "#0f0",
          padding: "10px",
          height: "400px",
          width: "80vw",
          overflowY: "auto",
          borderRadius: "6px",
          marginBottom: "10px",
        }}
      >
        {logs || "Waiting for container output..."}
      </pre>


      <input
        type="text"
        value={command}
        onChange={(e) => setCommand(e.target.value)}
        onKeyDown={handleEnter}
        style={{
          width: "80vw",
          fontFamily: "monospace",
          padding: "8px",
          borderRadius: "6px",
          border: "1px solid #444",
          backgroundColor: "#111",
          color: "#0f0",
        }}
        placeholder={isConnected ? "Type command and hit Enter" : "Connect or start container first"}
        disabled={!isConnected}
      />
    </div>
  );
}