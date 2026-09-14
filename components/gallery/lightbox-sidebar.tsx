"use client";

import { Calendar, ImageIcon, MessageCircle, Ruler } from "lucide-react";
import { type ReactNode, useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { isPositivePrice } from "@/lib/catalog";
import { siteConfig } from "@/lib/site-config";
import type { Artwork } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";
import { Chromacard } from "./chromacard";
import { ShareButton } from "./share-button";
import { WallLabel } from "./wall-label";

interface LightboxSidebarProps {
	artwork: Artwork;
	position: number;
	total: number;
	whatsappLink: string;
	ctaLabel: string;
	isSold: boolean;
	/** Single-tap chrome toggle: the caption fades, the buy bar never does. */
	chromeHidden?: boolean;
}

/**
 * Lightbox caption column (visual-direction 2.4): the museum wall label in
 * scrim tone on the deep room, the description (clamp-3 on phones, tap
 * expands), the metadata rows on bg/15 hairlines, and the buy bar (the C
 * graft) pinned to the panel's bottom edge on phones with the price, the one
 * primary and Share as a 44px icon. Share stays the last control (the
 * focus-trap test relies on it).
 */
export function LightboxSidebar({
	artwork,
	position,
	total,
	whatsappLink,
	ctaLabel,
	isSold,
	chromeHidden = false,
}: Readonly<LightboxSidebarProps>) {
	const [expanded, setExpanded] = useState(false);
	const isAvailable = isPositivePrice(artwork.priceInr);
	const hasPrice = isAvailable && !isSold && typeof artwork.priceInr === "number";

	let statusSlot: string | undefined;
	if (isSold) statusSlot = "Sold";
	else if (!isAvailable) statusSlot = "Not listed for sale";

	return (
		<div className="flex flex-col p-(--card-pad) md:col-span-4 md:min-h-0 md:overflow-y-auto">
			{/* Hidden chrome goes inert with the fade so the expand button leaves
			    the tab order, not just the paint. */}
			<div
				inert={chromeHidden || undefined}
				className={cn("transition-ui md:flex-1", chromeHidden && "pointer-events-none opacity-0")}
			>
				{/* The visual counters are chrome (aria-hidden); one sr-only live
				    region announces paging for everyone. */}
				{total > 1 ? (
					<p
						aria-hidden="true"
						className="t-meta mb-3 hidden tabular-nums text-bg/80 dark:text-ink/80 md:block"
					>
						{String(position).padStart(2, "0")} / {total}
					</p>
				) : null}
				<WallLabel
					variant="full"
					tone="scrim"
					mark
					stagger
					title={artwork.title}
					meta={[artwork.style, artwork.medium, artwork.year ? String(artwork.year) : ""].filter(
						Boolean,
					)}
					price={hasPrice ? formatInr(artwork.priceInr as number) : undefined}
					status={statusSlot}
					headingLevel="h2"
					titleId="lightbox-title"
				/>
				{artwork.description ? (
					<button
						type="button"
						aria-expanded={expanded}
						onClick={() => setExpanded((current) => !current)}
						className="mt-3 block text-left"
					>
						<p
							className={cn(
								"text-sm leading-relaxed text-bg/80 dark:text-ink/80",
								!expanded && "line-clamp-3 md:line-clamp-none",
							)}
						>
							{artwork.description}
						</p>
					</button>
				) : null}
				<dl className="mt-5 space-y-3 border-t border-bg/15 pt-4 text-sm dark:border-ink/15">
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
						<p className="t-meta text-bg/70 dark:text-ink/70">Palette</p>
						<Chromacard
							palette={artwork.palette}
							ariaLabel={`Palette for ${artwork.title}`}
							className="mt-2"
						/>
					</div>
				) : null}
			</div>

			{/* Buy bar (the C graft): pinned to the panel's bottom edge on phones so
			    price and the WhatsApp action are on the first screen of the modal;
			    a surface block in the column flow at md+. Never hidden by the
			    chrome toggle. */}
			<div className="sticky bottom-0 z-raised -mx-(--card-pad) mt-6 flex items-center gap-3 border-t border-(--color-gold-hairline) bg-surface-raised/95 px-4 py-3 pb-[max(--spacing(3),var(--spacing-safe-bottom))] backdrop-blur md:static md:mx-0 md:rounded-(--radius-md) md:pb-3">
				{hasPrice ? (
					<span className="t-numeral min-w-0 shrink-0 whitespace-nowrap text-title text-accent-text tabular-nums">
						{formatInr(artwork.priceInr as number)}
					</span>
				) : null}
				<a
					href={whatsappLink}
					target="_blank"
					rel="noopener noreferrer"
					className={cn(
						buttonVariants({ variant: isSold ? "secondary" : "primary", size: "lg" }),
						"min-w-0 flex-1 whitespace-normal text-center",
					)}
				>
					<MessageCircle size={16} aria-hidden="true" />
					{ctaLabel}
				</a>
				<ShareButton
					iconOnly
					title={`${artwork.title} by Megha Seth`}
					url={`${siteConfig.url}/work/${artwork.slug}/`}
				/>
			</div>
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
			<dt className="t-meta flex shrink-0 items-center gap-1.5 normal-case tracking-normal text-bg/70 dark:text-ink/70">
				{icon} {label}
			</dt>
			<dd className="min-w-0 text-right font-medium text-bg text-pretty dark:text-ink">{value}</dd>
		</div>
	);
}
