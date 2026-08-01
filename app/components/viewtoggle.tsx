export function ViewToggle({
  active,
  views,
  onChange,
}: {
  active: string;
  views: string[];
  onChange: (view: string) => void;
}) {
  return (
    <div className="flex gap-2 p-2 bg-gray-800 border-b border-gray-700">
      {views.map((view) => (
        <button
          key={view}
          onClick={() => onChange(view)}
          className={`px-4 py-2 rounded ${
            active === view
              ? "bg-zinc-300 text-black"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          {view}
        </button>
      ))}
    </div>
  );
}
