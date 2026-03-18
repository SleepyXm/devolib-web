import { ReactNode } from 'react'


export interface SectionPanelProps {
  title: string
  children: ReactNode
  onContextMenu?: (e: React.MouseEvent) => void
}
 
export interface PageRowProps {
  route: string
  file: string
}
 
export interface EndpointRowProps {
  method: string
  path: string
  file: string
}
 
export interface MethodBadgeProps {
  method: string
}
 
export interface DbColumn {
  column: string
  type: string
  nullable: boolean
}
 
export interface DbSectionProps {
  db_schema: Record<string, DbColumn[]>
}
 
export interface CreateModalProps {
  activeSection: "pages" | "endpoints"
  inputValue: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onConfirm: () => void
  onCancel: () => void
  pages: { route: string; file: string }[];
  parentPage: { name: string; path: string } | null;
  onParentChange: (p: { name: string; path: string } | null) => void;
}