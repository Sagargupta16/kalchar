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
 * keyboard-friendly with no JS, and reduced-motion-safe by construction.
 * FAQPage JSON-LD is emitted from the same content for rich results.
 */
export default function TrustPage() {
	if (!trust || trust.faqs.length === 0) {
		return (
			<main>
				<Section accent="peacock" padded>
					<PageHeader eyebrow="FAQ" title="Frequently asked questions" />
					<EmptyState
						className="mt-(--space-block)"
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
			<Section accent="peacock" padded>
				<PageHeader eyebrow={trust.eyebrow ?? "FAQ"} title={trust.title} lead={trust.lead} />

				{/* The list shares the h1's left axis and measure (42rem). */}
				<div className="mt-(--space-block) max-w-(--header-max) divide-y divide-line border-y border-line">
					{trust.faqs.map((faq, i) => (
						<Reveal key={faq.question} delayMs={staggerDelay(i)}>
							<details className="group">
								<summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-4 text-left text-base font-medium text-ink pressable [&::-webkit-details-marker]:hidden">
									{faq.question}
									<ChevronDown
										size={18}
										aria-hidden="true"
										className="shrink-0 text-muted transition-transform group-open:rotate-180"
									/>
								</summary>
								{/* Reuses the reveal-up-in keyframe: the answer fades up as the disclosure opens. */}
								<p className="t-body pb-4 motion-safe:animate-[reveal-up-in_var(--duration-base)_var(--ease-out)_both]">
									{faq.answer}
								</p>
							</details>
						</Reveal>
					))}
				</div>
			</Section>
		</main>
	);
}
