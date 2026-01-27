interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  text?: string;
}

export function Loading({ size = 'md', text }: LoadingProps) {
  const sizeClasses = {
    sm: 'w-5 h-5',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={`${sizeClasses[size]} border-2 border-gray-600 border-t-fpl-green rounded-full animate-spin`}
      />
      {text && <p className="text-gray-400 text-sm">{text}</p>}
    </div>
  );
}

export function LoadingPage() {
  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <Loading size="lg" text="Loading team data..." />
    </div>
  );
}

export function LoadingCard() {
  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-4 bg-gray-700 rounded w-1/3" />
        <div className="space-y-2">
          <div className="h-3 bg-gray-700 rounded w-full" />
          <div className="h-3 bg-gray-700 rounded w-5/6" />
          <div className="h-3 bg-gray-700 rounded w-4/6" />
        </div>
      </div>
    </div>
  );
}
