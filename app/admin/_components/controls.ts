// Shared visible keyboard focus, applied to every admin button so focus is
// never invisible/browser-default (previously only adminField had a ring).
const FOCUS_RING =
	"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:ring-offset-bg";

export const adminField =
	"rounded-(--radius-sm) border border-line bg-bg px-3 py-2 text-sm text-ink transition-colors placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50";

export const adminBtn = `inline-flex items-center justify-center gap-1.5 rounded-(--radius-sm) border border-line bg-bg px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-50 ${FOCUS_RING}`;

export const adminBtnPrimary = `inline-flex items-center justify-center gap-1.5 rounded-(--radius-sm) bg-accent px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50 ${FOCUS_RING}`;

export const adminBtnDestructive = `inline-flex items-center justify-center gap-1.5 rounded-(--radius-sm) border border-ruby/40 px-3 py-2 text-sm font-medium text-ruby transition-colors hover:bg-ruby hover:text-bg disabled:pointer-events-none disabled:opacity-50 ${FOCUS_RING}`;

/**
 * Square icon-only destructive button (row delete). One shared definition so
 * the delete control stops drifting between managers (was h-8/h-9 + ruby/30
 * vs /40 hand-rolled per file).
 */
export const adminIconBtnDestructive = `grid h-9 w-9 place-items-center rounded-(--radius-sm) border border-ruby/40 text-ruby transition-colors hover:bg-ruby hover:text-bg disabled:pointer-events-none disabled:opacity-50 ${FOCUS_RING}`;
