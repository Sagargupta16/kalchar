"use client";

import { AlertCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Section } from "@/components/ui/section";

/**
 * Fallback for errors below the root layout. Diagnostics stay in the console;
 * Next's retry refreshes server data as well as resetting the boundary.
 */
export default function GlobalError({
	error,
	retry,
}: Readonly<{
	error: Error & { digest?: string };
	retry: () => void;
}>) {
	const headingRef = useRef<HTMLHeadingElement>(null);

	useEffect(() => {
		console.error("[ErrorBoundary]", error);
		headingRef.current?.focus();
	}, [error]);

	return (
		<Section>
			<main className="mx-auto flex min-h-[60svh] max-w-(--header-max) flex-col items-center justify-center px-(--container-px) py-(--section-py) text-center">
				<AlertCircle size={24} aria-hidden="true" className="mb-4 text-ruby" />
				<p className="t-eyebrow">Something went wrong</p>
				<h1
					ref={headingRef}
					tabIndex={-1}
					aria-describedby="error-description"
					className="t-headline mt-3 text-display-sm"
				>
					We hit a snag
				</h1>
				<p id="error-description" className="t-lead mt-4">
					We couldn't load this page. Try again, or head back home.
				</p>
				<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
					<button type="button" onClick={retry} className={buttonVariants({ variant: "primary" })}>
						Try again
					</button>
					<a href="/" className={buttonVariants({ variant: "ghost" })}>
						Back to home
					</a>
				</div>
			</main>
		</Section>
	);
}
