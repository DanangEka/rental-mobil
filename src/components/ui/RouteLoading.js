/**
 * Full-screen route fallback.
 *
 * This markup existed twice — once in App.js as the Suspense fallback and once
 * in ProtectedRoute.js as the role-check skeleton — with the same spinner ring
 * and label but separate copies of the raw hex and the `text-[10px]`. Both are
 * app-shell states rather than content placeholders, so it sits here rather
 * than in SkeletonLoader (which is for in-page content and is styled as such).
 *
 * `showDots` keeps ProtectedRoute's bouncing-dot flourish, which App.js never
 * had. Everything else is shared, so the two entry points can no longer drift.
 */
export default function RouteLoading({ label = "Memuat…", showDots = false }) {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-c57-surface-container-low"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-space-md">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-4 border-c57-surface-container-highest" />
          <div className="absolute inset-0 rounded-full border-4 border-t-c57-primary-container animate-spin" />
        </div>

        {showDots && (
          <div className="flex items-center gap-1.5" aria-hidden="true">
            {[0, 150, 300].map(delay => (
              <span
                key={delay}
                className="w-2 h-2 bg-c57-primary-container rounded-full animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        )}

        <p className="font-label-sm uppercase tracking-[0.22em] text-c57-on-surface-variant">
          {label}
        </p>
      </div>
    </div>
  );
}
