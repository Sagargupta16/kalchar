import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { KachniRule } from "./kachni-rule";

describe("KachniRule", () => {
	it("long form: 7px double line with a dot row, centred at the header measure", () => {
		const html = renderToStaticMarkup(<KachniRule form="long" />);
		expect(html).toContain("h-[7px]");
		expect(html).toContain("border-y");
		expect(html).toContain("mx-auto");
		expect(html).toContain("max-w-(--header-max)");
		expect(html).toContain("radial-gradient(circle, currentColor 1px, transparent 1px)");
		expect(html).toContain("12px 7px");
		expect(html).toContain("text-(--section-accent)/45");
	});

	it("long is the default form", () => {
		expect(renderToStaticMarkup(<KachniRule />)).toContain("h-[7px]");
	});

	it("short form: 64px wide, 3px tall, no dots", () => {
		const html = renderToStaticMarkup(<KachniRule form="short" />);
		expect(html).toContain("h-[3px]");
		expect(html).toContain("w-16");
		expect(html).not.toContain("radial-gradient");
	});

	it("mixes the section pigment into the line colour and stays presentational", () => {
		const html = renderToStaticMarkup(<KachniRule />);
		expect(html).toContain("color-mix(in oklch, var(--section-accent) 35%, var(--color-line))");
		expect(html).toContain('aria-hidden="true"');
		expect(html).toContain('role="presentation"');
	});

	it("merges consumer classes (the home seam passes its margin)", () => {
		expect(renderToStaticMarkup(<KachniRule className="mb-(--space-block)" />)).toContain(
			"mb-(--space-block)",
		);
	});
});
