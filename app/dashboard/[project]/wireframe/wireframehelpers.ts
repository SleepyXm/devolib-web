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