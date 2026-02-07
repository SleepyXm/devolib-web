interface ProjectCardProps {
  project: {
    project_id: string;
    name: string;
    status: string;
    services?: { framework: string }[];
    last_online: string;
  };
  onOpenModal: (projectId: string) => void;
}

export function ProjectCard({ project, onOpenModal }: ProjectCardProps) {
  return (
    <div className="border-2 border-black dark:border-white p-4 py-16 hover:bg-gray-100 dark:hover:bg-zinc-800 flex flex-col justify-between">
      <span
        className="cursor-pointer font-medium"
        onClick={() => onOpenModal(project.project_id)}
      >
        {project.name} {`Status: ${project.status}`}
      </span>

      <div className="mt-2 flex flex-wrap gap-4">
        {project.services && project.services.length > 0 ? (
          project.services.map((s) => {
            const iconUrl = `https://skillicons.dev/icons?i=${s.framework.toLowerCase()}`;
            return (
              <div
                key={s.framework}
                className="flex flex-col items-center text-center text-sm"
              >
                <img
                  src={iconUrl}
                  alt={s.framework}
                  className="h-8 w-8 mb-1"
                />
                <span>{s.framework}</span>
              </div>
            );
          })
        ) : (
          <span className="text-gray-400 text-sm">No services</span>
        )}
        <span className="text-xs text-gray-500">
          Last Accessed: {new Date(project.last_online).toLocaleString()}
        </span>
      </div>
    </div>
  );
}