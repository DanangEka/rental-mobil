/**
 * Replaces the `text-3xl font-black text-slate-900 tracking-tight` heading
 * that is copy-pasted across eight admin pages, plus its `text-[10px]
 * uppercase tracking-[0.2em]` eyebrow counterparts.
 *
 * The eyebrow is where crimson is permitted as *text* — but only via
 * `c57-primary` (#6E0000), not `c57-primary-container` (#990000), which is
 * the fill token. That distinction is the reason the scale splits.
 */
export default function PageHeader({ eyebrow, title, subtitle, actions, className = "" }) {
  return (
    <header
      className={`flex flex-col gap-space-lg sm:flex-row sm:items-end sm:justify-between ${className}`}
    >
      <div className="min-w-0">
        {eyebrow && (
          <p className="flex items-center gap-space-sm font-label-sm uppercase tracking-[0.22em] text-c57-primary">
            <span className="accent-line" aria-hidden="true" />
            {eyebrow}
          </p>
        )}
        <h1 className="font-headline-md text-headline-md text-c57-on-surface mt-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-body-md text-c57-on-surface-variant mt-2 max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-space-sm shrink-0">{actions}</div>}
    </header>
  );
}
