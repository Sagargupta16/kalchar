/**
 * Maintainer allowlist access -- the dynamic admin roster.
 *
 * The Auth.js signIn callback gates login on `isMaintainer(email)`; the /admin
 * "Maintainers" page lists/adds/removes via the rest. Server-only (touches the
 * DB), never imported into a client component.
 *
 * Lockout guard: root maintainers (the seeded sg85207@gmail.com) cannot be
 * removed, so the roster can never be emptied into a lockout.
 */
import { eq } from "drizzle-orm";
import { db } from "./db/client";
import { type MaintainerRow, maintainers } from "./db/schema";

function normalize(email: string): string {
	return email.trim().toLowerCase();
}

/** Is this email allowed to sign in to the admin panel? */
export async function isMaintainer(email: string | null | undefined): Promise<boolean> {
	if (!email) return false;
	const rows = await db
		.select({ email: maintainers.email })
		.from(maintainers)
		.where(eq(maintainers.email, normalize(email)))
		.limit(1);
	return rows.length > 0;
}

/** Full roster, root first then by date added. */
export async function listMaintainers(): Promise<readonly MaintainerRow[]> {
	const rows = await db.select().from(maintainers);
	return rows
		.slice()
		.sort((a, b) =>
			a.isRoot === b.isRoot ? a.createdAt.getTime() - b.createdAt.getTime() : a.isRoot ? -1 : 1,
		);
}

/** Add a maintainer. Idempotent on email. `addedBy` records who invited them. */
export async function addMaintainer(email: string, addedBy: string, name?: string): Promise<void> {
	await db
		.insert(maintainers)
		.values({
			email: normalize(email),
			name: name ?? null,
			isRoot: false,
			addedBy: normalize(addedBy),
		})
		.onConflictDoNothing({ target: maintainers.email });
}

/**
 * Remove a maintainer. Refuses to remove a root maintainer (lockout guard).
 * Returns true if a row was removed.
 */
export async function removeMaintainer(email: string): Promise<boolean> {
	const target = normalize(email);
	const rows = await db.select().from(maintainers).where(eq(maintainers.email, target)).limit(1);
	const row = rows[0];
	if (!row) return false;
	if (row.isRoot) throw new Error("Cannot remove a root maintainer.");
	await db.delete(maintainers).where(eq(maintainers.email, target));
	return true;
}
