export const PythonShapes = {
  router: {
    decorator: "@router.{method}({path})",
    definition: "async def {name}({inputs}):",
    auth_dependency: "current_user: dict = Depends(get_current_user)",
    body_input: "{name}: {Model} = Body(...)",
    path_input: "{name}: {type}",
  },

  db: {
    fetch_one: 'await database.fetch_one(query="{sql}", values={values})',
    fetch_all: 'await database.fetch_all(query="{sql}", values={values})',
    execute: 'await database.execute(query="{sql}", values={values})',
  },

  response: {
    single: 'return {"{key}": {value}}',
    list: 'return {"{key}": list({value})}',
    message: 'return {"message": "{value}"}',
  },

  error: "raise HTTPException(status_code={code}, detail={detail})",
};
