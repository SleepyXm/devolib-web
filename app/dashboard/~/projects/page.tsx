"use client";
import { createProject } from "@/app/handlers/projects";
import { useUser } from "@/app/provider/UserProvider";

export default function ProjectsPage() {
    const user = useUser();
    const name = user?.user?.username;
    const projectname = "Test Project";

    const handleCreateProject = async () => {
        try {
            const res = await createProject(`${name}`,  `${projectname}`);
            console.log("Project created:", res);
        } catch (err) {
            console.error("Error creating project:", err);
        }
    }
    return(
        <div className="w-full text-black">
            <div className=" p-15">
            <button className="bg-blue-600" onClick={handleCreateProject}>
                Press me
            </button>
        </div>
        </div>
    );
}