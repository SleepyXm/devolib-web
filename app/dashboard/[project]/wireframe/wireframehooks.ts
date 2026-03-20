import { useContext, useEffect, useState } from "react";
import { ProjectMetaContext, ProjectContext } from "../layout";
import { patchRoutes, patchRoutesNested, generateRouter, patchMainPy } from "./wireframehelpers";
import { patchProjectMetadata } from "@/app/handlers/projects"
import { saveEndpoints } from "../backend/models/backendoperations";

export function useWireframe() {
  const { projectWS, projectName, projectId } = useContext(ProjectContext)!;
  const { db_schema, endpoints, pages, setPages } = useContext(ProjectMetaContext)!;

  const [showInput, setShowInput] = useState(false);
  const [activeSection, setActiveSection] = useState<"pages" | "endpoints" | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [routesFileContent, setRoutesFileContent] = useState<string | null>(null);
  const [mainPyContent, setMainPyContent] = useState<string | null>(null);
  const [parentPage, setParentPage] = useState<{ name: string; path: string } | null>(null);
  const [endpointType, setEndpointType] = useState<"endpoint" | "router">("endpoint");

  useEffect(() => {
    if (!projectWS) return;
    const handleOutput = (data: string) => {
      console.log("WS output:", data);
      try {
        const msg = JSON.parse(data);
        if (msg.type === "FILE_CONTENT") {
          if (msg.path?.endsWith("main.py")) setMainPyContent(msg.content);
          else setRoutesFileContent(msg.content);
        }
      } catch {
        if (data.startsWith("FILE_CONTENT:"))
          setRoutesFileContent(data.replace("FILE_CONTENT:", ""));
      }
    };
    projectWS.onFile(handleOutput);
    return () => projectWS.removeFile(handleOutput);
  }, [projectWS]);

  useEffect(() => {
    if (!projectWS || !projectName) return;
    projectWS.sendCommand(JSON.stringify({
      type: "READ_FILE",
      path: `/app/workspace/frontend/${projectName}/src/Routes.jsx`,
    }));
  }, [projectWS, projectName]);

  const openInput = (section: "pages" | "endpoints") => {
    setActiveSection(section);
    setShowInput(true);
    if (section === "endpoints" && projectWS && projectName) {
      projectWS.sendCommand(JSON.stringify({
        type: "READ_FILE",
        path: `/app/workspace/backend/main.py`,
      }));
    }
  };

  const closeInput = () => {
    setShowInput(false);
    setInputValue("");
    setParentPage(null);
    setEndpointType("endpoint");
  };

  const handleCreate = async () => {
    if (!inputValue || !projectName || !projectId || !projectWS) return;

    const name = inputValue.charAt(0).toUpperCase() + inputValue.slice(1);
    const path = inputValue.toLowerCase();

    if (activeSection === "pages") {
      projectWS.sendCommand(JSON.stringify({
        type: "WRITE_FILE",
        path: `/app/workspace/frontend/${projectName}/src/${name}.jsx`,
        content: `export default function ${name}() {\n  return(\n    <>\n      <h1>Welcome to your ${name} page</h1>\n    </>\n  );\n}`,
      }));

      if (routesFileContent) {
        projectWS.sendCommand(JSON.stringify({
          type: "WRITE_FILE",
          path: `/app/workspace/frontend/${projectName}/src/Routes.jsx`,
          content: parentPage
            ? patchRoutesNested(routesFileContent, name, path, parentPage.name, parentPage.path)
            : patchRoutes(routesFileContent, name, path),
        }));
      }

      const newPages = [
        ...pages,
        {
          route: parentPage ? `/${parentPage.path}/${path}` : `/${path}`,
          file: `src/${name}.jsx`,
        },
      ];


      setPages(newPages);
      await patchProjectMetadata(projectId, { pages: newPages });
    }

    if (activeSection === "endpoints" && endpointType === "router" && mainPyContent) {
      projectWS.sendCommand(JSON.stringify({
        type: "WRITE_FILE",
        path: `/app/workspace/backend/routers/${path}.py`,
        content: generateRouter(path),
      }));

      projectWS.sendCommand(JSON.stringify({
        type: "WRITE_FILE",
        path: `/app/workspace/backend/main.py`,
        content: patchMainPy(mainPyContent, path),
      }));

      const newEndpoints = [
        ...endpoints,
        {
          method: "GET",
          path: `/api/${path}/`,
          file: `routers/${path}.py`,
          handler: `${path}_index` 
        }
      ];
      await saveEndpoints(projectId, newEndpoints);
      }

      closeInput();
    };

  return {
    db_schema, endpoints, pages,
    showInput, activeSection, setActiveSection, inputValue, parentPage,
    setInputValue, setParentPage,
    openInput, closeInput, handleCreate, setShowInput, endpointType, setEndpointType
  };
}