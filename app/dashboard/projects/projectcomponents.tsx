import { Eye, EyeOff, Trash2, X } from "lucide-react";
import { Action, Empty, Panel, Status, ui } from "@/app/UI";

type Env = { key: string; value: string; is_secret: boolean };
export type ProjectFormData =
  | { type: "blank"; name: string; frontend: string; backend: string; db: string; envs: Env[] }
  | { type: "import"; repoUrl: string; envs: Env[] }
  | { type: "template"; templateId: string };

type ModalProps = {
  open: boolean; onClose: () => void; onSubmit: (data: ProjectFormData) => void; loading: boolean;
  backendOptions: string[]; frontendOptions: string[]; dbOptions: string[];
  tab: "blank" | "import" | "templates"; onTabChange: (tab: "blank" | "import" | "templates") => void;
  name: string; onNameChange: (value: string) => void;
  frontend: string; onFrontendChange: (value: string) => void;
  backend: string; onBackendChange: (value: string) => void;
  db: string; onDbChange: (value: string) => void;
  envs: Env[]; onEnvsChange: (envs: Env[]) => void;
  repoUrl: string; onRepoUrlChange: (value: string) => void;
  selectedTemplate: string; onTemplateSelect: (id: string) => void;
};

function EnvEditor({ envs, onChange }: { envs: Env[]; onChange: (envs: Env[]) => void }) {
  const patch = (index: number, update: Partial<Env>) =>
    onChange(envs.map((env, position) => position === index ? { ...env, ...update } : env));
  return (
    <div className="grid gap-2">
      <div className="flex justify-between"><span className={ui.micro}>Environment</span><button className={ui.micro} onClick={() => onChange([...envs, { key: "", value: "", is_secret: false }])}>+ Add</button></div>
      {envs.map((env, index) => (
        <div className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 max-sm:grid-cols-2" key={index}>
          <input className={ui.field} placeholder="KEY" value={env.key} onChange={(event) => patch(index, { key: event.target.value })} />
          <input className={ui.field} placeholder="VALUE" value={env.value} onChange={(event) => patch(index, { value: event.target.value })} />
          <button className="grid w-10 place-items-center border border-white/10" onClick={() => patch(index, { is_secret: !env.is_secret })}>
            {env.is_secret ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          <button className="grid w-10 place-items-center border border-white/10 text-red-200" onClick={() => onChange(envs.filter((_, position) => position !== index))}>
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function CreateProjectModal(props: ModalProps) {
  if (!props.open) return null;
  const stack = [
    ["Frontend", props.frontend, props.onFrontendChange, props.frontendOptions],
    ["Backend", props.backend, props.onBackendChange, props.backendOptions],
    ["Database", props.db, props.onDbChange, props.dbOptions],
  ] as const;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-5 backdrop-blur-lg">
      <button className="absolute inset-0" onClick={props.onClose} aria-label="Close" />
      <Panel className="relative z-10 w-full max-w-xl border-white/20 p-6">
        <header className="mb-6 flex justify-between"><div><span className={ui.micro}>Provision runtime</span><h2 className="mt-2 text-xl font-medium">New project</h2></div><button onClick={props.onClose}><X size={16} /></button></header>
        <div className="mb-5 grid grid-cols-3 gap-px bg-white/10">
          {(["blank", "import", "templates"] as const).map((tab) => (
            <button className={`min-h-9 bg-[var(--dv-surface-inset)] font-mono text-[9px] uppercase ${props.tab === tab ? "text-[var(--dv-accent)]" : "text-white/35"}`} onClick={() => props.onTabChange(tab)} key={tab}>{tab}</button>
          ))}
        </div>

        {props.tab === "blank" && (
          <div className="grid gap-4">
            <input className={ui.field} placeholder="Project name" value={props.name} onChange={(event) => props.onNameChange(event.target.value)} />
            <div className="grid grid-cols-3 gap-2 max-sm:grid-cols-1">
              {stack.map(([label, value, onChange, options]) => (
                <label className="grid gap-2" key={label}><span className={ui.micro}>{label}</span><select className={ui.field} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option}>{option}</option>)}</select></label>
              ))}
            </div>
            <EnvEditor envs={props.envs} onChange={props.onEnvsChange} />
            <Action disabled={!props.name || props.loading} onClick={() => props.onSubmit({ type: "blank", name: props.name, frontend: props.frontend, backend: props.backend, db: props.db, envs: props.envs })}>Create runtime</Action>
          </div>
        )}
        {props.tab === "import" && (
          <div className="grid gap-4">
            <p className="m-0 text-sm text-white/45">Import from your connected GitHub account.</p>
            <input className={ui.field} placeholder="https://github.com/you/repo" value={props.repoUrl} onChange={(event) => props.onRepoUrlChange(event.target.value)} />
            <EnvEditor envs={props.envs} onChange={props.onEnvsChange} />
            <Action disabled={!props.repoUrl || props.loading} onClick={() => props.onSubmit({ type: "import", repoUrl: props.repoUrl, envs: props.envs })}>Import repository</Action>
          </div>
        )}
        {props.tab === "templates" && <Empty title="Templates are not configured">Use blank project or repository import.</Empty>}
      </Panel>
    </div>
  );
}

export function CreatingOverlay({ step, messages }: { step: number; messages: string[] }) {
  return (
    <div className="fixed inset-0 z-[110] grid place-items-center bg-black/75 backdrop-blur-lg">
      <Panel className="grid w-full max-w-sm gap-4 p-6 text-center">
        <Status state="idle">provisioning</Status><h2 className="text-lg font-medium">{messages[step]}</h2>
        <div className="h-1 bg-white/10"><div className="h-full bg-[var(--dv-accent)] transition-all" style={{ width: `${((step + 1) / messages.length) * 100}%` }} /></div>
      </Panel>
    </div>
  );
}

export function ProjectList({
  projects,
  loading,
  onProjectClick,
  onDelete,
}: {
  projects: { project_id: string; name: string; status: string; services?: { framework: string }[] }[];
  loading: boolean;
  onProjectClick: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  if (loading) return <Empty title="Reading projects">Loading registered runtimes.</Empty>;
  if (!projects.length) return <Empty title="No projects">Import a repository or scaffold a runtime.</Empty>;
  return (
    <div className="grid gap-px border border-white/10 bg-white/10">
      {projects.map((project) => (
        <Panel className="flex min-h-16 items-center justify-between border-0 px-4" key={project.project_id}>
          <button className="flex-1 text-left" onClick={() => onProjectClick(project.project_id)}>
            <strong className="text-sm font-medium">{project.name}</strong>
            <span className="ml-3 font-mono text-[9px] text-white/35">{project.services?.map((service) => service.framework).join(" · ") || "Stack pending"}</span>
          </button>
          <Status state={project.status === "running" ? "live" : "offline"}>{project.status}</Status>
          <button className="ml-4 text-red-200" onClick={() => onDelete(project.project_id)} aria-label={`Delete ${project.name}`}><Trash2 size={13} /></button>
        </Panel>
      ))}
    </div>
  );
}
