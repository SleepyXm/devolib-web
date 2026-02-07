import { request } from "../handlers/auth";
import { ServiceStatus } from "../dashboard/[project]/layout";
import { WSAPI_BASE } from "../handlers/auth";

const project_endpoint = `/projects`;
const container_endpoint = `/container`;



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
}

export type ProjectMetaData = {
  envs: Array<{key: string; value: string; is_secret: boolean}>;
  db_schema: Record<string, Array<{name: string; type: string; nullable: boolean}>>;
  endpoints: Array<{method?: string; path: string; type: string}>;
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

export async function getProject(id: string): Promise<Project> {
  const res = await request(`${project_endpoint}/${id}`, { method: "GET" });
  return res;
}

export async function getProjectMetadata(id: string): Promise<ProjectMetaData> {
  const res = await request(`${project_endpoint}/metadata/${id}`, { method: "GET" });
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


export async function startProject(project_id: string): Promise<{ ok: boolean; container_id: string; status: string }> {
  const res = await request(`${container_endpoint}/start/${project_id}`, {
    method: "POST",
  });
  return res;
}

export async function stopProject(project_id: string): Promise<{ ok: boolean; container_id: string; status: string }> {
  const res = await request(`${container_endpoint}/stop/${project_id}`, {
    method: "POST",
  });
  return res;
}

export type ProjectWS = {
  sendCommand: (cmd: string) => void;
  onOutput: (callback: (data: string) => void) => void;
  onStatus: (callback: (data: ServiceStatus) => void) => void;
  onSchema: (callback: (data: any) => void) => void;
  close: () => void;
};

export async function fetchProjectDetails(project_id: string): Promise<{ access_token: string }> {
  const res = await request(`${project_endpoint}/${project_id}`, { method: "GET" });
  return res;
}

export function connectToProject(project_id: string, access_token: string): ProjectWS {
  const ws = new WebSocket(`${WSAPI_BASE}${container_endpoint}/ws/${project_id}?access_token=${access_token}`);

  let outputCallback: ((data: string) => void) | null = null;
  let statusCallback: ((data: ServiceStatus) => void) | null = null;
  let schemaCallback: ((data: any) => void) | null = null;

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
    } catch (e) {
      // Catching as terminal output
    }
    
    if (outputCallback) outputCallback(event.data);
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
    onOutput: (callback: (data: string) => void) => {
      outputCallback = callback;
    },
    onStatus: (callback: (data: ServiceStatus) => void) => { 
      statusCallback = callback;
    },
    onSchema: (callback: (data: string) => void) => { 
      schemaCallback = callback;
    },

    close: () => {
      ws.close();
    },
  };
}