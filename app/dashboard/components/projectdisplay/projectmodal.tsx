"use client";

import { ArrowRight, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteProject, getProjectMetadata } from "@/app/handlers/projects";
import { ProjectMetaData } from "@/app/types/projects";
import { Action, Status, ui } from "@/app/UI";
import { DangerZone, MetadataRows, MetadataSection } from "./projectdisplaycomponents";

const empty: ProjectMetaData = {
  envs: [],
  db_schema: {},
  endpoints: [],
  pages: [],
  groups: [],
  updated_at: null,
};

export function ProjectModal({
  projectId,
  projectName,
  onClose,
}: {
  projectId: string;
  projectName: string;
  onClose: () => void;
}) {
  const [metadata, setMetadata] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [confirmation, setConfirmation] = useState("");
  const router = useRouter();

  useEffect(() => {
    getProjectMetadata(projectId).then(setMetadata).finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    const escape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onClose]);

  async function remove() {
    if (confirmation !== "DELETE") return;
    await deleteProject(projectId);
    onClose();
    router.refresh();
  }

  return (
    <div
      className="fixed inset-0 z-[100] grid place-items-center bg-black/75 p-5 backdrop-blur-lg max-sm:p-0"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div className="grid max-h-[86vh] w-[min(100%,900px)] grid-rows-[auto_1fr] overflow-hidden border border-white/20 bg-[var(--dv-surface)] shadow-2xl">
        <header className="flex min-h-16 items-center justify-between border-b border-white/10 bg-[var(--dv-surface-inset)] px-5">
          <div><span className={ui.micro}>Project model</span><h2 className="mt-1 text-base font-medium">{projectName}</h2></div>
          <button className="grid h-8 w-8 place-items-center border border-white/10 text-white/50" onClick={onClose} aria-label="Close">
            <X size={14} />
          </button>
        </header>

        <div className="grid gap-6 overflow-y-auto p-5">
          <div className="flex items-center justify-between border border-white/10 bg-[var(--dv-surface-inset)] p-3">
            <Status state={loading ? "idle" : "live"}>{loading ? "reading source model" : "metadata synchronized"}</Status>
            <Action onClick={() => router.push(`/dashboard/${projectId}`)} className="min-h-8 px-3">
              Open workspace <ArrowRight size={11} />
            </Action>
          </div>

          {!loading && (
            <>
              <MetadataSection title="Application routes" count={metadata.pages.length}>
                <MetadataRows rows={metadata.pages.map((page) => ["PAGE", page.route, page.file])} />
              </MetadataSection>
              <MetadataSection title="API endpoints" count={metadata.endpoints.length}>
                <MetadataRows rows={metadata.endpoints.map((endpoint) => [endpoint.method, endpoint.path, endpoint.handler])} />
              </MetadataSection>
              <MetadataSection title="Database schema" count={Object.keys(metadata.db_schema).length}>
                <MetadataRows rows={Object.entries(metadata.db_schema).map(([table, columns]) => ["TABLE", table, `${columns.length} columns`])} />
              </MetadataSection>
              <MetadataSection title="Environment" count={metadata.envs.length}>
                <MetadataRows rows={metadata.envs.map((env) => [env.is_secret ? "SECRET" : "PUBLIC", env.key, env.is_secret ? "••••••••" : env.value])} />
              </MetadataSection>
              <DangerZone
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                onDelete={() => void remove()}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
