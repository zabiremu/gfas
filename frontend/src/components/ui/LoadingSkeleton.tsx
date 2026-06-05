export default function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse divide-y divide-gray-100">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="h-4 w-28 rounded bg-gray-200" />
          <div className="h-4 w-16 rounded bg-gray-200" />
          <div className="h-4 flex-1 rounded bg-gray-200" />
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="h-6 w-16 rounded-full bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
