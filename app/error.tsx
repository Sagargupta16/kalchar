"use client";

import Link from "next/link";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";

/**
 * Root error boundary. Catches unhandled client-side errors (React render
 * errors, thrown promises, etc.) and shows a recovery UI instead of a blank
 * page. Logs the error to the console in development; in production a
 * monitoring integration can hook here.
 */
export default function GlobalError({
	error,
	reset,
}: Readonly<{
	error: Error & { digest?: string };
	reset: () => void;
}>) {
	useEffect(() => {
		console.error("[ErrorBoundary]", error);
	}, [error]);

	return (
		<main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-(--container-px) py-(--section-py) text-center">
			<p className="t-eyebrow">Something went wrong</p>
			<h1 className="t-display mt-3 text-4xl sm:text-5xl">We hit a snag</h1>
			<p className="t-lead mt-5">
				The page ran into an unexpected error. Try refreshing, or head back to the gallery.
			</p>
			<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
				<button type="button" onClick={reset} className={buttonVariants({ variant: "primary" })}>
					Try again
				</button>
				<Link href="/" className={buttonVariants({ variant: "ghost" })}>
					Back to home
				</Link>
			</div>
		</main>
	);
}
