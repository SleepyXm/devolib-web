import { useState, useEffect } from "react";
import { useMonaco, Editor } from "@monaco-editor/react";
import { ElementNode } from "../types/tailwindstuff";

interface EditorProps {
  initialCode?: string;
  language: string;
  onChange?: (value: string) => void;
}

export default function MonacoEditor({
  initialCode,
  language,
  onChange,
}: EditorProps) {
  const monaco = useMonaco();
  const [code, setCode] = useState(initialCode);

  // ADD THIS: Update code when initialCode prop changes
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

  const [elements, setElements] = useState<ElementNode[]>([
    {
      id: "node-1",
      type: "div",
      classState: { p: "p-4" },
      content: "Test content",
    },
  ]);

  const serializeElements = (nodes: ElementNode[]) => {
    return nodes
      .map((node) => {
        const classes = Object.values(node.classState).join(" ");
        return `<${node.type} class="${classes}">${node.content || ""}</${node.type}>`;
      })
      .join("\n");
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

  useEffect(() => {
    const html = serializeElements(elements);
    setCode(html);
  }, [elements]);

  return (
    <div className="flex flex-1 overflow-hidden">
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
          "renderValidationDecorations": "off",
        }}
      />
    </div>
  );
}