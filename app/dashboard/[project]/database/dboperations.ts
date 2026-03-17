import { Column, Row, Table, mapType } from "./dbtypes";

export type DBOperationType =
  | "CREATE_TABLE"
  | "DROP_TABLE"
  | "ALTER_TABLE"
  | "INSERT"
  | "UPDATE"
  | "DELETE"
  | "GET_SCHEMA"
  | "PUSH_SCHEMA"
  | "INSERT_TEST_DATA";

export type DBCommand = {
  operation: DBOperationType;
  target: string;
  payload?: any;
  sql?: string;
};

export const DBCommandBuilder = {
  build: (
    operation: DBOperationType,
    target: string,
    payload?: any,
    sql?: string
  ): DBCommand => {
    return {
      operation,
      target,
      payload,
      sql: sql ?? DBCommandBuilder.generateSQL(operation, target, payload),
    };
  },

  generateSQL: (
    operation: DBOperationType,
    target: string,
    payload?: any,
  ): string => {
    switch (operation) {
      case "GET_SCHEMA":
        return "";
      case "PUSH_SCHEMA":
        return "";
      case "INSERT_TEST_DATA":
        return "";


      case "CREATE_TABLE":
        return DBCommandBuilder.createTable(target, payload);

      case "DROP_TABLE":
        return `DROP TABLE IF EXISTS ${target}`;

      case "ALTER_TABLE":
        return DBCommandBuilder.alterTable(target, payload);

      case "INSERT":
        return DBCommandBuilder.insert(target, payload);

      case "UPDATE":
        return DBCommandBuilder.update(target, payload);

      case "DELETE":
        return `DELETE FROM ${target} WHERE id = $1`;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },

  createTable: (tableName: string, columns: Column[]): string => {
    if (!columns || columns.length === 0) {
      return `CREATE TABLE IF NOT EXISTS ${tableName} (id SERIAL PRIMARY KEY)`;
    }

    const columnDefs = columns
      .map((col) => {
        let def = `${col.name} ${mapType(col.type)}`;
        if (col.linkedTableId) {
          def += ` REFERENCES Table_${col.linkedTableId}(id)`;
        }
        return def;
      })
      .join(", ");

    return `CREATE TABLE IF NOT EXISTS ${tableName} (id SERIAL PRIMARY KEY, ${columnDefs})`;
  },

  alterTable: (tableName: string, payload: any): string => {
    const { action, column, oldName, newName } = payload;

    switch (action) {
      case "ADD_COLUMN":
        return `ALTER TABLE ${tableName} ADD COLUMN ${column.name} ${mapType(column.type)}`;

      case "DROP_COLUMN":
        return `ALTER TABLE ${tableName} DROP COLUMN ${column}`;

      case "RENAME_COLUMN":
        return `ALTER TABLE ${tableName} RENAME COLUMN ${oldName} TO ${newName}`;

      case "CHANGE_COLUMN_TYPE":
        return `ALTER TABLE ${tableName} ALTER COLUMN ${payload.column} TYPE ${mapType(payload.newType)} USING ${payload.column}::${mapType(payload.newType)}`;

      default:
        throw new Error(`Unknown ALTER action: ${action}`);
    }
  },

  insert: (tableName: string, data: Record<string, any>): string => {
    const columns = Object.keys(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(", ");
    return `INSERT INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;
  },

  update: (
    tableName: string,
    payload: { id: number; updates: Record<string, any> },
  ): string => {
    const keys = Object.keys(payload.updates);
    const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(", ");
    return `UPDATE ${tableName} SET ${setClauses} WHERE id = $${keys.length + 1}`;
  },
};
