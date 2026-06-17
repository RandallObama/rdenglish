export default function DashboardLoading() {
  return (
    <div className="flex items-center justify-center min-h-[80vh] px-4 animate-pulse">
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-10">
        <div className="w-48 h-48 sm:w-56 sm:h-56 bg-muted rounded-2xl" />
        <div className="w-48 h-48 sm:w-56 sm:h-56 bg-muted rounded-2xl" />
      </div>
    </div>
  );
}
