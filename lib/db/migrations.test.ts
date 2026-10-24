import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

let database: PGlite;
let migrations: string[];

async function readJournalTags(): Promise<string[]> {
	const journal = JSON.parse(
		await readFile(join(process.cwd(), "drizzle", "meta/_journal.json"), "utf8"),
	) as { entries: { tag: string }[] };
	return journal.entries.map(({ tag }) => tag);
}

async function seedArtwork(target: PGlite) {
	await target.query("INSERT INTO categories (id, name, \"order\") VALUES ('folk', 'Folk', 1)");
	await target.query(
		`INSERT INTO artworks (slug, title, style, medium, "order", image)
		 VALUES ('example', 'Example', 'Folk', 'Ink', 1, 'example.jpg')`,
	);
}

beforeAll(async () => {
	const directory = join(process.cwd(), "drizzle");
	migrations = await Promise.all(
		(await readJournalTags()).map((tag) => readFile(join(directory, `${tag}.sql`), "utf8")),
	);
	database = await PGlite.create();
	for (const migration of migrations) await database.exec(migration);
}, 30_000);

beforeEach(async () => {
	await database.exec("TRUNCATE artworks, categories, leads");
});

afterAll(async () => {
	await database?.close();
});

describe("catalog database migrations", () => {
	it("creates all nine application tables from an empty database", async () => {
		const { rows } = await database.query<{ count: number }>(
			"SELECT count(*)::integer AS count FROM pg_tables WHERE schemaname = 'public'",
		);
		expect(rows[0]?.count).toBe(9);
	});

	it("cascades category renames without leaving artwork on the old name", async () => {
		await seedArtwork(database);
		await database.query("UPDATE categories SET name = 'Traditional' WHERE id = 'folk'");
		await database.query("UPDATE categories SET name = 'Traditional art' WHERE id = 'folk'");
		const { rows } = await database.query<{ style: string }>("SELECT style FROM artworks");
		expect(rows[0]?.style).toBe("Traditional art");
	});

	it("rejects duplicate names and deletion of a referenced category", async () => {
		await seedArtwork(database);
		await expect(
			database.query("INSERT INTO categories (id, name, \"order\") VALUES ('other', 'Folk', 2)"),
		).rejects.toMatchObject({ code: "23505" });
		await expect(database.query("DELETE FROM categories WHERE id = 'folk'")).rejects.toMatchObject({
			code: "23001",
		});
	});

	it("rejects a save into a category that was deleted first", async () => {
		await database.query("INSERT INTO categories (id, name, \"order\") VALUES ('folk', 'Folk', 1)");
		await database.query("DELETE FROM categories WHERE id = 'folk'");
		await expect(
			database.query(
				`INSERT INTO artworks (slug, title, style, medium, "order", image)
				 VALUES ('example', 'Example', 'Folk', 'Ink', 1, 'example.jpg')`,
			),
		).rejects.toMatchObject({ code: "23503" });
	});

	it("bounds contact information without requiring it on older leads", async () => {
		await database.query("INSERT INTO leads (id, brief) VALUES ('old', 'Example enquiry')");
		await expect(
			database.query("INSERT INTO leads (id, brief, contact) VALUES ('long', 'Enquiry', $1)", [
				"x".repeat(201),
			]),
		).rejects.toMatchObject({ code: "23514" });
	});

	it("accepts the hidden status and still rejects unknown ones", async () => {
		await seedArtwork(database);
		await database.query("UPDATE artworks SET status = 'hidden', price_inr = 1500");
		const { rows } = await database.query<{ status: string }>("SELECT status FROM artworks");
		expect(rows[0]?.status).toBe("hidden");
		await expect(database.query("UPDATE artworks SET status = 'draft'")).rejects.toMatchObject({
			code: "23514",
		});
	});

	it("relaxes the status check without touching existing pieces", async () => {
		const tags = await readJournalTags();
		const index = tags.indexOf("0004_hidden_artwork_status");
		expect(index).toBeGreaterThan(0);
		const previous = await PGlite.create();
		try {
			for (const migration of migrations.slice(0, index)) await previous.exec(migration);
			await seedArtwork(previous);
			await previous.query("UPDATE artworks SET status = 'sold', price_inr = 900");
			await expect(previous.query("UPDATE artworks SET status = 'hidden'")).rejects.toMatchObject({
				code: "23514",
			});
			await previous.exec(migrations[index] ?? "");
			const before = await previous.query<{ status: string; price_inr: number }>(
				"SELECT status, price_inr FROM artworks",
			);
			expect(before.rows).toEqual([{ status: "sold", price_inr: 900 }]);
			await previous.query("UPDATE artworks SET status = 'hidden'");
			await expect(previous.query("UPDATE artworks SET status = 'draft'")).rejects.toMatchObject({
				code: "23514",
			});
		} finally {
			await previous.close();
		}
	}, 30_000);

	it("preserves existing catalog and lead rows when upgrading the previous schema", async () => {
		const previous = await PGlite.create();
		try {
			for (const migration of migrations.slice(0, -1)) await previous.exec(migration);
			await seedArtwork(previous);
			await previous.query("INSERT INTO leads (id, brief) VALUES ('old', 'Existing enquiry')");
			await previous.exec(migrations.at(-1) ?? "");
			const { rows } = await previous.query<{ contact: string | null; brief: string }>(
				"SELECT contact, brief FROM leads",
			);
			expect(rows).toEqual([{ contact: null, brief: "Existing enquiry" }]);
			const artwork = await previous.query<{ image: string }>("SELECT image FROM artworks");
			expect(artwork.rows[0]?.image).toBe("example.jpg");
		} finally {
			await previous.close();
		}
	}, 30_000);
});
