import { patchProjectMetadata } from "@/app/handlers/projects";
import { Endpoint } from "../../helpers/FileHandler/FileScanner";

export const saveEndpoints = async (projectId: string, endpoints: Endpoint[]) => {
  await patchProjectMetadata(projectId, { endpoints });
};