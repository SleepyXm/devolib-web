"use client";

import { useContext, useEffect, useState } from "react";
import { ProjectContext } from "../[project]/layout";
import { useTableManager } from "./database/tablemanager";
import { DBCommandBuilder } from "./database/dboperations";
import { COLUMN_TYPES } from "./database/dbtypes";

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
      <h2 className="text-xl text-black font-bold">Database Project Page</h2>

      <input
        type="text"
        value={tableName}
        onChange={(e) => setTableName(e.target.value)}
        placeholder="Table name..."
        className="border px-2 py-1 rounded text-black"
      />
      <button
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        onClick={() => {
          addTable(tableName);
          setTableName("");
        }}
      >
        Add New Table
      </button>

      {tables.map((table) => (
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
                    defaultValue={col.name}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleColumnNameSave(
                          table.id,
                          idx,
                          e.currentTarget.value,
                        );
                      } else {
                        setSavedCols((prev) => ({
                          ...prev,
                          [`${table.id}-${idx}`]: false,
                        }));
                      }
                    }}
                    className="border px-2 py-1 rounded w-1/2"
                  />
                  {savedCols[`${table.id}-${idx}`] === false && (
                    <span className="text-xs text-yellow-500">unsaved</span>
                  )}
                  {savedCols[`${table.id}-${idx}`] === true && (
                    <span className="text-xs text-green-500">✓ saved</span>
                  )}
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
                      onChange={(e) =>
                        updateColumn(table.id, idx, { type: e.target.value })
                      }
                      className="border px-2 py-1 rounded text-gray-600"
                    >
                      {COLUMN_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>

                    <span className="text-sm text-gray-600">
                      Link to Table:
                    </span>
                    <select
                      value={col.linkedTableId || ""}
                      onChange={(e) =>
                        updateColumn(table.id, idx, {
                          linkedTableId: Number(e.target.value) || undefined,
                        })
                      }
                      className="border px-2 py-1 rounded text-gray-600"
                    >
                      <option value="">None</option>
                      {tables
                        .filter((t) => t.id !== table.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
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
                    <th
                      key={idx}
                      className="border border-gray-300 px-2 py-1 text-left text-black"
                    >
                      {col.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    {table.columns.map((col, colIdx) => (
                      <td
                        key={colIdx}
                        className="border border-gray-300 px-2 py-1"
                      >
                        {col.linkedTableId ? (
                          <select
                            value={row[col.name] || ""}
                            onChange={(e) =>
                              updateRowValue(
                                table.id,
                                rowIdx,
                                col.name,
                                e.target.value,
                              )
                            }
                            className="border px-1 py-0.5 rounded"
                          >
                            <option value="">Select</option>
                            {tables
                              .find((t) => t.id === col.linkedTableId)
                              ?.rows.map((r, i) => (
                                <option
                                  key={i}
                                  value={
                                    r[
                                      tables.find(
                                        (t) => t.id === col.linkedTableId,
                                      )!.columns[0].name
                                    ]
                                  }
                                >
                                  {
                                    r[
                                      tables.find(
                                        (t) => t.id === col.linkedTableId,
                                      )!.columns[0].name
                                    ]
                                  }
                                </option>
                              ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            value={row[col.name] || ""}
                            onChange={(e) =>
                              updateRowValue(
                                table.id,
                                rowIdx,
                                col.name,
                                e.target.value,
                              )
                            }
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
