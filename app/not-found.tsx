import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { KineticText } from "@/components/motion/kinetic-text";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { staggerDelay } from "@/lib/motion";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

const ELSEWHERE = [
	{ label: "Workshops", href: "/workshops" },
	{ label: "Custom orders", href: "/custom-orders" },
	{ label: "Events", href: "/events" },
	{ label: "Contact", href: "/contact" },
] as const;

/**
 * The 404 as a peacock pigment slab: a poster-size 404 rides up digit by
 * digit, the Devanagari for "lost" drifts behind it, and the page offers the
 * artwork, home, and the other rooms of the site.
 */
export default function NotFound() {
	return (
		<main>
			<Section accent="peacock" background="pigment" className="overflow-hidden">
				<Container className="relative">
					<span aria-hidden="true" lang="hi" className="page-hero-glyph">
						खो गया
					</span>
					<div className="relative z-10 flex min-h-[72svh] flex-col justify-center py-16">
						<p className="t-eyebrow eyebrow-eager flex items-center gap-3">
							<span aria-hidden="true" className="h-px w-8 bg-(--section-accent)" />
							<span>Page not found</span>
						</p>
						<p
							aria-hidden="true"
							className="t-numeral status-numeral kinetic-eager mt-4 text-ink [word-spacing:-0.3em]"
						>
							<KineticText text="4 0 4" accentLast />
						</p>
						<h1 className="t-headline type-page kinetic-eager mt-6 max-w-2xl">
							<KineticText text="This page wandered off" startIndex={3} />
						</h1>
						<Reveal eager delayMs={staggerDelay(4)}>
							<p className="t-lead mt-4 max-w-xl">
								The page you were looking for has moved or never existed. The work is still here.
							</p>
							<div className="mt-8 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
								<Link href="/work" className={buttonVariants({ variant: "primary", size: "lg" })}>
									Browse the artwork
									<ArrowRight size={16} aria-hidden="true" />
								</Link>
								<Link
									href="/"
									className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "group")}
								>
									<ArrowLeft
										size={16}
										aria-hidden="true"
										className="transition-transform group-hover:-translate-x-1"
									/>
									Back to home
								</Link>
							</div>
							<nav aria-label="Elsewhere on the site" className="mt-10">
								<p className="t-meta">Or try</p>
								<ul className="mt-2 flex flex-wrap gap-2">
									{ELSEWHERE.map((item) => (
										<li key={item.href}>
											<Link
												href={item.href}
												className="inline-flex min-h-control items-center rounded-full border border-line-strong px-4 text-sm font-medium text-ink transition-ui pressable hover:-translate-y-0.5 hover:border-accent hover:text-accent-text"
											>
												{item.label}
											</Link>
										</li>
									))}
								</ul>
							</nav>
						</Reveal>
					</div>
				</Container>
			</Section>
		</main>
	);
}
