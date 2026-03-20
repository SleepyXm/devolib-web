
import { useContext, useEffect, useState } from "react";
import { Table, Row, Column, mapType } from "./dbtypes";
import { DBCommand, DBCommandBuilder } from "./dboperations";
import {  ProjectMetaContext } from "../../[project]/layout";
import { gen_test_data } from "@/app/handlers/llm";

// Hook for managing tables and DB commands
export const useTableManager = (projectWS: any) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [tableCounter, setTableCounter] = useState(1);
  const { setDbSchema } = useContext(ProjectMetaContext)!;
  const [inserting, setInserting] = useState(false);
  

  const executeCommand = (command: DBCommand) => {
    console.log(`${command.operation}:`, command);
    projectWS?.sendCommand(JSON.stringify(command));
  };

  const loadSchema = (schemaData: any) => {
    const loadedTables = Object.entries(schemaData.tables).map(
      ([tableName, columns]: [string, any], idx) => ({
        id: idx + 1,
        name: tableName,
        columns: columns.map((col: any) => ({
          name: col.column,
          type: col.type.toUpperCase(),
          expanded: false,
          linkedTableId: col.foreignKey
          ? Object.entries(schemaData.tables).findIndex(([name]) => name === col.foreignKey.referencedTable) + 1
          : undefined
        })),
        rows: []
      })
    );
    setTables(loadedTables);
    setTableCounter(loadedTables.length + 1);
  };

  const tablesToSchema = (tables: Table[]) => {
  return tables.reduce((acc, table) => {
    acc[table.name] = table.columns.map(col => ({
      column: col.name,
      type: col.type,
      nullable: true
    }));
    return acc;
  }, {} as Record<string, { column: string; type: string; nullable: boolean }[]>);
  };

  useEffect(() => {
  if (!tables || tables.length === 0) return;
  setDbSchema(tablesToSchema(tables));
}, [tables]);



  const addTable = (name: string) => {
    const newTable: Table = { 
      id: tableCounter, 
      name: name, 
      columns: [], 
      rows: [] 
    };
    
    setTables(prev => [...prev, newTable]);
    setTableCounter(prev => prev + 1);
    
    executeCommand(DBCommandBuilder.build('CREATE_TABLE', newTable.name, []));
  };

  const deleteTable = (tableId: number) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    setTables(prev => prev
      .filter(t => t.id !== tableId)
      .map(t => ({
        ...t,
        columns: t.columns.map(c => 
          c.linkedTableId === tableId ? { ...c, linkedTableId: undefined } : c
        )
      }))
    );

    executeCommand(DBCommandBuilder.build('DROP_TABLE', table.name));
  };

  const addColumn = (tableId: number) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    const newCol: Column = { name: "new_column", type: "VARCHAR(255)", expanded: true, pending: true };
    
    setTables(prev => prev.map(t => 
      t.id === tableId ? { ...t, columns: [...t.columns, newCol] } : t
    ));

  };

  const confirmColumn = (tableId: number, colIdx: number, name: string) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    const col = table.columns[colIdx];
    if (!col?.pending) return;

    const confirmedCol = { ...col, name, pending: false };

    setTables(prev => prev.map(t =>
      t.id === tableId ? {
        ...t,
        columns: t.columns.map((c, i) => i === colIdx ? confirmedCol : c)
      } : t
    ));

    executeCommand(DBCommandBuilder.build('ALTER_TABLE', table.name, {
      action: 'ADD_COLUMN',
      column: confirmedCol
    }));
  };

  const deleteColumn = (tableId: number, colIdx: number) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    
    const colName = table.columns[colIdx]?.name;
    if (!colName) return;

    setTables(prev => prev.map(t => ({
      ...t,
      columns: t.id === tableId ? t.columns.filter((_, idx) => idx !== colIdx) : t.columns,
      rows: t.rows.map(r => {
        const { [colName]: _, ...rest } = r;
        return rest;
      })
    })).map(t => ({
      ...t,
      columns: t.columns.map(c => 
        c.linkedTableId === tableId ? { ...c, linkedTableId: undefined } : c
      )
    })));

    executeCommand(DBCommandBuilder.build('ALTER_TABLE', table.name, {
      action: 'DROP_COLUMN',
      column: colName
    }));
  };

  const updateColumn = (tableId: number, colIdx: number, updated: Partial<Column>) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    
    const oldColumn = table.columns[colIdx];
    
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        const updatedCols = t.columns.map((col, idx) => 
          idx === colIdx ? { ...col, ...updated } : col
        );
        return { ...t, columns: updatedCols };
      }
      return t;
    }));

    if (updated.name && updated.name !== oldColumn.name) {
      executeCommand(DBCommandBuilder.build('ALTER_TABLE', table.name, {
        action: 'RENAME_COLUMN',
        oldName: oldColumn.name,
        newName: updated.name
      }));
    }

    if (updated.type && updated.type !== oldColumn.type) {
    executeCommand(DBCommandBuilder.build('ALTER_TABLE', table.name, {
      action: 'CHANGE_COLUMN_TYPE',
      column: oldColumn.name,
      newType: updated.type
    }));
  }

  if (updated.linkedTableId !== undefined) {
    const linkedTable = tables.find(t => t.id === updated.linkedTableId);
    if (linkedTable) {
      executeCommand(DBCommandBuilder.build('ALTER_TABLE', table.name, {
        action: 'ADD_FOREIGN_KEY',
        column: oldColumn.name,
        columnType: 'INTEGER',
        referencedTable: linkedTable.name,
        referencedColumn: 'id'
      }));
    }
  }
};

  const toggleExpanded = (tableId: number, colIdx: number) => {
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        const updatedCols = t.columns.map((col, idx) => 
          idx === colIdx ? { ...col, expanded: !col.expanded } : col
        );
        return { ...t, columns: updatedCols };
      }
      return t;
    }));
  };

  const addRow = (tableId: number) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const newRow: Row = {};
    table.columns.forEach(col => { newRow[col.name] = ""; });

    setTables(prev => prev.map(t => 
      t.id === tableId ? { ...t, rows: [...t.rows, newRow] } : t
    ));

    executeCommand(DBCommandBuilder.build('INSERT', table.name, newRow));
  };

  const updateRowValue = (tableId: number, rowIdx: number, colName: string, value: any) => {
    setTables(prev => prev.map(t => {
      if (t.id === tableId) {
        const updatedRows = t.rows.map((row, idx) => 
          idx === rowIdx ? { ...row, [colName]: value } : row
        );
        return { ...t, rows: updatedRows };
      }
      return t;
    }));
  };

  const insertTestData = async (projectWS: any) => {
    setInserting(true);
    try {
      const schema = Object.fromEntries(tables.map(t => [t.name, t.columns.map(c => ({ column: c.name, type: c.type, nullable: true }))]));
      const result = await gen_test_data(schema);
      projectWS?.sendCommand(JSON.stringify(DBCommandBuilder.build("INSERT_TEST_DATA", "", undefined, result.sql)));
    } finally {
      setInserting(false);
    }
  };


  const fetchRows = (tableName: string) => {
    executeCommand(DBCommandBuilder.build('GET_ROWS', tableName));
  };

  const loadRows = (tableName: string, rows: Row[]) => {
    setTables(prev => prev.map(t => t.name === tableName ? { ...t, rows } : t));
  };

  return {
    tables,
    inserting,
    loadSchema,
    addTable,
    deleteTable,
    addColumn,
    deleteColumn,
    updateColumn,
    toggleExpanded,
    addRow,
    updateRowValue,
    insertTestData,
    fetchRows,
    loadRows,
    confirmColumn,
  };
};