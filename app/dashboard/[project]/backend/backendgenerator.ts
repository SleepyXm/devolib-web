export function generateRouteSnippet(db_schema: Record<string, {column: string, type: string}[]>): string {
  const tables = Object.keys(db_schema)
  const tableOptions = tables.join(",")
  
  // flatten all columns across all tables for now, will be dynamic later
  const allColumns = [...new Set(
    Object.values(db_schema).flatMap(cols => cols.map(c => c.column))
  )].join(",")

  return [
    `@app.\${1|GET,POST,PUT,DELETE,PATCH|}("\${2:/path}")`,
    `async def \${3:function_name}(\${4|body: dict,id: int,q: str|}${', current_user: dict = Depends(get_current_user)'}):`,
    `    result = await database.\${5|fetch_one,fetch_all,execute|}(`,
    `        query="\${6|SELECT,INSERT INTO,UPDATE,DELETE FROM|} \${7|${tableOptions}|}",`,
    `        values={\${8:values}}`,
    `    )`,
    `    return {"\${9:key}": \${10|result,"Success"|}}`
  ].join("\n")
}