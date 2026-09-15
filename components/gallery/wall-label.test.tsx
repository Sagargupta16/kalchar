import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { WallLabel } from "./wall-label";

describe("WallLabel", () => {
	it("formats the counter zero-padded with the catalogue total", () => {
		const html = renderToStaticMarkup(
			<WallLabel index={7} total={21} title="Radha and Krishna" meta={["Madhubani", "2024"]} />,
		);
		expect(html).toContain("No. 07 of 21");
	});

	it("drops the total when absent and skips line 1 without index, prefix or mark", () => {
		const withIndex = renderToStaticMarkup(<WallLabel index={7} title="T" meta={[]} />);
		expect(withIndex).toContain("No. 07");
		expect(withIndex).not.toContain("of");
		const without = renderToStaticMarkup(<WallLabel title="T" meta={[]} />);
		expect(without).not.toContain("No.");
	});

	it("titles in the italic display voice: text-h3 compact, text-title full", () => {
		expect(renderToStaticMarkup(<WallLabel title="T" meta={[]} />)).toContain("t-display text-h3");
		expect(renderToStaticMarkup(<WallLabel variant="full" title="T" meta={[]} />)).toContain(
			"t-display text-title",
		);
	});

	it("joins meta facts with a middle dot and drops empty entries", () => {
		const html = renderToStaticMarkup(<WallLabel title="T" meta={["Madhubani", "", "2024"]} />);
		expect(html).toContain("Madhubani · 2024");
	});

	it("prices in the numeral voice and section pigment: text-base compact, text-title full", () => {
		const compact = renderToStaticMarkup(<WallLabel title="T" meta={[]} price="INR 12,500" />);
		expect(compact).toContain("t-numeral");
		expect(compact).toContain("text-base");
		expect(compact).toContain("text-(--section-accent)");
		expect(compact).toContain("INR 12,500");
		const full = renderToStaticMarkup(
			<WallLabel variant="full" title="T" meta={[]} price="INR 12,500" />,
		);
		// The title line is t-display text-title; assert the price line's pairing
		// so the calmer rung (was text-h2, steering 2026-09-14) is what's locked.
		expect(full).toContain("t-numeral text-title");
		expect(full).not.toContain("text-h2");
	});

	it("status replaces the price slot in the meta voice", () => {
		const html = renderToStaticMarkup(
			<WallLabel title="T" meta={[]} price="INR 12,500" status="Sold" />,
		);
		expect(html).toContain("Sold");
		expect(html).not.toContain("INR 12,500");
		expect(html).not.toContain("t-numeral");
	});

	it("scrim tone swaps ink and muted for the light-on-dark pair", () => {
		const html = renderToStaticMarkup(
			<WallLabel
				tone="scrim"
				index={7}
				total={21}
				title="T"
				meta={["Madhubani"]}
				price="INR 12,500"
			/>,
		);
		expect(html).toContain("text-bg/70");
		expect(html).toContain("text-bg");
		expect(html).not.toContain("text-(--section-accent)");
	});

	it("renders the bindu mark before line 1 and the caller prefix slot", () => {
		const html = renderToStaticMarkup(
			<WallLabel
				index={1}
				total={21}
				title="T"
				meta={[]}
				mark
				prefix={<span aria-hidden="true">Featured ·</span>}
			/>,
		);
		expect(html).toContain('viewBox="0 0 16 8"');
		expect(html.indexOf("viewBox")).toBeLessThan(html.indexOf("Featured"));
		expect(html.indexOf("Featured")).toBeLessThan(html.indexOf("No. 01"));
	});

	it("headingLevel h1 renders line 2 as the document h1", () => {
		const html = renderToStaticMarkup(
			<WallLabel headingLevel="h1" title="Radha and Krishna" meta={[]} />,
		);
		expect(html).toContain("<h1");
		expect(html).toContain("Radha and Krishna");
	});

	it("stagger rises each line on the eager reveal rhythm (50ms steps from step 1)", () => {
		const html = renderToStaticMarkup(
			<WallLabel stagger index={7} total={21} title="T" meta={["Madhubani"]} price="INR 1" />,
		);
		expect(html).toContain("reveal-up");
		expect(html).toContain("animation-delay:50ms");
		expect(html).toContain("animation-delay:100ms");
		expect(html).toContain("animation-delay:150ms");
		expect(html).toContain("animation-delay:200ms");
	});

	it("renders as figcaption when asked and keeps the 4px line grid", () => {
		const html = renderToStaticMarkup(
			<WallLabel as="figcaption" title="T" meta={[]} className="mt-4" />,
		);
		expect(html).toContain("<figcaption");
		expect(html).toContain("grid gap-1");
		expect(html).toContain("mt-4");
	});
});
