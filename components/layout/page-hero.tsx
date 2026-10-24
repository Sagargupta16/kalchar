import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { cn } from "@/lib/utils";

type HeroAccent = "accent" | "marigold" | "pichwai" | "vermillion" | "peacock" | "ruby";

interface PageHeroProps {
	accent: HeroAccent;
	eyebrow: string;
	title: string;
	lead?: string;
	/** Oversized Devanagari word drawn as a drifting outline behind the copy. */
	glyph?: string;
	/** Rendered under the lead inside the header column (links, chips, actions). */
	children?: ReactNode;
	/** Right column from lg (facts panel, quick actions); stacks under on phones. */
	aside?: ReactNode;
	className?: string;
}

/**
 * The opening band for the conversion pages (workshops, custom orders,
 * contact, FAQ, the 404): a deep pigment slab in the page accent with cream
 * type (Section background="pigment"), the shared PageHeader choreography on
 * paint, and one outlined Devanagari word drifting behind it. The home page
 * alternates paper and pigment; these pages open on pigment so the first
 * screen reads confident, not faded.
 */
export function PageHero({
	accent,
	eyebrow,
	title,
	lead,
	glyph,
	children,
	aside,
	className,
}: Readonly<PageHeroProps>) {
	return (
		<Section
			accent={accent}
			background="pigment"
			className={cn("overflow-hidden dark:[--band-mix:42%]", className)}
		>
			<Container className="relative">
				{glyph ? (
					<span aria-hidden="true" lang="hi" className="page-hero-glyph">
						{glyph}
					</span>
				) : null}
				<div
					className={cn(
						"relative z-10 grid gap-10 pt-10 pb-12 sm:pt-14 lg:pt-20 lg:pb-20",
						aside && "lg:grid-cols-12 lg:items-end lg:gap-12",
					)}
				>
					<div className={cn("min-w-0", aside && "lg:col-span-7")}>
						<PageHeader eyebrow={eyebrow} title={title} lead={lead}>
							{children}
						</PageHeader>
					</div>
					{aside ? <div className="min-w-0 lg:col-span-5">{aside}</div> : null}
				</div>
			</Container>
		</Section>
	);
}
