"use client";

import { fontBody, fontDisplay } from "./fonts";
import "./globals.css";

/**
 * Root-layout failure surface. Next renders this only when app/layout.tsx
 * itself throws, replacing <html>; it deliberately imports no component (a
 * root-layout failure may be a module failure), so the primary Button recipe
 * is inlined once here and nowhere else.
 */
export default function GlobalError({
	reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
	return (
		<html lang="en" className={`${fontBody.variable} ${fontDisplay.variable}`}>
			<body>
				<main className="mx-auto flex min-h-[60svh] max-w-(--header-max) flex-col items-center justify-center px-(--container-px) py-(--section-py) text-center">
					<p className="t-eyebrow">Something went wrong</p>
					<h1 className="t-display mt-3 text-h1">We hit a snag</h1>
					<p className="t-lead mt-4">
						The site ran into an unexpected error. Refresh, or try again in a moment.
					</p>
					<div className="mt-8">
						<button
							type="button"
							onClick={reset}
							className="inline-flex min-h-control items-center justify-center rounded-(--radius-sm) bg-accent px-5 py-2 text-sm font-medium uppercase tracking-meta text-bg transition-ui pressable hover:bg-accent-hover"
						>
							Try again
						</button>
					</div>
				</main>
			</body>
		</html>
	);
}
