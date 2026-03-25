import { useState, useEffect, useContext } from "react";
import { useMonaco, Editor } from "@monaco-editor/react";
import { ProjectMetaContext } from "../../../layout";
import { generateRouteSnippet } from "../../models/generator/backendgenerator";
import { resolveSnippetToPlain, activatePlaceholder } from "../../routes/routerehandler";
import FileTree from "../../../helpers/FileHandler/FileTree";

interface EditorProps {
  initialCode?: string;
  language: string;
  onChange?: (value: string) => void;
  files: string[];
  selectedFile: string | null;
  onFileSelect: (file: string) => void;
}

export default function BackendEditor({
  initialCode,
  language,
  onChange,
  files,
  selectedFile,
  onFileSelect,
}: EditorProps) {
  const meta = useContext(ProjectMetaContext);
  const db_schema = meta?.db_schema ?? {};
  const monaco = useMonaco();
  const [code, setCode] = useState(initialCode);
  const backendGroups = meta?.groups.filter(g => g.context === "backend") ?? [];

  useEffect(() => {
    if (initialCode !== undefined && initialCode !== code) {
      setCode(initialCode);
    }
  }, [initialCode]);

  const handleChange = (value: string | undefined) => {
    const newValue = value || "";
    setCode(newValue);
    if (onChange) onChange(newValue);
  };

  useEffect(() => {
    if (monaco) {
      monaco.editor.defineTheme("vs-dark-custom-bg", {
        base: "vs-dark",
        inherit: true,
        rules: [],
        colors: {
          "editor.background": "#1e1e2f",
          "editorLineNumber.foreground": "#888888",
        },
      });
    }
  }, [monaco]);

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-36 bg-gray-800 text-white flex flex-col overflow-y-auto shrink-0">
        <FileTree label="Files" items={files.map(f => ({ name: f, filepath: f }))} selected={selectedFile ?? undefined} onSelect={(item) => onFileSelect(item.name + "." + item.filepath.split(".").pop())}  />
          {backendGroups.map(group => (
            <FileTree key={group.label} label={group.label} items={group.files.map(f => ({ name: f.name, filepath: `${group.root}/${f.filepath}` }))} selected={selectedFile ?? undefined} onSelect={(item) => onFileSelect(item.filepath)} />
          ))}
      </div>

      <Editor
        height="100%"
        defaultLanguage={language}
        value={code}
        onChange={handleChange}
        theme="vs-dark-custom-bg"
        options={{
          fontSize: 16,
          minimap: { enabled: false },
          wordWrap: "on",
          renderValidationDecorations: "off",
        }}
        onMount={(editor) => {
          editor.addAction({
            id: "generate-route",
            label: "Generate Route",
            contextMenuGroupId: "navigation",
            contextMenuOrder: 1.5,
            run: (ed) => {
              const snippet = generateRouteSnippet(db_schema);
              const { text, placeholders } = resolveSnippetToPlain(snippet);
              const position = ed.getPosition()!;
              ed.executeEdits("", [
                {
                  range: {
                    startLineNumber: position.lineNumber,
                    startColumn: position.column,
                    endLineNumber: position.lineNumber,
                    endColumn: position.column,
                  },
                  text,
                },
              ]);
              activatePlaceholder(ed, placeholders, 0, position);
            },
          });
        }}
      />
    </div>
  );
}