"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { SERVER_BRAND_COLORS } from "@/lib/server-brand-colors";
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
 * expecting the bright canvas. DEF1 (decisions.md) keeps this default; the
 * recommendation to follow prefers-color-scheme is open with Sagar.
 *
 * applyMode also rewrites the theme-color meta so the address bar follows the
 * class, not the OS (chrome-13); the pre-paint script in app/layout.tsx does
 * the same before hydration.
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
const THEME_EVENT = "kalchar:theme-change";

const THEME_COLOR: Record<Mode, string> = {
	light: SERVER_BRAND_COLORS.paper,
	dark: SERVER_BRAND_COLORS.night,
};
const SWITCHING_CLASS = "theme-switching";

function applyMode(mode: Mode) {
	const root = document.documentElement;
	// Freeze every transition for two frames so all tokens swap in one repaint
	// (the CSS half lives in globals.css, .theme-switching).
	root.classList.add(SWITCHING_CLASS);
	root.classList.toggle("dark", mode === "dark");
	document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[mode]);
	window.dispatchEvent(new Event(THEME_EVENT));
	try {
		localStorage.setItem(STORAGE_KEY, mode);
	} catch {
		/* localStorage unavailable -- ignore */
	}
	requestAnimationFrame(() => {
		requestAnimationFrame(() => root.classList.remove(SWITCHING_CLASS));
	});
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

export function ThemeToggle({
	className,
	compact = false,
}: Readonly<{ className?: string; compact?: boolean }>) {
	const [mode, setMode] = useState<Mode>("light");
	const [mounted, setMounted] = useState(false);

	useEffect(() => {
		setMode(readInitialMode());
		setMounted(true);
		// Cross-tab sync: another tab's flip lands here without a reload.
		const onStorage = (e: StorageEvent) => {
			if (e.key !== STORAGE_KEY) return;
			const next: Mode = e.newValue === "dark" ? "dark" : "light";
			setMode(next);
			document.documentElement.classList.toggle("dark", next === "dark");
			document
				.querySelector('meta[name="theme-color"]')
				?.setAttribute("content", THEME_COLOR[next]);
		};
		addEventListener("storage", onStorage);
		const onThemeChange = () =>
			setMode(document.documentElement.classList.contains("dark") ? "dark" : "light");
		addEventListener(THEME_EVENT, onThemeChange);
		return () => {
			removeEventListener("storage", onStorage);
			removeEventListener(THEME_EVENT, onThemeChange);
		};
	}, []);

	function setTheme(next: Mode) {
		setMode(next);
		applyMode(next);
	}

	// Pre-mount placeholder keeps the box stable until we know the mode. The
	// compact glyph follows the .dark class the pre-paint script set, so the
	// header never shows an empty pill.
	if (!mounted) {
		if (compact) {
			return (
				<span
					aria-hidden="true"
					className={cn(
						"grid size-control place-items-center rounded-full border border-line bg-canvas text-muted",
						className,
					)}
				>
					<Moon size={16} className="dark:hidden" />
					<Sun size={16} className="hidden dark:block" />
				</span>
			);
		}
		return (
			<div
				aria-hidden="true"
				className={cn("inline-grid h-14 w-28 rounded-full border border-line bg-canvas", className)}
			/>
		);
	}

	if (compact) {
		const nextMode: Mode = mode === "light" ? "dark" : "light";
		const NextIcon = nextMode === "dark" ? Moon : Sun;
		return (
			<button
				type="button"
				onClick={() => setTheme(nextMode)}
				aria-label={`Switch to ${nextMode} theme`}
				title={`Switch to ${nextMode} theme`}
				className={cn(
					"grid size-control place-items-center rounded-full border border-line bg-canvas text-muted transition-ui pressable hover:text-ink",
					className,
				)}
			>
				{/* key remounts the glyph so it rotates in from -90deg on each flip
				    (motion addendum C4); the page colours still swap in one frame. */}
				<NextIcon key={mode} size={16} aria-hidden="true" className="theme-icon-in" />
			</button>
		);
	}

	return (
		<fieldset
			className={cn(
				"inline-grid h-14 w-28 grid-cols-2 rounded-full border border-line bg-canvas p-1",
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
							"grid h-full w-full place-items-center rounded-full transition-ui pressable",
							active
								? "bg-surface text-ink shadow-e1 ring-1 ring-line"
								: "text-muted hover:text-ink",
						)}
					>
						<Icon size={16} aria-hidden="true" />
					</button>
				);
			})}
		</fieldset>
	);
}
