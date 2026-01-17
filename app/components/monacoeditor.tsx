import { useState, useEffect } from "react";
import { useMonaco, Editor } from "@monaco-editor/react";

interface EditorProps {
    initialCode: string;
    language: string;
    onChange?: (value: string) => void;
}

export default function MonacoEditor({ initialCode, language, onChange }: EditorProps) {
    const monaco = useMonaco();
    const [code, setCode] = useState(initialCode);

    const handleChange = (value: string | undefined) => {
        const newValue = value || "";
        setCode(newValue);
        if(onChange) onChange(newValue);
    };

    useEffect(() => {
        if (monaco) {
          monaco.editor.defineTheme("vs-dark-custom-bg", {
            base: "vs-dark",
            inherit: true,
            rules: [], // keep all syntax colors
            colors: {
              "editor.background": "#1e1e2f", // lighter, less harsh than pure vs-dark
              "editorLineNumber.foreground": "#888888", // optional line number color
            },
          });
        }
    }, [monaco]);

    
    return(
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
          }}
        />
      </div>
    );
}