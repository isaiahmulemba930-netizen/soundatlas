export default function ReviewLoading() {
  return (
    <main className="min-h-screen pb-12 pt-6 text-[var(--text-main)] md:pb-16 md:pt-8">
      <div className="page-shell">
        <div className="animate-pulse space-y-6">
          <div className="h-6 w-40 rounded bg-white/10" />
          <div className="h-16 w-2/3 rounded bg-white/10" />
          <div className="hero-panel p-6 md:p-8">
            <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
              <div className="aspect-square rounded-[1.6rem] bg-white/10" />
              <div className="space-y-4">
                <div className="h-5 w-32 rounded bg-white/10" />
                <div className="grid gap-4 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="h-28 rounded-[1.4rem] bg-white/10" />
                  ))}
                </div>
                <div className="h-56 rounded-[1.4rem] bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
