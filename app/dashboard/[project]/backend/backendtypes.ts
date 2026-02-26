export const BackendBase = {
  routes: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  
  definition: {
    auth: ["required", "optional", "none"],
    inputs: ["path_param", "query_param", "body", "none"],
  },

  db_operations: ["fetch_one", "fetch_all", "execute", "none"],

  logic_operations: ["validation", "transform", "check", "ext-call", "computation"],

  response: ["single", "list", "message", "none"],
};

type table = string

const query: { table: table; columns: string[]; condition: string } = {
  table: "",
  columns: [],
  condition: "",
}