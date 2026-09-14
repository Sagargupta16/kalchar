import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
	DUR,
	EASE_IN,
	EASE_IN_OUT,
	EASE_OUT,
	EASE_SHEET,
	gridStaggerDelay,
	PRESS_SCALE,
	perSegmentEase,
	REVEAL_DISTANCE,
	SHEEN_EVERY_S,
	SHEET_DETENTS,
	SPRING_SHEET,
	STAGGER,
	staggerDelay,
	UNDO_HOLD_MS,
} from "./motion";

// Normalise line endings so the slices below work on a CRLF checkout too.
function read(file: string): string {
	return readFileSync(resolve(process.cwd(), file), "utf8").replace(/\r\n/g, "\n");
}

const css = read("app/globals.css");
const animations = read("app/animations.css");
const elevation = read("app/elevation.css");

function token(name: string, source = css): string {
	const value = source.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1];
	if (!value) throw new Error(`missing ${name}`);
	return value.trim();
}

function bezier(value: string): number[] {
	const inner = value.match(/cubic-bezier\(([^)]+)\)/)?.[1];
	if (!inner) throw new Error(`not a cubic-bezier: ${value}`);
	return inner.split(",").map((n) => Number(n.trim()));
}

/** Evaluate a `clamp(<min>rem, <intercept>rem + <slope>vw, <max>rem)` rung at a viewport width, in px (16px root). */
function clampAtViewport(value: string, viewportPx: number): number {
	const match = value.match(
		/^clamp\(\s*([\d.]+)rem\s*,\s*([\d.]+)rem\s*\+\s*([\d.]+)vw\s*,\s*([\d.]+)rem\s*\)$/,
	);
	if (!match) throw new Error(`not a rem + vw clamp: ${value}`);
	const [minRem, interceptRem, slopeVw, maxRem] = match.slice(1).map(Number);
	const preferred = (interceptRem ?? 0) * 16 + ((slopeVw ?? 0) / 100) * viewportPx;
	return Math.min(Math.max(preferred, (minRem ?? 0) * 16), (maxRem ?? 0) * 16);
}

/** The whole `@theme ... { ... }` block, brace-balanced (the file reads `@theme static {`). */
function themeBlock(): string {
	const start = css.search(/@theme[^{]*\{/);
	if (start === -1) throw new Error("no @theme block in app/globals.css");
	let depth = 0;
	for (let i = css.indexOf("{", start); i < css.length; i++) {
		if (css[i] === "{") depth++;
		if (css[i] === "}" && --depth === 0) return css.slice(start, i);
	}
	throw new Error("unterminated @theme block");
}

describe("lib/motion mirrors app/globals.css", () => {
	it.each([
		["--duration-instant", DUR.instant],
		["--duration-fast", DUR.fast],
		["--duration-base", DUR.base],
		["--duration-enter", DUR.enter],
		["--duration-slow", DUR.slow],
	])("%s equals DUR", (name, seconds) => {
		expect(token(name)).toBe(`${seconds * 1000}ms`);
	});

	it("--ease-out and --ease-in-out equal the exported arrays", () => {
		expect(bezier(token("--ease-out"))).toEqual([...EASE_OUT]);
		expect(bezier(token("--ease-in-out"))).toEqual([...EASE_IN_OUT]);
	});

	it("--ease-in and --ease-sheet equal the exported arrays", () => {
		expect(bezier(token("--ease-in"))).toEqual([...EASE_IN]);
		expect(bezier(token("--ease-sheet"))).toEqual([...EASE_SHEET]);
	});

	it("--duration-unveil, --duration-drift and --duration-float mirror DUR (ms and s forms)", () => {
		expect(token("--duration-unveil")).toBe(`${DUR.unveil * 1000}ms`);
		expect(token("--duration-drift")).toBe(`${DUR.drift}s`);
		expect(token("--duration-float")).toBe(`${DUR.float}s`);
	});

	it("--ease-emphatic is in @theme (M3 emphasized-decelerate; hero-scale entrances only)", () => {
		expect(themeBlock()).toContain("--ease-emphatic");
		expect(bezier(token("--ease-emphatic"))).toEqual([0.05, 0.7, 0.1, 1]);
	});

	it.each([
		["--text-display", 390, 44],
		["--text-display", 1280, 68],
		["--text-display-sm", 390, 40],
		["--text-display-sm", 1280, 56],
		["--text-h1", 390, 36],
		["--text-h1", 1280, 44],
		["--text-h2", 390, 30],
		["--text-h2", 1280, 40],
	])("%s resolves at %dpx viewport to %dpx within 1px", (name, viewport, expected) => {
		expect(clampAtViewport(token(name), viewport)).toBeCloseTo(expected, 0);
	});

	it("--sheet-peek mirrors SHEET_DETENTS.peek and --spacing-fab is the 56px disc", () => {
		expect(token("--sheet-peek")).toBe(`${SHEET_DETENTS.peek * 100}dvh`);
		expect(SHEET_DETENTS.full).toBe(1);
		expect(token("--spacing-fab")).toBe("3.5rem");
	});

	it("the undo toast holds for 5 seconds (D-A3 supersedes D26)", () => {
		expect(UNDO_HOLD_MS).toBe(5000);
	});

	it("the sheen loop period constant is 8 seconds", () => {
		expect(SHEEN_EVERY_S).toBe(8);
	});

	it("--stagger-step equals STAGGER.stepMs and the stagger utility caps at maxIndex", () => {
		expect(token("--stagger-step")).toBe(`${STAGGER.stepMs}ms`);
		expect(css).toMatch(new RegExp(`min\\(var\\(--i, 0\\), ${STAGGER.maxIndex}\\)`));
	});

	it("pressable scales by PRESS_SCALE", () => {
		expect(css).toContain(`scale(${PRESS_SCALE})`);
	});

	it("reveal travel tokens equal REVEAL_DISTANCE", () => {
		expect(token("--reveal-travel")).toBe(`${REVEAL_DISTANCE.block}px`);
		expect(token("--reveal-travel-item")).toBe(`${REVEAL_DISTANCE.item}px`);
	});

	it("SPRING_SHEET lands in DUR.base with no bounce", () => {
		expect(SPRING_SHEET.visualDuration).toBe(DUR.base);
		expect(SPRING_SHEET.bounce).toBe(0);
	});

	it("no bounce easing remains in @theme (integration deletes the :root alias)", () => {
		expect(themeBlock()).not.toContain("--ease-spring");
		// flip to the whole-file assertion once integration deletes the :root alias:
		// expect(css).not.toContain("--ease-spring");
	});
});

describe("elevation indirection", () => {
	it("every @theme shadow is a var(--elev-*) reference so :root.dark can remap it", () => {
		const theme = themeBlock();
		expect(theme.length).toBeGreaterThan(0);
		const shadows = [...theme.matchAll(/--shadow-[\w-]+:\s*([^;]+);/g)].map((m) =>
			(m[1] ?? "").trim(),
		);
		expect(shadows.length).toBeGreaterThanOrEqual(9);
		for (const value of shadows) {
			expect(value).toMatch(/^(none|var\(--elev-[\w-]+\)(, var\(--elev-[\w-]+\))*)$/);
		}
	});

	it("every referenced --elev-* list is defined for light and dark in app/elevation.css", () => {
		const names = new Set(
			[...themeBlock().matchAll(/var\((--elev-[\w-]+)\)/g)].map((m) => m[1] ?? ""),
		);
		expect(names.size).toBeGreaterThanOrEqual(6);
		const light = elevation.slice(elevation.indexOf(":root {"), elevation.indexOf(":root.dark {"));
		const dark = elevation.slice(elevation.indexOf(":root.dark {"));
		for (const name of names) {
			expect(light).toMatch(new RegExp(`${name}:\\s*[^;]+;`));
			expect(dark).toMatch(new RegExp(`${name}:\\s*[^;]+;`));
		}
	});

	it("dark hairline is the 0.10 light edge and e2 / e3 keep a contact layer", () => {
		const dark = elevation.slice(elevation.indexOf(":root.dark {"));
		expect(token("--elev-hairline", dark)).toBe("0 0 0 1px oklch(1 0 0 / 0.1)");
		expect(token("--elev-e2", dark).split("),").length).toBe(3);
		expect(token("--elev-e3", dark).split("),").length).toBe(3);
	});
});

describe("app/animations.css", () => {
	it("uses the shimmer and flare tokens instead of literal seconds", () => {
		expect(animations).toContain("var(--duration-shimmer)");
		expect(animations).toContain("var(--delay-flare)");
		expect(animations).not.toMatch(/\b(?:1\.4|0\.6)s\b/);
		expect(token("--duration-shimmer")).toBe("1400ms");
		expect(token("--delay-flare")).toBe("600ms");
	});

	it("reveal-up travels by --reveal-travel and the flare grows on transform", () => {
		expect(animations).toContain("translateY(var(--reveal-travel))");
		expect(animations).toMatch(/@keyframes flare-grow\s*\{\s*to\s*\{\s*transform: scaleX\(1\);/);
	});

	it("the reduced-motion block strips transforms from transition-ui but keeps colour and opacity", () => {
		const reduced = animations.slice(animations.indexOf("prefers-reduced-motion: reduce"));
		expect(reduced).toMatch(
			/\.transition-ui\s*\{\s*transition-property:\s*color, background-color, border-color, box-shadow, opacity;/,
		);
		for (const selector of [
			".reveal-plate",
			".theme-icon-in",
			".rule-draw",
			".notice-in",
			".plate-float",
		]) {
			expect(reduced).toContain(selector);
		}
	});
});

describe("staggerDelay", () => {
	it("is 0 for the first item and grows by stepMs", () => {
		expect(staggerDelay(0)).toBe(0);
		expect(staggerDelay(1)).toBe(60);
		expect(staggerDelay(3)).toBe(180);
	});
	it("caps at maxIndex and clamps negatives", () => {
		expect(staggerDelay(5)).toBe(300);
		expect(staggerDelay(9)).toBe(300);
		expect(staggerDelay(-2)).toBe(0);
	});
});

describe("gridStaggerDelay", () => {
	it("staggers the eager cards by index and later cards within their row", () => {
		expect(gridStaggerDelay(0)).toBe(0);
		expect(gridStaggerDelay(5)).toBe(300);
		expect(gridStaggerDelay(6)).toBe(0);
		expect(gridStaggerDelay(7)).toBe(60);
		expect(gridStaggerDelay(8)).toBe(120);
		expect(gridStaggerDelay(9)).toBe(0);
	});
});

describe("perSegmentEase", () => {
	it("returns one ease per keyframe segment, all EASE_IN_OUT", () => {
		const eases = perSegmentEase([0, 0.5, 1]);
		expect(eases).toHaveLength(2);
		for (const ease of eases) expect(ease).toBe(EASE_IN_OUT);
	});

	it("never returns an empty array (Motion requires at least one ease)", () => {
		expect(perSegmentEase([0])).toHaveLength(1);
		expect(perSegmentEase([])).toHaveLength(1);
	});
});
