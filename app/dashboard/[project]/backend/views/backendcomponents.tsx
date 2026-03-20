export function BackendControls({ hasUnsavedChanges, onSave }: {
  hasUnsavedChanges: boolean;
  onSave: () => void;
}) {
  return (
    <div className="p-2 bg-gray-900 flex justify-between items-center">
      <h2>Backend Project Setup</h2>
      {hasUnsavedChanges && (
        <button
          onClick={onSave}
          className="px-4 py-2 rounded bg-blue-500 hover:bg-blue-600"
        >
          Save Changes
        </button>
      )}
    </div>
  );
}

