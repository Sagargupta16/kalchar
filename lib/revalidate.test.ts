/**
 * Locks the exact refresh sequence for every entity.
 *
 * The expected routes keep mutations aligned with their public and admin
 * consumers. A changed sequence deliberately changes which pages refresh.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const fakes = vi.hoisted(() => ({ revalidate: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: fakes.revalidate }));

import { type Entity, REVALIDATION, revalidateEntity } from "./revalidate";

beforeEach(() => {
	fakes.revalidate.mockClear();
});

const expected: Record<Entity, unknown[][]> = {
	artworks: [
		["/"],
		["/work"],
		["/work/[slug]", "page"],
		["/custom-orders"],
		["/about"],
		["/admin"],
		["/catalog.csv"],
		["/sitemap.xml"],
	],
	categories: [
		["/"],
		["/work"],
		["/work/[slug]", "page"],
		["/catalog.csv"],
		["/custom-orders"],
		["/admin"],
		["/admin/categories"],
	],
	workshops: [["/"], ["/workshops"], ["/about"], ["/admin/workshops"]],
	orderPresets: [["/custom-orders"], ["/admin/presets"]],
	events: [["/"], ["/events"], ["/admin/events"]],
	profile: [["/"], ["/about"], ["/admin/profile"]],
	testimonials: [["/"], ["/admin/testimonials"]],
	leads: [["/admin/leads"]],
	maintainers: [["/admin/maintainers"]],
};

function pathsOf(entity: Entity): string[] {
	return REVALIDATION[entity].map((target) => (typeof target === "string" ? target : target[0]));
}

describe("revalidateEntity", () => {
	it.each(
		Object.keys(expected) as Entity[],
	)("refreshes exactly the routes that render %s, in order", (entity) => {
		revalidateEntity(entity);
		expect(fakes.revalidate.mock.calls).toEqual(expected[entity]);
	});

	it("has an expected sequence for every registered entity and nothing else", () => {
		expect(Object.keys(REVALIDATION).sort()).toEqual(Object.keys(expected).sort());
	});

	it("appends row-specific paths after the entity routes and skips empty ones", () => {
		revalidateEntity("testimonials", undefined, null, "", "/work/lotus-woman");
		expect(fakes.revalidate.mock.calls).toEqual([
			["/"],
			["/admin/testimonials"],
			["/work/lotus-woman"],
		]);
	});

	it("never lists a route twice for one entity", () => {
		for (const entity of Object.keys(REVALIDATION) as Entity[]) {
			const paths = pathsOf(entity);
			expect(new Set(paths).size, entity).toBe(paths.length);
		}
	});

	it("refreshes every public route that renders the catalog when artworks change", () => {
		// The public routes whose pages import artwork getters from lib/data.ts.
		// A new page that reads the catalog belongs in both this list and
		// REVALIDATION.artworks, or it will serve stale pieces after an upload.
		const publicCatalogRoutes = [
			"/",
			"/work",
			"/work/[slug]",
			"/custom-orders",
			"/about",
			"/catalog.csv",
			"/sitemap.xml",
		];
		for (const route of publicCatalogRoutes) {
			expect(pathsOf("artworks"), route).toContain(route);
		}
	});

	it("refreshes every public route that lists categories when they change", () => {
		for (const route of ["/", "/work", "/custom-orders"]) {
			expect(pathsOf("categories"), route).toContain(route);
		}
	});
});
