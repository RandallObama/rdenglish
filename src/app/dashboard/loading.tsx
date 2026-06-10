export default function DashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl animate-pulse">
      <div className="flex items-start sm:items-center justify-between mb-8 gap-3">
        <div>
          <div className="h-7 w-40 bg-muted rounded mb-2" />
          <div className="h-4 w-32 bg-muted rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-28 bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}
