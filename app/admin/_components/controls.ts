/**
 * Shared control styles for the admin surface.
 *
 * The admin panel is a dense utility register, distinct from the public site's
 * uppercase-tracked CTA buttons. These tokens keep the three admin components
 * (upload form, artwork row, maintainer manager) visually consistent: one field
 * shape, one button shape per intent. All colors come from the design tokens
 * (border-line, accent, ruby) -- no raw hex.
 */

/** Text inputs, number inputs, selects, textareas. */
export const adminField =
	"rounded-md border border-line bg-bg px-3 py-2 text-sm text-ink transition-colors placeholder:text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50";

/** Secondary action (Save, Feature, etc.): bordered, accent on hover. */
export const adminBtn =
	"inline-flex items-center justify-center gap-1.5 rounded-md border border-line bg-bg px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent disabled:pointer-events-none disabled:opacity-50";

/** Primary action (Add piece, Add maintainer): filled accent. */
export const adminBtnPrimary =
	"inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-bg transition-opacity hover:opacity-90 disabled:pointer-events-none disabled:opacity-50";

/** Destructive action (Delete, Remove): ruby, fills on hover. */
export const adminBtnDestructive =
	"inline-flex items-center justify-center gap-1.5 rounded-md border border-ruby/40 px-3 py-2 text-sm font-medium text-ruby transition-colors hover:bg-ruby hover:text-bg disabled:pointer-events-none disabled:opacity-50";
