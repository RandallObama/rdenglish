export default function ReportLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="animate-pulse space-y-6">
        {/* Header */}
        <div className="h-8 bg-muted rounded w-48" />
        <div className="h-5 bg-muted rounded w-64" />

        {/* Period selector */}
        <div className="flex gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-9 bg-muted rounded w-20" />
          ))}
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-muted rounded-xl" />
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-muted rounded-xl" />
          <div className="h-64 bg-muted rounded-xl" />
        </div>

        {/* More charts */}
        <div className="h-72 bg-muted rounded-xl" />
        <div className="h-64 bg-muted rounded-xl" />
      </div>
    </div>
  );
}
