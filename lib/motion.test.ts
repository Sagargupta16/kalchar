import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DUR, EASE_IN_OUT, EASE_OUT, PRESS_SCALE, STAGGER, staggerDelay } from "./motion";

// Normalise line endings so the @theme slice below works on a CRLF checkout too.
const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8").replace(/\r\n/g, "\n");

function token(name: string): string {
	const value = css.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1];
	if (!value) throw new Error(`missing ${name} in app/globals.css`);
	return value.trim();
}

function bezier(value: string): number[] {
	const inner = value.match(/cubic-bezier\(([^)]+)\)/)?.[1];
	if (!inner) throw new Error(`not a cubic-bezier: ${value}`);
	return inner.split(",").map((n) => Number(n.trim()));
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

	it("--stagger-step equals STAGGER.stepMs and the stagger utility caps at maxIndex", () => {
		expect(token("--stagger-step")).toBe(`${STAGGER.stepMs}ms`);
		expect(css).toMatch(new RegExp(`min\\(var\\(--i, 0\\), ${STAGGER.maxIndex}\\)`));
	});

	it("pressable scales by PRESS_SCALE", () => {
		expect(css).toContain(`scale(${PRESS_SCALE})`);
	});

	it("no bounce easing remains in @theme", () => {
		const theme = css.slice(css.indexOf("@theme {"), css.indexOf("}\n", css.indexOf("@theme {")));
		expect(theme).not.toContain("--ease-spring");
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
