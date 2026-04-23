import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";


export type ProjectFormData =
  | { type: "blank"; name: string; frontend: string; backend: string; db: string; envs: { key: string; value: string; is_secret: boolean }[] }
  | { type: "import"; repoUrl: string }
  | { type: "template"; templateId: string }

export type CreateProjectModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ProjectFormData) => void;
  loading: boolean;
  // stack options
  backendOptions: string[];
  frontendOptions: string[];
  dbOptions: string[];
  // tab
  tab: "blank" | "import" | "templates";
  onTabChange: (tab: "blank" | "import" | "templates") => void;
  // blank
  name: string;
  onNameChange: (val: string) => void;
  frontend: string;
  onFrontendChange: (val: string) => void;
  backend: string;
  onBackendChange: (val: string) => void;
  db: string;
  onDbChange: (val: string) => void;
  envs: { key: string; value: string; is_secret: boolean }[];
  onEnvsChange: (envs: { key: string; value: string; is_secret: boolean }[]) => void;
  // import
  repoUrl: string;
  onRepoUrlChange: (val: string) => void;
  // templates
  selectedTemplate: string;
  onTemplateSelect: (id: string) => void;
}


export function CreateProjectModal({
  open, onClose, onSubmit, loading,
  backendOptions, frontendOptions, dbOptions,
  tab, onTabChange,
  name, onNameChange,
  frontend, onFrontendChange,
  backend, onBackendChange,
  db, onDbChange,
  repoUrl, onRepoUrlChange,
  selectedTemplate, onTemplateSelect,
  envs, onEnvsChange,
}: CreateProjectModalProps) {
  if (!open) return null;

  return (
    <div className="dv-modal">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl ring-1 ring-white/10 shadow-2xl p-6" style={{ backgroundColor: "hsl(220, 13%, 9%)" }}>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-xl">New Project</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition">✕</button>
        </div>

        <div className="flex gap-1 mb-6 bg-gray-800/50 p-1 rounded-lg">
          {(["blank", "import", "templates"] as const).map((t) => (
            <button key={t} onClick={() => onTabChange(t)} className={`flex-1 text-sm py-1.5 rounded-md transition-all duration-200 ${tab === t ? "bg-gray-600 text-white" : "text-gray-400 hover:text-white"}`}>
              {t === "blank" ? "Blank Project" : t === "import" ? "Import Repo" : "Templates"}
            </button>
          ))}
        </div>

        {tab === "blank" && (
          <div className="space-y-4">
            <input type="text" placeholder="Project name" value={name} onChange={(e) => onNameChange(e.target.value)} className="w-full bg-gray-800/60 ring-1 ring-gray-600/30 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none" />
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: "Frontend", value: frontend, onChange: onFrontendChange, options: frontendOptions },
                { label: "Backend", value: backend, onChange: onBackendChange, options: backendOptions },
                { label: "Database", value: db, onChange: onDbChange, options: dbOptions },
              ].map(({ label, value, onChange, options }) => (
                <div key={label} className="flex flex-col gap-1">
                  <label className="text-xs text-gray-400">{label}</label>
                  <select value={value} onChange={(e) => onChange(e.target.value)} className="bg-gray-800/60 ring-1 ring-gray-600/30 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none">
                    {options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-gray-400">Environment Variables</label>
                <button type="button" onClick={() => onEnvsChange([...envs, { key: "", value: "", is_secret: false }])}
                 className="text-xs text-gray-400 hover:text-white transition"
                >
                  + Add
                </button>
              </div>
                {envs.map((env, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input placeholder="KEY" value={env.key} onChange={(e) => { const updated = [...envs]; updated[i] = { ...updated[i], key: e.target.value }; onEnvsChange(updated); }}
                      className="flex-1 bg-gray-800/60 ring-1 ring-gray-600/30 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
                    />
      <input
        placeholder="VALUE"
        value={env.value}
        onChange={(e) => {
          const updated = [...envs];
          updated[i] = { ...updated[i], value: e.target.value };
          onEnvsChange(updated);
        }}
        className="flex-1 bg-gray-800/60 ring-1 ring-gray-600/30 rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none"
      />
      <button
        type="button"
        onClick={() => {
          const updated = [...envs];
          updated[i] = { ...updated[i], is_secret: !updated[i].is_secret };
          onEnvsChange(updated);
        }}
        className={`text-xs px-2 py-1.5 rounded-lg ring-1 transition ${env.is_secret ? "ring-yellow-500/50 text-yellow-400" : "ring-gray-600/30 text-gray-400 hover:text-white"}`}
      >
        {env.is_secret ? "secret" : "plain"}
      </button>
      <button
        type="button"
        onClick={() => onEnvsChange(envs.filter((_, j) => j !== i))}
        className="text-gray-500 hover:text-red-400 transition text-xs"
      >
        ✕
      </button>
    </div>
  ))}
</div>



            <button disabled={loading || !name} onClick={() => onSubmit({ type: "blank", name, frontend, backend, db, envs })} className="w-full py-2 rounded-lg text-sm font-medium text-white bg-gray-700 ring-1 ring-white/10 hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Creating..." : "Create Project"}
            </button>
          </div>
        )}

        {tab === "import" && (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">Import a repository from your connected GitHub account.</p>
            <input type="text" placeholder="https://github.com/you/repo" value={repoUrl} onChange={(e) => onRepoUrlChange(e.target.value)} className="w-full bg-gray-800/60 ring-1 ring-gray-600/30 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none" />
            <button disabled={loading || !repoUrl} onClick={() => onSubmit({ type: "import", repoUrl })} className="w-full py-2 rounded-lg text-sm font-medium text-white bg-gray-700 ring-1 ring-white/10 hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Importing..." : "Import Repository"}
            </button>
          </div>
        )}

        {tab === "templates" && (
          <div className="space-y-3">
            <p className="text-sm text-gray-400">Start from a pre-configured stack.</p>
            <button disabled={loading || !selectedTemplate} onClick={() => onSubmit({ type: "template", templateId: selectedTemplate })} className="w-full py-2 rounded-lg text-sm font-medium text-white bg-gray-700 ring-1 ring-white/10 hover:bg-gray-600 transition disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? "Creating..." : "Use Template"}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

export function CreatingOverlay({ step, messages }: { step: number; messages: string[] }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-l" />
      <div className="relative z-10 bg-white rounded-xl shadow-lg p-6 w-full max-w-sm text-center">
        <div className="text-lg font-semibold mb-1">Creating your project…</div>
        <div className="text-sm text-gray-600 dark:text-zinc-300 mb-4">{messages[step]}</div>
        <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-blue-300 transition-all duration-500"
            style={{ width: `${((step + 1) / messages.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// Project Item
type ProjectItemProps = {
  project: { project_id: string; name: string; status: string; services?: { framework: string }[] };
  onClick: () => void;
  onDelete: () => void;
}

export function ProjectItem({ project, onClick, onDelete }: ProjectItemProps) {
  return (
    <li className="dv-stack-card">
      <span className="cursor-pointer" onClick={onClick}>
        {project.name} {`(Status: ${project.status})`}
      </span>
      <div className="text-sm text-gray-600 mt-1">
        Stack: {project.services?.map((s) => s.framework).join(", ") || "No services"}
      </div>
      <button
        className="text-red-600 font-bold px-2 py-1 rounded hover:bg-red-100"
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
      >
        X
      </button>
    </li>
  );
}

// Project List
type ProjectListProps = {
  projects: ProjectItemProps["project"][];
  loading: boolean;
  onProjectClick: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProjectList({ projects, loading, onProjectClick, onDelete }: ProjectListProps) {
  if (loading) return <p>Loading projects...</p>;
  if (projects.length === 0) return <p>No projects yet.</p>;

  return (
    <ul className="space-y-2">
      {projects.map((project) => (
        <ProjectItem
          key={project.project_id}
          project={project}
          onClick={() => onProjectClick(project.project_id)}
          onDelete={() => onDelete(project.project_id)}
        />
      ))}
    </ul>
  );
}