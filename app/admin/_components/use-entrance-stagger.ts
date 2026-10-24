"use client";

import { useEffect, useState } from "react";
import { DUR } from "@/lib/motion";
import { ADMIN_STAGGER } from "./controls";

/** The whole cascade: the capped last delay plus one entrance run. */
const ENTRANCE_MS = ADMIN_STAGGER.maxIndex * ADMIN_STAGGER.stepMs + DUR.base * 1000;

/**
 * The .admin-stagger class for a list's first moments only. Server HTML ships
 * with the class, so the cascade plays on first paint without waiting for
 * hydration; once it has finished the class drops, so a later reorder (a DOM
 * move, which restarts CSS animations) or an added row never replays it.
 */
export function useEntranceStagger(): string | undefined {
	const [active, setActive] = useState(true);
	useEffect(() => {
		const id = window.setTimeout(() => setActive(false), ENTRANCE_MS);
		return () => window.clearTimeout(id);
	}, []);
	return active ? "admin-stagger" : undefined;
}
