"use client";
import { useEffect, useState } from "react";
import { listProjects, handleCreateProject, handleImportProject, deleteProject, Project } from "@/app/handlers/projects";
import { useUser } from "@/app/provider/UserProvider";
import { useRouter } from "next/navigation";
import Popup from "@/app/components/ErrorPopup";
import { CreatingOverlay, CreateProjectModal, ProjectList, ProjectFormData } from "./projectcomponents";
import { useSearchParams } from "next/navigation";

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
  const searchParams = useSearchParams();

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [loaderStep, setLoaderStep] = useState(0);
  const [empty, setEmpty] = useState(false);

  // modal
  const [modalOpen, setModalOpen] = useState(false);
  const [tab, setTab] = useState<"blank" | "import" | "templates">("blank");
  const [name, setName] = useState("");
  const [frontend, setFrontend] = useState(FRONTEND_OPTIONS[0]);
  const [backend, setBackend] = useState(BACKEND_OPTIONS[0]);
  const [db, setDb] = useState(DATABASE_OPTIONS[0]);
  const [repoUrl, setRepoUrl] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");

  useEffect(() => {
    if (!username) return;
    setLoading(true);
    listProjects()
      .then(setProjects)
      .catch(() => setError("Failed to fetch projects"))
      .finally(() => setLoading(false));
  }, [username]);

  useEffect(() => {
    const modal = searchParams.get("modal");
    const repo = searchParams.get("repo");
    const url = searchParams.get("url");

    if (modal === "import") {
      setTab("import");
      if (url) setRepoUrl(url);
      if (repo) setName(repo.split("/")[1]); // use repo name as project name when user imports
      setModalOpen(true);
    }
  }, [searchParams]);

  const refreshProjects = () =>
    listProjects().then(setProjects).catch(() => setError("Failed to refresh projects"));

  const handleSubmit = async (data: ProjectFormData) => {
    if (!username) return;
    if (data.type === "blank" && !data.name.trim()) {
    setError("Project name is required");
    return;
    }
    setModalOpen(false);
    setCreating(true);
    setLoaderStep(0);
    const interval = setInterval(() =>
      setLoaderStep((p) => (p < LOADER_MESSAGES.length - 1 ? p + 1 : p)), 4000);
    try {
      if (data.type === "blank") {
        await handleCreateProject(username, data.name, data.frontend, data.backend, data.db);
      } else if (data.type === "import") {
        await handleImportProject(data.repoUrl);
      }
      await refreshProjects();
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

      <button onClick={() => setModalOpen(true)} className="mb-4 px-4 py-2 rounded-lg text-sm font-medium text-white bg-gray-700 ring-1 ring-white/10 hover:bg-gray-600 transition">
        + New Project
      </button>

      <CreateProjectModal
        open={modalOpen} onClose={() => setModalOpen(false)} onSubmit={handleSubmit} loading={loading}
        backendOptions={BACKEND_OPTIONS} frontendOptions={FRONTEND_OPTIONS} dbOptions={DATABASE_OPTIONS}
        tab={tab} onTabChange={setTab}
        name={name} onNameChange={setName}
        frontend={frontend} onFrontendChange={setFrontend}
        backend={backend} onBackendChange={setBackend}
        db={db} onDbChange={setDb}
        repoUrl={repoUrl} onRepoUrlChange={setRepoUrl}
        selectedTemplate={selectedTemplate} onTemplateSelect={setSelectedTemplate}
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