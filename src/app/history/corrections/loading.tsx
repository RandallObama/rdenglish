export default function CorrectionHistoryLoading() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl animate-pulse">
      <div className="h-7 w-28 bg-muted rounded mb-6" />
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-lg" />
        ))}
      </div>
    </div>
  );
}
