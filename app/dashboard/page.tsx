"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useUser } from "@/app/provider/UserProvider";
import { listProjects } from "../handlers/projects";

export default function DashboardPage() {
  const user = useUser();
  const username = user?.user?.username;
  const router = useRouter();
  const loggedInUsername = user?.user?.username;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [projects, setProjects] = useState<
    {
      project_id: string;
      name: string;
      status: string;
      services?: { framework: string }[];
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
      <div className="mt-2 p-4 shadow border-3 border-black dark:border-white">
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
              <div
                key={project.project_id}
                className="border-2 border-black dark:border-white p-4 py-16 hover:bg-gray-100 dark:hover:bg-zinc-800 flex flex-col justify-between"
              >
                <span
                  className="cursor-pointer font-medium"
                  onClick={() => {
                    // fit the modal stuff in here
                  }}
                >
                  {project.name} {`Status: ${project.status}`}
                </span>

                <div className="mt-2 flex flex-wrap gap-4">
                  {project.services && project.services.length > 0 ? (
                    project.services.map((s) => {
                      const iconUrl = `https://skillicons.dev/icons?i=${s.framework.toLowerCase()}`;
                      return (
                        <div
                          key={s.framework}
                          className="flex flex-col items-center text-center text-sm"
                        >
                          <img
                            src={iconUrl}
                            alt={s.framework}
                            className="h-8 w-8 mb-1"
                          />
                          <span>{s.framework}</span>
                        </div>
                      );
                    })
                  ) : (
                    <span className="text-gray-400 text-sm">No services</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
