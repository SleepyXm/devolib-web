import { useEffect, useContext } from "react";
import { ProjectContext, ProjectMetaContext } from "../../layout";
import { useFileManager } from "../../helpers/FileHandler/FileManager";
import { useEndpointScanner } from "../../helpers/FileHandler/FileScanner";
import { saveEndpoints } from "../models/backendoperations";

export const useBackendManager = () => {
  const { projectWS, projectId } = useContext(ProjectContext)!;
  const { endpoints, setEndpoints } = useContext(ProjectMetaContext)!;
  const { fileContent, writeFile, saveFile, readFile, loadFileContent, hasUnsavedChanges } = useFileManager(projectWS);
  const scannedEndpoints = useEndpointScanner(fileContent, "fastapi", "main.py");

  useEffect(() => {
    if (!projectWS) return;
    readFile(`/app/workspace/backend/main.py`);
  }, [projectWS]);

  const save = async () => {
    saveFile();
    if (!projectId) return;

    const otherEndpoints = endpoints.filter(ep => ep.file !== "main.py");
    const newEndpoints = [...otherEndpoints, ...scannedEndpoints];
    setEndpoints(newEndpoints);
    await saveEndpoints(projectId, newEndpoints).catch(console.error);
  };

  return { fileContent, writeFile, hasUnsavedChanges, save, scannedEndpoints };
};