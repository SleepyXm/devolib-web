import { request } from "../handlers/auth";

const project_endpoint = `/projects`;


export type Project = {
    id: string;
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

// Delete a project
export async function deleteProject(id: string): Promise<{ success: boolean }> {
  const res = await request(`/${project_endpoint}/remove/${id}`, { method: "DELETE" });
  return res;
}