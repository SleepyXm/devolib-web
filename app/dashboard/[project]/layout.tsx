"use client";

import { useRef, useState, ReactNode, createContext, useEffect } from "react";
import { ProjectWS, connectToProject, startProject, stopProject, fetchProjectDetails, getProjectMetadata, } from "@/app/handlers/projects";
import { ProjectEnv, ProjectDbColumn, ProjectPage, ProjectEndpoint, ProjectGroup, ProjectRoots } from "@/app/handlers/projects";

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
  roots: ProjectRoots | null;
}

export interface ServiceStatus {
  frontend: boolean;
  backend: boolean;
  database: boolean;
  container: boolean;
}

export const ProjectContext = createContext<ProjectContextType | null>(null);

interface ProjectMetaContextType {
  db_schema: Record<string, ProjectDbColumn[]>;
  pages: ProjectPage[];
  endpoints: ProjectEndpoint[];
  groups: ProjectGroup[];
  envs: ProjectEnv[];
  updated_at: string | null;

  fetchMeta: () => Promise<void>;
  setDbSchema: (schema: ProjectMetaContextType["db_schema"]) => void;
  setPages: (pages: ProjectPage[]) => void;
  setEndpoints: (endpoints: ProjectEndpoint[]) => void;
  setGroups: (groups: ProjectGroup[]) => void;
  setEnvs: (envs: ProjectEnv[]) => void;
}

export const ProjectMetaContext = createContext<ProjectMetaContextType | null>(
  null,
);

interface ProjectLogsContextType {
  logs: LogEvent[];
  clearLogs: () => void;
}

interface LogEvent {
  id: string;
  correlationId: string;
  source: "frontend" | "backend" | "database";
  direction: "inbound" | "outbound" | "self";
  cause: "self" | "contract" | "expectation";
  status?: number;
  message: string;
  timestamp: string;
}

export const ProjectLogsContext = createContext<ProjectLogsContextType | null>(
  null,
);

export default function ProjectLayout({ children }: { children: ReactNode }) {
  const projectWS = useRef<ProjectWS | null>(null);
  const [logs, setLogs] = useState("");
  const [logEvents, setLogEvents] = useState<LogEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [roots, setRoots] = useState<ProjectRoots | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [wsInstance, setWsInstance] = useState<ProjectWS | null>(null);

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
  const [groups, setGroups] = useState<ProjectMetaContextType["groups"]>([]);
  const [updated_at, setUpdatedAt] = useState<string | null>(null);

  const fetchMeta = async () => {
    if (!projectId) return;
    const meta = await getProjectMetadata(projectId);
    setEnvs(meta.envs);
    setPages(meta.pages);
    setEndpoints(meta.endpoints);
    setDbSchema(meta.db_schema);
    setGroups(meta.groups);
    setUpdatedAt(meta.updated_at);
  };

  useEffect(() => {
    if (projectId) {
      fetchProjectDetails(projectId).then((project) => {
        setAccessToken(project.access_token);
        setProjectName(project.name);
        setRoots(project.roots);
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
    projectWS.current.onOutput((data) => {
      if (data.startsWith("FILE_CONTENT:")) return;
      setLogs((prev) => prev + data);
    });
    projectWS.current.onStatus((status) => setServiceStatus(status));
    projectWS.current.onSchema((data) => setDbSchema(data.tables));
    projectWS.current.onLog((event: LogEvent) =>
      setLogEvents((prev) => [...prev, event]),
    );
    setWsInstance(projectWS.current);
    setIsConnected(true);
  };

  const stop = async () => {
    if (!projectId) return;
    await stopProject(projectId);
    projectWS.current?.close();
    projectWS.current = null;
    setIsConnected(false);
    setIsRunning(false);
    setServiceStatus({
        frontend: false,
        backend: false,
        database: false,
        container: false,
    });
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
        projectWS: wsInstance,
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
        roots
      }}
    >
      <ProjectMetaContext.Provider
        value={{ db_schema, pages, endpoints, envs, setEnvs, updated_at, fetchMeta, setDbSchema, setEndpoints, setPages, groups, setGroups}}>
        <ProjectLogsContext.Provider
          value={{ logs: logEvents, clearLogs: () => setLogEvents([]) }}
        >
          {children}
        </ProjectLogsContext.Provider>
      </ProjectMetaContext.Provider>
    </ProjectContext.Provider>
  );
}
