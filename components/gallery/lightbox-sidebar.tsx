"use client";

import { Calendar, ImageIcon, MessageCircle, Ruler } from "lucide-react";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import type { Artwork } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";
import { Chromacard } from "./chromacard";
import { ShareButton } from "./share-button";

interface LightboxSidebarProps {
	artwork: Artwork;
	position: number;
	total: number;
	whatsappLink: string;
	ctaLabel: string;
}

/**
 * Lightbox metadata column. On phones the buy bar (price + WhatsApp) sticks to
 * the panel's bottom edge so the answer is on the first screen of the modal; at
 * md+ it is a plain block under the metadata. Share stays the last control (the
 * focus-trap test relies on it).
 */
export function LightboxSidebar({
	artwork,
	position,
	total,
	whatsappLink,
	ctaLabel,
}: Readonly<LightboxSidebarProps>) {
	const hasPrice = typeof artwork.priceInr === "number";
	return (
		<div className="flex flex-col border-t border-line p-(--card-pad) md:col-span-4 md:min-h-0 md:overflow-y-auto md:border-l md:border-t-0">
			<div className="md:flex-1">
				<div className="flex items-baseline justify-between gap-3">
					<p className="t-eyebrow">{artwork.style}</p>
					{total > 1 ? (
						<p className="t-meta" aria-live="polite" aria-atomic="true">
							{position} of {total}
						</p>
					) : null}
				</div>
				<h2 id="lightbox-title" className="t-display mt-2 text-title">
					{artwork.title}
				</h2>
				{artwork.description ? (
					<p className="mt-3 text-sm leading-relaxed text-muted">{artwork.description}</p>
				) : null}
				<dl className="mt-5 space-y-3 border-t border-line pt-4 text-sm">
					<MetaRow
						icon={<ImageIcon size={13} aria-hidden="true" />}
						label="Medium"
						value={artwork.medium}
					/>
					{artwork.year ? (
						<MetaRow
							icon={<Calendar size={13} aria-hidden="true" />}
							label="Year"
							value={String(artwork.year)}
						/>
					) : null}
					{artwork.dimensions ? (
						<MetaRow
							icon={<Ruler size={13} aria-hidden="true" />}
							label="Dimensions"
							value={artwork.dimensions}
						/>
					) : null}
				</dl>
				{artwork.palette && artwork.palette.length > 0 ? (
					<div className="mt-6">
						<p className="t-meta">Palette</p>
						<Chromacard
							palette={artwork.palette}
							ariaLabel={`Palette for ${artwork.title}`}
							className="mt-2"
						/>
					</div>
				) : null}
			</div>

			{/* Buy bar: sticky to the panel's bottom edge on phones so price and the
			    WhatsApp action are on the first screen of the modal; a plain block at md+. */}
			<div className="sticky bottom-0 -mx-(--card-pad) mt-6 flex items-center justify-between gap-3 border-t border-line bg-surface-raised/95 px-(--card-pad) py-3 backdrop-blur md:static md:mx-0 md:block md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
				{hasPrice ? (
					<div className="min-w-0 md:mb-3 md:flex md:items-baseline md:justify-between md:gap-3">
						<span className="t-meta block normal-case tracking-normal">Price</span>
						<span className="t-display block whitespace-nowrap text-title text-accent-text tabular-nums">
							{formatInr(artwork.priceInr as number)}
						</span>
					</div>
				) : null}
				<a
					href={whatsappLink}
					target="_blank"
					rel="noopener noreferrer"
					className={cn(
						buttonVariants({ variant: "primary", size: "lg" }),
						"min-w-0 flex-1 whitespace-normal text-center md:w-full md:flex-none",
					)}
				>
					<MessageCircle size={16} aria-hidden="true" />
					{ctaLabel}
				</a>
			</div>
			<ShareButton
				title={`${artwork.title} by Megha Seth`}
				url={`${siteConfig.url}/work/${artwork.slug}/`}
				className="mt-3 w-full"
			/>
		</div>
	);
}

function MetaRow({
	icon,
	label,
	value,
}: Readonly<{ icon: ReactNode; label: string; value: string }>) {
	return (
		<div className="flex justify-between gap-4">
			<dt className="t-meta flex shrink-0 items-center gap-1.5 normal-case tracking-normal">
				<span className="text-muted">{icon}</span> {label}
			</dt>
			<dd className="min-w-0 text-right font-medium text-ink text-pretty">{value}</dd>
		</div>
	);
}
