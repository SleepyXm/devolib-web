"use client";
import { useEffect, useState } from "react";
import { listProjects, handleCreateProject, deleteProject, Project } from "@/app/handlers/projects";
import { useUser } from "@/app/provider/UserProvider";
import { useRouter } from "next/navigation";
import Popup from "@/app/components/ErrorPopup";
import { CreatingOverlay, CreateProjectBar, ProjectList } from "./projectcomponents";

const BACKEND_OPTIONS = ["FastAPI", "Node.js", "Rust"];
const FRONTEND_OPTIONS = ["React", "HTML/CSS", "Next.js", "Angular.js"];
const DATABASE_OPTIONS = ["PostgreSQL", "MySQL", "SQLite"];

const LOADER_MESSAGES = [
  "Downloading Node.js...",
  "Downloading Python...",
  "Downloading PostgreSQL...",
  "Initializing container...",
  "Setting up frontend...",
  "Setting up backend...",
  "Finalizing project...",
];

export default function ProjectsPage() {
  const { user } = useUser();
  const username = user?.username;
  const router = useRouter();

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [loaderStep, setLoaderStep] = useState(0);
  const [backend, setBackend] = useState(BACKEND_OPTIONS[0]);
  const [frontend, setFrontend] = useState(FRONTEND_OPTIONS[0]);
  const [db, setDb] = useState(DATABASE_OPTIONS[0]);

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    listProjects()
      .then(setProjects)
      .catch(() => setError("Failed to fetch projects"))
      .finally(() => setLoading(false));
  }, [username]);

  const refreshProjects = () =>
    listProjects().then(setProjects).catch(() => setError("Failed to refresh projects"));

  const handleCreate = async () => {
    if (!username) return;
    setCreating(true);
    setLoaderStep(0);
    const interval = setInterval(() =>
      setLoaderStep((p) => (p < LOADER_MESSAGES.length - 1 ? p + 1 : p)), 4000);
    try {
      await handleCreateProject(username, projectName, frontend, backend, db);
      await refreshProjects();
      setProjectName("");
      setSuccess("Project created!");
    } catch {
      setError("Failed to create project");
    } finally {
      clearInterval(interval);
      setCreating(false);
      setLoaderStep(0);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id);
      await refreshProjects();
    } catch {
      setError("Failed to delete project");
    }
  };

  return (
    <div className="w-full text-black dark:text-zinc-300 p-5">
      {creating && <CreatingOverlay step={loaderStep} messages={LOADER_MESSAGES} />}
      <Popup message={error} onClose={() => setError("")} type="error" />
      <Popup message={success} onClose={() => setSuccess("")} type="success" />
      <CreateProjectBar
        projectName={projectName} onNameChange={setProjectName}
        backend={backend} onBackendChange={setBackend}
        frontend={frontend} onFrontendChange={setFrontend}
        db={db} onDbChange={setDb}
        loading={loading} onCreate={handleCreate}
        backendOptions={BACKEND_OPTIONS}
        frontendOptions={FRONTEND_OPTIONS}
        dbOptions={DATABASE_OPTIONS}
      />
      <ProjectList
        projects={projects}
        loading={loading}
        onProjectClick={(id) => router.push(`/dashboard/${id}`)}
        onDelete={handleDelete}
      />
    </div>
  );
}