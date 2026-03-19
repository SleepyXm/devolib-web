import { COLUMN_TYPES } from "../dbtypes"; // adjust import path as needed
import { useState, useEffect } from "react";
 
type Column = {
  name: string;
  type: string;
  expanded: boolean;
  linkedTableId?: number;
};
 
type Row = Record<string, string>;
 
type Table = {
  id: number;
  name: string;
  columns: Column[];
  rows: Row[];
};
 
// --- Table Header ---
export function TableHeader({ name, onAddColumn, onAddRow, onDelete }: {
  name: string;
  onAddColumn: () => void;
  onAddRow: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex justify-between items-center px-4 py-3 border-b border-[#c9bfab] bg-[#f8f4ec] rounded-t-lg">
      <h3 className="font-medium text-sm text-zinc-700">{name}</h3>
      <div className="flex gap-2">
        <button onClick={onAddColumn} className="text-xs px-2 py-1 rounded bg-[#50c878] text-black border border-[#fff00020] transition-all duration-300s hover:bg-green-600/70 text-sm">+ column</button>
        <button onClick={onAddRow}    className="text-xs px-2 py-1 rounded bg-[#7050c0] text-white border border-[#afa9ec] transition-all duration-300s hover:bg-purple-900/80 text-sm">+ row</button>
        <button onClick={onDelete}    className="text-xs px-2 py-1 rounded bg-[#de595f] text-zinc-800 border border-[#f09595] transition-all duration-300s hover:bg-red-500/80">x remove</button>
      </div>
    </div>
  );
}
 
// --- Column Row ---
export function ColumnRow({ tableId, col, idx, savedState, tables, onKeyDown, onChange, onToggle, onDelete, onUpdateColumn }: {
  tableId: number;
  col: Column;
  idx: number;
  savedState: boolean | undefined;
  tables: Table[];
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onChange: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onUpdateColumn: (patch: Partial<Column>) => void;
}) {
  return (
    <div className="border-b border-[#e8e4dc] last:border-b-0">
      <div className="flex items-center gap-2 px-4 py-2">
        <input
          type="text"
          defaultValue={col.name}
          onKeyDown={onKeyDown}
          onChange={onChange}
          className="flex-1 text-sm border border-[#c9bfab] px-2 py-1 rounded bg-white text-black"
        />
        {savedState === false && <span className="text-xs text-yellow-500 shrink-0">unsaved</span>}
        {savedState === true  && <span className="text-xs text-green-600 shrink-0">saved</span>}
        <button onClick={onToggle} className="text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-zinc-500">{col.expanded ? "▼" : "▶"}</button>
        <button onClick={onDelete} className="text-xs w-6 h-6 flex items-center justify-center rounded hover:bg-[#fcebeb] text-[#a32d2d]">×</button>
      </div>
 
      {col.expanded && (
        <div className="flex gap-3 items-center px-4 py-2 bg-[#fafaf8] border-t border-[#e8e4dc]">
          <span className="text-xs text-zinc-500">Type</span>
          <select
            value={col.type}
            onChange={(e) => onUpdateColumn({ type: e.target.value })}
            className="text-xs border border-[#c9bfab] px-2 py-1 rounded bg-white text-black"
          >
            {COLUMN_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <span className="text-xs text-zinc-500">Link to table</span>
          <select
            value={col.linkedTableId || ""}
            onChange={(e) => onUpdateColumn({ linkedTableId: Number(e.target.value) || undefined })}
            className="text-xs border border-[#c9bfab] px-2 py-1 rounded bg-white text-black"
          >
            <option value="">None</option>
            {tables.filter((t) => t.id !== tableId).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
 
// --- Row Preview Table ---
export function RowPreview({ table, tables, onUpdateRowValue, onFetchRows }: {
  table: Table;
  tables: Table[];
  onUpdateRowValue: (rowIdx: number, colName: string, value: string) => void;
  onFetchRows: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [fetched, setFetched] = useState(false);

  const handleToggle = () => {
    if (!fetched) {
      onFetchRows();
      setFetched(true);
    }
    setOpen(prev => !prev);
  };

  const label = table.rows.length > 0 ? `View rows (${table.rows.length})` : "View rows";

  return (
    <div className="border-t border-[#e8e4dc]">
      <button
        onClick={handleToggle}
        className="w-full px-4 py-2 text-xs text-left text-zinc-500 hover:bg-[#f8f4ec] flex justify-between items-center"
      >
        <span>{label}</span>
        <span>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        table.rows.length === 0
          ? <div className="p-4 text-xs text-zinc-400 italic">No data found.</div>
          : <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8f4ec]">
                    {table.columns.map((col, idx) => (
                      <th key={idx} className="border border-[#e8e4dc] px-2 py-1 text-left font-medium text-zinc-600">{col.name}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row, rowIdx) => (
                    <tr key={rowIdx}>
                      {table.columns.map((col, colIdx) => (
                        <td key={colIdx} className="border border-[#e8e4dc] px-2 py-1 text-zinc-700">
                          {row[col.name]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
      )}
    </div>
  );
}
 
// --- Table Card ---
export function TableCard({ table, tables, savedCols, onAddColumn, onAddRow, onDelete, onColumnKeyDown, onColumnChange, onToggleExpanded, onDeleteColumn, onUpdateColumn, onUpdateRowValue, onFetchRows }: {
  table: Table;
  tables: Table[];
  savedCols: Record<string, boolean>;
  onAddColumn: () => void;
  onAddRow: () => void;
  onDelete: () => void;
  onColumnKeyDown: (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => void;
  onColumnChange: (idx: number) => void;
  onToggleExpanded: (idx: number) => void;
  onDeleteColumn: (idx: number) => void;
  onUpdateColumn: (idx: number, patch: Partial<Column>) => void;
  onUpdateRowValue: (rowIdx: number, colName: string, value: string) => void;
  onFetchRows: () => void;
}) {
  return (
    <div className="border border-[#c9bfab] rounded-lg bg-white overflow-hidden">
      <TableHeader name={table.name} onAddColumn={onAddColumn} onAddRow={onAddRow} onDelete={onDelete} />
      <div>
        {table.columns.map((col, idx) => (
          <ColumnRow
            key={idx}
            tableId={table.id}
            col={col}
            idx={idx}
            savedState={savedCols[`${table.id}-${idx}`]}
            tables={tables}
            onKeyDown={(e) => onColumnKeyDown(idx, e)}
            onChange={() => onColumnChange(idx)}
            onToggle={() => onToggleExpanded(idx)}
            onDelete={() => onDeleteColumn(idx)}
            onUpdateColumn={(patch) => onUpdateColumn(idx, patch)}
          />
        ))}
      </div>
      <RowPreview table={table} tables={tables} onUpdateRowValue={onUpdateRowValue} onFetchRows={onFetchRows} />
    </div>
  );
}
 
// --- DB Controls (top input + button) ---
export function DBControls({ tableName, onChange, onAdd, onInsertTestData }: {
  tableName: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAdd: () => void;
  onInsertTestData: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={tableName}
        onChange={onChange}
        placeholder="Table name..."
        className="border border-[#c9bfab] px-3 py-1.5 rounded text-sm text-black bg-white"
      />
      <button
        onClick={onAdd}
        className="text-sm px-3 py-1.5 rounded border border-[#c9bfab] bg-[#111318] text-zinc-500 transition-all duration-300s hover:text-zinc-100"
      >
        Add table
      </button>

      <button
        onClick={onInsertTestData}
        className="text-sm px-3 py-1.5 rounded border border-[#c9bfab] bg-[#f8f4ec] text-[#111318] transition-all duration-300 hover:bg-[#c2bdb2] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Insert Test Data
      </button>
    </div>
  );
}