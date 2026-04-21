import { request } from "../handlers/auth";
import { ServiceStatus } from "../dashboard/[project]/layout";
import { WSAPI_BASE } from "../handlers/auth";

const project_endpoint = `/projects`;

export type Project = {
    project_id: string;
    name: string;
    frontend: string;
    backend: string;
    db: string;
    user_id: string;
    container_id: string;
    status: string;
    last_online: string;
    roots: ProjectRoots;
}

export type ProjectRoots = {
    frontend_root: string | null;
    backend_root: string | null;
    db_root: string | null;
}

export type GithubRepo = {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    url: string;
    default_branch: string;
    updated_at: string;
}

export interface ProjectEnv {
  key: string;
  value: string;
  is_secret: boolean;
}

export interface ProjectDbColumn {
  column: string;
  type: string;
  nullable: boolean;
}

export interface ProjectPage {
  route: string;
  file: string; // relative to /app/workspace/frontend/{name}/
}

export interface ProjectEndpoint {
  method: string;
  path: string;
  file: string; // relative to /app/workspace/backend/{name}/
  handler: string;
}

export interface ProjectGroupFileMeta {
  type?: "wrapper" | "hook" | "helper" | "middleware";
  category?: "http" | "validation" | "auth" | "payment";
  compatibility?: string;
  library?: string;
  style?: string;
  colourScheme?: string;
  [key: string]: unknown;
}

export interface ProjectGroupFile {
  name: string;
  filepath: string; // relative to root
  meta?: ProjectGroupFileMeta;
}

export interface ProjectGroup {
  name: string;
  filepath: string;
  type: "folder" | "file";
  context: "frontend" | "backend";
  meta: ProjectGroupFileMeta;
  children: ProjectGroup[];
}

export type ProjectMetaData = {
  envs: ProjectEnv[];
  db_schema: Record<string, ProjectDbColumn[]>;
  pages: ProjectPage[];
  endpoints: ProjectEndpoint[];
  groups: ProjectGroup[];
  updated_at: string | null;
}

export async function createProject(user_id: string, name: string, frontend?: string, backend?: string, db?: string): Promise<Project> {
  const res = await request(`${project_endpoint}/create`, {
    method: "POST",
    body: JSON.stringify({ user_id, name, frontend, backend, db }),
  });
  return res;
}

export async function listProjects(): Promise<Project[]> {
  const res = await request(`${project_endpoint}/list`, { method: "GET" });
  return res.projects;
}

export async function listGithubRepos(): Promise<GithubRepo[]> {
  const res = await request(`${project_endpoint}/repos`, { method: "GET" });
  return res.projects;
}


export async function getProject(id: string): Promise<Project> {
  const res = await request(`${project_endpoint}/${id}`, { method: "GET" });
  return res;
}

export async function getProjectMetadata(id: string): Promise<ProjectMetaData> {
  const res = await request(`${project_endpoint}/metadata/${id}`, { method: "GET" });
  return res; 
}

export async function patchProjectMetadata(id: string, metadata: Partial<ProjectMetaData>): Promise<ProjectMetaData> {
  const res = await request(`${project_endpoint}/metadata/${id}`, {
    method: "PATCH",
    body: JSON.stringify(metadata),
  });
  return res; 
}


export async function editProject(id: string, updates: Partial<Project>): Promise<Project> {
  const res = await request(`${project_endpoint}/edit/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates),
  });
  return res;
}


export async function deleteProject(id: string): Promise<{ success: boolean }> {
  const res = await request(`${project_endpoint}/delete`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ project_id: id }),
  });
  return res;
}


export const handleCreateProject = async (name: string, projectname: string, frontend?: string, backend?: string, db?: string ) => {
    try {
      const res = await createProject(name, projectname, frontend, backend, db);
      console.log("Project created:", res);
    } catch (err) {
      console.error("Error creating project:", err);
    }
}

export async function handleImportProject(repoUrl: string) {
  const name = repoUrl.split("/").pop() ?? "imported-project";
  return await request(`${project_endpoint}/create`, {
    method: "POST",
    body: JSON.stringify({ name, import_url: repoUrl }),
  });
}



export async function startProject(project_id: string): Promise<{ ok: boolean; container_id: string; status: string }> {
  const res = await request(`${project_endpoint}/start/${project_id}`, {
    method: "POST",
  });
  return res;
}

export async function stopProject(project_id: string): Promise<{ ok: boolean; container_id: string; status: string }> {
  const res = await request(`${project_endpoint}/stop/${project_id}`, {
    method: "POST",
  });
  return res;
}

export async function fetchProjectDetails(project_id: string): Promise<Project & { access_token: string }> {
  const res = await request(`${project_endpoint}/${project_id}`, { method: "GET" });
  return res;
}

export type ProjectWS = {
  sendCommand: (cmd: string) => void;
  onOutput: (callback: (data: string) => void) => void;
  removeOutput: (callback: (data: string) => void) => void;
  onStatus: (callback: (data: ServiceStatus) => void) => void;
  onSchema: (callback: (data: any) => void) => void;
  onLog: (callback: (data: any) => void) => void;
  onFile: (callback: (data: string) => void) => void;
  removeFile: (callback: (data: string) => void) => void;
  close: () => void;
};


export function connectToProject(project_id: string, access_token: string): ProjectWS {
  const ws = new WebSocket(`${WSAPI_BASE}${project_endpoint}/ws/${project_id}?access_token=${access_token}`);

  let outputCallbacks: ((data: string) => void)[] = [];
  let statusCallback: ((data: ServiceStatus) => void) | null = null;
  let schemaCallback: ((data: any) => void) | null = null;
  let logCallback: ((data: any) => void) | null = null;
  let fileCallbacks: ((data: string) => void)[] = [];

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'service-status' && statusCallback) {
        statusCallback(message.data);
        return;
      }
      // For schema retrieval on project
      if (message.type === 'DATABASE_SCHEMA' && schemaCallback) {
        schemaCallback(message);
        return;
      }

      if (message.type === 'FILE_CONTENT' || message.type === 'FILE_SAVED') {
        fileCallbacks.forEach(cb => cb(event.data));
        return;
      }

      if (message.type === 'GET_ROWS' && schemaCallback) {
        schemaCallback(message);
        return;
      }

      if (message.type === 'LOG_EVENT' && logCallback) {
        logCallback(message.event);
        return;
      }
    } catch (e) {
      // Catching as terminal output
    }
    
    outputCallbacks.forEach(cb => cb(event.data));
  };

  ws.onclose = () => {
    console.log("WebSocket closed for project", project_id);
  };

  ws.onerror = (err) => {
    console.error("WebSocket error:", err);
  };

  return {
    sendCommand: (cmd: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(cmd + "\n");
      }
    },
    onOutput: (callback) => {
      outputCallbacks.push(callback);
    },
    removeOutput: (callback) => {
      outputCallbacks = outputCallbacks.filter(cb => cb !== callback);
    },
    onStatus: (callback: (data: ServiceStatus) => void) => { 
      statusCallback = callback;
    },
    onSchema: (callback: (data: string) => void) => { 
      schemaCallback = callback;
    },
    onLog: (callback: (data: any) => void) => {
      logCallback = callback;
    },
    onFile: (callback) => { fileCallbacks.push(callback); },
    
    removeFile: (callback) => { fileCallbacks = fileCallbacks.filter(cb => cb !== callback); },

    close: () => {
      ws.close();
    },
  };
}