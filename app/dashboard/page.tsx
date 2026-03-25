"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProjectCard } from "./components/projectdisplay/projectdisplay";
import { ProjectModal } from "./components/projectdisplay/projectmodal";
import { useUser } from "@/app/provider/UserProvider";
import { listProjects } from "../handlers/projects";

export default function DashboardPage() {
  const user = useUser();
  const username = user?.user?.username;
  const loggedInUsername = user?.user?.username;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [projects, setProjects] = useState<
    {
      project_id: string;
      name: string;
      status: string;
      services?: { framework: string }[];
      last_online: string;
    }[]
  >([]);

  useEffect(() => {

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

  return (
    <div className="text-zinc-600 dark:text-zinc-300 p-8">
      <h1 className="text-2xl font-bold">
        {loggedInUsername}'s Dashboard
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
        <h1 className="text-xl mb-4">Welcome to your Dashboard</h1>
      </div>
      <div className="mt-2 p-4 rounded-[8px] bg-white/20 dark:bg-white/[0.055] backdrop-blur-2xl border border-white/40 dark:border-white/[0.09]">
        <h1 className="text-lg font-semibold mb-2">Recent Projects</h1>

        <div className="grid grid-cols-3 gap-3">
          {loading ? (
            <div className="border-2 border-black dark:border-white p-4 py-16 col-span-3 text-center">
              Loading projects...
            </div>
          ) : projects.length === 0 ? (
            <div className="border-2 border-black dark:border-white p-4 py-16 col-span-3 text-center">
              No projects yet.
            </div>
          ) : (
            projects.map((project) => (
              <ProjectCard
                key={project.project_id}
                project={project}
                onOpenModal={setSelectedProject}
              />
            ))
          )}
        </div>

        {selectedProject && (
        <ProjectModal
          projectId={selectedProject}
          projectName={selectedProject}
          onClose={() => setSelectedProject("")}
        />
      )}

      </div>
    </div>
  );
}
