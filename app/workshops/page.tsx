import { Clock, MessageCircle } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { ClosingCta } from "@/components/ui/closing-cta";
import { EmptyState } from "@/components/ui/empty-state";
import { IconCircle } from "@/components/ui/icon-circle";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { getAllWorkshops, getSite } from "@/lib/data";
import { staggerDelay } from "@/lib/motion";
import { createPageMetadata } from "@/lib/page-metadata";
import { cn, toRoman } from "@/lib/utils";
import { buildWhatsAppLink, extractPhoneFromWaUrl } from "@/lib/whatsapp";

export const metadata = createPageMetadata({
	title: "Workshops",
	description:
		"Hands-on folk-art sessions for individuals, schools, communities, and corporate groups.",
	path: "/workshops/",
});

export default async function WorkshopsPage() {
	const { contact, sections } = getSite();
	const workshopsCopy = sections.workshops;
	const workshops = await getAllWorkshops();
	const phone = extractPhoneFromWaUrl(contact.whatsapp.url);
	// Prefilled so the maintainer can tell a group enquiry from a card enquiry.
	const groupEnquiryUrl = buildWhatsAppLink({
		phoneE164NoPlus: phone,
		message: "Hi, I'd like to bring a workshop to our group or school.",
	});

	return (
		<main className="[--shadow-ink:0.2_0.02_165]">
			{/* The standard public page header (2.0): grand rhythm on the pichwai
			    wash band, short kachni under the eyebrow. */}
			<Section accent="pichwai" background="wash" rhythm="grand" padded>
				<PageHeader
					kachni
					eyebrow={workshopsCopy?.eyebrow ?? "Workshops"}
					title={workshopsCopy?.title ?? "Hands-on sessions"}
					lead={workshopsCopy?.lead}
				/>
			</Section>

			<Section accent="pichwai" padded containerClassName="pt-(--space-block)">
				{workshops.length > 0 ? (
					// The programme as a numbered ledger (2.7): hairline rows under one
					// gold opening rule, no card shells, roman numerals in the pigment.
					<ul className="divide-y divide-line border-t border-(--color-gold-hairline)">
						{workshops.map((item, i) => {
							const enquireUrl = buildWhatsAppLink({
								phoneE164NoPlus: phone,
								message: `Hi, I'd like to enquire about the "${item.title}" workshop.`,
							});
							return (
								<Reveal
									key={item.slug}
									as="li"
									delayMs={staggerDelay(i)}
									className="grid grid-cols-[2.5rem_1fr] gap-x-3 py-6 transition-ui hover:bg-surface-hover md:min-h-18 md:grid-cols-12 md:items-center md:gap-x-6 md:py-8"
								>
									<span
										aria-hidden="true"
										className="t-numeral pt-1 text-title text-(--section-accent) md:col-span-1 md:pt-0"
									>
										{toRoman(i + 1)}
									</span>
									<div className="min-w-0 md:col-span-7">
										<h3 id={item.slug} className="t-display text-h3">
											{item.title}
										</h3>
										<p className="mt-2 line-clamp-2 text-sm text-muted md:line-clamp-none">
											{item.blurb}
										</p>
									</div>
									<div className="col-start-2 mt-4 flex flex-col gap-4 md:col-span-4 md:col-start-9 md:mt-0 md:flex-row md:items-center md:justify-end">
										{item.durationHours ? (
											<div className="flex items-center gap-1.5">
												<IconCircle size="sm">
													<Clock size={14} />
												</IconCircle>
												<span className="t-meta text-(--section-accent)">
													{item.durationHours}h session
												</span>
											</div>
										) : null}
										<a
											href={enquireUrl}
											target="_blank"
											rel="noopener noreferrer"
											className={cn(buttonVariants({ variant: "secondary" }), "w-full md:w-auto")}
										>
											<MessageCircle size={14} aria-hidden="true" />
											Enquire
										</a>
									</div>
								</Reveal>
							);
						})}
					</ul>
				) : (
					<Reveal delayMs={staggerDelay(1)}>
						<EmptyState
							icon={<Clock size={24} aria-hidden="true" />}
							title="Workshops coming soon"
							body="Ask on WhatsApp about the next session."
							action={
								<a
									href={contact.whatsapp.url}
									target="_blank"
									rel="noopener noreferrer"
									className={buttonVariants({ variant: "secondary" })}
								>
									<MessageCircle size={14} aria-hidden="true" />
									Ask on WhatsApp
								</a>
							}
						/>
					</Reveal>
				)}

				{/* Group enquiry CTA: rendered in both branches. */}
				<Reveal delayMs={staggerDelay(3)}>
					<ClosingCta
						eyebrow="Group / school enquiries"
						title="Bring a workshop to your space"
						body="Tell us about the group, age range, and dates."
						action={
							<a
								href={groupEnquiryUrl}
								target="_blank"
								rel="noopener noreferrer"
								className={cn(buttonVariants({ variant: "primary" }), "w-full sm:w-auto")}
							>
								Get in touch
							</a>
						}
					/>
				</Reveal>
			</Section>
		</main>
	);
}
