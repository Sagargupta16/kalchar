"use client";

import { Clock, MessageCircle } from "lucide-react";
import type { CSSProperties } from "react";
import { KineticText } from "@/components/motion/kinetic-text";
import { useViewReveal } from "@/components/motion/use-view-reveal";
import { buttonVariants } from "@/components/ui/button";
import { cn, toRoman } from "@/lib/utils";

export interface LedgerWorkshop {
	slug: string;
	title: string;
	blurb: string;
	durationHours?: number;
	enquireUrl: string;
}

/**
 * The programme as an editorial ledger: one hairline row per workshop under a
 * gold opening rule. Each row plays its own entrance when it scrolls in: the
 * big roman numeral slides in from the left, the title rides up word by word
 * out of its masks, then the blurb, duration chip and enquiry rise. Rows are
 * not links (the enquiry button is), so the row itself never changes on hover.
 */
export function WorkshopLedger({ workshops }: Readonly<{ workshops: readonly LedgerWorkshop[] }>) {
	return (
		<ul className="divide-y divide-line border-t border-(--color-gold-hairline)">
			{workshops.map((item, i) => (
				<LedgerRow key={item.slug} item={item} index={i} />
			))}
		</ul>
	);
}

function LedgerRow({ item, index }: Readonly<{ item: LedgerWorkshop; index: number }>) {
	const [ref, state] = useViewReveal<HTMLLIElement>();
	const words = item.title.trim().split(/\s+/).length;
	const after = { "--after-step": Math.min(words, 4) } as CSSProperties;
	const hours = item.durationHours;
	return (
		<li
			ref={ref}
			data-motion-reveal
			data-reveal={state}
			className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-4 py-8 sm:grid-cols-[5rem_minmax(0,1fr)] md:grid-cols-12 md:items-start md:gap-x-8 md:py-12"
		>
			<span
				aria-hidden="true"
				className="t-numeral reveal-eyebrow pt-1 text-h1 md:text-display text-(--section-accent) md:col-span-2"
			>
				{toRoman(index + 1)}
			</span>
			<div className="min-w-0 md:col-span-6">
				<h2 id={item.slug} className="t-headline wrap-anywhere scroll-mt-(--space-page) text-title">
					<KineticText text={item.title} />
				</h2>
				<p
					className="reveal-after wrap-anywhere mt-3 max-w-prose whitespace-pre-line text-base leading-relaxed text-muted"
					style={after}
				>
					{item.blurb}
				</p>
			</div>
			<div
				className="reveal-after col-start-2 mt-5 flex min-w-0 items-center gap-3 md:col-span-4 md:col-start-9 md:mt-1 md:flex-col md:items-end"
				style={after}
			>
				{hours ? (
					<p className="inline-flex shrink-0 items-center gap-2 rounded-full border border-line bg-canvas px-3 py-2 text-sm font-medium text-ink">
						<Clock size={14} aria-hidden="true" className="text-(--section-accent)" />
						{hours} {hours === 1 ? "hour" : "hours"}
					</p>
				) : null}
				{/* The enquiry fills its own cell: the rest of the row beside the chip on phones. */}
				<div className="min-w-0 flex-1 md:w-auto md:flex-none">
					<a
						href={item.enquireUrl}
						target="_blank"
						rel="noopener noreferrer"
						aria-label={`Enquire on WhatsApp about ${item.title}`}
						className={cn(
							buttonVariants({ variant: "secondary" }),
							"w-full max-w-full whitespace-normal text-center md:w-auto",
						)}
					>
						<MessageCircle size={14} aria-hidden="true" />
						<span className="sm:hidden">Enquire</span>
						<span className="hidden sm:inline">Enquire on WhatsApp</span>
					</a>
				</div>
			</div>
		</li>
	);
}
