export default function CorrectLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl animate-pulse">
      <div className="mb-6">
        <div className="h-7 w-28 bg-muted rounded mb-2" />
        <div className="h-4 w-64 bg-muted rounded" />
      </div>
      <div className="space-y-3">
        <div className="h-[250px] bg-muted rounded-lg" />
        <div className="h-10 bg-muted rounded-lg" />
      </div>
    </div>
  );
}
