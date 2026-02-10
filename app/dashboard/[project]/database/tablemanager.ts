
import { useState } from "react";
import { Table, Row, Column } from "./dbtypes";
import { DBCommand, DBCommandBuilder } from "./dbstuff";

// Hook for managing tables and DB commands
export const useTableManager = (projectWS: any) => {
  const [tables, setTables] = useState<Table[]>([]);
  const [tableCounter, setTableCounter] = useState(1);

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
          expanded: false
        })),
        rows: []
      })
    );
    
    setTables(loadedTables);
    setTableCounter(loadedTables.length + 1);
  };

  const addTable = () => {
    const newTable: Table = { 
      id: tableCounter, 
      name: `Table_${tableCounter}`, 
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
    
    const newCol: Column = { name: "new_column", type: "STRING", expanded: true };
    
    setTables(prev => prev.map(t => 
      t.id === tableId ? { ...t, columns: [...t.columns, newCol] } : t
    ));
    
    executeCommand(DBCommandBuilder.build('ALTER_TABLE', table.name, {
      action: 'ADD_COLUMN',
      column: newCol
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

  return {
    tables,
    loadSchema,
    addTable,
    deleteTable,
    addColumn,
    deleteColumn,
    updateColumn,
    toggleExpanded,
    addRow,
    updateRowValue
  };
};