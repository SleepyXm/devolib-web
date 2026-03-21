export interface FileTreeProp  {
    name: string;
    filepath: string;
}

export interface FileTreeSectionProps {
  label: string;
  items: FileTreeProp[];
  selected?: string;
  onSelect: (item: FileTreeProp) => void;
}

export default function FileTree({ label, items, selected, onSelect }: FileTreeSectionProps) {
    return (
    <>
      <div className="p-2 text-xs text-gray-400 uppercase tracking-wide border-b border-gray-700">
        {label}
      </div>
      {items.map((item) => (
        <button
          key={item.name}
          onClick={() => onSelect(item)}
          className={`px-3 py-2 text-sm text-left hover:bg-gray-700 border-b border-gray-700/50 flex flex-col ${
            selected === item.name ? "bg-gray-700" : ""
          }`}
        >
          <span className="text-sm">{item.name}</span>
          <span className="text-xs text-gray-400">{item.filepath}</span>
        </button>
      ))}
    </>
  );
}