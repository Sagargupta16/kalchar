import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { PGlite } from "@electric-sql/pglite";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LEADS_PER_DAY_CAP, LEADS_PER_HOUR_CAP } from "./lead-intake-cap";

const fakes = vi.hoisted(() => ({
	database: undefined as PGlite | undefined,
	client: 0,
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// A fresh address per call keeps the per-instance limiter out of the way.
vi.mock("next/headers", () => ({
	headers: async () => new Headers({ "x-forwarded-for": `203.0.113.${++fakes.client % 250}` }),
}));
vi.mock("@/lib/admin-auth", () => ({ requireMaintainer: vi.fn() }));
vi.mock("@/lib/db/client", async () => {
	const { PGlite } = await import("@electric-sql/pglite");
	const { drizzle } = await import("drizzle-orm/pglite");
	fakes.database = await PGlite.create();
	return { db: drizzle(fakes.database) };
});

import { submitLead } from "@/app/admin/lead-actions";

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

const CAP_WARNING = "submitLead refused: the hourly or daily enquiry cap is reached.";

beforeEach(async () => {
	vi.restoreAllMocks();
	vi.spyOn(console, "warn").mockImplementation(() => {});
	await database.exec("truncate leads;");
});

afterAll(async () => {
	await database?.close();
});

async function seedLeads(total: number, age: string) {
	await database.query(
		`insert into leads (id, brief, created_at)
		 select 'seed-' || n || '-' || $2, 'Seeded brief', now() - $1::interval
		 from generate_series(1, $3) as n`,
		[age, age.replaceAll(" ", "-"), total],
	);
}

async function leadCount(): Promise<number> {
	const { rows } = await database.query<{ total: number }>(
		"select count(*)::int as total from leads",
	);
	return rows[0]!.total;
}

function brief(text = "A lotus pond in blue.") {
	const formData = new FormData();
	formData.set("brief", text);
	formData.set("contact", "98765 43210");
	return formData;
}

describe("submitLead site-wide cap", () => {
	it("saves while both windows are under their caps", async () => {
		await seedLeads(LEADS_PER_HOUR_CAP - 1, "5 minutes");
		await expect(submitLead(brief())).resolves.toEqual({ ok: true });
		expect(await leadCount()).toBe(LEADS_PER_HOUR_CAP);
	});

	it("refuses once the last hour is full, without saving", async () => {
		await seedLeads(LEADS_PER_HOUR_CAP, "5 minutes");
		await expect(submitLead(brief())).resolves.toEqual({ ok: false });
		expect(console.warn).toHaveBeenCalledWith(CAP_WARNING);
		expect(await leadCount()).toBe(LEADS_PER_HOUR_CAP);
	});

	it("only counts the last hour toward the hourly cap", async () => {
		await seedLeads(LEADS_PER_HOUR_CAP, "2 hours");
		await expect(submitLead(brief())).resolves.toEqual({ ok: true });
	});

	it("refuses once the last day is full, even in a quiet hour", async () => {
		await seedLeads(LEADS_PER_DAY_CAP, "3 hours");
		await expect(submitLead(brief())).resolves.toEqual({ ok: false });
		expect(console.warn).toHaveBeenCalledWith(CAP_WARNING);
	});

	it("ignores enquiries older than a day", async () => {
		await seedLeads(LEADS_PER_DAY_CAP, "25 hours");
		await expect(submitLead(brief())).resolves.toEqual({ ok: true });
	});
});
