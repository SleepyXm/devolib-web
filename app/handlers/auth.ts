export const API_BASE = process.env.NEXT_PUBLIC_API_BASE;
export const WSAPI_BASE = process.env.NEXT_PUBLIC_WS_API_BASE;

import ErrorPopup from "../components/ErrorPopup";

export async function request(path: string, options: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const data = await res.json();

  if (!res.ok) {
    
    throw new Error(data.detail || `Request failed with status ${res.status}`);
  }

  return data;
}

export type User = {
    username: string;
    email: string;
    github_id?: string;
};



export async function validateUser(): Promise<User | null> {
  try {
    return await request("/auth/me", { method: "GET" });
  } catch {
    return null;
  }
}


export async function signup(username: string, email: string, password: string) {
  return request("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}

export async function login(username: string, password: string) {
  await request("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  return validateUser();
}

export function loginWithGitHub() {
  window.location.href = `${API_BASE}/auth/github`;
}

export async function handleGitHubCallback() {
  const user = await validateUser();
  if (!user) throw new Error("Authentication failed");
  return { user };
}

export async function logout() {
  await request("/auth/logout", { method: "POST" });
}