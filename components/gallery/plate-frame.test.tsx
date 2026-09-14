import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PlateFrame } from "./plate-frame";

describe("PlateFrame", () => {
	const base = renderToStaticMarkup(
		<PlateFrame>
			<span data-plate="x" />
		</PlateFrame>,
	);

	it("frames at radius-md on the canvas with the edged rest, lift and hover crossfade", () => {
		expect(base).toContain("rounded-(--radius-md)");
		expect(base).toContain("bg-canvas");
		expect(base).toContain("shadow-e1-edged");
		expect(base).toContain("elevate-e3");
		expect(base).toContain("transition-ui");
		expect(base).toContain("group-hover:-translate-y-1");
		expect(base).toContain("relative overflow-hidden");
	});

	it("keeps the inset gold line concentric and hover-gated by default", () => {
		expect(base).toContain("inset-1.5");
		expect(base).toContain("border-(--color-gold-hairline)");
		expect(base).toContain("rounded-[calc(var(--radius-md)-6px)]");
		expect(base).toContain("opacity-0 group-hover:opacity-100");
	});

	it("rests the gold line at full opacity and the e3-edged shadow with goldRest", () => {
		const html = renderToStaticMarkup(
			<PlateFrame goldRest>
				<span />
			</PlateFrame>,
		);
		expect(html).toContain("opacity-100");
		expect(html).not.toContain("opacity-0");
		expect(html).toContain("shadow-e3-edged");
		expect(html).not.toContain("shadow-e1-edged");
	});

	it("radius lg swaps both the frame and the concentric inset", () => {
		const html = renderToStaticMarkup(
			<PlateFrame radius="lg">
				<span />
			</PlateFrame>,
		);
		expect(html).toContain("rounded-(--radius-lg)");
		expect(html).toContain("rounded-[calc(var(--radius-lg)-6px)]");
		expect(html).not.toContain("rounded-(--radius-md)");
	});

	it("sheen renders the loop layer with the 8s period", () => {
		const html = renderToStaticMarkup(
			<PlateFrame sheen>
				<span />
			</PlateFrame>,
		);
		expect(html).toContain('data-sheen="loop"');
		expect(html).toContain("gold-sheen");
		expect(html).toContain("--sheen-every:8s");
	});

	it("no sheen layer without the prop", () => {
		expect(base).not.toContain("gold-sheen");
		expect(base).not.toContain("data-sheen");
	});

	it("glow feeds --plate-glow and swaps the resting shadow for shadow-glow", () => {
		const html = renderToStaticMarkup(
			<PlateFrame glow="oklch(0.6 0.2 300)">
				<span />
			</PlateFrame>,
		);
		expect(html).toContain("--plate-glow:oklch(0.6 0.2 300)");
		expect(html).toContain("shadow-glow");
		expect(html).not.toContain("shadow-e1-edged");
	});

	it("never scales the image and merges consumer classes", () => {
		const html = renderToStaticMarkup(
			<PlateFrame className="aspect-3/4">
				<span />
			</PlateFrame>,
		);
		expect(html).toContain("aspect-3/4");
		expect(html).not.toContain("scale-");
	});
});
