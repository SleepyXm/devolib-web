"use client";

import { Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Popup from "@/app/components/ErrorPopup";
import { content, Action, PageHeader } from "@/app/UI";
import { deleteProject, handleCreateProject, handleImportProject, listProjects } from "@/app/handlers/projects";
import { useUser } from "@/app/provider/UserProvider";
import { CreateProjectModal, CreatingOverlay, ProjectFormData, ProjectList } from "./projectcomponents";

const FRONTEND = ["React", "Next.js"];
const BACKEND = ["FastAPI", "Node.js"];
const DATABASE = ["PostgreSQL"];
const MESSAGES = ["Building container…", "Scanning services…", "Installing dependencies…", "Attaching proxy…", "Finalizing runtime…"];

export default function ProjectsPage() {
  const { user } = useUser();
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"blank" | "import" | "templates">("blank");
  const [name, setName] = useState("");
  const [frontend, setFrontend] = useState(FRONTEND[0]);
  const [backend, setBackend] = useState(BACKEND[0]);
  const [db, setDb] = useState(DATABASE[0]);
  const [repoUrl, setRepoUrl] = useState("");
  const [envs, setEnvs] = useState<{ key: string; value: string; is_secret: boolean }[]>([]);

  const refresh = () => listProjects().then(setProjects);
  useEffect(() => {
    if (!user?.username) return;
    setLoading(true);
    refresh().catch(() => setError("Failed to fetch projects")).finally(() => setLoading(false));
  }, [user?.username]);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("modal") === "import") {
      setTab("import");
      setRepoUrl(params.get("url") ?? "");
      setOpen(true);
    }
  }, []);

  async function submit(data: ProjectFormData) {
    if (!user?.username) return;
    setOpen(false);
    setCreating(true);
    const timer = setInterval(() => setStep((value) => Math.min(value + 1, MESSAGES.length - 1)), 3000);
    try {
      if (data.type === "blank") await handleCreateProject(user.username, data.name, data.frontend, data.backend, data.db, data.envs);
      if (data.type === "import") await handleImportProject(data.repoUrl, data.envs);
      await refresh();
      setSuccess("Project created.");
    } catch {
      setError("Failed to create project.");
    } finally {
      clearInterval(timer);
      setCreating(false);
      setStep(0);
    }
  }

  return (
    <div className="grid gap-8">
      {creating && <CreatingOverlay step={step} messages={MESSAGES} />}
      <Popup message={error} onClose={() => setError("")} />
      <Popup message={success} onClose={() => setSuccess("")} type="success" />
      <PageHeader {...content.projects} action={<Action onClick={() => setOpen(true)}><Plus size={12} /> New project</Action>} />
      <CreateProjectModal
        open={open} onClose={() => setOpen(false)} onSubmit={submit} loading={loading}
        backendOptions={BACKEND} frontendOptions={FRONTEND} dbOptions={DATABASE}
        tab={tab} onTabChange={setTab} name={name} onNameChange={setName}
        frontend={frontend} onFrontendChange={setFrontend}
        backend={backend} onBackendChange={setBackend}
        db={db} onDbChange={setDb} envs={envs} onEnvsChange={setEnvs}
        repoUrl={repoUrl} onRepoUrlChange={setRepoUrl}
        selectedTemplate="" onTemplateSelect={() => undefined}
      />
      <ProjectList
        projects={projects} loading={loading}
        onProjectClick={(id) => router.push(`/dashboard/${id}`)}
        onDelete={async (id) => { await deleteProject(id); await refresh(); }}
      />
    </div>
  );
}
