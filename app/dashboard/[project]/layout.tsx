"use client";

import { useRef, useState, ReactNode, createContext, useEffect } from "react";
import {
  ProjectWS,
  connectToProject,
  startProject,
  stopProject,
  fetchProjectDetails,
  getProjectMetadata,
} from "@/app/handlers/projects";

interface ProjectContextType {
  projectWS: ProjectWS | null;
  logs: string;
  isConnected: boolean;
  isRunning: boolean;
  serviceStatus: ServiceStatus;
  startService: (service: "frontend" | "backend" | "database") => void;
  start: () => Promise<void>;
  connect: () => void;
  stop: () => Promise<void>;
  setProjectId: (id: string) => void;
  projectId: string | null;
  projectName: string | null;
}


export interface ServiceStatus {
  frontend: boolean;
  backend: boolean;
  database: boolean;
  container: boolean;
}

export const ProjectContext = createContext<ProjectContextType | null>(null);


interface ProjectMetaContextType {
  db_schema: Record<string, { column: string; type: string; nullable: boolean }[]>;
  
  pages: {
    route: string;  // "/" | "/about" etc.
    file: string;  // "src/App.jsx" — relative to /app/workspace/frontend/{name}/
  }[];
  
  endpoints: {
    method: string;  // "GET" | "POST" etc. — no longer optional, backend routes always have a method
    path: string;   // "/api/health"
    file: string;  // "routes/health.py" — relative to /app/workspace/backend/{name}/
  }[];
  
  envs: { key: string; value: string; is_secret: boolean }[];
  updated_at: string | null;
  fetchMeta: () => Promise<void>;
  setDbSchema: (schema: ProjectMetaContextType["db_schema"]) => void;
  setEndpoints: React.Dispatch<React.SetStateAction<ProjectMetaContextType["endpoints"]>>;
  setPages: React.Dispatch<React.SetStateAction<ProjectMetaContextType["pages"]>>;
}


export const ProjectMetaContext = createContext<ProjectMetaContextType | null>(null);


export default function ProjectLayout({ children }: { children: ReactNode }) {
  const projectWS = useRef<ProjectWS | null>(null);
  const [logs, setLogs] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>({
    frontend: false,
    backend: false,
    database: false,
    container: false,
  });

  const [db_schema, setDbSchema] = useState<ProjectMetaContextType["db_schema"]>({});
  const [pages, setPages] = useState<ProjectMetaContextType["pages"]>([]);
  const [endpoints, setEndpoints] = useState<ProjectMetaContextType["endpoints"]>([]);
  const [envs, setEnvs] = useState<ProjectMetaContextType["envs"]>([]);
  const [updated_at, setUpdatedAt] = useState<string | null>(null);

  const fetchMeta = async () => {
    if (!projectId) return;
    const meta = await getProjectMetadata(projectId);
    setEnvs(meta.envs);
    setPages(meta.pages);
    setEndpoints(meta.endpoints);
    setDbSchema(meta.db_schema);
    setUpdatedAt(meta.updated_at);
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails(projectId).then((project) => {
        setAccessToken(project.access_token);
        setProjectName(project.name);
      });
      fetchMeta();
    }
  }, [projectId]);


  const start = async () => {
    if (!projectId || !projectName) return;
    await startProject(projectId);
    setIsRunning(true);
  };

  const connect = () => {
  if (!projectId || !projectName || !accessToken) return;
  projectWS.current = connectToProject(projectId, accessToken);
  projectWS.current.onOutput((data) => setLogs((prev) => prev + data));
  projectWS.current.onStatus((status) => setServiceStatus(status));
  projectWS.current.onSchema((data) => setDbSchema(data.tables));
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

  // start services
  const startService = (service: "frontend" | "backend" | "database") => {
    if (!projectWS.current || !projectId) {
      console.log("Cannot start service: no WebSocket or projectId");
      return;
    }

    console.log(`Sending START_SERVICE command for ${service}`);
    projectWS.current.sendCommand(
      JSON.stringify({
        type: "START_SERVICE",
        service: service,
        projectId: projectId,
      }),
    );
  };

  return (
    <ProjectContext.Provider
      value={{
        projectWS: projectWS.current,
        logs,
        isConnected,
        isRunning,
        serviceStatus,
        startService,
        start,
        connect,
        stop,
        setProjectId,
        projectId,
        projectName,
      }}
    >
      <ProjectMetaContext.Provider value={{
        db_schema, pages, endpoints, envs, updated_at, fetchMeta, setDbSchema, setEndpoints, setPages,
      }}>
      {children}
      </ProjectMetaContext.Provider>
    </ProjectContext.Provider>
  );
}
