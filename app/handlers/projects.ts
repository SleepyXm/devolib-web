import { request } from "../handlers/auth";
import { ServiceStatus } from "../dashboard/~/layout";

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
}

export async function createProject(user_id: string, name: string, frontend?: string, backend?: string, db?: string): Promise<Project> {
  const res = await request("/projects/create", {
    method: "POST",
    body: JSON.stringify({ user_id, name, frontend, backend, db }),
  });
  return res;
}

export async function listProjects(): Promise<Project[]> {
  const res = await request("/projects/list", { method: "GET" });
  return res.projects;
}

export async function getProject(id: string): Promise<Project> {
  const res = await request(`/${project_endpoint}/${id}`, { method: "GET" });
  return res;
}

export async function editProject(id: string, updates: Partial<Project>): Promise<Project> {
  const res = await request(`/${project_endpoint}/edit/${id}`, {
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
  close: () => void;
};

export function connectToProject(project_id: string): ProjectWS {
  const ws = new WebSocket(`ws://localhost:8000${container_endpoint}/ws/${project_id}`);

  let outputCallback: ((data: string) => void) | null = null;
  let statusCallback: ((data: ServiceStatus) => void) | null = null;

  ws.onmessage = (event) => {
    // Parsing as JSON for status events
    try {
      const message = JSON.parse(event.data);
      if (message.type === 'service-status' && statusCallback) {
        statusCallback(message.data);
        return;
      }
    } catch (e) {
      // Catching as terminal output
    }
    
    // Original terminal output handling
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
    close: () => {
      ws.close();
    },
  };
}