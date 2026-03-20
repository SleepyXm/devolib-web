"use client";

import BackendEditor from "./editor/backendeditor";
import { BackendControls } from "./backendcomponents";
import { useBackendManager } from "../models/backendmanager";
import RightPanel from "../rightpanel/panel";

export default function BackendPage() {
  const { fileContent, writeFile, hasUnsavedChanges, save, files, selectedFile, onFileSelect } = useBackendManager();

  return (
    <div className="text-white flex flex-col h-full">
      <BackendControls hasUnsavedChanges={hasUnsavedChanges} onSave={save} />
      <div className="flex flex-1 overflow-hidden relative w-full">
        <BackendEditor
          initialCode={fileContent}
          onChange={(value) => writeFile(value)}
          language="python"
          files={files}
          selectedFile={selectedFile}
          onFileSelect={onFileSelect}
        />
        <div className="w-1/2 flex flex-col overflow-hidden">
          <RightPanel code={fileContent} />
        </div>
      </div>
    </div>
  );
}