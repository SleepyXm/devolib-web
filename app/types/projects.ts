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

export interface ServiceStatus {
  frontend: boolean;
  backend: boolean;
  database: boolean;
  container: boolean;
}