import { Clock, MessageCircle } from "lucide-react";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ClosingCta } from "@/components/ui/closing-cta";
import { EmptyState } from "@/components/ui/empty-state";
import { IconCircle } from "@/components/ui/icon-circle";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { getAllWorkshops, getSite } from "@/lib/data";
import { staggerDelay } from "@/lib/motion";
import { createPageMetadata } from "@/lib/page-metadata";
import { cn } from "@/lib/utils";
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
			<Section accent="pichwai" padded>
				<PageHeader
					eyebrow={workshopsCopy?.eyebrow ?? "Workshops"}
					title={workshopsCopy?.title ?? "Hands-on sessions"}
					lead={workshopsCopy?.lead}
				/>

				{workshops.length > 0 ? (
					<ul className="mt-(--space-block) grid gap-(--grid-gap) sm:grid-cols-2 lg:grid-cols-3">
						{workshops.map((item, i) => {
							const enquireUrl = buildWhatsAppLink({
								phoneE164NoPlus: phone,
								message: `Hi, I'd like to enquire about the "${item.title}" workshop.`,
							});
							return (
								<Reveal key={item.slug} as="li" delayMs={staggerDelay(i)}>
									<Card className="flex h-full flex-col">
										<h3 className="t-display text-h3">{item.title}</h3>
										<p className="mt-3 text-sm text-muted">{item.blurb}</p>
										{item.durationHours ? (
											<div className="mt-4 flex items-center gap-1.5">
												<IconCircle size="sm">
													<Clock size={14} />
												</IconCircle>
												<span className="t-meta text-(--section-accent)">
													{item.durationHours}h session
												</span>
											</div>
										) : null}
										<div className="mt-auto pt-6">
											<a
												href={enquireUrl}
												target="_blank"
												rel="noopener noreferrer"
												className={cn(buttonVariants({ variant: "secondary" }), "w-full sm:w-auto")}
											>
												<MessageCircle size={14} aria-hidden="true" />
												Enquire
											</a>
										</div>
									</Card>
								</Reveal>
							);
						})}
					</ul>
				) : (
					<Reveal delayMs={staggerDelay(1)}>
						<EmptyState
							className="mt-(--space-block)"
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
