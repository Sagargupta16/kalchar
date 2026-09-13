/**
 * Shared admin control strings. Every tappable is 44px (min-h-control /
 * size-control), transitions are scoped (transition-ui), presses scale 0.97
 * (pressable), focus is the global :focus-visible outline in globals.css.
 * Compose with cn(adminBtn, "...") or the named variants; never template
 * strings (the CI guard fails on `${admin`).
 */

/** Same treatment as the global rule, for elements :where() cannot reach. */
export const FOCUS_RING =
	"focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2";
/** For a <label> wrapping an sr-only input (file pickers, checkbox rows). */
export const FOCUS_WITHIN =
	"has-focus-visible:outline-2 has-focus-visible:outline-accent has-focus-visible:outline-offset-2";
/** Only for transition-[explicit,list] outside these tokens; bare transition-* already inherits the @theme defaults. */
export const MOTION = "duration-(--duration-fast) ease-(--ease-out)";

/** Icons beside meta text, stat labels, chips, notices. */
export const ICON_SM = 14;
/** Icons inside any control (text buttons and 44px icon buttons). */
export const ICON_MD = 16;
/** Alias used by the admin-shell and admin-settings plans. */
export const ICON_INLINE = ICON_MD;
/** Mobile tab bar glyphs. */
export const ICON_TAB = 20;
/** Empty-state and dialog glyphs. */
export const ICON_LG = 24;

export const adminField =
	"min-h-control w-full rounded-(--radius-sm) border border-line-strong bg-canvas px-3 py-2 text-base text-ink transition-ui placeholder:text-muted focus-visible:border-accent disabled:opacity-50";
export const adminLabel = "grid gap-(--field-label-gap) text-label font-medium text-muted";
export const adminHelp = "text-label text-muted";
export const adminError = "text-sm text-ruby";
export const adminSectionTitle = "text-base font-semibold tracking-tight text-ink";
export const adminCheckbox =
	"size-5 shrink-0 rounded-(--radius-sm) border-line-strong accent-accent";

const BTN_BASE =
	"inline-flex min-h-control items-center justify-center gap-1.5 rounded-(--radius-sm) text-sm font-medium transition-ui pressable disabled:pointer-events-none disabled:opacity-50";
const ICON_BTN_BASE =
	"grid size-control shrink-0 place-items-center rounded-(--radius-sm) transition-ui pressable disabled:pointer-events-none disabled:opacity-50";

export const adminBtn = `${BTN_BASE} border border-line bg-surface px-3 py-2 text-ink hover:border-accent hover:text-accent-text aria-pressed:border-accent aria-pressed:text-accent-text`;
export const adminBtnSm = `${BTN_BASE} border border-line bg-surface px-2.5 py-2 text-xs text-ink hover:border-accent hover:text-accent-text aria-pressed:border-accent aria-pressed:text-accent-text`;
/** Modifier for selected states that cannot carry aria-pressed; prefer aria-pressed. */
export const adminBtnSelected = "border-accent text-accent-text";
export const adminBtnPrimary = `${BTN_BASE} bg-accent px-4 py-2 text-bg hover:bg-accent-hover`;
export const adminBtnDestructive = `${BTN_BASE} border border-ruby-line px-3 py-2 text-ruby hover:bg-ruby hover:text-bg`;
export const adminBtnDangerSolid = `${BTN_BASE} bg-ruby px-4 py-2 text-bg hover:bg-ruby/90`;

export const adminIconBtn = `${ICON_BTN_BASE} border border-line bg-surface text-muted hover:border-accent hover:text-accent-text aria-pressed:border-accent aria-pressed:text-accent-text`;
export const adminIconBtnPrimary = `${ICON_BTN_BASE} bg-accent text-bg hover:bg-accent-hover`;
export const adminIconBtnDestructive = `${ICON_BTN_BASE} border border-ruby-line text-ruby hover:bg-ruby hover:text-bg`;
export const adminIconBtnGhost = `${ICON_BTN_BASE} text-muted hover:bg-canvas hover:text-ink`;

export const adminPanel = "rounded-(--radius-md) border border-line bg-surface p-(--card-pad)";
export const adminPanelInset = "rounded-(--radius-md) border border-line bg-canvas p-(--card-pad)";
export const adminRow = "rounded-(--radius-sm) border border-line bg-surface p-3 transition-ui";
export const adminRowInset = "rounded-(--radius-sm) border border-line bg-canvas p-3 transition-ui";
export const adminFilePicker = `flex min-h-control cursor-pointer items-center gap-3 rounded-(--radius-sm) border border-dashed border-line px-4 py-3 text-sm text-muted transition-ui hover:border-accent hover:text-accent-text has-disabled:pointer-events-none has-disabled:opacity-50 ${FOCUS_WITHIN}`;
export const adminThumb = "shrink-0 rounded-(--radius-sm) object-cover shadow-hairline";
