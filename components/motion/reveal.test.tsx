import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { REVEAL_TRAVEL, staggerDelay } from "@/lib/motion";
import { Reveal } from "./reveal";

describe("Reveal", () => {
	it("eager default keeps the reveal-up fade (existing callers unchanged)", () => {
		const html = renderToStaticMarkup(
			<Reveal eager delayMs={staggerDelay(2)}>
				<span>copy</span>
			</Reveal>,
		);
		expect(html).toContain("reveal-up");
		expect(html).toContain("animation-delay:100ms");
		expect(html).toContain(`--reveal-offset-y:${REVEAL_TRAVEL.block}px`);
		expect(html).not.toContain("reveal-plate");
	});

	it("eager plate applies the clip-path unveil class", () => {
		const html = renderToStaticMarkup(
			<Reveal eager variant="plate">
				<span data-plate="x" />
			</Reveal>,
		);
		expect(html).toContain("reveal-plate");
		expect(html).not.toContain("reveal-plate-unveil");
		expect(html).not.toContain("reveal-up");
	});

	it("unveil adds the 700ms modifier on the eager plate path", () => {
		const html = renderToStaticMarkup(
			<Reveal eager variant="plate" unveil>
				<span data-plate="x" />
			</Reveal>,
		);
		expect(html).toContain("reveal-plate reveal-plate-unveil");
	});

	it("in-view plate clips instead of translating (the image is never resampled)", () => {
		const html = renderToStaticMarkup(
			<Reveal variant="plate">
				<span data-plate="x" />
			</Reveal>,
		);
		expect(html).toContain('data-motion-reveal="idle"');
		expect(html).toContain('class="reveal-view-plate"');
		expect(html).not.toContain("reveal-view ");
		expect(html).not.toContain("translate");
	});

	it("in-view default fades up from below through the CSS entrance", () => {
		const html = renderToStaticMarkup(
			<Reveal>
				<span>copy</span>
			</Reveal>,
		);
		expect(html).toContain('class="reveal-view"');
		expect(html).toContain(`--reveal-offset-y:${REVEAL_TRAVEL.block}px`);
		expect(html).not.toContain("clip-path");
	});

	it("merges the caller className on the eager plate path", () => {
		const html = renderToStaticMarkup(
			<Reveal eager variant="plate" className="col-span-2">
				<span />
			</Reveal>,
		);
		expect(html).toContain("col-span-2");
	});

	it("uses shorter shared travel for item reveals", () => {
		const html = renderToStaticMarkup(<Reveal variant="item">Item</Reveal>);
		const eager = renderToStaticMarkup(
			<Reveal eager variant="item">
				Item
			</Reveal>,
		);
		expect(html).toContain(`--reveal-offset-y:${REVEAL_TRAVEL.item}px`);
		expect(eager).toContain(`--reveal-offset-y:${REVEAL_TRAVEL.item}px`);
	});

	it("eager and viewport reveals enter from the requested side", () => {
		const eager = renderToStaticMarkup(
			<Reveal eager direction="left" distance={32}>
				Copy
			</Reveal>,
		);
		const inView = renderToStaticMarkup(
			<Reveal direction="left" distance={32}>
				Copy
			</Reveal>,
		);
		expect(eager).toContain("--reveal-offset-x:-32px");
		expect(eager).toContain("--reveal-offset-y:0px");
		expect(inView).toContain("--reveal-offset-x:-32px");
	});
});

/** Inline styles that would hide server HTML until hydration (opacity or a closed clip). */
function hiddenInlineStates(html: string): number {
	return (html.match(/opacity:\s*0[;"]|clip-path:\s*inset\([^)]*100%/g) ?? []).length;
}

describe("server HTML is visible before hydration", () => {
	it("no Reveal path renders a hidden inline state", () => {
		const html = [
			<Reveal key="up">copy</Reveal>,
			<Reveal key="item" variant="item">
				copy
			</Reveal>,
			<Reveal key="plate" variant="plate">
				copy
			</Reveal>,
			<Reveal key="left" direction="left">
				copy
			</Reveal>,
			<Reveal key="eager" eager>
				copy
			</Reveal>,
		]
			.map((node) => renderToStaticMarkup(node))
			.join("");
		expect(hiddenInlineStates(html)).toBe(0);
	});

	it("catalog images render without the settle from-state", async () => {
		process.env.NEXT_PUBLIC_IMAGE_BASE_URL ??= "https://fixtures.invalid";
		const { ResponsiveImage } = await import("@/components/gallery/responsive-image");
		const { ArtImage } = await import("@/components/gallery/art-image");
		const html = [
			renderToStaticMarkup(<ResponsiveImage keyBase="events/e/p" alt="Photo" sizes="100vw" />),
			renderToStaticMarkup(<ArtImage src="/artworks/radha.jpg" alt="Radha" sizes="100vw" />),
		].join("");
		expect(hiddenInlineStates(html)).toBe(0);
		expect(html).not.toContain("scale(1.02)");
	});
});
