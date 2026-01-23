import Terminal from "../components/terminal";
import DatabasePage from "./database";
import FrontendPage from "./frontend";
import BackendPage from "./backend";

export default function ProjectPage() {
  return(
  <div>
  <FrontendPage />
  <BackendPage />
  <DatabasePage />
  <Terminal/>
  </div>

  );
}