"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { buttonVariants } from "@/components/ui/button";
import { isPositivePrice } from "@/lib/catalog";
import { siteConfig } from "@/lib/site-config";
import type { Artwork } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";
import { ShareButton } from "./share-button";

interface LightboxSidebarProps {
	artwork: Artwork;
	whatsappLink: string;
	ctaLabel: string;
	isSold: boolean;
	/** A single tap quiets the details; the enquiry action remains available. */
	chromeHidden?: boolean;
}

/** A compact bottom card on phones becomes a reading column on desktop.
 * Only the information scrolls: the primary action and Share stay in view. */
export function LightboxSidebar({
	artwork,
	whatsappLink,
	ctaLabel,
	isSold,
	chromeHidden = false,
}: Readonly<LightboxSidebarProps>) {
	const [expandedSlug, setExpandedSlug] = useState<string | null>(null);
	const expanded = expandedSlug === artwork.slug;
	const isAvailable = isPositivePrice(artwork.priceInr);
	const hasPrice = isAvailable && !isSold && typeof artwork.priceInr === "number";

	return (
		<aside
			aria-label="About this artwork"
			className={cn(
				"flex max-h-[48dvh] min-h-0 flex-col overflow-hidden rounded-md border text-ink transition-ui md:max-h-full",
				chromeHidden
					? "border-transparent bg-transparent"
					: "border-line/40 bg-surface-raised shadow-e2",
			)}
		>
			<div
				inert={chromeHidden || undefined}
				className={cn(
					"min-h-0 overflow-y-auto overscroll-contain p-4 transition-ui md:flex-1 md:p-6",
					chromeHidden && "pointer-events-none opacity-0",
				)}
			>
				<p className="t-meta text-muted">{artwork.style}</p>
				<h2
					id="lightbox-title"
					className="t-display mt-2 text-title text-balance [overflow-wrap:anywhere] md:text-h2"
				>
					{artwork.title}
				</h2>
				{!hasPrice ? (
					<p className="mt-2 text-sm text-muted">{isSold ? "Sold" : "Not listed for sale"}</p>
				) : null}
				<dl className="mt-4 grid grid-cols-3 gap-3 md:mt-6 md:grid-cols-1 md:gap-4">
					<MetaRow label="Medium" value={artwork.medium} />
					{artwork.year ? <MetaRow label="Year" value={String(artwork.year)} /> : null}
					{artwork.dimensions ? <MetaRow label="Dimensions" value={artwork.dimensions} /> : null}
				</dl>
				{artwork.description ? (
					<div className="mt-2 md:mt-6">
						<button
							type="button"
							aria-expanded={expanded}
							aria-controls="lightbox-description"
							onClick={() => setExpandedSlug(expanded ? null : artwork.slug)}
							className="flex min-h-control w-full items-center justify-between gap-3 text-left text-sm font-medium md:hidden"
						>
							{expanded ? "Less about this piece" : "About this piece"}
							<ChevronDown
								size={16}
								aria-hidden="true"
								className={cn("transition-ui", expanded && "rotate-180")}
							/>
						</button>
						<p
							id="lightbox-description"
							className={cn(
								"text-sm leading-relaxed text-ink-soft md:block",
								!expanded && "hidden",
							)}
						>
							{artwork.description}
						</p>
					</div>
				) : null}
			</div>
			<div className="flex shrink-0 items-center gap-2 rounded-md bg-surface-raised p-3 pt-0 md:p-4 md:pt-0">
				{hasPrice ? (
					<p className="t-numeral shrink-0 whitespace-nowrap text-sm tabular-nums md:text-base">
						{formatInr(artwork.priceInr as number)}
					</p>
				) : null}
				<a
					href={whatsappLink}
					target="_blank"
					rel="noopener noreferrer"
					aria-label={ctaLabel}
					className={cn(
						buttonVariants({ variant: "primary", size: "lg" }),
						"min-w-0 flex-1 whitespace-normal px-3 text-center",
					)}
				>
					{hasPrice ? "Enquire" : ctaLabel}
				</a>
				<ShareButton
					iconOnly
					title={`${artwork.title} by Megha Seth`}
					url={`${siteConfig.url}/work/${artwork.slug}/`}
				/>
			</div>
		</aside>
	);
}

function MetaRow({ label, value }: Readonly<{ label: string; value: string }>) {
	return (
		<div className="min-w-0 md:flex md:justify-between md:gap-4">
			<dt className="text-xs text-muted">{label}</dt>
			<dd className="mt-1 text-sm font-medium text-pretty md:mt-0 md:text-right">{value}</dd>
		</div>
	);
}
