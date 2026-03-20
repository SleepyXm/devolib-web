import { useState, useEffect } from "react";
import { PackageManager, QueuedPackage, buildInstallPayload, buildPreview, validatePackageName } from "@/app/dashboard/components/DependencyZone/models/depshelper"

export const useDepsManager = (projectWS: any, isRunning: boolean) => {
  const [pm, setPm] = useState<PackageManager>("npm");
  const [input, setInput] = useState("");
  const [isDev, setIsDev] = useState(false);
  const [queue, setQueue] = useState<QueuedPackage[]>([]);
  const [installing, setInstalling] = useState(false);
  const [installingPm, setInstallingPm] = useState<string | null>(null);

  useEffect(() => {
    if (!projectWS) return;
    const handler = (data: string) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === "INSTALL_STARTED") {
          setInstalling(true);
          setInstallingPm(msg.pm);
        }
        if (msg.type === "INSTALL_DONE") {
          setInstalling(false);
          setInstallingPm(null);
        }
      } catch {}
    };
    projectWS.onOutput(handler);
    return () => projectWS.removeOutput(handler);
  }, [projectWS]);

  const addToQueue = () => {
    const name = input.trim();
    if (!name) return;
    if (!validatePackageName(name)) return;
    setQueue(prev => [...prev, { name, dev: isDev }]);
    setInput("");
  };

  const removeFromQueue = (i: number) => {
    setQueue(prev => prev.filter((_, idx) => idx !== i));
  };

  const install = () => {
    if (!queue.length || !projectWS || !isRunning) return;
    const payloads = buildInstallPayload(pm, queue);
    for (const payload of payloads) {
      projectWS.sendCommand(JSON.stringify(payload));
    }
    setQueue([]);
  };

  const preview = buildPreview(pm, queue);

  return {
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
  };
};