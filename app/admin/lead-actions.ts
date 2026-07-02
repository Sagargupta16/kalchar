"use server";

/**
 * Server actions for custom-order leads.
 *
 * `submitLead` is PUBLIC (the custom-order form calls it before handing off to
 * WhatsApp), so it's hardened against abuse: a honeypot field, a coarse
 * per-instance rate limit, and length caps. It is fire-and-forget by contract
 * -- it never throws back to the form, because the form must still open
 * WhatsApp even if persistence fails (the always-works link must not regress).
 *
 * The status/delete actions are maintainer-gated like every other admin
 * mutation. Split into its own module (mirroring event-actions.ts) to keep each
 * action file under the 500-line ceiling.
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db/client";
import { leads } from "@/lib/db/schema";
import type { LeadStatus } from "@/lib/types";
import { formString, requireMaintainer } from "./_helpers";

/** Field length caps -- generous for a real brief, tight enough to bound abuse. */
const MAX_BRIEF = 4000;
const MAX_SHORT = 200;

/**
 * Coarse in-memory rate limit: at most N submits per window per warm instance.
 * ponytail: a global counter, not per-IP -- serverless gives no stable client
 * key without extra plumbing, and this only needs to blunt a naive flood. If a
 * determined spammer becomes a real problem, swap for a Turnstile check.
 */
const RATE_MAX = 5;
const RATE_WINDOW_MS = 60_000;
let windowStart = 0;
let windowCount = 0;

function rateLimited(now: number): boolean {
	if (now - windowStart > RATE_WINDOW_MS) {
		windowStart = now;
		windowCount = 0;
	}
	windowCount += 1;
	return windowCount > RATE_MAX;
}

/**
 * Persist a custom-order brief. Returns `{ ok }` and NEVER throws -- the form
 * ignores the result and proceeds to WhatsApp regardless. `website` is a
 * honeypot: real users leave it empty; a filled value is silently dropped.
 */
export async function submitLead(formData: FormData): Promise<{ ok: boolean }> {
	try {
		if (formString(formData, "website").trim()) return { ok: false }; // honeypot tripped
		if (rateLimited(Date.now())) return { ok: false };

		const brief = formString(formData, "brief").trim().slice(0, MAX_BRIEF);
		if (!brief) return { ok: false };

		const short = (key: string) => {
			const v = formString(formData, key).trim().slice(0, MAX_SHORT);
			return v || null;
		};

		await db.insert(leads).values({
			id: randomUUID(),
			name: short("name"),
			style: short("style"),
			size: short("size"),
			budget: short("budget"),
			timeline: short("timeline"),
			brief,
			status: "new",
		});
		revalidatePath("/admin/leads");
		return { ok: true };
	} catch {
		// Persistence is best-effort; swallow so the form's WhatsApp hand-off,
		// which runs independently on the client, is never blocked.
		return { ok: false };
	}
}

const LEAD_STATUSES: readonly LeadStatus[] = ["new", "contacted", "closed"];

/** Update a lead's triage status (maintainer only). */
export async function setLeadStatus(id: string, status: LeadStatus): Promise<void> {
	await requireMaintainer();
	if (!LEAD_STATUSES.includes(status)) throw new Error("Invalid status.");
	await db.update(leads).set({ status }).where(eq(leads.id, id));
	revalidatePath("/admin/leads");
}

/** Delete a lead (maintainer only) -- the PII-removal path for a closed enquiry. */
export async function deleteLead(id: string): Promise<void> {
	await requireMaintainer();
	await db.delete(leads).where(eq(leads.id, id));
	revalidatePath("/admin/leads");
}
