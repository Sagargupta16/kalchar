import { Calendar, ImageIcon, Palette, Ruler, Shapes } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { PaletteSwatches } from "@/components/gallery/palette-swatches";
import { Reveal } from "@/components/motion/reveal";
import { Section } from "@/components/ui/section";
import { staggerDelay } from "@/lib/motion";
import type { Artwork } from "@/lib/types";

interface Fact {
	label: string;
	icon: ReactNode;
	value: ReactNode;
}

/**
 * The detail page's second spread, on paper under the painted wall: the
 * piece's own description set large in the italic display voice, the facts
 * as a hairline grid (dt / dd pairs, so the labels stay machine-readable)
 * and the palette discs sampled from the painting.
 */
export function ArtworkStory({ art }: Readonly<{ art: Artwork }>) {
	const facts: Fact[] = [
		{
			label: "Style",
			icon: <Shapes size={13} aria-hidden="true" />,
			value: (
				<Link
					href={`/work?style=${encodeURIComponent(art.style)}`}
					className="underline decoration-(--color-gold-hairline) underline-offset-4 transition-colors hover:text-accent-text"
				>
					{art.style}
				</Link>
			),
		},
		{ label: "Medium", icon: <ImageIcon size={13} aria-hidden="true" />, value: art.medium },
	];
	if (art.year) {
		facts.push({ label: "Year", icon: <Calendar size={13} aria-hidden="true" />, value: art.year });
	}
	if (art.dimensions) {
		facts.push({
			label: "Dimensions",
			icon: <Ruler size={13} aria-hidden="true" />,
			value: art.dimensions,
		});
	}
	const hasPalette = Boolean(art.palette && art.palette.length > 0);

	return (
		<Section accent="accent" padded>
			<div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
				<div className="lg:col-span-7">
					<Reveal>
						<p className="t-eyebrow flex items-center gap-3">
							<span aria-hidden="true" className="h-px w-8 bg-(--section-accent)" />
							About the piece
						</p>
					</Reveal>
					{art.description ? (
						<Reveal delayMs={staggerDelay(1)}>
							<p className="t-display mt-5 max-w-(--measure-essay) text-title text-ink text-pretty">
								{art.description}
							</p>
						</Reveal>
					) : null}
					<dl className="mt-10 grid grid-cols-2 border-t border-line sm:grid-cols-4">
						{facts.map((fact, i) => (
							<Reveal
								key={fact.label}
								delayMs={staggerDelay(i + 1)}
								className="border-b border-line py-4 pr-4"
							>
								<dt className="t-meta normal-case tracking-normal">
									<span className="inline-flex items-center gap-1.5">
										{fact.icon} {fact.label}
									</span>
								</dt>
								<dd className="mt-2 text-base font-medium text-ink">{fact.value}</dd>
							</Reveal>
						))}
					</dl>
				</div>

				{hasPalette ? (
					<div className="lg:col-span-5 lg:pt-10">
						<p className="t-meta inline-flex items-center gap-1.5 normal-case tracking-normal">
							<Palette size={13} aria-hidden="true" /> Palette
						</p>
						<PaletteSwatches
							palette={art.palette}
							label={`Palette sampled from ${art.title}`}
							className="mt-4"
						/>
						<p className="mt-4 max-w-xs text-sm text-muted">
							Sampled from the painting itself: the pigments it is built from.
						</p>
					</div>
				) : null}
			</div>
		</Section>
	);
}
