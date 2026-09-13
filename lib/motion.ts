/**
 * Single source of motion values for Motion (framer) components. CSS uses the
 * tokens in app/globals.css directly (transition-ui, pressable, stagger);
 * lib/motion.test.ts asserts these numbers equal those tokens.
 *
 * Travel contract: instant = press-in; fast = controls; base = dialogs, sheets,
 * header shrink, hover lifts; enter and slow = public reveals and hero plates
 * only. Nothing under /admin runs longer than base. Springs are for responses
 * to a gesture the viewer just made (open, zoom, indicator), never entrances.
 */
export const DUR = {
	instant: 0.1,
	fast: 0.15,
	base: 0.3,
	enter: 0.4,
	slow: 0.5,
} as const;

/** Mirrors --ease-out. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
/** Mirrors --ease-in-out (reorder neighbour shift, theme icon). */
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

/** Lightbox and sheet panels (was duplicated in artwork-lightbox.tsx:28 and event-gallery.tsx:24). */
export const SPRING_PANEL = { type: "spring", damping: 28, stiffness: 340 } as const;
/** Lightbox hover zoom (artwork-lightbox.tsx:29). */
export const SPRING_ZOOM = { type: "spring", stiffness: 200, damping: 25 } as const;
/** Sliding active indicator in the site header and admin nav (site-header-client.tsx:26). */
export const SPRING_INDICATOR = { type: "spring", stiffness: 400, damping: 30 } as const;

/** Press cue for whileTap; matches the pressable utility. */
export const PRESS_SCALE = 0.97;

/** Mirrors --stagger-step and the stagger utility's cap. */
export const STAGGER = { stepMs: 60, maxIndex: 5 } as const;

export function staggerDelay(index: number): number {
	return Math.min(Math.max(index, 0), STAGGER.maxIndex) * STAGGER.stepMs;
}

/** Reveal viewport margin shared by Reveal and any whileInView list. */
export const REVEAL_VIEWPORT_MARGIN = "0px 0px -80px 0px";
