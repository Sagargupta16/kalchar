"use client";

import { useEffect, useState } from "react";
import type { CustomOrderDraft } from "@/lib/types";

export const MAX_BRIEF_LENGTH = 4000;
export const MAX_SHORT_LENGTH = 200;
const SESSION_KEY = "kalchar.custom-order.v1";
const FIELD_NAMES = ["brief", "name", "contact", "style", "size", "budget", "timeline"] as const;
export type OrderField = (typeof FIELD_NAMES)[number];
type OrderValues = Record<OrderField, string>;
export type SaveStatus = "idle" | "saving" | "saved" | "failed";

interface OrderSession {
	values: OrderValues;
	saveStatus: SaveStatus;
}

const EMPTY_SESSION: OrderSession = {
	values: { brief: "", name: "", contact: "", style: "", size: "", budget: "", timeline: "" },
	saveStatus: "idle",
};

export function readOrderValues(formData: FormData): OrderValues {
	return Object.fromEntries(
		FIELD_NAMES.map((name) => {
			const value = formData.get(name);
			const limit = name === "brief" ? MAX_BRIEF_LENGTH : MAX_SHORT_LENGTH;
			return [name, typeof value === "string" ? value.slice(0, limit) : ""];
		}),
	) as OrderValues;
}

export function orderDraft(values: OrderValues): CustomOrderDraft | null {
	const briefMessage = values.brief.trim();
	if (!briefMessage) return null;
	return {
		briefMessage,
		name: values.name.trim() || undefined,
		contact: values.contact.trim() || undefined,
		style: values.style.trim() || undefined,
		size: values.size.trim() || undefined,
		budget: values.budget.trim() || undefined,
		timeline: values.timeline.trim() || undefined,
	};
}

function readSession(): OrderSession | null {
	try {
		const stored = window.sessionStorage.getItem(SESSION_KEY);
		if (!stored) return null;
		const parsed = JSON.parse(stored) as Partial<OrderSession> | null;
		if (
			!parsed?.values ||
			!["idle", "saving", "saved", "failed"].includes(parsed.saveStatus ?? "")
		) {
			return null;
		}
		const storedValues = parsed.values;
		if (
			FIELD_NAMES.some((name) => {
				const value = storedValues[name];
				const limit = name === "brief" ? MAX_BRIEF_LENGTH : MAX_SHORT_LENGTH;
				return typeof value !== "string" || value.length > limit;
			})
		) {
			return null;
		}
		const values = Object.fromEntries(
			FIELD_NAMES.map((name) => [name, storedValues[name]]),
		) as OrderValues;
		// A reload cannot confirm an in-flight save. Keep the handoff links and
		// show the existing uncertain-save message instead of submitting again.
		const saveStatus = parsed.saveStatus === "saving" ? "failed" : parsed.saveStatus!;
		return { values, saveStatus: orderDraft(values) ? saveStatus : "idle" };
	} catch {
		return null;
	}
}

/** Keep this tab's brief through route changes without blocking navigation. */
export function useCustomOrderDraft() {
	const [session, setSession] = useState<OrderSession>(EMPTY_SESSION);
	const [restored, setRestored] = useState(false);

	useEffect(() => {
		const stored = readSession();
		if (stored) setSession(stored);
		setRestored(true);
	}, []);

	useEffect(() => {
		if (!restored) return;
		try {
			if (FIELD_NAMES.some((name) => session.values[name].trim())) {
				window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
			} else {
				window.sessionStorage.removeItem(SESSION_KEY);
			}
		} catch {
			// Storage can be unavailable in private or restricted browser contexts.
			// The form and its handoff links must remain usable.
		}
	}, [restored, session]);

	return [session, setSession] as const;
}
