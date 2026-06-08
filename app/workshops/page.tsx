import { Clock, MessageCircle } from "lucide-react";
import type { Metadata } from "next";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { IconCircle } from "@/components/ui/icon-circle";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { getAllWorkshops, getSite } from "@/lib/data";
import { buildWhatsAppLink, extractPhoneFromWaUrl } from "@/lib/whatsapp";

export const metadata: Metadata = {
	title: "Workshops",
	description:
		"Hands-on folk-art sessions for individuals, schools, communities, and corporate groups.",
};

/** Reveal stagger: each card waits index * step, capped so later cards aren't slow. */
const STAGGER_STEP_MS = 60;
const STAGGER_MAX_INDEX = 5;

export default async function WorkshopsPage() {
	const { contact, sections } = getSite();
	const workshopsCopy = sections.workshops;
	const workshops = await getAllWorkshops();
	const phone = extractPhoneFromWaUrl(contact.whatsapp.url);

	return (
		<main>
			<Section accent="pichwai">
				<Container className="py-(--section-py)">
					<PageHeader
						eyebrow={workshopsCopy?.eyebrow ?? "Workshops"}
						title={workshopsCopy?.title ?? "Hands-on sessions"}
						lead={workshopsCopy?.lead}
					/>

					<ul className="mt-10 grid gap-5 sm:mt-14 sm:grid-cols-2 lg:grid-cols-3">
						{workshops.map((item, i) => {
							const enquireUrl = buildWhatsAppLink({
								phoneE164NoPlus: phone,
								message: `Hi, I'd like to enquire about the "${item.title}" workshop.`,
							});
							return (
								<Reveal
									key={item.slug}
									as="li"
									delayMs={Math.min(i, STAGGER_MAX_INDEX) * STAGGER_STEP_MS}
								>
									<Card hover className="group flex h-full flex-col">
										<h3 className="t-display text-xl transition-colors group-hover:text-(--section-accent)">
											{item.title}
										</h3>
										<p className="mt-3 text-sm text-muted">{item.blurb}</p>
										{item.durationHours ? (
											<div className="mt-4 flex items-center gap-1.5">
												<IconCircle size="sm">
													<Clock size={13} />
												</IconCircle>
												<span className="text-xs uppercase tracking-[var(--tracking-meta)] text-(--section-accent)">
													{item.durationHours}h session
												</span>
											</div>
										) : null}
										<div className="mt-auto pt-5">
											<a
												href={enquireUrl}
												target="_blank"
												rel="noopener noreferrer"
												className={buttonVariants({ variant: "secondary", size: "sm" })}
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

					{/* Group enquiry CTA */}
					<Reveal delayMs={280}>
						<Card
							padding="lg"
							className="mt-14 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between"
						>
							<div>
								<p className="t-eyebrow">Group / school enquiries</p>
								<p className="t-display mt-2 text-2xl">Bring a workshop to your space</p>
								<p className="mt-1 text-sm text-muted">
									Tell us about the group, age range, and dates.
								</p>
							</div>
							<a
								href={contact.whatsapp.url}
								target="_blank"
								rel="noopener noreferrer"
								className={buttonVariants({ variant: "primary" })}
							>
								Get in touch
							</a>
						</Card>
					</Reveal>
				</Container>
			</Section>
		</main>
	);
}
