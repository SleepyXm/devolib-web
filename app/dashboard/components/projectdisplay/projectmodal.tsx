"use client";
import { useState, useEffect, useRef } from "react";
import { getProjectMetadata, ProjectMetaData, deleteProject } from "@/app/handlers/projects";
import { DangerZone, ModalHeader, PagesSection, EnvsSection, EndpointsSection, DatabaseSection } from "./projectdisplaycomponents";
import { useRouter } from "next/navigation";


interface ProjectModalProps {
  projectId: string;
  projectName: string;
  onClose: () => void;
}

export function ProjectModal({
  projectId,
  projectName,
  onClose,
}: ProjectModalProps) {
  const [metadata, setMetadata] = useState<ProjectMetaData>({
    envs: [],
    db_schema: {},
    endpoints: [],
    pages: [],
    groups: [],
    updated_at: null,
  });
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
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
      <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center">
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
        className="dv-surface dv-project-modal"
      >
        <ModalHeader title={projectName} onClose={onClose} />
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <span className="text-sm text-white dark:text-zinc-400 bg-[#4a90e0] border-2 border-[#2a70c0] rounded px-2 py-1"
          onClick={async () => {
                  router.push(`/dashboard/${projectId}`);
                }}>
            Access Project <span className="text-xl">→</span>
          </span>
          <br />
          <PagesSection pages={metadata.pages} />
          <EndpointsSection endpoints={metadata.endpoints} />
          <DatabaseSection db_schema={metadata.db_schema} />
          <EnvsSection envs={metadata.envs} />
          <DangerZone
            deleteConfirm={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
