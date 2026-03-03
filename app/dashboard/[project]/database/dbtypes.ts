export type Column = { name: string; type: string; expanded: boolean; linkedTableId?: number };
export type Table = { id: number; name: string; columns: Column[]; rows: Row[] };
export type Row = { [colName: string]: any };

export const TYPE_MAP: Record<string, string> = {
  'STRING': 'VARCHAR(255)',
  'VARCHAR': 'VARCHAR(255)',
  'TEXT': 'TEXT',
  'NUMBER': 'INTEGER',
  'INT': 'INTEGER',
  'BOOLEAN': 'BOOLEAN',
  'DATE': 'TIMESTAMPTZ',
  'TIMESTAMPTZ': 'TIMESTAMPTZ',
  'UUID': 'UUID',
};

export const COLUMN_TYPES = Object.keys(TYPE_MAP);

export const mapType = (type: string): string => TYPE_MAP[type.toUpperCase()] ?? 'TEXT';