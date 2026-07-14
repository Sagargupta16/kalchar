import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";

const r2 = vi.hoisted(() => ({
	uploadObject: vi.fn(),
	deleteObjects: vi.fn(),
}));

vi.mock("../image-base", () => ({ VARIANT_WIDTHS: [400] }));
vi.mock("./r2", () => r2);

import { processImageVariants } from "./process-artwork-image";

describe("processImageVariants", () => {
	beforeEach(() => {
		r2.uploadObject.mockReset();
		r2.deleteObjects.mockReset();
		r2.deleteObjects.mockResolvedValue(undefined);
	});

	it("removes every attempted key when an upload fails", async () => {
		const image = await sharp({
			create: { width: 8, height: 6, channels: 3, background: "#a84f32" },
		})
			.jpeg()
			.toBuffer();
		r2.uploadObject.mockResolvedValueOnce("ok").mockRejectedValueOnce(new Error("R2 failed"));

		await expect(processImageVariants("artworks/test", image)).rejects.toThrow("R2 failed");
		expect(r2.deleteObjects).toHaveBeenCalledWith([
			"artworks/test-400.avif",
			"artworks/test-400.webp",
		]);
	});
});
