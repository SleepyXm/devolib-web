export function patchRoutes(content: string, name: string, path: string): string {
  const lastImport = content.lastIndexOf("import ");
  const afterImport = content.indexOf("\n", lastImport) + 1;

  return (
    content.slice(0, afterImport) +
    `import ${name} from './${name}.jsx'\n` +
    content.slice(afterImport)
  ).replace(
    "</Routes>",
    `  <Route path="/${path}" element={<${name} />} />\n</Routes>`,
  );
}

export function patchRoutesNested(
  content: string,
  name: string,
  path: string,
  parentName: string,
  parentPath: string,
): string {
  // Step 1: insert import
  const lastImport = content.lastIndexOf("import ");
  const afterImport = content.indexOf("\n", lastImport) + 1;

  const withImport =
    content.slice(0, afterImport) +
    `import ${name} from './${name}.jsx'\n` +
    content.slice(afterImport);

  // Step 2: find the parent route and inject inside it
  // Looks for:   <Route path="/parentPath" element={<ParentName />} />
  // and converts it to a wrapping block with the child inside
  const selfClosingParent = new RegExp(
    `(\\s*)<Route path="\\/${parentPath}" element=\\{<${parentName}[^/]*\\/\\>\\}\\s*\\/>`
  );

  if (selfClosingParent.test(withImport)) {
    // Parent is self-closing (<Route ... />) — convert it to a wrapping block
    return withImport.replace(
      selfClosingParent,
      `$1<Route path="/${parentPath}" element={<${parentName} />}>\n$1  <Route path="${path}" element={<${name} />} />\n$1</Route>`,
    );
  }

  // Parent is already a wrapping block (<Route ...> ... </Route>) — inject before closing tag
  const openParent = new RegExp(
    `(<Route path="\\/${parentPath}" element=\\{<${parentName}[^>]*>)([\\s\\S]*?)(</Route>)`
  );

  return withImport.replace(
    openParent,
    `$1$2  <Route path="${path}" element={<${name} />} />\n$3`,
  );
}



export function patchMainPy(content: string, name: string): string {
  const routerName = name.toLowerCase();
  const importLine = `from routers.${routerName} import router as ${routerName}_router`;
  const includeLine = `app.include_router(${routerName}_router)`;

  if (!content.includes("# -- ROUTER IMPORTS --") || !content.includes("# -- ROUTERS --")) {
    throw new Error("main.py is missing router sentinels");
  }

  return content
    .replace("# -- ROUTER IMPORTS -- #", `# -- ROUTER IMPORTS -- #\n${importLine}`)
    .replace("# -- ROUTERS -- #", `# -- ROUTERS -- #\n${includeLine}`);
}



export function generateRouter(name: string): string {
  const routerName = name.toLowerCase();
  return `from fastapi import APIRouter
from sqlalchemy import text

router = APIRouter(prefix="/api/${routerName}", tags=["${routerName}"])

@router.get("/")
async def ${routerName}_index():
    return {"message": "Hello from ${routerName}!"}
`;
}