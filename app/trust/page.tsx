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
import styles from "./trust.module.css";

const site = getSite();
const trust = site.trust;

export const metadata = createPageMetadata({
	title: trust?.title ?? "FAQ",
	description: trust?.lead ?? site.brand.description,
	path: "/trust/",
});

/**
 * Trust / FAQ page: how buying an original over WhatsApp works, shipping, care,
 * returns, and authenticity. Content is fully editable in data/site.json (read
 * via the sync getSite()), so the maintainer changes copy without a deploy.
 *
 * The accordion is a native <details>/<summary> -- accessible and
 * keyboard-friendly with no JS. Opening animates the answer's grid rows
 * 0fr -> 1fr (trust.module.css; reduced motion opens instantly); the open
 * summary tints on the section wash. FAQPage JSON-LD is emitted from the same
 * content for rich results. Header per the 2.0 standard: grand rhythm on the
 * default terracotta wash (visual-direction 2.10).
 */
export default function TrustPage() {
	if (!trust || trust.faqs.length === 0) {
		return (
			<main>
				<Section background="wash" rhythm="grand" padded>
					<PageHeader kachni eyebrow="FAQ" title="Frequently asked questions" />
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
		mainEntity: trust.faqs.map((f) => ({
			"@type": "Question",
			name: f.question,
			acceptedAnswer: { "@type": "Answer", text: f.answer },
		})),
	};

	return (
		<main>
			<script
				type="application/ld+json"
				// biome-ignore lint/security/noDangerouslySetInnerHtml: FAQPage JSON-LD, angle brackets escaped
				dangerouslySetInnerHTML={{
					__html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
				}}
			/>
			<Section background="wash" rhythm="grand" padded>
				<PageHeader kachni eyebrow={trust.eyebrow ?? "FAQ"} title={trust.title} lead={trust.lead} />
			</Section>

			<Section padded containerClassName="pt-(--space-block)">
				{/* The list shares the h1's left axis and stays prose-measured (2.10). */}
				<div className="max-w-(--prose-max) divide-y divide-line border-y border-line">
					{trust.faqs.map((faq, i) => (
						<Reveal key={faq.question} delayMs={staggerDelay(i)}>
							<details className="group">
								<summary className="-mx-3 flex min-h-control cursor-pointer items-center justify-between gap-4 rounded-(--radius-sm) px-3 py-3 text-left text-sm font-medium text-ink transition-colors pressable group-open:bg-(--section-wash) [&::-webkit-details-marker]:hidden">
									{faq.question}
									<ChevronDown
										size={18}
										aria-hidden="true"
										className="shrink-0 text-muted transition-transform group-open:rotate-180"
									/>
								</summary>
								{/* Rows animate 0fr -> 1fr on open; the inner box hides the
								    overflow while the row grows. */}
								<div className={styles.answer}>
									<div className="overflow-hidden">
										<p className="t-body pb-4 pt-1">{faq.answer}</p>
									</div>
								</div>
							</details>
						</Reveal>
					))}
				</div>
			</Section>
		</main>
	);
}
