export type Column = { name: string; type: string; expanded: boolean; linkedTableId?: number };
export type Table = { id: number; name: string; columns: Column[]; rows: Row[] };
export type Row = { [colName: string]: any };
