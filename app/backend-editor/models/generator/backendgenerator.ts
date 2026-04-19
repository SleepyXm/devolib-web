
export function generateRouteSnippet(db_schema: Record<string, {column: string, type: string}[]>): string {
  const tables = Object.keys(db_schema)
  const tableOptions = tables.join(",")
  
  // flatten all columns across all tables for now, will be dynamic later
  const allColumns = [...new Set(
    Object.values(db_schema).flatMap(cols => cols.map(c => c.column))
  )].join(",")

  return [
  `@app.\${1|get,post,put,delete,patch}("\${2:/path}")`,
  `async def \${3:function_name}():`,
  `    async with engine.connect() as conn:`,
  `        result = await conn.execute(text("\${5|SELECT * FROM,INSERT INTO,UPDATE,DELETE FROM} \${6|${tableOptions}}"))`,
  `        \${7|rows = result.mappings().all(),row = result.mappings().first()}`,
  `    return \${8|rows,row,{"message": "Success"}`,
].join("\n");
}