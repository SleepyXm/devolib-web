"use client";

import { ReactNode, useContext } from "react";
import { ProjectMetaContext, ProjectContext, ServiceStatus } from "../layout";

export default function WireframeView() {
  const { db_schema, endpoints, pages } = useContext(ProjectMetaContext)!;
  const { serviceStatus } = useContext(ProjectContext)!;

  const services: { key: keyof ServiceStatus; label: string }[] = [
    { key: "frontend", label: "Frontend" },
    { key: "backend", label: "Backend" },
    { key: "database", label: "Database" },
    { key: "container", label: "Container" },
  ];

  return (
    <div className="flex flex-col w-full p-6 gap-6 overflow-auto text-foreground">
      {/* Services Bar */}
      <div className="flex items-center gap-6 px-4 py-3 rounded-lg border bg-card">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mr-2">
          Services
        </span>
        {services.map(({ key, label }) => (
          <div key={key} className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${serviceStatus[key] ? "bg-green-500" : "bg-muted-foreground/40"}`}
            />
            <span className="text-sm">{label}</span>
          </div>
        ))}
      </div>

      {/* Columns */}
      <div className="flex gap-6 flex-1 min-h-0">
        {/* Pages (frontend) */}
        <div className="flex flex-col flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">
            Pages
          </p>
          <div className="rounded-lg border bg-card p-4 flex flex-col gap-1 flex-1 overflow-auto">
            {pages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pages found.</p>
            ) : (
              pages.map((page, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm py-1.5 px-2 rounded hover:bg-muted/50 transition-colors"
                >
                  <span className="text-muted-foreground">/</span>
                  <span className="font-mono">
                    {page.route.replace(/^\//, "") || "index"}
                  </span>
                  <span className="text-muted-foreground/40 text-xs ml-auto font-mono">
                    {page.file}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Backend (api endpoints) */}
        <div className="flex flex-col flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">
            API Endpoints
          </p>
          <div className="rounded-lg border bg-card p-4 flex flex-col gap-1 flex-1 overflow-auto">
            {endpoints.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No endpoints found.
              </p>
            ) : (
              endpoints.map((ep, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm py-1.5 px-2 rounded hover:bg-muted/50 transition-colors"
                >
                  <span
                    className={`font-mono text-xs px-1.5 py-0.5 rounded shrink-0 uppercase
            ${
              ep.method === "POST"
                ? "bg-blue-500/10 text-blue-400"
                : ep.method === "PUT" || ep.method === "PATCH"
                  ? "bg-yellow-500/10 text-yellow-400"
                  : ep.method === "DELETE"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-green-500/10 text-green-400"
            }`}
                  >
                    {ep.method}
                  </span>
                  <span className="font-mono truncate">{ep.path}</span>
                  <span className="text-muted-foreground/40 text-xs ml-auto font-mono">
                    {ep.file}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Database (tables) */}
        <div className="flex flex-col flex-1 min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3 px-1">
            Database
          </p>
          <div className="rounded-lg border bg-card p-4 flex flex-col gap-4 flex-1 overflow-auto">
            {Object.keys(db_schema).length === 0 ? (
              <p className="text-sm text-muted-foreground">No tables found.</p>
            ) : (
              Object.entries(db_schema).map(([table, columns]) => (
                <div key={table}>
                  <p className="text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wide">
                    {table}
                  </p>
                  <div className="rounded border divide-y text-xs overflow-hidden">
                    {columns.map((col) => (
                      <div
                        key={col.column}
                        className="flex justify-between px-3 py-1.5 hover:bg-muted/50 transition-colors"
                      >
                        <span className="font-mono">{col.column}</span>
                        <span className="text-muted-foreground">
                          {col.type}
                          {col.nullable ? "" : " · NN"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col min-w-[220px] max-w-[320px] flex-1">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        {title}
      </h2>
      <div className="rounded-lg border bg-card p-4 flex flex-col gap-1 flex-1">
        {children}
      </div>
    </div>
  );
}

function StatusRow({ label, online }: { label: string; online: boolean }) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <span>{label}</span>
      <span
        className={`text-xs font-medium ${online ? "text-green-500" : "text-muted-foreground"}`}
      >
        {online ? "Online" : "Offline"}
      </span>
    </div>
  );
}
