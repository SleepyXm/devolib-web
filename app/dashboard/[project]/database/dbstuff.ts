import { Column, Row, Table } from "./dbtypes";

export type DBOperationType = 
  | 'CREATE_TABLE' 
  | 'DROP_TABLE'
  | 'ALTER_TABLE'
  | 'INSERT'
  | 'UPDATE'
  | 'DELETE';

export type DBCommand = {
  operation: DBOperationType;
  target: string;
  payload?: any;
  sql?: string;
};

export const DBCommandBuilder = {
  build: (operation: DBOperationType, target: string, payload?: any): DBCommand => {
    return {
      operation,
      target,
      payload,
      sql: DBCommandBuilder.generateSQL(operation, target, payload)
    };
  },

  generateSQL: (operation: DBOperationType, target: string, payload?: any): string => {
    switch (operation) {
      case 'CREATE_TABLE':
        return DBCommandBuilder.createTable(target, payload);
      
      case 'DROP_TABLE':
        return `DROP TABLE IF EXISTS ${target}`;
      
      case 'ALTER_TABLE':
        return DBCommandBuilder.alterTable(target, payload);
      
      case 'INSERT':
        return DBCommandBuilder.insert(target, payload);
      
      case 'UPDATE':
        return DBCommandBuilder.update(target, payload);
      
      case 'DELETE':
        return `DELETE FROM ${target} WHERE id = $1`;
      
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  },

  createTable: (tableName: string, columns: Column[]): string => {
    if (!columns || columns.length === 0) {
      return `CREATE TABLE ${tableName} (id SERIAL PRIMARY KEY)`;
    }

    const columnDefs = columns.map(col => {
      let def = `${col.name} `;
      
      switch (col.type.toUpperCase()) {
        case 'STRING':
        case 'VARCHAR': def += 'VARCHAR(255)'; break;
        case 'TEXT': def += 'TEXT'; break;
        case 'NUMBER':
        case 'INT': def += 'INTEGER'; break;
        case 'BOOLEAN': def += 'BOOLEAN'; break;
        case 'DATE':
        case 'TIMESTAMPTZ': def += 'TIMESTAMPTZ'; break;
        case 'UUID': def += 'UUID'; break;
        default: def += 'TEXT';
      }
      
      if (col.linkedTableId) {
        def += ` REFERENCES Table_${col.linkedTableId}(id)`;
      }
      
      return def;
    }).join(', ');

    return `CREATE TABLE ${tableName} (id SERIAL PRIMARY KEY, ${columnDefs})`;
  },

  alterTable: (tableName: string, payload: any): string => {
    const { action, column, oldName, newName } = payload;
    
    switch (action) {
      case 'ADD_COLUMN':
        let def = `${column.name} `;
        switch (column.type.toUpperCase()) {
          case 'STRING':
          case 'VARCHAR': def += 'VARCHAR(255)'; break;
          case 'TEXT': def += 'TEXT'; break;
          case 'NUMBER':
          case 'INT': def += 'INTEGER'; break;
          case 'BOOLEAN': def += 'BOOLEAN'; break;
          case 'DATE':
          case 'TIMESTAMPTZ': def += 'TIMESTAMPTZ'; break;
          case 'UUID': def += 'UUID'; break;
          default: def += 'TEXT';
        }
        return `ALTER TABLE ${tableName} ADD COLUMN ${def}`;
      
      case 'DROP_COLUMN':
        return `ALTER TABLE ${tableName} DROP COLUMN ${column}`;
      
      case 'RENAME_COLUMN':
        return `ALTER TABLE ${tableName} RENAME COLUMN ${oldName} TO ${newName}`;
      
      default:
        throw new Error(`Unknown ALTER action: ${action}`);
    }
  },

  insert: (tableName: string, data: Record<string, any>): string => {
    const columns = Object.keys(data);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${placeholders})`;
  },

  update: (tableName: string, payload: { id: number; updates: Record<string, any> }): string => {
    const keys = Object.keys(payload.updates);
    const setClauses = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');
    return `UPDATE ${tableName} SET ${setClauses} WHERE id = $${keys.length + 1}`;
  }
};