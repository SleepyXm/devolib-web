"use client";
import { useEffect, useState } from "react";
import {
  listProjects,
  handleCreateProject,
  startProject,
  deleteProject,
} from "@/app/handlers/projects";
import { useUser } from "@/app/provider/UserProvider";
import { useRouter } from "next/navigation";

export default function ProjectsPage() {
  const user = useUser();
  const username = user?.user?.username;
  const router = useRouter();
  const [error, setError] = useState("");

  const [projects, setProjects] = useState<
    { project_id: string; name: string; status: string; services?: { framework: string }[] }[]
  >([]);
  const [loading, setLoading] = useState(false);

  const [projectName, setProjectName] = useState("");

  const BACKEND_OPTIONS = ["FastAPI", "Node.js", "Rust"];
  const FRONTEND_OPTIONS = ["React", "HTML/CSS", "Next.js", "Angular.js"];
  const DATABASE_OPTIONS = ["MySQL", "PostgreSQL", "SQLite"];

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
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="mb-4 flex items-center space-x-2">
        {/* NEW: input for project name */}
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          placeholder="Enter project name"
          className="border px-2 py-1 rounded flex-1"
        />
        <select value={backend} onChange={(e) => setBackend(e.target.value)}>
          {["FastAPI", "Node.js", "Rust"].map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        <select value={frontend} onChange={(e) => setFrontend(e.target.value)}>
          {["React", "HTML/CSS", "Next.js", "Angular.js"].map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>

        <select value={db} onChange={(e) => setDb(e.target.value)}>
          {["PostgreSQL", "MySQL", "SQLite"].map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        <button
          className={`px-4 py-2 rounded text-white
            ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 active:bg-blue-800"
            }
            transition-colors duration-150
            `}
          disabled={loading}
          onClick={async () => {
            if (!username) return;
            setLoading(true);
            try {
              await handleCreateProject(`${username}`, projectName, frontend, backend, db);
              await refreshProjects();
              setProjectName("");
            } catch (err) {
              setError("Failed to create project:");
            } finally {
              setLoading(false);
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
                Stack: {project.services?.map(s => s.framework).join(", ") || "No services"}
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
