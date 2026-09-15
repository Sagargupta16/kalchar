import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BinduMark } from "./bindu-mark";

describe("BinduMark", () => {
	const html = renderToStaticMarkup(<BinduMark />);

	it("is one 16x8 SVG in currentColor, hidden from the tree", () => {
		expect(html).toContain('viewBox="0 0 16 8"');
		expect(html).toContain('width="16"');
		expect(html).toContain('height="8"');
		expect(html).toContain('fill="currentColor"');
		expect(html).toContain('aria-hidden="true"');
		expect(html).toContain('focusable="false"');
	});

	it("draws a 4px centre circle flanked by two 2px dots 6px away", () => {
		expect(html).toContain('cx="8" cy="4" r="2"');
		expect(html).toContain('cx="2" cy="4" r="1"');
		expect(html).toContain('cx="14" cy="4" r="1"');
	});

	it("passes className through", () => {
		expect(renderToStaticMarkup(<BinduMark className="mr-2" />)).toContain("mr-2");
	});
});
