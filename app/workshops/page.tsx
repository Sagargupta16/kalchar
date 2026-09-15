import { Clock, MessageCircle } from "lucide-react";
import Link from "next/link";
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
	const upcomingEnquiryUrl = buildWhatsAppLink({
		phoneE164NoPlus: phone,
		message:
			"Hi, I'd like to ask about upcoming workshops. Could you share the available dates and pricing?",
	});
	// Prefilled so the maintainer can tell a group enquiry from a card enquiry.
	const groupEnquiryUrl = buildWhatsAppLink({
		phoneE164NoPlus: phone,
		message: "Hi, I'd like to bring a workshop to our group or school.",
	});

	return (
		<main className="[--shadow-ink:0.2_0.02_165]">
			<Section accent="pichwai" background="wash" padded containerClassName="py-(--space-block)">
				<PageHeader
					eyebrow={workshopsCopy?.eyebrow ?? "Workshops"}
					title={workshopsCopy?.title ?? "Hands-on sessions"}
					lead={workshopsCopy?.lead}
				>
					<p className="mt-5 max-w-prose text-sm text-muted">
						{workshops.length > 0
							? "Choose a workshop below to ask about dates and pricing on WhatsApp."
							: "Ask us about upcoming sessions or a workshop for your group."}
					</p>
					<div className="mt-2 flex flex-wrap gap-x-6">
						<a
							href="#group-enquiry"
							className={cn(
								buttonVariants({ variant: "link" }),
								"max-w-full justify-start whitespace-normal px-0 text-left text-ink",
							)}
						>
							Planning for a group or school?
						</a>
						<Link
							href="/contact/"
							className={cn(
								buttonVariants({ variant: "link" }),
								"max-w-full justify-start whitespace-normal px-0 text-left",
							)}
						>
							Other ways to enquire
						</Link>
					</div>
				</PageHeader>
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
									className="grid grid-cols-[2.5rem_1fr] gap-x-3 py-6 md:grid-cols-12 md:items-start md:gap-x-6 md:py-8"
								>
									<span
										aria-hidden="true"
										className="t-numeral pt-1 text-title text-(--section-accent) md:col-span-1 md:pt-0"
									>
										{toRoman(i + 1)}
									</span>
									<div className="min-w-0 md:col-span-7">
										<h2
											id={item.slug}
											className="t-display wrap-anywhere scroll-mt-(--space-page) text-h3"
										>
											{item.title}
										</h2>
										<p className="wrap-anywhere mt-2 max-w-prose whitespace-pre-line text-base leading-relaxed text-muted">
											{item.blurb}
										</p>
									</div>
									<div className="col-start-2 mt-4 flex min-w-0 flex-col gap-3 md:col-span-4 md:col-start-9 md:mt-0 md:items-end">
										{item.durationHours ? (
											<div className="flex items-center gap-1.5">
												<IconCircle size="sm">
													<Clock size={14} aria-hidden="true" />
												</IconCircle>
												<span className="t-meta text-(--section-accent)">
													{item.durationHours} {item.durationHours === 1 ? "hour" : "hours"}
												</span>
											</div>
										) : null}
										<a
											href={enquireUrl}
											target="_blank"
											rel="noopener noreferrer"
											aria-label={`Enquire on WhatsApp about ${item.title}`}
											className={cn(
												buttonVariants({ variant: "secondary" }),
												"w-full max-w-full whitespace-normal text-center md:w-auto",
											)}
										>
											<MessageCircle size={14} aria-hidden="true" />
											Enquire on WhatsApp
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
							title="No workshops listed yet"
							body="Ask on WhatsApp about the next session."
							action={
								<a
									href={upcomingEnquiryUrl}
									target="_blank"
									rel="noopener noreferrer"
									className={cn(
										buttonVariants({ variant: "secondary" }),
										"w-full whitespace-normal sm:w-auto",
									)}
								>
									<MessageCircle size={14} aria-hidden="true" />
									Ask on WhatsApp
								</a>
							}
						/>
					</Reveal>
				)}

				{/* Group enquiry CTA: rendered in both branches. */}
				<div id="group-enquiry" className="scroll-mt-(--space-page)">
					<Reveal delayMs={staggerDelay(3)}>
						<ClosingCta
							eyebrow="Group / school enquiries"
							title="Bring a workshop to your space"
							body="Tell us about the group, age range, and preferred dates on WhatsApp."
							action={
								<a
									href={groupEnquiryUrl}
									target="_blank"
									rel="noopener noreferrer"
									className={cn(
										buttonVariants({ variant: "primary" }),
										"w-full whitespace-normal sm:w-auto",
									)}
								>
									Ask about a group workshop
								</a>
							}
						/>
					</Reveal>
				</div>
			</Section>
		</main>
	);
}
