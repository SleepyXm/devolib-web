export function BackendControls({ hasUnsavedChanges, onSave }: {
  hasUnsavedChanges: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between border-b border-white/10 bg-[var(--dv-surface-inset)] px-4">
      <h2>Backend Project Setup</h2>
      {hasUnsavedChanges && (
        <button
          onClick={onSave}
          className="rounded bg-zinc-300 px-4 py-2 text-black transition hover:bg-white"
        >
          Save Changes
        </button>
      )}
    </div>
  );
}

