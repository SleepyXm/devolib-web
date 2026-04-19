import { useContext, useEffect, useState } from "react";
import { ProjectMetaContext } from "@/app/dashboard/[project]/layout";

export const useRequestFlowManager = (projectWS: any) => {
  const { endpoints } = useContext(ProjectMetaContext)!;
  const [requestFlows, setRequestFlows] = useState<any[]>([]); }