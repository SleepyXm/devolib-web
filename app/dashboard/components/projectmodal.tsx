"use client";
import { useState, useEffect, useRef } from "react";
import { getProjectMetadata, ProjectMetaData } from "@/app/handlers/projects";
import { deleteProject } from "@/app/handlers/projects";

interface ProjectModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export function ProjectModal({ projectId, projectName, onClose }: ProjectModalProps) {
  const [metadata, setMetadata] = useState<ProjectMetaData>({
    envs: [],
    db_schema: {},
    endpoints: [],
    pages: [],
    updated_at: null
  });
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const data = await getProjectMetadata(projectId);
        setMetadata(data);
      } catch (err) {
        console.error("Failed to fetch metadata:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetadata();
  }, [projectId]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  const handleDelete = async () => {
    if (deleteConfirm !== "DELETE") return;
    
    try {
      await deleteProject(projectId);
      onClose();
      window.location.reload(); // Refresh to update project list
    } catch (err) {
      console.error("Failed to delete project:", err);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-white p-24">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white dark:bg-zinc-900 border-2 border-black dark:border-white w-[70vw] max-h-[85vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b-2 border-black dark:border-white flex justify-between items-center">
          <h2 className="text-xl font-bold">{projectName}</h2>
          <button
            onClick={onClose}
            className="text-2xl hover:bg-gray-100 dark:hover:bg-zinc-800 px-3 py-1 rounded"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Environment Variables */}
          <section>
            <h3 className="text-lg font-semibold mb-3 border-b border-gray-300 dark:border-gray-700 pb-2">
              Environment Variables
            </h3>
            {metadata.envs.length > 0 ? (
              <div className="space-y-2">
                {metadata.envs.map((env, idx) => (
                  <div
                    key={idx}
                    className="flex gap-4 p-3 border border-gray-300 dark:border-gray-700 rounded font-mono text-sm"
                  >
                    <span className="font-semibold min-w-[200px]">{env.key}</span>
                    <span className="flex-1 text-gray-600 dark:text-gray-400">
                      {env.is_secret ? "••••••••" : env.value}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No environment variables configured</p>
            )}
          </section>

          {/* Database Schema */}
          <section>
            <h3 className="text-lg font-semibold mb-3 border-b border-gray-300 dark:border-gray-700 pb-2">
              Database Schema
            </h3>
            {Object.keys(metadata.db_schema).length > 0 ? (
              <div className="space-y-4">
                {Object.entries(metadata.db_schema).map(([tableName, columns]) => (
                  <div key={tableName} className="border border-gray-300 dark:border-gray-700 rounded overflow-hidden">
                    <div className="bg-gray-100 dark:bg-zinc-800 px-4 py-2 font-semibold">
                      {tableName}
                    </div>
                    <div className="p-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-300 dark:border-gray-700">
                            <th className="text-left py-2 px-3">Column</th>
                            <th className="text-left py-2 px-3">Type</th>
                            <th className="text-left py-2 px-3">Nullable</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(columns as any[]).map((col, idx) => (
                            <tr key={idx} className="border-b border-gray-200 dark:border-gray-800">
                              <td className="py-2 px-3 font-mono">{col.column}</td>
                              <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{col.type}</td>
                              <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                                {col.nullable ? "Yes" : "No"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No database schema available</p>
            )}
          </section>

          {/* API Endpoints */}
          <section>
            <h3 className="text-lg font-semibold mb-3 border-b border-gray-300 dark:border-gray-700 pb-2">
              API Endpoints
            </h3>
            {metadata.endpoints.length > 0 ? (
              <div className="space-y-2">
                {metadata.endpoints.map((endpoint, idx) => (
                  <div
                    key={idx}
                    className="flex gap-4 p-3 border border-gray-300 dark:border-gray-700 rounded font-mono text-sm"
                  >
                    {endpoint.method && (
                      <span className="font-semibold min-w-[80px] text-blue-600 dark:text-blue-400">
                        {endpoint.method}
                      </span>
                    )}
                    <span className="flex-1">{endpoint.path}</span>
                    <span className="text-gray-500 text-xs uppercase">{endpoint.path}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No endpoints configured</p>
            )}
          </section>

          {/* Danger Zone */}
          <section className="border-2 border-red-500 rounded p-4">
            <h3 className="text-lg font-semibold text-red-500 mb-2">Danger Zone</h3>
            <p className="text-sm mb-4 text-gray-600 dark:text-gray-400">
              Deleting this project will remove all data, containers, and configurations.
              This action cannot be undone.
            </p>
            <input
              type="text"
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              className="border-2 border-red-500 p-2 w-full mb-2 rounded"
              placeholder="Type DELETE to confirm"
            />
            <button
              onClick={handleDelete}
              disabled={deleteConfirm !== "DELETE"}
              className="bg-red-500 text-white px-4 py-2 w-full rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Delete Project Permanently
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}