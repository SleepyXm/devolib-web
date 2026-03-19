export const BackendBase = {
  routes: ["GET", "POST", "PUT", "DELETE", "PATCH"],

  definition: {
    auth: ["required", "optional", "none"],
    inputs: ["path_param", "query_param", "body", "none"],
  },

  db_operations: ["fetch_one", "fetch_all", "execute", "none"],

  logic_operations: ["validation", "transform", "check", "ext-call", "computation"],

  response: ["single", "list", "message", "none"],

  query: {
    table: "" as string,
    columns: [] as string[],
    condition: "" as string,
  },

  variables: {
    source: ["body", "path_param", "query_param", "db_result"],
    type: ["string", "int", "bool", "object", "list"],
  },

  sequence: ["validate", "allocate", "db_operation", "logic", "return"],
};



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

export type Placeholder = {
  tabStop: number;
  options: string[];
  line: number;
  col: number;
  end: number;
  type: "dropdown" | "text";
};