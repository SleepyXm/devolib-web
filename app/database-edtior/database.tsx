"use client";

import { useContext, useEffect, useState } from "react";
import { ProjectContext } from "../dashboard/[project]/layout";
import { useTableManager } from "./tablemanager";
import { DBCommandBuilder } from "./dboperations";
import { TableCard, DBControls } from "./views/databasecomponents";

export default function DatabasePage() {
  const { projectWS } = useContext(ProjectContext)!;
  
  const [savedCols, setSavedCols] = useState<Record<string, boolean>>({});
  const [tableName, setTableName] = useState("");

  const handleColumnNameSave = (
    tableId: number,
    idx: number,
    value: string,
  ) => {
    updateColumn(tableId, idx, { name: value });
    setSavedCols((prev) => ({ ...prev, [`${tableId}-${idx}`]: true }));
  };

  const {
    tables,
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
    inserting,
    confirmColumn,
  } = useTableManager(projectWS);

  useEffect(() => {
  if (!projectWS) return;

  projectWS.onSchema((data) => {
    if (data.type === "GET_ROWS") {
      loadRows(data.table, data.rows);
      return;
    }
    loadSchema(data);
  });

  projectWS.onOutput((data: string) => {
    try {
      const msg = JSON.parse(data);
      if (msg.type === "GET_ROWS") loadRows(msg.table, msg.rows);
    } catch {}
  });

  const cmd = DBCommandBuilder.build("GET_SCHEMA", "public");
  projectWS.sendCommand(JSON.stringify(cmd));
}, [projectWS]);

  return (
  <div className="max-h-full space-y-4 overflow-y-auto p-5">
    <div><span className="font-mono text-[10px] uppercase tracking-[.12em] text-white/35">PostgreSQL</span><h2 className="mt-2 text-2xl font-medium">Alter schema</h2></div>
    <DBControls
      tableName={tableName}
      onChange={(e) => setTableName(e.target.value)}
      onAdd={() => { addTable(tableName); setTableName(""); }}
      onInsertTestData={() => insertTestData(projectWS)}
      inserting={inserting}
    />
    <div className="w-full space-y-4 py-4">
    {tables.map((table) => (
      <TableCard
        key={table.id}
        table={table}
        tables={tables}
        savedCols={savedCols}
        onAddColumn={() => addColumn(table.id)}
        onAddRow={() => addRow(table.id)}
        onDelete={() => deleteTable(table.id)}
        onConfirmColumn={(idx) => confirmColumn(table.id, idx, table.columns[idx]?.name)}
        onColumnKeyDown={(idx, e) => {
          if (e.key === "Enter") {
            if (table.columns[idx]?.pending) {
              confirmColumn(table.id, idx, e.currentTarget.value);
            } else {
              handleColumnNameSave(table.id, idx, e.currentTarget.value);
            }
          } else {
            setSavedCols((prev) => ({ ...prev, [`${table.id}-${idx}`]: false }));
          }
        }}
        onColumnChange={(idx) => setSavedCols((prev) => ({ ...prev, [`${table.id}-${idx}`]: false }))}
        onToggleExpanded={(idx) => toggleExpanded(table.id, idx)}
        onDeleteColumn={(idx) => deleteColumn(table.id, idx)}
        onUpdateColumn={(idx, patch) => updateColumn(table.id, idx, patch)}
        onUpdateRowValue={(rowIdx, colName, value) => updateRowValue(table.id, rowIdx, colName, value)}
        onFetchRows={() => fetchRows(table.name)}
      />
    ))}
    </div>
  </div>
);
}
