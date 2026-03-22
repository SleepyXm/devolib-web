interface LoadingStateProps {
  message: string;
  className?: string;
}

export function LoadingState({ message, className = "" }: LoadingStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center h-48 gap-2 text-gray-500 ${className}`}>
      <span className="animate-spin inline-block w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full" />
      <span className="text-xs">{message}</span>
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  message: string;
  className?: string;
}

export function EmptyState({ icon, message, className = "" }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center h-48 gap-3 text-gray-600 select-none ${className}`}>
      {icon}
      <p className="text-xs">{message}</p>
    </div>
  );
}