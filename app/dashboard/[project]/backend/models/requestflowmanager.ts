import { useContext, useEffect, useState } from "react";
import { ProjectContext, ProjectMetaContext } from "../../layout";

export const useRequestFlowManager = (projectWS: any) => {
  const { endpoints } = useContext(ProjectMetaContext)!;
  const [requestFlows, setRequestFlows] = useState<any[]>([]); }