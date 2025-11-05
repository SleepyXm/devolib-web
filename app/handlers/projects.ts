import { request } from "../handlers/auth";

const project_endpoint = `/projects`;


export type Project = {
    project_id: string;
    name: string;
    user_id: string;
    container_id: string;
    status: string;
}

export async function createProject(user_id: string, name: string): Promise<Project> {
  const res = await request("/projects/create", {
    method: "POST",
    body: JSON.stringify({ user_id, name }),
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
  const res = await request(`/${project_endpoint}/remove/${id}`, { method: "DELETE" });
  return res;
}


export const handleCreateProject = async (name: string, projectname: string) => {
    try {
      const res = await createProject(name, projectname);
      console.log("Project created:", res);
    } catch (err) {
      console.error("Error creating project:", err);
    }
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