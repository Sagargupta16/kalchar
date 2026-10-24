import { describe, expect, it, vi } from "vitest";
import type { ActionResult } from "./action-result";
import { processInParallel } from "./event-photo-batch";

type Step = ActionResult<{ keyBase: string }>;
const ok = (keyBase: string): Step => ({ ok: true, keyBase });
const fail = (message: string): Step => ({ ok: false, message });
const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

describe("processInParallel", () => {
	it("returns key-bases in selection order even when later photos finish first", async () => {
		const step = vi.fn(async (key: string, index: number) => {
			await wait(index === 0 ? 30 : 5);
			return ok(`base-${key}`);
		});
		const outcome = await processInParallel(["a", "b", "c"], step, { concurrency: 3 });
		expect(outcome).toEqual({ total: 3, keyBases: ["base-a", "base-b", "base-c"], failures: [] });
	});

	it("never runs more photos at once than the concurrency allows", async () => {
		let inFlight = 0;
		let peak = 0;
		const step = async (key: string) => {
			inFlight += 1;
			peak = Math.max(peak, inFlight);
			await wait(10);
			inFlight -= 1;
			return ok(key);
		};
		await processInParallel(["a", "b", "c", "d", "e", "f"], step, { concurrency: 2 });
		expect(peak).toBe(2);
	});

	it("records failures by position and keeps the successes", async () => {
		const step = async (key: string) => (key === "b" ? fail("Upload expired.") : ok(`base-${key}`));
		const outcome = await processInParallel(["a", "b", "c"], step);
		expect(outcome).toEqual({
			total: 3,
			keyBases: ["base-a", "base-c"],
			failures: [{ position: 2, message: "Upload expired." }],
		});
	});

	it("treats a thrown error like a failure envelope and continues", async () => {
		const step = async (key: string) => {
			if (key === "a") throw new Error("Network dropped.");
			return ok(key);
		};
		const outcome = await processInParallel(["a", "b"], step, { concurrency: 1 });
		expect(outcome.failures).toEqual([{ position: 1, message: "Network dropped." }]);
		expect(outcome.keyBases).toEqual(["b"]);
	});

	it("reports progress once per finished photo, counting up to the total", async () => {
		const progress: Array<[number, number]> = [];
		await processInParallel(["a", "b", "c"], async (key) => ok(key), {
			concurrency: 2,
			onProgress: (p) => progress.push([p.done, p.total]),
		});
		expect(progress).toEqual([
			[1, 3],
			[2, 3],
			[3, 3],
		]);
	});

	it("does nothing for an empty batch", async () => {
		const step = vi.fn(async (key: string) => ok(key));
		expect(await processInParallel([], step)).toEqual({ total: 0, keyBases: [], failures: [] });
		expect(step).not.toHaveBeenCalled();
	});
});
