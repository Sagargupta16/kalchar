import { ChevronDown, CircleHelp } from "lucide-react";
import Link from "next/link";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
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
 * FAQPage JSON-LD. Native details owns disclosure behavior; the page-local CSS
 * fades and lifts each answer when opened.
 */
export default function TrustPage() {
	if (faqs.length === 0) {
		return (
			<main className={styles.page}>
				<Section background="wash" padded containerClassName="py-(--space-block)">
					<PageHeader eyebrow={eyebrow} title={pageTitle} lead={pageLead} />
				</Section>
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
			<Section background="wash" padded containerClassName="py-(--space-block)">
				<PageHeader eyebrow={eyebrow} title={pageTitle} lead={pageLead} />
			</Section>

			<Section
				padded
				containerClassName="grid gap-8 pt-(--space-block) lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:gap-12"
			>
				{/* The list shares the h1's left axis and stays prose-measured (2.10). */}
				<div className="max-w-(--prose-max) divide-y divide-line border-y border-line">
					{faqs.map((faq, i) => (
						<Reveal key={faq.question} delayMs={staggerDelay(i)}>
							<details className="group">
								<summary className="flex min-h-control cursor-pointer items-center justify-between gap-4 rounded-md px-3 py-4 text-left text-base font-medium text-ink transition-colors pressable hover:bg-canvas group-open:bg-(--section-wash) [&::-webkit-details-marker]:hidden">
									<span className={styles.question}>{faq.question}</span>
									<ChevronDown
										size={18}
										aria-hidden="true"
										className="shrink-0 text-muted transition-transform group-open:rotate-180"
									/>
								</summary>
								{/* Native details owns the layout; only the answer's opacity
								    and transform animate on opening. */}
								<div className={styles.answer}>
									<div className="overflow-hidden">
										<p className="t-body px-3 pb-5 pt-3">{faq.answer}</p>
									</div>
								</div>
							</details>
						</Reveal>
					))}
				</div>
				<aside className="self-start rounded-md border border-line bg-canvas p-(--card-pad) lg:sticky lg:top-[calc(var(--header-h-shrunk)+var(--space-page))]">
					<h2 className="t-display text-h3">Need help with a particular piece?</h2>
					<p className="mt-3 text-sm leading-relaxed text-muted">
						Share the artwork name or link and your question. We can talk through the details with
						you.
					</p>
					<Link
						href="/contact"
						className={cn(buttonVariants({ variant: "primary" }), "mt-5 w-full whitespace-normal")}
					>
						Ask us a question
					</Link>
					<Link
						href="/work"
						className={cn(
							buttonVariants({ variant: "link" }),
							"mt-2 min-h-control w-full whitespace-normal text-center text-ink",
						)}
					>
						Explore the artwork
					</Link>
				</aside>
			</Section>
		</main>
	);
}
