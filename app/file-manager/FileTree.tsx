import { Tree, NodeApi, NodeRendererProps } from "react-arborist";
import { FileIcon, FolderIcon, FolderOpenIcon, ChevronRightIcon, ChevronDownIcon } from "lucide-react";
import { useRef, useState, useEffect } from "react";

export interface FileTreeProp  {
    name: string;
    filepath: string;
    children?: FileTreeProp[];
}

export interface FileTreeSectionProps {
  items: FileTreeProp[];
  selected?: string;
  onSelect: (item: FileTreeProp) => void;
  width?: number;
}

function FileNode({ node, style }: NodeRendererProps<FileTreeProp>) {
  const isFolder = !node.isLeaf;

  return (
    <div
      style={style}
      onClick={() => isFolder ? node.toggle() : node.select()}
      className={`flex items-center gap-1.5 px-2 py-1 text-sm cursor-pointer select-none
        hover:bg-gray-700
        ${node.isSelected ? "bg-gray-700 text-white" : "text-gray-300"}
      `}
    >
      <span style={{ paddingLeft: node.level * 12 }} />
      <span className="w-3 shrink-0 text-gray-500">
        {isFolder
          ? node.isOpen
            ? <ChevronDownIcon size={12} />
            : <ChevronRightIcon size={12} />
          : null
        }
      </span>
      <span className="shrink-0 text-gray-400">
        {isFolder
          ? node.isOpen
            ? <FolderOpenIcon size={14} />
            : <FolderIcon size={14} />
          : <FileIcon size={14} />
        }
      </span>
      <span className="truncate">{node.data.name}</span>
    </div>
  );
}


function countVisible(items: FileTreeProp[]): number {
  return items.reduce((acc, item) => {
    return acc + 1 + (item.children ? countVisible(item.children) : 0);
  }, 0);
}


export default function FileTree({ items, selected, onSelect }: FileTreeSectionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry.contentRect.width);
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const height = countVisible(items) * 24;

  return (
    <div ref={containerRef}>
      <Tree
        data={items}
        width={width}
        height={height}
        rowHeight={24}
        indent={0}
        idAccessor="filepath"
        selection={selected}
        onSelect={(nodes: NodeApi<FileTreeProp>[]) => {
          const node = nodes[0];
          if (node?.isLeaf) onSelect(node.data);
        }}
      >
        {FileNode}
      </Tree>
    </div>
  );
}