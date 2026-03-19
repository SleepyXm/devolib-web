export type FileOperationType = 
  | 'READ_FILE' 
  | 'WRITE_FILE'
  | 'SAVE_CHANGES'
  | 'UNDO_CHANGES'
  | 'DELETE_FILE';

export type FileCommand = {
  type: FileOperationType;
  path: string;
  content?: string;
};