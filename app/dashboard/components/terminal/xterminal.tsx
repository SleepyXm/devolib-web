"use client";

import { useContext, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { ProjectContext } from "../../[project]/layout";
import { Terminal as XTerm } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { TerminalControls } from "./terminalcomponents";

export default function Terminal2() {
  const ctx = useContext(ProjectContext);
  const params = useParams();
  const projectId = Array.isArray(params?.project) ? params.project[0] : params?.project;
  const termRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<XTerm | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const inputBufferRef = useRef("");
  const observerRef = useRef<ResizeObserver | null>(null);

  if (!ctx) return <div>Project context not found</div>;

  const { isConnected, isRunning, start, connect, stop, projectWS, setProjectId } = ctx;

  useEffect(() => {
    if (projectId) setProjectId(projectId);
  }, [projectId, setProjectId]);

  // init xterm once
  useEffect(() => {
    if (!termRef.current) return;
    if (xtermRef.current) return;

    const term = new XTerm({
    fontFamily: "monospace",
    fontSize: 13,
    theme: {
      background: "#0e1018",
      foreground: "#c8cdd8",
      cursor: "#50c878",
      green: "#50c878",
      red: "#c85050",
      blue: "#5070c8",
    },
    cursorBlink: true,
    convertEol: true,
  });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.open(termRef.current);
    fitAddon.fit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    observerRef.current = new ResizeObserver(() => fitAddonRef.current?.fit());
    observerRef.current.observe(termRef.current);

    return () => {
        observerRef.current?.disconnect();
        observerRef.current = null;
        term.dispose();
        xtermRef.current = null;
        fitAddonRef.current = null;
    };
    }, 
[]);

  // wire websocket to xterm when projectWS changes
  useEffect(() => {
    if (!projectWS || !xtermRef.current) return;

    const term = xtermRef.current;

    // receive output from server
    projectWS.onOutput((data: string) => {
      if (data.startsWith("FILE_CONTENT:")) return;
      term.write(data);
    });

    // handle keyboard input locally, send on Enter
    const dataDisposable = term.onData((data: string) => {
      const code = data.charCodeAt(0);

      if (code === 13) { // Enter
        const cmd = inputBufferRef.current;
        term.write("\r\n");
        if (cmd.trim()) {
          projectWS.sendCommand(cmd);
        }
        inputBufferRef.current = "";
      } else if (code === 127) { // Backspace
        if (inputBufferRef.current.length > 0) {
          inputBufferRef.current = inputBufferRef.current.slice(0, -1);
          term.write("\b \b");
        }
      } else if (code === 3) { // Ctrl+C
        inputBufferRef.current = "";
        term.write("^C\r\n");
      } else if (code === 27) { // Escape sequences (arrow keys etc) — ignore for now
        return;
      } else {
        inputBufferRef.current += data;
        term.write(data);
      }
    });

    return () => {
      dataDisposable.dispose();
      inputBufferRef.current = "";
    };
  }, [projectWS]);

  return (
    <div className="flex flex-col h-full p-4 gap-3 font-mono">
      <TerminalControls start={start} connect={connect} stop={stop} isRunning={isRunning} isConnected={isConnected} />
      <div ref={termRef} className="flex-1 rounded-md overflow-hidden" style={{ border: "1px solid #1e2228" }} />
    </div>
  );
}