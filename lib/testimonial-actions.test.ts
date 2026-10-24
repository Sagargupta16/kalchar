import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const fakes = vi.hoisted(() => ({
	authorize: vi.fn(),
	revalidate: vi.fn(),
	database: undefined as PGlite | undefined,
}));

vi.mock("@/lib/admin-auth", () => ({ requireMaintainer: fakes.authorize }));
vi.mock("next/cache", () => ({ revalidatePath: fakes.revalidate }));
vi.mock("@/lib/db/client", async () => {
	const { PGlite } = await import("@electric-sql/pglite");
	const { drizzle } = await import("drizzle-orm/pglite");
	fakes.database = await PGlite.create();
	return { db: drizzle(fakes.database) };
});

import { createTestimonial, updateTestimonial } from "@/app/admin/testimonial-actions";

let database: PGlite;

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
	fakes.authorize.mockResolvedValue("maintainer@example.invalid");
	await database.exec(`
		truncate testimonials;
		insert into testimonials (id, quote, author_name, author_location, artwork_slug, featured, "order")
		values ('a', 'A treasured piece.', 'Mira', 'Pune', 'old-piece', true, 1);
	`);
});

afterAll(async () => {
	await database?.close();
});

function form(fields: Record<string, string>): FormData {
	const formData = new FormData();
	for (const [key, value] of Object.entries(fields)) formData.set(key, value);
	return formData;
}

async function row(id: string) {
	const { rows } = await database.query(
		"select quote, author_name, author_location, artwork_slug, featured from testimonials where id = $1",
		[id],
	);
	return rows[0];
}

describe("updateTestimonial", () => {
	it("saves trimmed fields, keeps Featured, and refreshes both artwork pages", async () => {
		const result = await updateTestimonial(
			"a",
			form({ quote: " Even better. ", authorName: " Mira S ", artworkSlug: "new-piece" }),
		);
		expect(result).toEqual({ ok: true });
		expect(await row("a")).toEqual({
			quote: "Even better.",
			author_name: "Mira S",
			author_location: null,
			artwork_slug: "new-piece",
			featured: true,
		});
		const paths = fakes.revalidate.mock.calls.map(([path]) => path);
		expect(paths).toEqual(expect.arrayContaining(["/admin/testimonials", "/work/old-piece"]));
		expect(paths).toContain("/work/new-piece");
	});

	it("refuses invalid input with the create rules and leaves the row alone", async () => {
		await expect(updateTestimonial("a", form({ quote: " ", authorName: "Mira" }))).resolves.toEqual(
			{ ok: false, message: "Quote is required." },
		);
		await expect(
			updateTestimonial("a", form({ quote: "a".repeat(1001), authorName: "Mira" })),
		).resolves.toMatchObject({ ok: false });
		expect(await row("a")).toMatchObject({ quote: "A treasured piece." });
		expect(fakes.revalidate).not.toHaveBeenCalled();
	});

	it("reports a missing testimonial", async () => {
		await expect(
			updateTestimonial("missing", form({ quote: "Hello", authorName: "Mira" })),
		).resolves.toEqual({ ok: false, message: "Testimonial not found." });
	});

	it("checks the maintainer before reading anything", async () => {
		fakes.authorize.mockRejectedValueOnce(new Error("Not authorized."));
		await expect(
			updateTestimonial("a", form({ quote: "Hello", authorName: "Mira" })),
		).resolves.toEqual({ ok: false, message: "Not authorized." });
		expect(await row("a")).toMatchObject({ quote: "A treasured piece." });
	});
});

describe("createTestimonial", () => {
	it("applies the same length rules as an edit", async () => {
		await expect(
			createTestimonial(form({ quote: "Hi", authorName: "a".repeat(101) })),
		).resolves.toEqual({ ok: false, message: "The name can be up to 100 characters." });
	});
});
