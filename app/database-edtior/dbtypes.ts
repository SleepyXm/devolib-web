export type Column = { name: string; type: string; expanded: boolean; linkedTableId?: number; pending?: boolean; };
export type Table = { id: number; name: string; columns: Column[]; rows: Row[] };
export type Row = { [colName: string]: any };

export const COLUMN_TYPES = [
  'VARCHAR(255)',
  'TEXT',
  'INTEGER',
  'BOOLEAN',
  'TIMESTAMPTZ',
  'UUID',
  'JSONB',
  'SERIAL',
];

export const mapType = (type: string): string => type;