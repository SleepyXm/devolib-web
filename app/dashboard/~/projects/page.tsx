"use client";
import { useEffect, useState } from "react";
import { listProjects, handleCreateProject } from "@/app/handlers/projects";
import { useUser } from "@/app/provider/UserProvider";

export default function ProjectsPage() {
  const user = useUser();
  const username = user?.user?.username;
  const defaultProjectName = "Docker test";

  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch projects on mount
  useEffect(() => {
  if (!username) return; // wait for user to be loaded

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const projectList = await listProjects();
      setProjects(projectList);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
    } finally {
      setLoading(false);
    }
  };

  fetchProjects();
}, [user]);

  // Optional: refresh list after creating a new project
  const refreshProjects = async () => {
    try {
      const projectList = await listProjects();
      setProjects(projectList);
    } catch (err) {
      console.error("Failed to refresh projects:", err);
    }
  };

  return (
    <div className="w-full text-black p-5">
      <div className="mb-4">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={async () => {
            await handleCreateProject(`${username}`, `${defaultProjectName}`);
            await refreshProjects();
          }}
        >
          Press me
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
              className="border p-2 rounded hover:bg-gray-100"
              key={project.name}
            >
              {project.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}