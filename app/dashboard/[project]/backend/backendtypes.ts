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