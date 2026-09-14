import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { staggerDelay } from "@/lib/motion";
import { Reveal } from "./reveal";

describe("Reveal", () => {
	it("eager default keeps the reveal-up fade (existing callers unchanged)", () => {
		const html = renderToStaticMarkup(
			<Reveal eager delayMs={staggerDelay(2)}>
				<span>copy</span>
			</Reveal>,
		);
		expect(html).toContain("reveal-up");
		expect(html).toContain("animation-delay:120ms");
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

	it("whileInView plate clips instead of translating (the image is never resampled)", () => {
		const html = renderToStaticMarkup(
			<Reveal variant="plate">
				<span data-plate="x" />
			</Reveal>,
		);
		expect(html).toContain("data-motion-reveal");
		expect(html).toContain("clip-path");
		expect(html).toContain("100%");
		expect(html).not.toContain("translateY");
	});

	it("whileInView default still fades up from below", () => {
		const html = renderToStaticMarkup(
			<Reveal>
				<span>copy</span>
			</Reveal>,
		);
		expect(html).toContain("opacity:0");
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
});
