"use client";
import { useEffect, useState } from "react";
import {
  listProjects,
  handleCreateProject,
  startProject,
} from "@/app/handlers/projects";
import { useUser } from "@/app/provider/UserProvider";

export default function ProjectsPage() {
  const user = useUser();
  const username = user?.user?.username;
  const defaultProjectName = "Docker test";

  const [projects, setProjects] = useState<
    { project_id: string; name: string; status: string }[]
  >([]);
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    if (!username) return;

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
              key={project.project_id}
              className="border p-2 rounded hover:bg-gray-100 cursor-pointer"
              onClick={async () => {
                const res = await startProject(project.project_id);
                console.log("Project started:", res);
              }}
            >
              {project.name} {`(Status: ${project.status})`} 
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
