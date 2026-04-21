import { patchProjectMetadata } from "@/app/handlers/projects";
import { Endpoint } from "@/app/file-manager/FileScanner";

export const saveEndpoints = async (projectId: string, endpoints: Endpoint[]) => {
  await patchProjectMetadata(projectId, { endpoints });
};