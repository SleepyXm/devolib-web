import { useEffect, useContext, useState } from "react";
import { ProjectContext, ProjectMetaContext } from "@/app/dashboard/[project]/layout";
import { useFileManager } from "@/app/file-manager/FileManager";
import { useEndpointScanner } from "@/app/file-manager/FileScanner";
import { saveEndpoints } from "../models/backendoperations";

export const useBackendManager = () => {
  const { projectWS, projectId, roots } = useContext(ProjectContext)!;
  const { endpoints, setEndpoints } = useContext(ProjectMetaContext)!;
  const { fileContent, writeFile, saveFile, readFile, hasUnsavedChanges } = useFileManager(projectWS);

  const [selectedFile, setSelectedFile] = useState<string>("main.py");
  const files = ["main.py", ...new Set(endpoints.filter(ep => ep.file.startsWith("routers/")).map(ep => ep.file))];
  const scannedEndpoints = useEndpointScanner(fileContent, "fastapi", selectedFile);

  useEffect(() => {
    if (!projectWS) return;
    readFile(`${roots?.backend_root}/main.py`);
  }, [projectWS]);

  const onFileSelect = (file: string) => {
    setSelectedFile(file);
    readFile(`${roots?.backend_root}/${file}`);
  };

  const save = async () => {
    saveFile();
    if (!projectId) return;
    const otherEndpoints = endpoints.filter(ep => ep.file !== selectedFile);
    const newEndpoints = [...otherEndpoints, ...scannedEndpoints];
    setEndpoints(newEndpoints);
    await saveEndpoints(projectId, newEndpoints).catch(console.error);
  };

  return { fileContent, writeFile, hasUnsavedChanges, save, scannedEndpoints, files, selectedFile, onFileSelect };
};