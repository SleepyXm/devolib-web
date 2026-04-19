import { useContext, useEffect, useState } from "react";
import { ProjectContext, ProjectMetaContext } from "@/app/dashboard/[project]/layout";
import { gen_tests } from "@/app/handlers/llm";

export type TestStatus = "idle" | "running" | "pass" | "fail" | "error";

export interface TestCase {
  id: string;
  name: string;
  endpoint: string;
  method: string;
  description: string;
  payload: any;
  status: TestStatus;
  output?: string;
}

export const useTestSuiteManager = (projectWS: any) => {
  const { endpoints } = useContext(ProjectMetaContext)!;
  const [tests, setTests] = useState<TestCase[]>([]);
  const [generating, setGenerating] = useState(false);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!projectWS) return;
    projectWS.onOutput((data: string) => {
      try {
        const msg = JSON.parse(data);
        if (msg.type !== "CURL") return;
        const passed = String(msg.status_code).startsWith("2");
        setTests(prev => prev.map(t =>
          t.id === msg.test_id
            ? { ...t, status: passed ? "pass" : "fail", output: `${msg.status_code} — ${msg.body}` }
            : t
        ));
      } catch {}
    });
  }, [projectWS]);

  const generateTests = async () => {
    if (!endpoints.length) return;
    setGenerating(true);
    setTests([]);
    try {
      const data = await gen_tests(endpoints);
      setTests(data.tests.map((t: any) => ({ ...t, status: "idle" as TestStatus })));
    } catch (e) {
      console.error(e);
    } finally {
      setGenerating(false);
    }
  };

  const runTests = () => {
    if (!tests.length || !projectWS) return;
    setRunning(true);
    setTests(prev => prev.map(t => ({ ...t, status: "running", output: undefined })));
    for (const test of tests) {
      projectWS.sendCommand(JSON.stringify({
        type: "CURL",
        test_id: test.id,
        method: test.method,
        path: test.endpoint,
        payload: test.payload ?? null,
      }));
    }
  };

  const allDone = tests.length > 0 && tests.every(t => t.status !== "idle" && t.status !== "running");

  useEffect(() => {
    if (allDone && running) setRunning(false);
  }, [allDone, running]);

  const summary = {
    pass: tests.filter(t => t.status === "pass").length,
    fail: tests.filter(t => t.status === "fail").length,
    error: tests.filter(t => t.status === "error").length,
    total: tests.length,
  };

  return { tests, generating, running, allDone, summary, generateTests, runTests };
};