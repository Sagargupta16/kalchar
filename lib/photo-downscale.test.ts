import { afterEach, describe, expect, it, vi } from "vitest";
import {
	downscalePhoto,
	downscaleSize,
	PHOTO_UPLOAD_MAX_EDGE,
	PHOTO_UPLOAD_QUALITY,
} from "./photo-downscale";

describe("downscaleSize", () => {
	it("fits the long edge of a landscape or portrait photo to the limit", () => {
		expect(downscaleSize(4000, 3000)).toEqual({ width: 2400, height: 1800 });
		expect(downscaleSize(3000, 4000)).toEqual({ width: 1800, height: 2400 });
		expect(downscaleSize(4033, 3025)).toEqual({ width: 2400, height: 1800 });
	});

	it("leaves a photo at or under the limit alone and never enlarges", () => {
		expect(downscaleSize(PHOTO_UPLOAD_MAX_EDGE, 1600)).toBeNull();
		expect(downscaleSize(1200, 900)).toBeNull();
	});

	it("ignores unusable sizes", () => {
		expect(downscaleSize(0, 3000)).toBeNull();
		expect(downscaleSize(Number.NaN, 3000)).toBeNull();
	});

	it("keeps a very thin panorama at least one pixel tall", () => {
		expect(downscaleSize(20000, 2)).toEqual({ width: 2400, height: 1 });
	});
});

interface FakeCanvas {
	width: number;
	height: number;
	getContext: () => unknown;
	toBlob: (done: (blob: Blob | null) => void, type: string, quality: number) => void;
}

function stubBrowser({
	width = 4000,
	height = 3000,
	blob = new Blob([new Uint8Array(100)], { type: "image/jpeg" }),
	context = true,
	decode = "ok",
}: {
	width?: number;
	height?: number;
	blob?: Blob | null;
	context?: boolean;
	decode?: "ok" | "throw";
} = {}) {
	const close = vi.fn();
	const drawImage = vi.fn();
	const toBlob = vi.fn<FakeCanvas["toBlob"]>((done) => done(blob));
	const canvas: FakeCanvas = {
		width: 0,
		height: 0,
		getContext: () => (context ? { fillRect: vi.fn(), drawImage } : null),
		toBlob,
	};
	const createImageBitmap = vi.fn(async () => {
		if (decode === "throw") throw new Error("decode failed");
		return { width, height, close };
	});
	vi.stubGlobal("createImageBitmap", createImageBitmap);
	vi.stubGlobal("document", { createElement: () => canvas });
	return { canvas, close, createImageBitmap, drawImage, toBlob };
}

const photo = (size = 1000, type = "image/jpeg") =>
	new File([new Uint8Array(size)], "IMG_1.jpg", { type, lastModified: 42 });

describe("downscalePhoto", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("redraws a large photo as a smaller upright JPEG with the original name", async () => {
		const browser = stubBrowser();
		const original = photo();
		const result = await downscalePhoto(original);
		expect(browser.createImageBitmap).toHaveBeenCalledWith(original, {
			imageOrientation: "from-image",
		});
		expect(browser.canvas).toMatchObject({ width: 2400, height: 1800 });
		expect(browser.drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 2400, 1800);
		expect(browser.toBlob).toHaveBeenCalledWith(
			expect.any(Function),
			"image/jpeg",
			PHOTO_UPLOAD_QUALITY,
		);
		expect(result).not.toBe(original);
		expect(result).toMatchObject({ name: "IMG_1.jpg", type: "image/jpeg", lastModified: 42 });
		expect(result.size).toBe(100);
		expect(browser.close).toHaveBeenCalledOnce();
	});

	it("keeps a photo that already fits", async () => {
		const browser = stubBrowser({ width: 1600, height: 1200 });
		const original = photo();
		expect(await downscalePhoto(original)).toBe(original);
		expect(browser.toBlob).not.toHaveBeenCalled();
		expect(browser.close).toHaveBeenCalledOnce();
	});

	it("keeps the original when the redrawn copy would not be smaller", async () => {
		stubBrowser({ blob: new Blob([new Uint8Array(2000)]) });
		const original = photo(1000);
		expect(await downscalePhoto(original)).toBe(original);
	});

	it.each([
		["the photo cannot be decoded", { decode: "throw" as const }],
		["there is no 2D context", { context: false }],
		["encoding returns nothing", { blob: null }],
	])("fails open when %s", async (_, options) => {
		stubBrowser(options);
		const original = photo();
		expect(await downscalePhoto(original)).toBe(original);
	});

	it("decodes one photo at a time when a batch stages several at once", async () => {
		const browser = stubBrowser();
		let inFlight = 0;
		let peak = 0;
		browser.createImageBitmap.mockImplementation(async () => {
			inFlight += 1;
			peak = Math.max(peak, inFlight);
			await new Promise((resolve) => setTimeout(resolve, 5));
			inFlight -= 1;
			return { width: 4000, height: 3000, close: browser.close };
		});
		const results = await Promise.all([photo(), photo(), photo()].map(downscalePhoto));
		expect(peak).toBe(1);
		expect(results.every((result) => result.type === "image/jpeg" && result.size === 100)).toBe(
			true,
		);
	});

	it("fails open without browser image APIs", async () => {
		vi.stubGlobal("createImageBitmap", undefined);
		const original = photo();
		expect(await downscalePhoto(original)).toBe(original);
	});
});
