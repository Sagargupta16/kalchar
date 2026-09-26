"use client";

import { AlertCircle, RotateCcw } from "lucide-react";
import { useEffect, useRef } from "react";
import { KineticText } from "@/components/motion/kinetic-text";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/utils";

/**
 * Fallback for errors below the root layout, on a ruby pigment slab with the
 * Devanagari for "wait" drifting behind the copy. Diagnostics stay in the
 * console; Next's retry refreshes server data as well as resetting the
 * boundary. Focus lands on the heading so the change is announced.
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
		<main>
			<Section accent="ruby" background="pigment" className="overflow-hidden">
				<Container className="relative">
					<span aria-hidden="true" lang="hi" className="page-hero-glyph">
						रुको
					</span>
					<div className="relative z-10 flex min-h-[64svh] flex-col justify-center py-16">
						<p className="t-eyebrow eyebrow-eager flex items-center gap-3">
							<AlertCircle size={14} aria-hidden="true" className="text-(--section-accent)" />
							Something went wrong
						</p>
						<h1
							ref={headingRef}
							tabIndex={-1}
							aria-describedby="error-description"
							className="t-headline type-page kinetic-eager mt-4 max-w-2xl"
						>
							<KineticText text="We hit a snag" startIndex={1} />
						</h1>
						<p id="error-description" className="t-lead eyebrow-eager mt-4 max-w-xl">
							We couldn't load this page. Try again, or head back home.
						</p>
						<div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
							<button
								type="button"
								onClick={retry}
								className={cn(buttonVariants({ variant: "primary", size: "lg" }), "group")}
							>
								<RotateCcw
									size={16}
									aria-hidden="true"
									className="transition-transform duration-500 group-hover:-rotate-180"
								/>
								Try again
							</button>
							<a href="/" className={buttonVariants({ variant: "secondary", size: "lg" })}>
								Back to home
							</a>
						</div>
					</div>
				</Container>
			</Section>
		</main>
	);
}
