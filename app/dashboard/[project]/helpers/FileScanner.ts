import { useMemo } from "react";

export type Endpoint = {
  method: string;
  path: string;
  file: string;
};

const FRAMEWORK_PATTERNS: Record<string, RegExp> = {
  fastapi: /@\w+\.(get|post|put|delete|patch)\(["']([^"']+)["']/gi,
  flask: /@\w+\.route\(["']([^"']+)["'](?:.*?methods=\[["']([^"']+)["']\])?/gi,
  express: /\w+\.(get|post|put|delete|patch)\(["']([^"']+)["']/gi,
  nest: /@(Get|Post|Put|Delete|Patch)\(["']([^"']+)["']\)/gi,
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