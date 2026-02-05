import { Column, Row, Table } from "./dbtypes";

export type DBOperationType = 
  | 'create_table' 
  | 'alter_table_add_column'
  | 'alter_table_drop_column'
  | 'alter_table_rename_column'
  | 'drop_table'
  | 'insert_row'
  | 'update_row'
  | 'delete_row';

export type DBCommand = {
  operation: DBOperationType;
  sql: string;
  params?: any;
};


export const DBCommandBuilder = {
  createTable: (tableName: string, columns: Column[]): DBCommand => {
    const columnDefs = columns.map(col => {
      let def = `${col.name} `;
      
      // Map your types to SQL types
      switch (col.type) {
        case 'string': def += 'VARCHAR(255)'; break;
        case 'number': def += 'INTEGER'; break;
        case 'boolean': def += 'BOOLEAN'; break;
        case 'date': def += 'TIMESTAMP'; break;
        default: def += 'TEXT';
      }
      
      // Add foreign key if linked
      if (col.linkedTableId) {
        const linkedTable = `Table_${col.linkedTableId}`; // adjust based on your naming
        def += `, FOREIGN KEY (${col.name}) REFERENCES ${linkedTable}(id)`;
      }
      
      return def;
    }).join(', ');

    return {
      operation: 'create_table',
      sql: `CREATE TABLE ${tableName} (id SERIAL PRIMARY KEY, ${columnDefs})`
    };
  },

  dropTable: (tableName: string): DBCommand => ({
    operation: 'drop_table',
    sql: `DROP TABLE IF EXISTS ${tableName}`
  }),

  addColumn: (tableName: string, column: Column): DBCommand => {
    let columnDef = `${column.name} `;
    
    switch (column.type) {
      case 'string': columnDef += 'VARCHAR(255)'; break;
      case 'number': columnDef += 'INTEGER'; break;
      case 'boolean': columnDef += 'BOOLEAN'; break;
      case 'date': columnDef += 'TIMESTAMP'; break;
      default: columnDef += 'TEXT';
    }

    return {
      operation: 'alter_table_add_column',
      sql: `ALTER TABLE ${tableName} ADD COLUMN ${columnDef}`
    };
  },

  dropColumn: (tableName: string, columnName: string): DBCommand => ({
    operation: 'alter_table_drop_column',
    sql: `ALTER TABLE ${tableName} DROP COLUMN ${columnName}`
  }),

  renameColumn: (tableName: string, oldName: string, newName: string): DBCommand => ({
    operation: 'alter_table_rename_column',
    sql: `ALTER TABLE ${tableName} RENAME COLUMN ${oldName} TO ${newName}`
  }),

  insertRow: (tableName: string, row: Row, columns: Column[]): DBCommand => {
    const cols = columns.map(c => c.name).join(', ');
    const values = columns.map(c => row[c.name] || null);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    return {
      operation: 'insert_row',
      sql: `INSERT INTO ${tableName} (${cols}) VALUES (${placeholders})`,
      params: values
    };
  },

  updateRow: (tableName: string, rowId: number, updates: Partial<Row>): DBCommand => {
    const setClauses = Object.keys(updates)
      .map((key, i) => `${key} = $${i + 1}`)
      .join(', ');
    
    return {
      operation: 'update_row',
      sql: `UPDATE ${tableName} SET ${setClauses} WHERE id = $${Object.keys(updates).length + 1}`,
      params: [...Object.values(updates), rowId]
    };
  },

  deleteRow: (tableName: string, rowId: number): DBCommand => ({
    operation: 'delete_row',
    sql: `DELETE FROM ${tableName} WHERE id = $1`,
    params: [rowId]
  })
};