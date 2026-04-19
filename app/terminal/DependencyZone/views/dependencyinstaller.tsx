"use client";

import { useContext } from "react";
import { ProjectContext } from "@/app/dashboard/[project]/layout";
import { useDepsManager } from "../models/depsmanager";
import { InstallingIndicator, PackageManagerTabs, PackageInput, QueuedPackages, CommandPreview, InstallButton } from "./depscomponents";

export default function DependencyInstallerPage() {
  const { projectWS, isRunning } = useContext(ProjectContext)!;

  const {
    pm, setPm,
    input, setInput,
    isDev, setIsDev,
    queue,
    installing,
    installingPm,
    preview,
    addToQueue,
    removeFromQueue,
    install,
  } = useDepsManager(projectWS, isRunning);

  if (installing) return <InstallingIndicator installingPm={installingPm} />;

  return (
    <div className="flex flex-col h-full gap-3 font-mono overflow-hidden backdrop-blur-lg">
      <PackageManagerTabs pm={pm} onChange={setPm} />
      <PackageInput
        value={input}
        isDev={isDev}
        onChange={setInput}
        onToggleDev={setIsDev}
        onAdd={addToQueue}
        onKeyDown={e => e.key === "Enter" && addToQueue()}
      />
      <QueuedPackages queue={queue} onRemove={removeFromQueue} />
      <CommandPreview preview={preview} />
      <InstallButton onClick={install} disabled={!queue.length || !isRunning} queueLength={queue.length} />
    </div>
  );
}