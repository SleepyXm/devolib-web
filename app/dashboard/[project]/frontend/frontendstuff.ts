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

export const FileCommandBuilder = {
  build: (operation: FileOperationType, path: string, content?: any): FileCommand => {
    return {
      type: operation,
      path,
      content,
    };
  },

  readFile: (path: string): FileCommand => ({
    type: 'READ_FILE',
    path,
  }),
  

  writeFile: (path: string, content: string): FileCommand => ({
    type: 'WRITE_FILE',
    path,
    content
  }),

  deleteFile: (path: string): FileCommand => ({
    type: 'DELETE_FILE',
    path,
  }),

};