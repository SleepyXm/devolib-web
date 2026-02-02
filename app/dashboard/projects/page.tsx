"use client";
import { useEffect, useState } from "react";
import {
  listProjects,
  handleCreateProject,
  startProject,
  deleteProject,
  Project,
} from "@/app/handlers/projects";
import { useUser } from "@/app/provider/UserProvider";
import { useRouter } from "next/navigation";
import ErrorPopup from "@/app/components/ErrorPopup";
import ProjectSettings from "../[project]/settings";

export default function ProjectsPage() {
  const user = useUser();
  const username = user?.user?.username;
  const router = useRouter();
  const [error, setError] = useState("");

  const [projects, setProjects] = useState<
    {
      project_id: string;
      name: string;
      status: string;
      services?: { framework: string }[];
    }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const [projectName, setProjectName] = useState("");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const [creating, setCreating] = useState(false);
  const [loaderStep, setLoaderStep] = useState(0);

  const loaderMessages = [
    "Downloading Node.js...",
    "Downloading Python...",
    "Downloading PostgreSQL...",
    "Initializing container...",
    "Setting up frontend...",
    "Setting up backend...",
    "Finalizing project...",
  ];

  const startFakeLoader = () => {
    setCreating(true);
    setLoaderStep(0);

    const interval = setInterval(() => {
      setLoaderStep((prev) => {
        if (prev < loaderMessages.length - 1) return prev + 1;
        return prev;
      });
    }, 4000);

    return interval;
  };

  const BACKEND_OPTIONS = [
    { label: "FastAPI", icon: "fastapi" },
    { label: "Node.js", icon: "nodejs" },
    { label: "Rust", icon: "rust" },
  ];

  const FRONTEND_OPTIONS = [
    { label: "React", icon: "react" },
    { label: "HTML/CSS", icon: "html" },
    { label: "Next.js", icon: "nextjs" },
    { label: "Angular.js", icon: "angular" },
  ];

  const DATABASE_OPTIONS = [
    { label: "PostgreSQL", icon: "postgres" },
    { label: "MySQL", icon: "mysql" },
    { label: "SQLite", icon: "sqlite" },
  ];

  const [backend, setBackend] = useState(BACKEND_OPTIONS[0].icon);
  const [frontend, setFrontend] = useState(FRONTEND_OPTIONS[0].icon);
  const [db, setDb] = useState(DATABASE_OPTIONS[0].icon);

  const icons = [backend, frontend, db].join(",");
  const iconUrl = `https://skillicons.dev/icons?i=${icons}`;

  useEffect(() => {
    if (!username) return;

    const fetchProjects = async () => {
      setLoading(true);
      try {
        const projectList = await listProjects();
        setProjects(projectList);
      } catch (err) {
        setError("Failed to fetch projects:");
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  const refreshProjects = async () => {
    try {
      const projectList = await listProjects();
      setProjects(projectList);
    } catch (err) {
      setError("Failed to refresh projects:");
    }
  };

  return (
    <div className="w-full text-black p-5">
      {creating && (
        <div className="absolute inset-0 z-50 flex flex-col justify-center items-center bg-white bg-opacity-95">
          <div className="text-lg font-bold mb-2">Creating your project...</div>
          <div className="text-gray-700">{loaderMessages[loaderStep]}</div>
          <div className="mt-4 w-64 h-2 bg-gray-200 rounded overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-500"
              style={{
                width: `${((loaderStep + 1) / loaderMessages.length) * 100}%`,
              }}
            />
          </div>
        </div>
      )}
      <ErrorPopup message={error} onClose={() => setError("")} />
      <div className="mb-4 flex items-center space-x-2">
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Enter project name"
          className="border px-2 py-1 rounded flex-1"
        />
        <img
    src={`https://skillicons.dev/icons?i=${backend}`}
    className="h-5"/>
        <select value={backend} onChange={(e) => setBackend(e.target.value)}>
          {BACKEND_OPTIONS.map((opt) => (
            <option key={opt.icon} value={opt.icon}>
              {opt.label}
            </option>
          ))}
        </select>
    <img
    src={`https://skillicons.dev/icons?i=${frontend}`}
    className="h-5"/>
        <select value={frontend} onChange={(e) => setFrontend(e.target.value)}>
          {FRONTEND_OPTIONS.map((opt) => (
            <option key={opt.icon} value={opt.icon}>
              {opt.label}
            </option>
          ))}
        </select>

          <img
    src={`https://skillicons.dev/icons?i=${db}`}
    className="h-5"/>
        <select value={db} onChange={(e) => setDb(e.target.value)}>
          {DATABASE_OPTIONS.map((opt) => (
            <option key={opt.icon} value={opt.icon}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          className={`px-4 py-2 rounded text-white
            ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-yellow-400 hover:bg-yellow-500 active:bg-yellow-800"
            }
            transition-colors duration-150
            `}
          disabled={loading}
          onClick={async () => {
            if (!username) return;
            const interval = startFakeLoader();
            try {
              await handleCreateProject(
                `${username}`,
                projectName,
                frontend,
                backend,
                db,
              );
              await refreshProjects();
              setProjectName("");
            } catch (err) {
              setError("Failed to create project:");
            } finally {
              clearInterval(interval);
              setCreating(false);
              setLoaderStep(0);
            }
          }}
        >
          {loading ? "Creating..." : "Create Project"}
        </button>
      </div>

      {loading ? (
        <p>Loading projects...</p>
      ) : projects.length === 0 ? (
        <p>No projects yet.</p>
      ) : (
        <ul className="space-y-2">
          {projects.map((project) => (
            <li
              key={project.project_id}
              className="border p-2 rounded hover:bg-gray-100 flex justify-between items-center"
            >
              <span
                className="cursor-pointer"
                onClick={async () => {
                  const res = await startProject(project.project_id);
                  router.push(`/dashboard/${project.project_id}`);
                  console.log("Project started:", res);
                }}
              >
                {project.name} {`(Status: ${project.status})`}
              </span>
              <div className="text-sm text-gray-600 mt-1">
                Stack:{" "}
                {project.services?.map((s) => s.framework).join(", ") ||
                  "No services"}
              </div>
              <button
                className="text-red-600 font-bold px-2 py-1 rounded hover:bg-red-100"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    await deleteProject(project.project_id);
                    await refreshProjects();
                  } catch (err) {
                    setError("Failed to delete project:");
                  }
                }}
              >
                X
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
