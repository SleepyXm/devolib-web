"use client";

import { useState, useEffect } from "react";
import MonacoEditor from "@/app/components/monacoeditor";
import { useContextMenu } from "@/app/components/Contextmenu";
import { editorMenuItems, colorMenuItems, } from "@/app/components/Contextmenu/menuitems";
import { EditorMenuItem } from "@/app/components/Contextmenu/menuactions";
import { snapToTailwindHeight, snapToTailwindWidth, } from "@/app/types/tailwindstuff";
import Chat from "../../llm/chat";
import { generatePreviewDocument } from "../helpers/preview";

export default function DesignEditor() {
  const [code, setCode] = useState(
    `<h1>Hello Devolib</h1>\n<p>This is your live preview.</p>`,
  );

  const [srcDoc, setSrcDoc] = useState("");

  const { contextMenu, handleContextMenu, handleClick } = useContextMenu();

  const [showDropdown, setShowDropdown] = useState(false);

  const [selectedElement, setSelectedElement] = useState<{
    tagName: string;
    classes: string;
    id: string;
  } | null>(null);

  const handleMenuAction = (item: EditorMenuItem) => {
    switch (item.action) {
      case "copy":
        navigator.clipboard.writeText(code);
        alert("Copied!");
        break;

      case "format":
        setCode(code.toUpperCase());
        break;

      case "insert-element":
        setCode(
          code +
            `<${item.payload.value} class="${item.payload.defaultClass}"></${item.payload.value}>\n`,
        );
        break;

      case "set-class":
        if (!selectedElement) break;
        const parser = new DOMParser();
        const doc = parser.parseFromString(code, "text/html");

        let targetElement;
        if (selectedElement.id) {
          targetElement = doc.getElementById(selectedElement.id);
        } else {
          const elements = doc.getElementsByTagName(selectedElement.tagName);
          targetElement = Array.from(elements).find(
            (el) => el.className === selectedElement.classes,
          );
        }

        if (targetElement) {
          const newClass = `${item.payload.prefix}-${item.payload.color}-${item.payload.shade}`;
          targetElement.classList.add(newClass);
          setCode(doc.body.innerHTML);
        }
        break;
    }

    handleClick();
    setSelectedElement(null);
  };

  const getContextualMenuItems = () => {
    if (!selectedElement) {
      return editorMenuItems;
    }

    return [
      ...colorMenuItems,
      ...editorMenuItems.filter((item) => item.action !== "insert-element"),
    ];
  };

  useEffect(() => {
  const timeout = setTimeout(() => {
    setSrcDoc(generatePreviewDocument(code));
  }, 200);
  return () => clearTimeout(timeout);
}, [code]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === "contextmenu") {
        const iframe = document.querySelector('iframe[title="preview"]');
        const iframeRect = iframe?.getBoundingClientRect();

        if (iframeRect) {
          const finalX = iframeRect.left + e.data.x + window.scrollX;
          const finalY = iframeRect.top + e.data.y + window.scrollY;

          handleContextMenu({
            clientX: iframeRect.left + e.data.x,
            clientY: iframeRect.top + e.data.y,
            pageX: finalX,
            pageY: finalY,
            preventDefault: () => {},
          } as React.MouseEvent);
        }
      }

      if (e.data.type === "element-selected") {
        setSelectedElement({
          tagName: e.data.tagName,
          classes: e.data.classes,
          id: e.data.id,
        });
        console.log("Selected:", e.data.tagName, e.data.classes);
      }

      if (e.data.type === "element-resized") {
        const newWidth = snapToTailwindWidth(e.data.width);
        const newHeight = snapToTailwindHeight(e.data.height);

        const parser = new DOMParser();
        const doc = parser.parseFromString(code, "text/html");

        let targetElement;
        if (e.data.id) {
          targetElement = doc.getElementById(e.data.id);
        } else {
          const elements = doc.getElementsByTagName(e.data.tagName);
          targetElement = Array.from(elements).find(
            (el) => el.className === e.data.classes,
          );
        }

        if (targetElement) {
          const classes = targetElement.className
            .split(" ")
            .filter((c: string) => !c.startsWith("w-"));
          classes.push(newWidth, newHeight);
          targetElement.className = classes.join(" ");
          setCode(doc.body.innerHTML);
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [handleContextMenu, code]);

  return (
    <div className="flex flex-col h-screen w-full border rounded-lg">
      {/* Header */}
      <div className="p-2 bg-gray-900 text-white flex justify-between items-center">
        <h2>Design Editor</h2>
      </div>

      {/* Code editor + preview */}
      <div
        className="flex flex-1 overflow-hidden bg-white dark:bg-black"
        onContextMenu={handleContextMenu}
        onClick={handleClick}
      >
        <>
          <div className="flex flex-col w-1/2 h-[calc(100vh-11rem)]">
            <MonacoEditor
              initialCode={code}
              language="html"
              onChange={(value) => setCode(value)}
            />
            <Chat setCode={(setCode)} />
          </div>
          <div className="flex w-1/2">
            {/* Slim toolbar */}
            <div className="w-12 bg-gray-900 border-r border-gray-700 flex flex-col items-center py-4 gap-4">
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(!showDropdown)}
                  className="w-8 h-8 rounded bg-gray-800 hover:bg-gray-700 flex items-center justify-center text-gray-400"
                >
                  +
                </button>

                {showDropdown && (
                  <div className="absolute left-12 top-0 w-48 bg-gray-800 border border-gray-700 rounded shadow-lg p-2 z-50 text-gray-200">
                    <div className="text-xs text-gray-200 uppercase mb-2">
                      Text
                    </div>
                    <button className="w-full text-left px-2 py-1 hover:bg-gray-700 rounded text-sm">
                      h1
                    </button>
                    <button className="w-full text-left px-2 py-1 hover:bg-gray-700 rounded text-sm">
                      p
                    </button>
                    {/* etc */}
                  </div>
                )}
              </div>
            </div>

            {/* Iframe */}
            <div className="flex-1 relative">
              <iframe
                className="w-full max-h-screen"
                srcDoc={srcDoc}
                sandbox="allow-scripts allow-same-origin"
                title="preview"
              />
            </div>
          </div>

          {contextMenu.show && (
            <>
              <div className="fixed inset-0 z-40" />

              <div
                className="fixed z-50 bg-gray-900 text-white rounded shadow-lg"
                style={{
                  top: contextMenu.y,
                  left: contextMenu.x,
                }}
              >
                {getContextualMenuItems().map((item) => (
                  <button
                    key={item.label}
                    className="block px-4 py-2 hover:bg-gray-700 w-full text-left"
                    onClick={() => handleMenuAction(item)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
      </div>
    </div>
  );
}
