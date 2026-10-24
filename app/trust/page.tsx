import { ArrowRight, CircleHelp, MessageCircle } from "lucide-react";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Section } from "@/components/ui/section";
import { getSite } from "@/lib/data";
import { staggerDelay } from "@/lib/motion";
import { createPageMetadata } from "@/lib/page-metadata";
import { cn } from "@/lib/utils";
import styles from "./trust.module.css";

const site = getSite();
const trust = site.trust;
const pageTitle = trust?.title?.trim() || "Frequently asked questions";
const pageLead = trust?.lead?.trim();
const eyebrow = trust?.eyebrow?.trim() || "FAQ";
const faqs = (trust?.faqs ?? []).filter(
	({ question, answer }) => question.trim().length > 0 && answer.trim().length > 0,
);

export const metadata = createPageMetadata({
	title: pageTitle,
	description: pageLead || site.brand.description,
	path: "/trust/",
});

/**
 * Complete FAQ entries from getSite() feed both the native disclosures and
 * FAQPage JSON-LD. Native details owns disclosure behaviour (keyboard, find
 * in page, no JS); the page-local CSS grows each answer smoothly, folds the
 * plus into a minus and fades the answer up as it opens.
 */
export default function TrustPage() {
	const hero = (
		<PageHero
			className="[--band-mix:40%]"
			accent="marigold"
			glyph="प्रश्न"
			eyebrow={eyebrow}
			title={pageTitle}
			lead={pageLead}
		/>
	);

	if (faqs.length === 0) {
		return (
			<main className={styles.page}>
				{hero}
				<Section padded containerClassName="pt-(--space-block)">
					<EmptyState
						icon={<CircleHelp size={24} aria-hidden="true" />}
						title="No answers posted yet"
						body="Ask us on WhatsApp and we will reply with the details."
						action={
							<Link href="/contact" className={buttonVariants({ variant: "secondary" })}>
								Contact us
							</Link>
						}
					/>
				</Section>
			</main>
		);
	}

	const jsonLd = {
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: faqs.map((faq) => ({
			"@type": "Question",
			name: faq.question,
			acceptedAnswer: { "@type": "Answer", text: faq.answer },
		})),
	};

	return (
		<main className={styles.page}>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: FAQPage JSON-LD, angle brackets escaped
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(jsonLd).replaceAll("<", String.raw`\u003c`),
				}}
			/>
			{hero}

			<Section
				accent="marigold"
				padded
				containerClassName="grid gap-10 pt-(--space-canyon) lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-14"
			>
				{/* The list shares the h1's left axis and stays prose-measured. */}
				<div className="max-w-(--prose-max) divide-y divide-line border-y border-line">
					{faqs.map((faq, i) => (
						<Reveal key={faq.question} delayMs={staggerDelay(i)}>
							<details className={cn("group", styles.item)}>
								<summary className="flex min-h-control cursor-pointer items-start gap-4 rounded-(--radius-md) px-3 py-5 text-left text-ink transition-colors pressable hover:bg-canvas group-open:bg-canvas sm:gap-6 sm:px-4 [&::-webkit-details-marker]:hidden">
									<span
										aria-hidden="true"
										className="t-numeral w-8 shrink-0 pt-0.5 text-title text-accent-text sm:w-10"
									>
										{String(i + 1).padStart(2, "0")}
									</span>
									<span
										className={cn(
											"t-headline flex-1 pt-1 text-h3 transition-colors group-hover:text-accent-text",
											styles.question,
										)}
									>
										{faq.question}
									</span>
									<span
										aria-hidden="true"
										className={cn(
											"relative grid size-10 shrink-0 place-items-center rounded-full border border-line text-ink group-open:border-(--section-accent) group-open:bg-(--section-accent) group-open:text-bg",
											styles.plus,
										)}
									>
										<span className="absolute h-0.5 w-3.5 rounded-full bg-current" />
										<span
											className={cn("absolute h-3.5 w-0.5 rounded-full bg-current", styles.plusBar)}
										/>
									</span>
								</summary>
								<div className={styles.answer}>
									<p className="t-body pt-1 pr-4 pb-6 pl-15 sm:pl-20">{faq.answer}</p>
								</div>
							</details>
						</Reveal>
					))}
				</div>
				<Reveal
					as="aside"
					delayMs={staggerDelay(2)}
					className="band-pigment self-start [--band-mix:40%] overflow-hidden rounded-(--radius-sheet) lg:sticky lg:top-[calc(var(--header-h-shrunk)+var(--space-page))]"
				>
					<div className="p-(--card-pad-lg) sm:p-8">
						<span
							aria-hidden="true"
							className="grid size-12 place-items-center rounded-full bg-(--section-accent) text-bg"
						>
							<MessageCircle size={20} />
						</span>
						<h2 className="t-headline mt-5 text-title">Need help with a particular piece?</h2>
						<p className="mt-3 text-sm leading-relaxed text-muted">
							Share the artwork name or link and your question. We can talk through the details with
							you.
						</p>
						<Link
							href="/contact"
							className={cn(
								buttonVariants({ variant: "primary", size: "lg" }),
								"mt-6 w-full whitespace-normal",
							)}
						>
							Ask us a question
							<ArrowRight size={16} aria-hidden="true" />
						</Link>
						<Link
							href="/work"
							className={cn(
								buttonVariants({ variant: "link" }),
								"mt-3 min-h-control w-full whitespace-normal text-center text-ink",
							)}
						>
							Explore the artwork
						</Link>
					</div>
				</Reveal>
			</Section>
		</main>
	);
}
