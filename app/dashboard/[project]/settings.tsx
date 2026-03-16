"use client";
import { useState } from "react";
import { startProject, Project } from "@/app/handlers/projects";

interface ProjectSettingsProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
}

export default function ProjectSettings({ project, isOpen, onClose }: ProjectSettingsProps) {
  const [selectedTab, setSelectedTab] = useState("Overview");

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="flex h-[600px]">
        <Sidebar>
          <SidebarItem 
            active={selectedTab === "Overview"}
            onClick={() => setSelectedTab("Overview")}
          >
            Overview
          </SidebarItem>
          <SidebarItem 
            active={selectedTab === "Settings"}
            onClick={() => setSelectedTab("Settings")}
          >
            Settings
          </SidebarItem>
          <SidebarItem 
            active={selectedTab === "Env Vars"}
            onClick={() => setSelectedTab("Env Vars")}
          >
            Env Vars
          </SidebarItem>
          <SidebarItem 
            active={selectedTab === "Commands"}
            onClick={() => setSelectedTab("Commands")}
          >
            Commands
          </SidebarItem>
        </Sidebar>

        <div className="flex-1 p-6 overflow-y-auto">
          {selectedTab === "Overview" && <ProjectOverview project={project} />}
          {selectedTab === "Settings" && <ProjectSettingsTab project={project} />}
          {selectedTab === "Env Vars" && <EnvVarsEditor project={project} />}
          {selectedTab === "Commands" && <CommandsEditor project={project} />}
        </div>
      </div>

      <div className="border-t p-4 flex justify-between items-center">
        <button
          className="px-4 py-2 rounded border hover:bg-gray-100"
          onClick={onClose}
        >
          Close
        </button>
        <button
          className="px-4 py-2 rounded bg-yellow-500 hover:bg-gray-800 text-black hover:text-yellow-500 transition-colors"
          onClick={() => {
            startProject(project.project_id);
            // Maybe open in new tab?
            window.open(`http://${project.project_name}.localhost`, '_blank');
          }}
        >
          Launch Project
        </button>
      </div>
    </Modal>
  );
}