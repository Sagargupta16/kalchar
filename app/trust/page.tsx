import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { Container } from "@/components/ui/container";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { getSite } from "@/lib/data";
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
				<Section accent="peacock">
					<Container className="py-(--section-py)">
						<PageHeader eyebrow="FAQ" title="Frequently asked questions" />
						<p className="mt-12 rounded-(--radius-sm) border border-dashed border-line bg-bg-soft px-6 py-12 text-center text-sm text-muted">
							Details coming soon. Reach out on WhatsApp with any question in the meantime.
						</p>
					</Container>
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
			<Section accent="peacock">
				<Container className="py-(--section-py)">
					<PageHeader eyebrow={trust.eyebrow ?? "FAQ"} title={trust.title} lead={trust.lead} />

					<div className="mx-auto mt-12 max-w-2xl divide-y divide-line border-y border-line">
						{trust.faqs.map((faq, i) => (
							<Reveal key={faq.question} delayMs={Math.min(i, 5) * 60}>
								<details className="group">
									<summary className="flex min-h-14 cursor-pointer items-center justify-between gap-4 py-4 text-left text-base font-medium text-ink [&::-webkit-details-marker]:hidden">
										{faq.question}
										<ChevronDown
											size={18}
											aria-hidden="true"
											className="shrink-0 text-muted transition-transform duration-(--duration-base) ease-(--ease-out) group-open:rotate-180"
										/>
									</summary>
									<p className="pb-4 text-sm leading-relaxed text-muted">{faq.answer}</p>
								</details>
							</Reveal>
						))}
					</div>
				</Container>
			</Section>
		</main>
	);
}
