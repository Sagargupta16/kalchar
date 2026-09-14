import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AccentRule } from "./accent-rule";

describe("AccentRule", () => {
	it("defaults to the section pigment at the existing size, drawing from the left", () => {
		const html = renderToStaticMarkup(<AccentRule />);
		expect(html).toContain("inline-block h-px w-5");
		expect(html).toContain("bg-(--section-accent)");
		expect(html).toContain("rule-draw");
		expect(html).not.toContain("rule-draw-center");
		expect(html).toContain('aria-hidden="true"');
	});

	it("gold variant renders the museum hairline", () => {
		const html = renderToStaticMarkup(<AccentRule variant="gold" />);
		expect(html).toContain("bg-(--color-gold-hairline)");
		expect(html).not.toContain("bg-(--section-accent)");
	});

	it("origin center adds the centre draw modifier (pull quotes)", () => {
		const html = renderToStaticMarkup(<AccentRule variant="gold" origin="center" />);
		expect(html).toContain("rule-draw rule-draw-center");
	});

	it("static skips the draw entirely", () => {
		const html = renderToStaticMarkup(<AccentRule static />);
		expect(html).not.toContain("rule-draw");
	});

	it("merges caller classes (w-12 under section titles)", () => {
		const html = renderToStaticMarkup(<AccentRule variant="gold" className="mt-5 w-12" />);
		expect(html).toContain("mt-5 w-12");
		expect(html).not.toContain("w-5 ");
	});
});
