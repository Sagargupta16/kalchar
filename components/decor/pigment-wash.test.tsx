import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PigmentWash } from "./pigment-wash";

describe("PigmentWash", () => {
	const html = renderToStaticMarkup(<PigmentWash />);

	it("renders two ellipses reading the wash tokens with hard radial stops", () => {
		expect(html).toContain("var(--wash-a) 0%, var(--wash-a) 45%, transparent 70%");
		expect(html).toContain("var(--wash-b) 0%, var(--wash-b) 45%, transparent 70%");
	});

	it("softens with a mask, never a blur filter", () => {
		expect(html).toContain("mask-image:radial-gradient(closest-side, black, transparent)");
		expect(html).not.toContain("blur(");
	});

	it("multiplies on paper and falls back to plain alpha in dark", () => {
		expect(html).toContain("mix-blend-multiply");
		expect(html).toContain("dark:mix-blend-normal");
	});

	it("is inert ornament covering the host", () => {
		expect(html).toContain('aria-hidden="true"');
		expect(html).toContain("pointer-events-none");
		expect(html).toContain("absolute inset-0 -z-10");
	});

	it("server-renders the static wash (drift mounts only in view, on the client)", () => {
		// Before hydration the wash must be visible and identical whether or not
		// it will drift; the keyframe loop mounts client-side via useInView.
		expect(renderToStaticMarkup(<PigmentWash drift={false} />)).toBe(html);
	});

	it("positions the pigment ellipse top-right and the marigold ellipse bottom-left", () => {
		expect(html).toContain("h-[40vw] w-[60vw]");
		expect(html).toContain("h-[30vw] w-[45vw]");
	});
});
