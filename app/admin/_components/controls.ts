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
	"min-h-control w-full rounded-(--radius-sm) border border-line-strong bg-surface px-3 py-2 text-base text-ink shadow-e1 transition-ui placeholder:text-muted hover:border-muted focus-visible:border-accent disabled:opacity-50";
export const adminLabel =
	"grid content-start gap-(--field-label-gap) text-label font-medium text-ink-soft";
export const adminHelp = "text-label text-muted";
export const adminError = "text-sm text-ruby";
export const adminSectionTitle = "text-base font-semibold tracking-tight text-ink";
export const adminCheckbox =
	"size-5 shrink-0 rounded-(--radius-sm) border-line-strong accent-accent";

/*
 * Button hierarchy (one per surface, top to bottom): primary = terracotta
 * fill, the one "do it" per view; secondary = white on a hairline, neutral
 * hover fill; ghost = no chrome until hover; destructive = ruby text that
 * fills soft ruby on hover. Terracotta never marks a pressed or selected
 * state (that is ink on a muted fill); it stays "you can act here".
 */
const BTN_BASE =
	"inline-flex min-h-control items-center justify-center gap-1.5 rounded-(--radius-sm) text-sm font-medium transition-ui pressable disabled:pointer-events-none disabled:opacity-50";
const ICON_BTN_BASE =
	"grid size-control shrink-0 place-items-center rounded-(--radius-sm) transition-ui pressable disabled:pointer-events-none disabled:opacity-50";
const SECONDARY =
	"border border-line bg-surface text-ink shadow-e1 hover:border-line-strong hover:bg-surface-hover aria-pressed:border-line-strong aria-pressed:bg-bg-muted aria-pressed:text-ink";

export const adminBtn = `${BTN_BASE} ${SECONDARY} px-4 py-2`;
export const adminBtnSm = `${BTN_BASE} ${SECONDARY} px-3 py-2 text-xs`;
/** Modifier for selected states that cannot carry aria-pressed; prefer aria-pressed. */
export const adminBtnSelected = "border-line-strong bg-bg-muted text-ink";
export const adminBtnPrimary = `${BTN_BASE} bg-accent px-4 py-2 text-bg shadow-e1 hover:bg-accent-hover hover:shadow-e2`;
export const adminBtnGhost = `${BTN_BASE} px-3 py-2 text-muted hover:bg-surface-hover hover:text-ink`;
export const adminBtnDestructive = `${BTN_BASE} border border-line bg-surface px-4 py-2 text-ruby shadow-e1 hover:border-ruby-line hover:bg-ruby-soft`;
export const adminBtnDangerSolid = `${BTN_BASE} border border-ruby-line bg-ruby px-4 py-2 text-bg shadow-e1 hover:bg-ruby-soft hover:text-ruby`;

export const adminIconBtn = `${ICON_BTN_BASE} border border-line bg-surface text-muted shadow-e1 hover:border-line-strong hover:bg-surface-hover hover:text-ink aria-pressed:border-line-strong aria-pressed:bg-bg-muted aria-pressed:text-ink`;
export const adminIconBtnPrimary = `${ICON_BTN_BASE} bg-accent text-bg shadow-e1 hover:bg-accent-hover`;
export const adminIconBtnDestructive = `${ICON_BTN_BASE} border border-line bg-surface text-ruby shadow-e1 hover:border-ruby-line hover:bg-ruby-soft`;
export const adminIconBtnGhost = `${ICON_BTN_BASE} text-muted hover:bg-surface-hover hover:text-ink`;

export const adminPanel =
	"rounded-(--radius-md) border border-line bg-surface p-(--card-pad) shadow-e1";
/** Create forms (add a category, event, workshop, testimonial, maintainer): the working surface floats one rung above resting panels. */
export const adminPanelInset =
	"rounded-(--radius-md) border border-line bg-surface p-(--card-pad) shadow-e2";
export const adminRow =
	"rounded-(--radius-md) border border-line bg-surface p-(--card-pad-compact) shadow-e1 transition-ui hover:shadow-e2";
export const adminRowInset =
	"rounded-(--radius-sm) border border-line bg-canvas p-(--card-pad-compact) transition-ui";
export const adminFilePicker = `flex min-h-control cursor-pointer items-center gap-3 rounded-(--radius-sm) border border-dashed border-line-strong bg-canvas px-4 py-3 text-sm text-muted transition-ui hover:border-accent hover:bg-surface-hover hover:text-ink has-disabled:pointer-events-none has-disabled:opacity-50 ${FOCUS_WITHIN}`;
export const adminThumb = "shrink-0 rounded-(--radius-sm) object-cover shadow-hairline";

/**
 * role="switch" track: the button carries aria-checked and `group`, the thumb
 * is a child span. The track recolours through transition-colors while the
 * thumb slides 18px on translate through transition-ui (fast, ease-out), so
 * both land in the same frame. min-h-0 cancels the coarse-pointer 44px floor on the 24px
 * track; the ::before hit area restores the 44px target around it.
 */
export const adminSwitch =
	"group relative inline-flex h-6 min-h-0 w-11 shrink-0 items-center rounded-full border border-line bg-canvas transition-colors pressable aria-checked:border-accent aria-checked:bg-accent before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-['']";
export const adminSwitchThumb =
	"block size-5 translate-x-0.5 rounded-full bg-surface shadow-e1 transition-ui group-aria-checked:translate-x-5";

/** Chip-shaped inline add field (categories, presets, maintainers invite): field left, a round primary + inside its right end. */
export const adminChipField =
	"flex min-h-control w-full items-center gap-2 rounded-full border border-line-strong bg-surface pl-4 pr-1 shadow-e1 transition-ui";
/** Position badge on photo tiles (lifted from artwork-row.tsx, one source). */
export const adminTileBadge =
	"rounded-full bg-scrim/80 px-1.5 py-0.5 text-micro leading-none tabular-nums text-bg dark:text-ink";
/** Status dot base; colour via bg-status-available / bg-status-sold / bg-status-nfs at the call site. */
export const adminStatusDot = "shrink-0 rounded-full";
/** Status chip: dot + label on a quiet pill (tiles, rows, lead states). Colour lives on the dot only. */
export const adminStatusChip =
	"inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full bg-canvas px-2 text-xs font-medium text-ink-soft ring-1 ring-line";

/**
 * Admin list stagger (admin-theme.css .admin-rise mirrors it): 40ms per item,
 * capped at 10 so a long list never waits more than 400ms to finish arriving.
 */
export const ADMIN_STAGGER = { stepMs: 40, maxIndex: 10 } as const;

export function adminStaggerDelay(index: number): number {
	return Math.min(Math.max(index, 0), ADMIN_STAGGER.maxIndex) * ADMIN_STAGGER.stepMs;
}
/** Initials disc for enquiries, maintainers and the header avatar (one people-shape). */
export const adminInitialsDisc =
	"grid shrink-0 place-items-center rounded-full bg-bg-muted text-sm font-semibold uppercase text-ink ring-1 ring-line";
