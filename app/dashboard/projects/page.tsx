"use client";
import { useEffect, useState } from "react";
import {
  listProjects,
  handleCreateProject,
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

  const BACKEND_OPTIONS = ["FastAPI", "Node.js", "Rust"];

  const FRONTEND_OPTIONS = ["React", "HTML/CSS", "Next.js", "Angular.js"];

  const DATABASE_OPTIONS = ["PostgreSQL", "MySQL", "SQLite"];

  const [backend, setBackend] = useState(BACKEND_OPTIONS[0]);
  const [frontend, setFrontend] = useState(FRONTEND_OPTIONS[0]);
  const [db, setDb] = useState(DATABASE_OPTIONS[0]);

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
  }, [username]);

  const refreshProjects = async () => {
    try {
      const projectList = await listProjects();
      setProjects(projectList);
    } catch (err) {
      setError("Failed to refresh projects:");
    }
  };

  return (
    <div className="w-full text-black dark:text-zinc-300 p-5">
      {creating && (
        <div className="absolute inset-0 z-50 flex items-center justify-center">

          <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-l" />


          <div className="relative z-10 bg-white rounded-xl shadow-lg p-6 w-full max-w-sm text-center">
            <div className="text-lg font-semibold mb-1">
              Creating your project…
            </div>

            <div className="text-sm text-gray-600 dark:text-zinc-300 mb-4">
              {loaderMessages[loaderStep]}
            </div>

            <div className="w-full h-2 bg-gray-200 rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-600 to-blue-300 transition-all duration-500"
                style={{
                  width: `${((loaderStep + 1) / loaderMessages.length) * 100}%`,
                }}
              />
            </div>
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

         <select value={backend} onChange={(e) => setBackend(e.target.value)}>
          {BACKEND_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        <select value={frontend} onChange={(e) => setFrontend(e.target.value)}>
          {FRONTEND_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>


        <select value={db} onChange={(e) => setDb(e.target.value)}>
          {DATABASE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <button
          className={`px-4 py-2 rounded text-white transition-all duration-700
            ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-yellow-400 hover:bg-gradient-to-r from-yellow-300 to-red-300 active:bg-yellow-800 z-50"
            }
            transition-colors duration-300
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
                  router.push(`/dashboard/${project.project_id}`);
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
