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

// Project Creation Bar
type CreateBarProps = {
  projectName: string;
  onNameChange: (val: string) => void;
  backend: string;
  onBackendChange: (val: string) => void;
  frontend: string;
  onFrontendChange: (val: string) => void;
  db: string;
  onDbChange: (val: string) => void;
  loading: boolean;
  onCreate: () => void;
  backendOptions: string[];
  frontendOptions: string[];
  dbOptions: string[];
}

export function CreateProjectBar({
  projectName, onNameChange,
  backend, onBackendChange,
  frontend, onFrontendChange,
  db, onDbChange,
  loading, onCreate,
  backendOptions, frontendOptions, dbOptions
}: CreateBarProps) {
  return (
    <div className="mb-4 flex items-center space-x-2">
      <input
        type="text"
        value={projectName}
        onChange={(e) => onNameChange(e.target.value)}
        placeholder="Enter project name"
        className="border px-2 py-1 rounded flex-1"
      />
      <select value={backend} onChange={(e) => onBackendChange(e.target.value)}>
        {backendOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <select value={frontend} onChange={(e) => onFrontendChange(e.target.value)}>
        {frontendOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <select value={db} onChange={(e) => onDbChange(e.target.value)}>
        {dbOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
      </select>
      <button
        className={`px-4 py-2 rounded text-white transition-all duration-700 ${
          loading ? "bg-gray-400 cursor-not-allowed" : "bg-yellow-400 hover:bg-gradient-to-r from-yellow-300 to-red-300 active:bg-yellow-800 z-50"
        }`}
        disabled={loading}
        onClick={onCreate}
      >
        {loading ? "Creating..." : "Create Project"}
      </button>
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
    <li className="border p-2 rounded hover:bg-gray-100 flex justify-between items-center">
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