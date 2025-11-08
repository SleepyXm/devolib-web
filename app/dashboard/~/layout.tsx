"use client";

import { useRef, useState, ReactNode, createContext } from "react";
import { ProjectWS, connectToProject, startProject, stopProject } from "@/app/handlers/projects";

interface ProjectContextType {
  projectWS: ProjectWS | null;
  logs: string;
  isConnected: boolean;
  isRunning: boolean;
  start: () => Promise<void>;
  connect: () => void;
  stop: () => Promise<void>;
  setProjectId: (id: string) => void;
  projectId: string | null;
}

export const ProjectContext = createContext<ProjectContextType | null>(null);

export default function ProjectLayout({ children }: { children: ReactNode }) {
  const projectWS = useRef<ProjectWS | null>(null);
  const [logs, setLogs] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);

  const start = async () => {
    if (!projectId) return;
    await startProject(projectId);
    setIsRunning(true);
  };

  const connect = () => {
    if (!projectId) return;
    projectWS.current = connectToProject(projectId);
    projectWS.current.onOutput((data) => setLogs((prev) => prev + data));
    setIsConnected(true);
  };

  const stop = async () => {
    if (!projectId) return;
    await stopProject(projectId);
    projectWS.current?.close();
    projectWS.current = null;
    setIsConnected(false);
    setIsRunning(false);
  };

  return (
    <ProjectContext.Provider value={{ projectWS: projectWS.current, logs, isConnected, isRunning, start, connect, stop, setProjectId, projectId }}>
      {children}
    </ProjectContext.Provider>
  );
}