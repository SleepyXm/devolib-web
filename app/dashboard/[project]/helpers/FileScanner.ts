import { useMemo } from "react";

export type Endpoint = {
  method: string;
  path: string;
  file: string;
};

export type Page = {
    route: string;
    file: string;
}

export const WORKSPACE_PATHS = {
  backend: (projectName: string) => `/app/workspace/backend/${projectName}/main.py`,
  frontend: (projectName: string) => `/app/workspace/frontend/${projectName}/src/Routes.jsx`,
} as const;

const FRAMEWORK_PATTERNS: Record<string, RegExp> = {
  fastapi: /@\w+\.(get|post|put|delete|patch)\(["']([^"']+)["']/gi,
  flask: /@\w+\.route\(["']([^"']+)["'](?:.*?methods=\[["']([^"']+)["']\])?/gi,
  express: /\w+\.(get|post|put|delete|patch)\(["']([^"']+)["']/gi,
  nest: /@(Get|Post|Put|Delete|Patch)\(["']([^"']+)["']\)/gi,
};

const PAGE_PATTERNS: Record<string, RegExp> = {
  react_router: /<Route\s+path=["']([^"']+)["']/gi,
  next: /pages\/([^"'\s]+)\.(jsx?|tsx?)$/gm,
};

export const useEndpointScanner = (
  fileContent: string,
  framework: string,
  fileName: string
): Endpoint[] => {
  return useMemo(() => {
    if (!fileContent || !framework) return [];

    const pattern = FRAMEWORK_PATTERNS[framework];
    if (!pattern) return [];

    const results: Endpoint[] = [];
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;

    while ((match = regex.exec(fileContent)) !== null) {
      results.push({
        method: match[1].toUpperCase(),
        path: match[2],
        file: fileName,
      });
    }

    return results;
  }, [fileContent, framework, fileName]);
};


export const usePageScanner = (
  fileContent: string,
  framework: string,
  fileName: string
): Page[] => {
  return useMemo(() => {
    if (!fileContent || !framework) return [];

    const pattern = PAGE_PATTERNS[framework];
    if (!pattern) return [];

    const results: Page[] = [];
    const regex = new RegExp(pattern.source, pattern.flags);
    let match;

    while ((match = regex.exec(fileContent)) !== null) {
      results.push({
        route: match[1],
        file: fileName,
      });
    }

    return results;
  }, [fileContent, framework, fileName]);
};