import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/lib/site-config";
import type { Artwork } from "@/lib/types";
import { cn } from "@/lib/utils";
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
 * Detail-page enquiry inset (visual-direction 2.3, the B graft). The price
 * renders once, in the wall label above; the panel carries the full-width
 * primary, the WhatsApp display fallback and the share row. Sold pieces get
 * the commission intent as a secondary action plus a one-line jump to the
 * available collection. `id="enquire"` is observed by the phone EnquiryBar,
 * which hides itself while this panel is on screen. The e1 shadow matches
 * the site's other content panels.
 */
export function ArtworkCtaPanel({
	art,
	whatsappLink,
	cta,
	isSold,
	whatsappDisplay,
}: Readonly<ArtworkCtaPanelProps>) {
	return (
		<section
			id="enquire"
			aria-labelledby="enquire-heading"
			className="mt-(--space-block) rounded-(--radius-md) border border-line bg-canvas p-(--card-pad) shadow-e1"
		>
			<h2 id="enquire-heading" className="sr-only">
				Price and enquiry
			</h2>
			<a
				href={whatsappLink}
				target="_blank"
				rel="noopener noreferrer"
				className={cn(
					buttonVariants({ variant: isSold ? "secondary" : "primary", size: "lg" }),
					"w-full whitespace-normal text-center",
				)}
			>
				<MessageCircle size={16} aria-hidden="true" />
				{cta.label}
			</a>
			{isSold ? (
				<p className="mt-3 text-sm">
					<Link
						href="/work?view=available"
						className="text-accent-text underline-offset-4 transition-colors hover:underline"
					>
						Browse available artwork
					</Link>
				</p>
			) : null}
			<p className="mt-3 text-xs text-muted">{cta.note}</p>
			{whatsappDisplay ? (
				<p className="mt-1 text-xs text-muted">
					If WhatsApp does not open, message us at{" "}
					<span className="select-all whitespace-nowrap tabular-nums text-ink">
						{whatsappDisplay}
					</span>
					{"."}
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
					className={cn(
						buttonVariants({ variant: "ghost" }),
						"min-w-0 flex-auto whitespace-normal px-4 text-center",
					)}
				>
					See more {art.style}
				</Link>
			</div>
		</section>
	);
}
