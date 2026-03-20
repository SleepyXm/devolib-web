import { useEffect, useContext } from "react";
import { ProjectContext, ProjectMetaContext } from "../../[project]/layout";
import { useFileManager } from "../helpers/FileHandler/FileManager";
import { useEndpointScanner } from "../helpers/FileHandler/FileScanner";
import { saveEndpoints } from "./backendoperations";

export const useBackendManager = () => {
  const { projectWS, projectId } = useContext(ProjectContext)!;
  const { setEndpoints } = useContext(ProjectMetaContext)!;
  const { fileContent, writeFile, saveFile, readFile, loadFileContent, hasUnsavedChanges } = useFileManager(projectWS);
  const scannedEndpoints = useEndpointScanner(fileContent, "fastapi", "main.py");

  useEffect(() => {
    if (!projectId) return;
    setEndpoints(scannedEndpoints);
  }, [scannedEndpoints, projectId]);

  useEffect(() => {
    if (!projectWS) return;
    readFile(`/app/workspace/backend/main.py`);
    projectWS.onOutput((data: string) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === "FILE_CONTENT") loadFileContent(msg.content);
      } catch {
        if (data.includes("FILE_CONTENT:")) loadFileContent(data.replace("FILE_CONTENT:", ""));
      }
    });
  }, [projectWS]);

  const save = async () => {
    saveFile();
    if (projectId) await saveEndpoints(projectId, scannedEndpoints).catch(console.error);
  };

  return { fileContent, writeFile, hasUnsavedChanges, save, scannedEndpoints };
};