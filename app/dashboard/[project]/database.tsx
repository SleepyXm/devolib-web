"use client";

import { useContext, useEffect, useState } from "react";
import { ProjectContext } from "../[project]/layout";
import { useTableManager } from "./database/tablemanager";
import { DBCommandBuilder } from "./database/dboperations";
import { COLUMN_TYPES } from "./database/dbtypes";
import { TableCard, DBControls } from "./database/databasecomponents";

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
  } = useTableManager(projectWS);

  useEffect(() => {
    if (!projectWS) return;

    projectWS.onSchema((data) => {
      loadSchema(data);
    });

    const cmd = DBCommandBuilder.build("GET_SCHEMA", "public");
    projectWS.sendCommand(JSON.stringify(cmd));
  }, [projectWS]);

  return (
  <div className="p-6 space-y-4 w-[60vw]">
    <h2 className="text-4xl ">
      Alter Schema
    </h2>
    <DBControls
      tableName={tableName}
      onChange={(e) => setTableName(e.target.value)}
      onAdd={() => { addTable(tableName); setTableName(""); }}
    />
    {tables.map((table) => (
      <TableCard
        key={table.id}
        table={table}
        tables={tables}
        savedCols={savedCols}
        onAddColumn={() => addColumn(table.id)}
        onAddRow={() => addRow(table.id)}
        onDelete={() => deleteTable(table.id)}
        onColumnKeyDown={(idx, e) => {
          if (e.key === "Enter") handleColumnNameSave(table.id, idx, e.currentTarget.value);
          else setSavedCols((prev) => ({ ...prev, [`${table.id}-${idx}`]: false }));
        }}
        onColumnChange={(idx) => setSavedCols((prev) => ({ ...prev, [`${table.id}-${idx}`]: false }))}
        onToggleExpanded={(idx) => toggleExpanded(table.id, idx)}
        onDeleteColumn={(idx) => deleteColumn(table.id, idx)}
        onUpdateColumn={(idx, patch) => updateColumn(table.id, idx, patch)}
        onUpdateRowValue={(rowIdx, colName, value) => updateRowValue(table.id, rowIdx, colName, value)}
      />
    ))}
  </div>
);
}
