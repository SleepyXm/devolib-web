import { PythonShapes } from "./backendshapes";

export type RoutePayload = {
  route: {
    method: string;
    path: string;
  };
  definition: {
    name: string;
    auth: "required" | "optional" | "none";
    inputs: ("path_param" | "query_param" | "body" | "none")[];
  };
  query: {
    operation: "fetch_one" | "fetch_all" | "execute" | "none";
    table: string;
    columns: string[];
    condition?: string;
  };
  response: {
    type: "single" | "list" | "message";
    key: string;
  };
};


export function resolveRoute(payload: RoutePayload): string {
  const lines: string[] = [];
  const indent = "    ";

  // 1. Decorator
  lines.push(
    PythonShapes.router.decorator
      .replace("{method}", payload.route.method.toLowerCase())
      .replace("{path}", `"${payload.route.path}"`)
  );

  // 2. Function definition
  const inputs: string[] = [];
  if (payload.definition.inputs.includes("path_param")) {
    inputs.push(`${payload.query.condition ?? "id"}: int`);
  }
  if (payload.definition.inputs.includes("body")) {
    inputs.push(`body: dict`);
  }
  if (payload.definition.inputs.includes("query_param")) {
    inputs.push(`q: str = ""`);
  }
  if (payload.definition.auth === "required") {
    inputs.push(PythonShapes.router.auth_dependency);
  }
  lines.push(
    PythonShapes.router.definition
      .replace("{name}", payload.definition.name)
      .replace("{inputs}", inputs.join(", "))
  );

  // 3. DB operation
  if (payload.query.operation !== "none") {
    const cols = payload.query.columns.join(", ");
    const condition = payload.query.condition
      ? `WHERE ${payload.query.condition} = :${payload.query.condition}`
      : "";

    const sqlMap = {
      fetch_one: `SELECT ${cols} FROM ${payload.query.table} ${condition}`.trim(),
      fetch_all: `SELECT ${cols} FROM ${payload.query.table}`.trim(),
      execute: `INSERT INTO ${payload.query.table} (${cols}) VALUES (${payload.query.columns.map(c => `:${c}`).join(", ")})`,
    };

    const sql = sqlMap[payload.query.operation];
    const values = `{${payload.query.columns.map(c => `"${c}": ${c}`).join(", ")}}`;

    const dbLine = PythonShapes.db[payload.query.operation]
      .replace("{sql}", sql)
      .replace("{values}", values);

    lines.push(`${indent}result = ${dbLine}`);
  }

  // 4. Response
  const responseLine = {
    single: PythonShapes.response.single
      .replace("{key}", payload.response.key)
      .replace("{value}", "result"),
    list: PythonShapes.response.list
      .replace("{key}", payload.response.key)
      .replace("{value}", "result"),
    message: PythonShapes.response.message
      .replace("{value}", "Success"),
  }[payload.response.type];

  lines.push(`${indent}${responseLine}`);

  return lines.join("\n");
}


export function resolveSnippetToPlain(snippet: string) {
  const placeholders: { tabStop: number; options: string[]; line: number; col: number; end: number; type: "dropdown" | "text" }[] = [];
  
  let text = snippet;
  let offset = 0;

  const regex = /\$\{(\d+)\|([^}]+)\}|\$\{(\d+):([^}]+)\}/g;
  const matches = [...snippet.matchAll(regex)];

  for (const match of matches) {
    const tabStop = parseInt(match[1] ?? match[3]);
    const options = match[2] ? match[2].split(",") : [match[4]];
    const defaultValue = options[0];

    const before = text.slice(0, (match.index ?? 0) - offset);
    const lines = before.split("\n");
    const line = lines.length - 1;
    const col = lines[lines.length - 1].length;

    placeholders.push({ 
      tabStop, 
      options, 
      line,
      col,
      end: col + defaultValue.length,
      type: options.length > 1 ? "dropdown" : "text"
    });

    text = text.slice(0, (match.index ?? 0) - offset) + defaultValue + text.slice((match.index ?? 0) + match[0].length - offset);
    offset += match[0].length - defaultValue.length;
  }

  return { text, placeholders };
}



export function activatePlaceholder(
  ed: any,
  placeholders: { tabStop: number; options: string[]; line: number; col: number; end: number; type: "dropdown" | "text" }[],
  index: number,
  insertPosition: { lineNumber: number; column: number }
) {
  if (index >= placeholders.length) return;

  const placeholder = placeholders[index];

  const absLine = insertPosition.lineNumber + placeholder.line;
  const absCol = placeholder.line === 0
    ? insertPosition.column + placeholder.col
    : placeholder.col + 1;
  const absEnd = placeholder.line === 0
    ? insertPosition.column + placeholder.end
    : placeholder.end + 1;

  const startPos = { lineNumber: absLine, column: absCol };
  const endPos = { lineNumber: absLine, column: absEnd };

  ed.setSelection({
    startLineNumber: startPos.lineNumber,
    startColumn: startPos.column,
    endLineNumber: endPos.lineNumber,
    endColumn: endPos.column,
  });

  const domNode = document.createElement("div");
  domNode.className = "bg-gray-900 border border-gray-700 rounded shadow-lg z-50";

  const applyValue = (value: string) => {
    ed.executeEdits("", [{
      range: {
        startLineNumber: startPos.lineNumber,
        startColumn: startPos.column,
        endLineNumber: endPos.lineNumber,
        endColumn: endPos.column,
      },
      text: value,
    }]);

    const diff = value.length - (placeholder.end - placeholder.col);
    const adjusted = placeholders.map((p, pi) =>
      pi > index ? { 
        ...p, 
        col: p.line === placeholder.line ? p.col + diff : p.col, 
        end: p.line === placeholder.line ? p.end + diff : p.end 
      } : p
    );

    widget.dispose();
    activatePlaceholder(ed, adjusted, index + 1, insertPosition);
  };

  if (placeholder.type === "text") {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = placeholder.options[0];
    input.className = "bg-gray-800 text-white px-2 py-1 text-sm rounded border border-gray-600 outline-none w-40";
    input.onkeydown = (e) => {
      if (e.key === "Enter") {
        applyValue(input.value || placeholder.options[0]);
      }
      if (e.key === "Escape") {
        widget.dispose();
      }
    };
    domNode.appendChild(input);
    setTimeout(() => input.focus(), 50);
  } else {
    placeholder.options.forEach((option) => {
      const item = document.createElement("div");
      item.textContent = option;
      item.className = "px-3 py-1 text-sm text-white hover:bg-gray-700 cursor-pointer";
      item.onclick = () => applyValue(option);
      domNode.appendChild(item);
    });
  }

  const widget = {
    getId: () => `placeholder-widget-${index}`,
    getDomNode: () => domNode,
    getPosition: () => ({
      position: { lineNumber: startPos.lineNumber, column: startPos.column },
      preference: [1, 2],
    }),
    dispose: () => ed.removeContentWidget(widget),
  };

  ed.addContentWidget(widget);
}