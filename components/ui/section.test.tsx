import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Section, SectionHeader } from "./section";

describe("Section", () => {
	it("padded default keeps the section rhythm", () => {
		const html = renderToStaticMarkup(
			<Section padded>
				<p>body</p>
			</Section>,
		);
		expect(html).toContain("py-(--section-py)");
		expect(html).not.toContain("py-(--section-py-grand)");
	});

	it("rhythm grand swaps in the museum breathing token", () => {
		const html = renderToStaticMarkup(
			<Section padded rhythm="grand">
				<p>body</p>
			</Section>,
		);
		expect(html).toContain("py-(--section-py-grand)");
	});

	it("background wash tints the band from the section pigment", () => {
		const html = renderToStaticMarkup(
			<Section background="wash" accent="ruby">
				<p>body</p>
			</Section>,
		);
		expect(html).toContain("bg-(--section-wash)");
		expect(html).toContain("--section-accent:var(--color-ruby)");
	});

	it("wash renders a PigmentWash first child and contains the paint", () => {
		const html = renderToStaticMarkup(
			<Section wash padded>
				<p>body</p>
			</Section>,
		);
		expect(html).toContain("contain:paint");
		expect(html).toContain("relative overflow-hidden");
		expect(html).toContain("var(--wash-a)");
		// The wash precedes the content in DOM order.
		expect(html.indexOf("var(--wash-a)")).toBeLessThan(html.indexOf("body"));
	});

	it("no wash node without the prop", () => {
		const html = renderToStaticMarkup(
			<Section>
				<p>body</p>
			</Section>,
		);
		expect(html).not.toContain("var(--wash-a)");
		expect(html).not.toContain("contain:paint");
	});
});

describe("SectionHeader", () => {
	const html = renderToStaticMarkup(
		<SectionHeader eyebrow="Selected work" title="Original pieces" lead="A living archive." />,
	);

	it("titles in the roman headline voice at the display-sm rung", () => {
		expect(html).toContain("t-headline");
		expect(html).toContain("text-display-sm");
		expect(html).not.toContain("text-h2");
	});

	it("draws a gold w-12 rule between title and lead by default", () => {
		expect(html).toContain("bg-(--color-gold-hairline)");
		expect(html).toContain("w-12");
		expect(html.indexOf("Original pieces")).toBeLessThan(
			html.indexOf("bg-(--color-gold-hairline)"),
		);
		expect(html.indexOf("bg-(--color-gold-hairline)")).toBeLessThan(
			html.indexOf("A living archive."),
		);
	});

	it('rule="none" opts out of the gold rule', () => {
		const bare = renderToStaticMarkup(<SectionHeader eyebrow="E" title="T" rule="none" />);
		expect(bare).not.toContain("bg-(--color-gold-hairline)");
	});

	it("keeps the eyebrow, heading level and lead contract", () => {
		expect(html).toContain("Selected work");
		expect(html).toContain("<h2");
		expect(html).toContain("t-lead");
	});
});
