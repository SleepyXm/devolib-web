import { useState, useEffect, useContext } from "react";
import { useMonaco, Editor } from "@monaco-editor/react";
import { ProjectMetaContext } from "@/app/dashboard/[project]/layout";
import { generateRouteSnippet } from "../../models/generator/backendgenerator";
import { resolveSnippetToPlain, activatePlaceholder } from "../../routes/routerehandler";
import FileTree from "@/app/file-manager/FileTree";

interface EditorProps {
  initialCode?: string;
  language: string;
  onChange?: (value: string) => void;
  selectedFile: string | null;
  onFileSelect: (file: string) => void;
}

export default function BackendEditor({
  initialCode,
  language,
  onChange,
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
    <div className="flex flex-1">
      <div className="dv-folder-panel dv-folder-panel-color">
        <FileTree
          items={backendGroups}
          selected={selectedFile ?? undefined}
          onSelect={(item) => onFileSelect(item.filepath)}
        />
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