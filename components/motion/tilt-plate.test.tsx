import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { TiltPlate } from "./tilt-plate";

describe("TiltPlate", () => {
	it("renders children unchanged before a fine pointer is confirmed (SSR, phones)", () => {
		// The tilt wrapper mounts client-side only on (hover: hover) and
		// (pointer: fine); the server markup is the bare
		// children so phones never carry the wrapper.
		const wrapped = renderToStaticMarkup(
			<TiltPlate>
				<a href="/work/x" className="group">
					plate
				</a>
			</TiltPlate>,
		);
		const bare = renderToStaticMarkup(
			<a href="/work/x" className="group">
				plate
			</a>,
		);
		expect(wrapped).toBe(bare);
	});

	it("adds no transform or perspective markup on the server", () => {
		const html = renderToStaticMarkup(
			<TiltPlate className="block">
				<span>plate</span>
			</TiltPlate>,
		);
		expect(html).not.toContain("perspective");
		expect(html).not.toContain("rotate");
	});
});
