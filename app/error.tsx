"use client";

import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Section } from "@/components/ui/section";

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
		<Section>
			<main className="mx-auto flex min-h-[60svh] max-w-(--header-max) flex-col items-center justify-center px-(--container-px) py-(--section-py) text-center">
				<AlertCircle size={24} aria-hidden="true" className="mb-4 text-ruby" />
				<p className="t-eyebrow">Something went wrong</p>
				<h1 className="t-display mt-3 text-h1">We hit a snag</h1>
				<p className="t-lead mt-4">
					The page ran into an unexpected error. Refresh, or head back to the gallery.
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
		</Section>
	);
}
