import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import type { Artwork } from "@/lib/types";
import { cn, formatInr } from "@/lib/utils";
import { ShareButton } from "./share-button";

interface ArtworkCtaPanelProps {
	art: Artwork;
	whatsappLink: string;
	cta: { label: string; note: string };
	isAvailable: boolean;
	isSold: boolean;
	/** Human-readable number from site.json (contact.whatsapp.display); the fallback line needs it. */
	whatsappDisplay?: string;
}

/**
 * Detail-page price + enquiry inset. `id="enquire"` is observed by the phone
 * EnquiryBar, which hides itself while this panel is on screen.
 */
export function ArtworkCtaPanel({
	art,
	whatsappLink,
	cta,
	isAvailable,
	isSold,
	whatsappDisplay,
}: Readonly<ArtworkCtaPanelProps>) {
	return (
		<section
			id="enquire"
			aria-labelledby="enquire-heading"
			className="mt-(--space-block) rounded-(--radius-md) border border-line bg-canvas p-(--card-pad)"
		>
			<h2 id="enquire-heading" className="sr-only">
				Price and enquiry
			</h2>
			{typeof art.priceInr === "number" ? (
				<div className="mb-4 flex items-baseline justify-between gap-3">
					<span className="t-meta normal-case tracking-normal">Price</span>
					<span className="t-display whitespace-nowrap text-title text-(--section-accent) tabular-nums">
						{formatInr(art.priceInr)}
					</span>
				</div>
			) : null}
			{/* Honest scarcity: every piece is a single physical original, so
			    say so plainly on an available piece. No timers, no fake stock. */}
			{isAvailable && !isSold ? (
				<p className="mb-4 text-xs text-muted">One of a kind, the only original. Not a print.</p>
			) : null}
			<a
				href={whatsappLink}
				target="_blank"
				rel="noopener noreferrer"
				className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full")}
			>
				<MessageCircle size={16} aria-hidden="true" />
				{cta.label}
			</a>
			<p className="mt-3 text-xs text-muted">{cta.note}</p>
			{whatsappDisplay ? (
				<p className="mt-1 text-xs text-muted">
					If WhatsApp does not open, message us at{" "}
					<span className="select-all whitespace-nowrap tabular-nums text-ink">
						{whatsappDisplay}
					</span>
					.
				</p>
			) : null}
			{/* Share and See more share one row wherever they fit (px-4 and no arrow
			    glyph keep the pair inside the md:col-span-5 panel at 1280 for every
			    style name); on phones they wrap to two full-width rows. */}
			<div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
				<ShareButton
					title={art.title}
					url={`${siteConfig.url}/work/${art.slug}/`}
					className="flex-auto px-4"
				/>
				<Link
					href={`/work?style=${encodeURIComponent(art.style)}`}
					className={cn(buttonVariants({ variant: "ghost" }), "flex-auto px-4")}
				>
					See more {art.style}
				</Link>
			</div>
		</section>
	);
}
