import { useState } from "react";
import { FileCommand } from "./FileHandlerTypes";
import { FileCommandBuilder } from "./FileOperations";

export const useFileManager = (projectWS: any) => {
  const [fileContent, setFileContent] = useState<string>('');
  const [currentPath, setCurrentPath] = useState<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const executeCommand = (command: FileCommand) => {
    console.log(`${command.type}:`, command);
    projectWS?.sendCommand(JSON.stringify(command));
  };

  const readFile = (path: string) => {
    setCurrentPath(path);

    const handler = (data: string) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type === 'FILE_CONTENT' && msg.path === path) {
          loadFileContent(msg.content);
          projectWS.removeFile(handler); // changed
        }
      } catch {}
    };

    projectWS.onFile(handler); // changed
    executeCommand(FileCommandBuilder.readFile(path));
  };


  const writeFile = (content: string) => {
    if (!currentPath) return;
    setFileContent(content);
    setHasUnsavedChanges(true);
  };

  const saveFile = () => {
    if (!currentPath) return;
    executeCommand(FileCommandBuilder.writeFile(currentPath, fileContent));
    setHasUnsavedChanges(false);
  };

  const deleteFile = (path: string) => {
    executeCommand(FileCommandBuilder.deleteFile(path));
  };

  const loadFileContent = (content: string) => {
    setFileContent(content);
    setHasUnsavedChanges(false);
  };

  return {
    fileContent,
    currentPath,
    hasUnsavedChanges,
    readFile,
    writeFile,
    saveFile,
    deleteFile,
    loadFileContent
  };
};