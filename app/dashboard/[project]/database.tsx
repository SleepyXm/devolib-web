"use client";

import { useState, useContext, useEffect } from "react";
import { Column, Row, Table } from "@/app/types/dbtypes";
import { DBCommandBuilder, DBCommand } from "@/app/types/dbstuff";
import { ProjectContext } from "../[project]/layout";



const COLUMN_TYPES = ["STRING", "TEXT", "VARCHAR", "NUMBER", "BOOLEAN", "DATE", "UUID", "INT", "TIMESTAMPTZ"];

export default function DatabasePage() {
  const [tables, setTables] = useState<Table[]>([]);

  const [tableCounter, setTableCounter] = useState(1);
  const [commandQueue, setCommandQueue] = useState<DBCommand[]>([]);
  const { projectWS } = useContext(ProjectContext)!;

  useEffect(() => {
    if (!projectWS) return;
    
    projectWS.onSchema((data) => {
      console.log('Received schema:', data);
      
      const loadedTables = Object.entries(data.tables).map(([tableName, columns]: [string, any], idx) => ({
        id: idx + 1,
        name: tableName,
        columns: columns.map((col: any) => ({
          name: col.column,
          type: col.type.toUpperCase(),
          expanded: false
        })),
        rows: []
      }));
      
      setTables(loadedTables);
      setTableCounter(loadedTables.length + 1);
    });
  }, [projectWS]);
  
  const addTable = () => {
    const newTable: Table = { 
      id: tableCounter, 
      name: `Table_${tableCounter}`, 
      columns: [], 
      rows: [] 
    };
    
    setTables([...tables, newTable]);
    setTableCounter(tableCounter + 1);
    
    // Build command (ready for WS later)
    const command = DBCommandBuilder.createTable(newTable.name, newTable.columns);
    setCommandQueue([...commandQueue, command]);
    console.log('CREATE TABLE command:', command);
  };
  
  
  const deleteTable = (tableId: number) => {
    setTables(tables
      .filter(t => t.id !== tableId)
      .map(t => ({
        ...t,
        columns: t.columns.map(c => c.linkedTableId === tableId ? { ...c, linkedTableId: undefined } : c)
      }))
    );
  };

  const addColumn = (tableId: number) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    
    const newCol: Column = { name: "new_column", type: "string", expanded: true };
    setTables(tables.map(t => 
      t.id === tableId ? { ...t, columns: [...t.columns, newCol] } : t
    ));
    
    const command = DBCommandBuilder.addColumn(table.name, newCol);
    setCommandQueue([...commandQueue, command]);
    console.log('ADD COLUMN command:', command);
  };
  
  const deleteColumn = (tableId: number, colIdx: number) => {
    const colName = tables.find(t => t.id === tableId)?.columns[colIdx]?.name;
    setTables(tables.map(t => ({
      ...t,
      columns: t.id === tableId ? t.columns.filter((_, idx) => idx !== colIdx) : t.columns,
      rows: t.rows.map(r => {
        if (!colName) return r;
        const { [colName]: _, ...rest } = r;
        return rest;
      })
    })).map(t => ({
      ...t,
      columns: t.columns.map(c => c.linkedTableId && c.linkedTableId === tableId ? { ...c, linkedTableId: undefined } : c)
    })));
  };

  const updateColumn = (tableId: number, colIdx: number, updated: Partial<Column>) => {
    setTables(tables.map(t => {
      if (t.id === tableId) {
        const updatedCols = t.columns.map((col, idx) => idx === colIdx ? { ...col, ...updated } : col);
        return { ...t, columns: updatedCols };
      }
      return t;
    }));
  };

  const toggleExpanded = (tableId: number, colIdx: number) => {
    setTables(tables.map(t => {
      if (t.id === tableId) {
        const updatedCols = t.columns.map((col, idx) => idx === colIdx ? { ...col, expanded: !col.expanded } : col);
        return { ...t, columns: updatedCols };
      }
      return t;
    }));
  };

  const addRow = (tableId: number) => {
    setTables(tables.map(t => {
      if (t.id === tableId) {
        const newRow: Row = {};
        t.columns.forEach(col => {
          newRow[col.name] = "";
        });
        return { ...t, rows: [...t.rows, newRow] };
      }
      return t;
    }));
  };

  const updateRowValue = (tableId: number, rowIdx: number, colName: string, value: any) => {
    setTables(tables.map(t => {
      if (t.id === tableId) {
        const updatedRows = t.rows.map((row, idx) => idx === rowIdx ? { ...row, [colName]: value } : row);
        return { ...t, rows: updatedRows };
      }
      return t;
    }));
  };

  return (
    <div className="p-6 space-y-4 w-[60vw]">
      <h2 className="text-xl text-black font-bold">Database Project Page</h2>
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        onClick={addTable}
      >
        Add New Table
      </button>

      {tables.map(table => (
        <div key={table.id} className="border p-4 rounded space-y-2 relative">
          <div className="flex justify-between items-center text-black">
            <h3 className="font-semibold">{table.name}</h3>
            <div className="flex gap-2">
              <button
                className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600 text-sm"
                onClick={() => addColumn(table.id)}
              >
                Add Column
              </button>
              <button
                className="bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600 text-sm"
                onClick={() => addRow(table.id)}
              >
                Add Row
              </button>
              <button
                className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 text-sm"
                onClick={() => deleteTable(table.id)}
              >
                ×
              </button>
            </div>
          </div>

          {/* Columns */}
          <div className="space-y-2">
            {table.columns.map((col, idx) => (
              <div key={idx} className="border p-2 rounded bg-gray-50 relative">
                <div className="flex justify-between items-center text-black">
                  <input
                    type="text"
                    value={col.name}
                    onChange={(e) => updateColumn(table.id, idx, { name: e.target.value })}
                    className="border px-2 py-1 rounded w-1/2"
                  />
                  <div className="flex gap-1 items-center">
                    <button
                      className="text-sm px-2 py-1 hover:bg-gray-200 rounded"
                      onClick={() => toggleExpanded(table.id, idx)}
                    >
                      {col.expanded ? "▼" : "▶"}
                    </button>
                    <button
                      className="text-sm px-2 py-1 hover:bg-red-200 rounded text-red-600"
                      onClick={() => deleteColumn(table.id, idx)}
                    >
                      ×
                    </button>
                  </div>
                </div>

                {col.expanded && (
                  <div className="mt-1 flex gap-2 items-center">
                    <span className="text-sm text-gray-600">Type:</span>
                    <select
                      value={col.type}
                      onChange={(e) => updateColumn(table.id, idx, { type: e.target.value })}
                      className="border px-2 py-1 rounded text-gray-600"
                    >
                      {COLUMN_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>

                    <span className="text-sm text-gray-600">Link to Table:</span>
                    <select
                      value={col.linkedTableId || ""}
                      onChange={(e) => updateColumn(table.id, idx, { linkedTableId: Number(e.target.value) || undefined })}
                      className="border px-2 py-1 rounded text-gray-600"
                    >
                      <option value="">None</option>
                      {tables.filter(t => t.id !== table.id).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Table preview */}
          {table.rows.length > 0 && (
            <table className="table-auto border-collapse border border-gray-300 w-full mt-2">
              <thead>
                <tr>
                  {table.columns.map((col, idx) => (
                    <th key={idx} className="border border-gray-300 px-2 py-1 text-left text-black">
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {table.columns.map((col, colIdx) => (
                      <td key={colIdx} className="border border-gray-300 px-2 py-1">
                        {col.linkedTableId ? (
                          <select
                            value={row[col.name] || ""}
                            onChange={(e) => updateRowValue(table.id, rowIdx, col.name, e.target.value)}
                            className="border px-1 py-0.5 rounded"
                          >
                            <option value="">Select</option>
                            {tables.find(t => t.id === col.linkedTableId)?.rows.map((r, i) => (
                              <option key={i} value={r[ tables.find(t => t.id === col.linkedTableId)!.columns[0].name ]}>
                                {r[ tables.find(t => t.id === col.linkedTableId)!.columns[0].name ]}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={row[col.name] || ""}
                            onChange={(e) => updateRowValue(table.id, rowIdx, col.name, e.target.value)}
                            className="border px-1 py-0.5 rounded w-full"
                          />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
  );
}