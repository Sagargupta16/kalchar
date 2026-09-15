/**
 * Single source of motion values for Motion (framer) components. CSS uses the
 * tokens in app/globals.css directly (transition-ui, pressable, stagger);
 * lib/motion.test.ts asserts these numbers equal those tokens.
 *
 * Travel contract: instant = press-in; fast = controls (hover, press, colour,
 * lifts); base = dialogs, sheets, header shrink, image settle; enter and slow =
 * public reveals and hero plates only. Nothing under /admin runs longer than
 * base. Springs are for responses to a gesture the viewer just made (open,
 * zoom, indicator, reflow), never entrances the viewer did not trigger and
 * never exits. Exits are tweens at DUR.fast with EASE_IN; entrances use
 * EASE_OUT or, when the viewer caused them, a spring. Never add whileTap to an
 * element that also carries a CSS hover transform (pressable +
 * hover:-translate-y-*): if a node needs Motion gestures, Motion owns every
 * transform on that node.
 */
export const DUR = {
	instant: 0.1,
	fast: 0.15,
	base: 0.4,
	enter: 0.4,
	slow: 0.5,
	/** Single-plate unveil (detail on client nav, spanning grid lead). Mirrors --duration-unveil. */
	unveil: 0.7,
	/** Pigment-wash drift loop, seconds. Mirrors --duration-drift (the 30s form). */
	drift: 30,
	/** Idle plate-float half-cycle, seconds. Mirrors --duration-float (the 7s form); CSS drives the loop. */
	float: 7,
	/** DEPRECATED alias of drift; unconsumed since the visual pass. Integration deletes. */
	ambient: 30,
} as const;

/** Mirrors --ease-out. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
/** Mirrors --ease-in-out (reorder neighbour shift, theme icon). */
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
/** Mirrors --ease-in. Exits only: enter with EASE_OUT, leave with EASE_IN at DUR.fast. */
export const EASE_IN = [0.7, 0, 0.84, 0] as const;
/** Mirrors --ease-sheet (iOS sheet curve, Vaul). CSS sheets use the token; Motion sheets use SPRING_SHEET. */
export const EASE_SHEET = [0.32, 0.72, 0, 1] as const;

/** Lightbox and sheet panels (was duplicated in artwork-lightbox.tsx:28 and event-gallery.tsx:24). */
export const SPRING_PANEL = { type: "spring", visualDuration: DUR.base, bounce: 0 } as const;
/** Lightbox hover zoom (artwork-lightbox.tsx:29). */
export const SPRING_ZOOM = { type: "spring", stiffness: 200, damping: 25 } as const;
/** Sliding active indicator in the site header and admin nav (site-header-client.tsx:26). */
export const SPRING_INDICATOR = { type: "spring", stiffness: 400, damping: 40 } as const;
/** Grid reflow after a filter tap (layout="position" on gallery items). */
export const SPRING_LAYOUT = { type: "spring", stiffness: 300, damping: 30 } as const;
/** Motion-driven sheets and drag-dismiss releases: lands in DUR.base, inherits finger velocity, no bounce. */
export const SPRING_SHEET = { type: "spring", visualDuration: DUR.base, bounce: 0 } as const;
/** Raised Add disc press: a firm press that lands fast. Motion owns the node (never pair with CSS pressable). */
export const SPRING_PRESS = { type: "spring", stiffness: 500, damping: 30 } as const;

/** Press cue for whileTap; matches the pressable utility. */
export const PRESS_SCALE = 0.97;

/** Mirrors --stagger-step and the stagger utility's cap. */
export const STAGGER = { stepMs: 50, maxIndex: 5 } as const;

export function staggerDelay(index: number): number {
	return Math.min(Math.max(index, 0), STAGGER.maxIndex) * STAGGER.stepMs;
}

/**
 * Per-row stagger for artwork grids: the first `eager` cards stagger by index
 * (CSS eager path); later cards ripple within their own row as it scrolls in
 * instead of all waiting the cap.
 */
export function gridStaggerDelay(index: number, eager = 6, cols = 3): number {
	return staggerDelay(index < eager ? index : index % cols);
}

/** One ease per keyframe segment so a [from, to, from] loop lands on frame 0. */
export function perSegmentEase(times: readonly number[]): (typeof EASE_IN_OUT)[] {
	return Array.from({ length: Math.max(times.length - 1, 1) }, () => EASE_IN_OUT);
}

/** Hero front-plate sheen period in seconds (CSS reads --sheen-every: 8s on the PlateFrame). */
export const SHEEN_EVERY_S = 8;

/** Reveal viewport margin shared by Reveal and any whileInView list. */
export const REVEAL_VIEWPORT_MARGIN = "0px 0px -24px 0px";
/** Mount margin for ambient loops (pigment wash): animate only near the viewport. */
export const LOOP_MOUNT_MARGIN = "300px 0px";
/** Reveal travel in px; mirrors --reveal-travel and --reveal-travel-item. */
export const REVEAL_DISTANCE = { block: 24, item: 16 } as const;

/** Pointer tilt on art plates (TiltPlate). 3deg, not portfolio-react's 4: a painting must not read as warped. */
export const TILT_MAX_DEG = 3;
export const TILT_PERSPECTIVE_PX = 800;

/** Pointer parallax on the hero plate pair (portfolio-react usePointerParallax numbers).
 * Fine pointers only; travel = pointer(-1..1) x depth. */
export const PARALLAX_SPRING = { type: "spring", stiffness: 40, damping: 20 } as const;
export const PLATE_PARALLAX_DEPTH = { front: 10, back: 6 } as const;

/** Drag dismissal thresholds (Vaul CLOSE_THRESHOLD 0.25 and VELOCITY_THRESHOLD 0.4 px/ms; Motion reports px/s). */
export const DRAG_CLOSE_FRACTION = 0.25;
export const DRAG_VELOCITY_PX_S = 400;

/** Pending indicators: show after PENDING_SHOW_MS, stay at least PENDING_MIN_MS (Vercel guidelines). */
export const PENDING_SHOW_MS = 200;
export const PENDING_MIN_MS = 300;
/** Undo toast hold (was 6000 per D26; 5000 per the visual pass, the Gmail floor and decision D-A3;
 * the countdown pauses on hover, focus-within and document.hidden). */
export const UNDO_HOLD_MS = 5000;

/** Sheet detents as fractions of 100dvh; CSS mirror --sheet-peek (test-locked). */
export const SHEET_DETENTS = { peek: 0.62, full: 1 } as const;

/** Hero shuffle hold before the preloaded plate swap (hero-plates.tsx). */
export const HERO_SHUFFLE_DELAY_MS = 700;
/** Lenis root options for desktop fine pointers (smooth-scroll.tsx). 1.1s on purpose: not a UI response, so the 300ms ceiling does not apply. */
export const SMOOTH_SCROLL = { durationSeconds: 1.1, idleFallbackMs: 200 } as const;
