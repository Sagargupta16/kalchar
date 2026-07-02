"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Theme toggle -- light / dark only.
 *
 * The pre-paint script in app/layout.tsx reads localStorage.theme and adds
 * `class="dark"` to <html> before first paint, so dark-mode users never see a
 * flash of light styles. This component lets the user flip that preference.
 *
 * Default (nothing stored) is light: the site is a gallery, warm cream is the
 * resting register, and most visitors arrive from a WhatsApp / Instagram tap
 * expecting the bright canvas. We do not follow the OS theme -- the choice is
 * explicit and persisted, so the gallery looks the same each visit.
 *
 * Persistence:
 *   - light -> localStorage.theme = "light", remove .dark
 *   - dark  -> localStorage.theme = "dark",  add    .dark
 *
 * Mounted state: useEffect-after-mount avoids hydration mismatches (the server
 * has no localStorage, so the rendered icon state would differ). Until mounted,
 * we render a same-size placeholder.
 */

type Mode = "light" | "dark";

// Must match the localStorage key read by the pre-paint script in app/layout.tsx.
const STORAGE_KEY = "theme";

function applyMode(mode: Mode) {
	document.documentElement.classList.toggle("dark", mode === "dark");
	try {
		localStorage.setItem(STORAGE_KEY, mode);
	} catch {
		/* localStorage unavailable -- ignore */
	}
}

function readInitialMode(): Mode {
	try {
		if (localStorage.getItem(STORAGE_KEY) === "dark") return "dark";
	} catch {
		/* ignore */
	}
	return "light";
}

const MODES: { value: Mode; label: string; Icon: typeof Sun }[] = [
	{ value: "light", label: "Light", Icon: Sun },
	{ value: "dark", label: "Dark", Icon: Moon },
];

export function ThemeToggle({ className }: Readonly<{ className?: string }>) {
	const [mode, setMode] = useState<Mode>("light");
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMode(readInitialMode());
		setMounted(true);
	}, []);

	function setTheme(next: Mode) {
		setMode(next);
		applyMode(next);
	}

	// Pre-mount placeholder keeps layout width stable until we know the mode.
	if (!mounted) {
		return (
			<div
				aria-hidden="true"
				className={cn(
					"inline-flex h-9 w-[4.5rem] rounded-full border border-line bg-bg-soft",
					className,
				)}
			/>
		);
	}

	return (
		<fieldset
			className={cn(
				"inline-flex min-w-0 rounded-full border border-line bg-bg-soft p-0.5",
				className,
			)}
		>
			<legend className="sr-only">Theme</legend>
			{MODES.map(({ value, label, Icon }) => {
				const active = mode === value;
				return (
					<button
						key={value}
						type="button"
						aria-pressed={active}
						aria-label={`${label} theme`}
						title={`${label} theme`}
						onClick={() => setTheme(value)}
						className={cn(
							"inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors",
							active ? "bg-bg text-ink shadow-e1 ring-1 ring-line" : "text-muted hover:text-ink",
						)}
					>
						<Icon size={14} aria-hidden="true" />
					</button>
				);
			})}
		</fieldset>
	);
}
