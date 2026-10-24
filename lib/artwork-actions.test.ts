import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// artwork-actions imports lib/image-base, which reads the public image origin at import time.
vi.hoisted(() => {
	process.env.NEXT_PUBLIC_IMAGE_BASE_URL ??= "https://fixtures.invalid";
});

const fakes = vi.hoisted(() => ({
	authorize: vi.fn(),
	revalidate: vi.fn(),
	query: vi.fn(),
	processArtwork: vi.fn(),
	deleteImages: vi.fn(),
	database: undefined as PGlite | undefined,
}));

vi.mock("@/lib/admin-auth", () => ({ requireMaintainer: fakes.authorize }));
vi.mock("next/cache", () => ({ revalidatePath: fakes.revalidate }));
vi.mock("@/lib/storage/staged-upload", () => ({
	readStagedImage: async () => Buffer.from("fixture"),
	discardStagedImages: async () => undefined,
}));
vi.mock("@/lib/storage/process-artwork-image", () => ({
	processNewArtworkImage: fakes.processArtwork,
	deleteEventImages: fakes.deleteImages,
	extractPalette: vi.fn(),
}));
vi.mock("@/lib/db/client", async () => {
	const { PGlite } = await import("@electric-sql/pglite");
	const { drizzle } = await import("drizzle-orm/pglite");
	fakes.database = await PGlite.create();
	return {
		db: drizzle(fakes.database, {
			logger: { logQuery: (query, params) => fakes.query(query, params) },
		}),
	};
});

import { createArtwork, setArtworkStatus, updateArtwork } from "@/app/admin/artwork-actions";

let database: PGlite;
let version = 0;

const fields = {
	title: "Piece A",
	style: "Category A",
	description: null,
	medium: "Ink",
	dimensions: null,
	year: null,
	priceInr: null,
	featured: false,
} as const;

function pieceForm(title: string): FormData {
	const form = new FormData();
	form.set("title", title);
	form.set("style", "Category A");
	form.set("medium", "Ink");
	form.set("imageKey", "staging/fixture");
	return form;
}

async function readRows(query: string) {
	return (await database.query(query)).rows;
}

beforeAll(async () => {
	database = fakes.database!;
	const directory = join(process.cwd(), "drizzle");
	const journal = JSON.parse(await readFile(join(directory, "meta/_journal.json"), "utf8")) as {
		entries: { tag: string }[];
	};
	for (const { tag } of journal.entries) {
		await database.exec(await readFile(join(directory, `${tag}.sql`), "utf8"));
	}
}, 30_000);

beforeEach(async () => {
	vi.resetAllMocks();
	vi.spyOn(console, "error").mockImplementation(() => {});
	fakes.authorize.mockResolvedValue("maintainer@example.invalid");
	fakes.deleteImages.mockResolvedValue(undefined);
	fakes.processArtwork.mockImplementation(async (slug: string) => ({
		image: `${slug}-v${++version}.jpg`,
		keys: [],
		aspectRatio: 1,
		palette: [],
	}));
	await database.exec(`
		truncate artworks, categories;
		insert into categories (id, name, "order") values ('a', 'Category A', 1);
		insert into artworks (slug, title, style, medium, image, "order", status, price_inr) values
			('a', 'Piece A', 'Category A', 'Ink', 'a.jpg', 1, 'available', 12000),
			('fish-family', 'Fish family', 'Category A', 'Ink', 'ff.jpg', 2, 'archive', null);
	`);
});

afterAll(async () => {
	vi.restoreAllMocks();
	await database?.close();
});

describe("hidden status", () => {
	it("hides a priced piece from the row in one statement and keeps its price", async () => {
		await expect(setArtworkStatus("a", "hidden")).resolves.toEqual({ ok: true });
		expect(await readRows("select status, price_inr from artworks where slug = 'a'")).toEqual([
			{ status: "hidden", price_inr: 12000 },
		]);
		expect(fakes.query).toHaveBeenCalledTimes(1);
		expect(fakes.revalidate).toHaveBeenCalledWith("/work/[slug]", "page");
	});

	it("saves Hidden with a price from the editor", async () => {
		await expect(
			updateArtwork("a", { ...fields, priceInr: 9000, status: "hidden" }),
		).resolves.toEqual({ ok: true });
		expect(await readRows("select status, price_inr from artworks where slug = 'a'")).toEqual([
			{ status: "hidden", price_inr: 9000 },
		]);
	});

	it("still rejects an unknown status before writing", async () => {
		await expect(
			updateArtwork("a", { ...fields, status: "draft" as unknown as "hidden" }),
		).resolves.toEqual({ ok: false, message: "Choose a valid status." });
		await expect(setArtworkStatus("a", "draft" as unknown as "hidden")).resolves.toEqual({
			ok: false,
			message: "Choose a valid status.",
		});
		expect(fakes.query).not.toHaveBeenCalled();
	});
});

describe("editor archive and price", () => {
	it("refuses Not for sale with a price instead of saving a piece that reads back as Available", async () => {
		await expect(
			updateArtwork("a", { ...fields, priceInr: 5000, status: "archive" }),
		).resolves.toEqual({
			ok: false,
			message:
				"A piece that is not for sale cannot have a price. Clear the price or choose Available.",
		});
		expect(await readRows("select status, price_inr from artworks where slug = 'a'")).toEqual([
			{ status: "available", price_inr: 12000 },
		]);
		expect(fakes.query).not.toHaveBeenCalled();
		expect(fakes.revalidate).not.toHaveBeenCalled();
	});

	it("allows Not for sale once the price is cleared", async () => {
		await expect(
			updateArtwork("a", { ...fields, priceInr: null, status: "archive" }),
		).resolves.toEqual({ ok: true });
		expect(await readRows("select status, price_inr from artworks where slug = 'a'")).toEqual([
			{ status: "archive", price_inr: null },
		]);
	});
});

describe("repeated titles", () => {
	it("numbers the slug and keeps the title as typed", async () => {
		await expect(createArtwork(pieceForm("Fish"))).resolves.toEqual({ ok: true, slug: "fish" });
		await expect(createArtwork(pieceForm("Fish"))).resolves.toEqual({ ok: true, slug: "fish-2" });
		await expect(createArtwork(pieceForm("fish!"))).resolves.toEqual({ ok: true, slug: "fish-3" });
		expect(
			await readRows("select slug, title from artworks where slug like 'fish%' order by slug"),
		).toEqual([
			{ slug: "fish", title: "Fish" },
			{ slug: "fish-2", title: "Fish" },
			{ slug: "fish-3", title: "fish!" },
			{ slug: "fish-family", title: "Fish family" },
		]);
	});

	it("goes past the highest suffix rather than reusing a deleted one", async () => {
		await database.exec(`
			insert into artworks (slug, title, style, medium, image, "order") values
				('fish', 'Fish', 'Category A', 'Ink', 'f.jpg', 3),
				('fish-3', 'Fish', 'Category A', 'Ink', 'f3.jpg', 4);
		`);
		await expect(createArtwork(pieceForm("Fish"))).resolves.toEqual({ ok: true, slug: "fish-4" });
	});

	it("moves to the next suffix when a concurrent create takes the slug first", async () => {
		fakes.processArtwork.mockImplementationOnce(async (slug: string) => {
			// Lands between this request's slug read and its insert.
			await database.exec(`
				insert into artworks (slug, title, style, medium, image, "order")
				values ('fish', 'Fish', 'Category A', 'Ink', 'other.jpg', 9);
			`);
			return { image: `${slug}-v${++version}.jpg`, keys: [], aspectRatio: 1, palette: [] };
		});
		await expect(createArtwork(pieceForm("Fish"))).resolves.toEqual({ ok: true, slug: "fish-2" });
		expect(fakes.processArtwork).toHaveBeenCalledTimes(1);
		expect(fakes.deleteImages).not.toHaveBeenCalled();
		expect(await readRows("select image from artworks where slug = 'fish-2'")).toEqual([
			{ image: expect.stringMatching(/^fish-v\d+\.jpg$/) },
		]);
	});

	it("gives up after bounded attempts and discards only its own image", async () => {
		await database.exec(`
			create or replace function reject_fish() returns trigger language plpgsql as $$
			begin
				if new.slug like 'fish%' then return null; end if;
				return new;
			end;
			$$;
			create trigger reject_fish before insert on artworks
				for each row execute function reject_fish();
		`);
		try {
			await expect(createArtwork(pieceForm("Fish"))).resolves.toEqual({
				ok: false,
				message: "Another piece with this title was saved at the same moment. Try again.",
			});
			expect(fakes.deleteImages).toHaveBeenCalledTimes(1);
			expect(fakes.revalidate).not.toHaveBeenCalled();
		} finally {
			await database.exec("drop function if exists reject_fish() cascade;");
		}
	});
});
