import { ArrowDown, ArrowRight, Clock, MessageCircle } from "lucide-react";
import Link from "next/link";
import { PageHero } from "@/components/layout/page-hero";
import { Reveal } from "@/components/motion/reveal";
import { buttonVariants } from "@/components/ui/button";
import { ClosingCta } from "@/components/ui/closing-cta";
import { EmptyState } from "@/components/ui/empty-state";
import { Section, SectionHeader } from "@/components/ui/section";
import { getAllWorkshops, getSite } from "@/lib/data";
import { staggerDelay } from "@/lib/motion";
import { createPageMetadata } from "@/lib/page-metadata";
import { cn, toRoman } from "@/lib/utils";
import { buildWhatsAppLink, extractPhoneFromWaUrl } from "@/lib/whatsapp";
import { WorkshopLedger } from "./workshop-ledger";

export const metadata = createPageMetadata({
	title: "Workshops",
	description:
		"Hands-on folk-art sessions for individuals, schools, communities, and corporate groups.",
	path: "/workshops/",
});

/** Who the sessions are for, from the workshops lead in site.json. */
const AUDIENCES = ["Individuals", "Schools", "Communities", "Corporate groups"] as const;

const BOOKING_STEPS = [
	{
		title: "Pick a session",
		body: "Choose a workshop below, or ask for one shaped around your group.",
	},
	{ title: "Message us", body: "Share the group size, age range and a few dates on WhatsApp." },
	{
		title: "We plan it together",
		body: "Pricing, timing and the plan for the day come back to you.",
	},
] as const;

function durationRange(hours: readonly number[]): string | null {
	if (hours.length === 0) return null;
	const min = Math.min(...hours);
	const max = Math.max(...hours);
	return min === max ? `${min}` : `${min} to ${max}`;
}

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
	const ledger = workshops.map((item) => ({
		slug: item.slug,
		title: item.title,
		blurb: item.blurb,
		durationHours: item.durationHours,
		enquireUrl: buildWhatsAppLink({
			phoneE164NoPlus: phone,
			message: `Hi, I'd like to enquire about the "${item.title}" workshop.`,
		}),
	}));
	const hours = durationRange(
		workshops.flatMap((item) => (item.durationHours ? [item.durationHours] : [])),
	);

	return (
		<main className="[--shadow-ink:0.2_0.02_165]">
			<PageHero
				accent="pichwai"
				glyph="सीख"
				eyebrow={workshopsCopy?.eyebrow ?? "Workshops"}
				title={workshopsCopy?.title ?? "Hands-on sessions"}
				lead={workshopsCopy?.lead}
				aside={
					workshops.length > 0 ? (
						<Reveal eager delayMs={staggerDelay(4)} className="hidden lg:block">
							<dl className="grid grid-cols-2 gap-px overflow-hidden rounded-(--radius-md) border border-line bg-line">
								<div className="bg-canvas p-5">
									<dt className="t-meta">On offer</dt>
									<dd className="t-numeral type-page mt-2 text-ink">
										{String(workshops.length).padStart(2, "0")}
									</dd>
									<dd className="mt-1 text-sm text-muted">
										{workshops.length === 1 ? "workshop" : "workshops"}
									</dd>
								</div>
								<div className="bg-canvas p-5">
									<dt className="t-meta">Per session</dt>
									<dd className="t-numeral type-page mt-2 text-ink">{hours ?? "Flexible"}</dd>
									<dd className="mt-1 text-sm text-muted">{hours ? "hours" : "timing"}</dd>
								</div>
								<div className="col-span-2 bg-canvas p-5">
									<dt className="t-meta">Booked over</dt>
									<dd className="mt-2 flex items-center gap-2 text-base font-medium text-ink">
										<MessageCircle
											size={16}
											aria-hidden="true"
											className="text-(--section-accent)"
										/>
										WhatsApp, dates and pricing on request
									</dd>
								</div>
							</dl>
						</Reveal>
					) : undefined
				}
			>
				<Reveal eager delayMs={staggerDelay(5)}>
					<p className="mt-6 flex flex-wrap gap-2">
						{AUDIENCES.map((audience) => (
							<span
								key={audience}
								className="inline-flex items-center rounded-full border border-line-strong px-3 py-1.5 text-sm font-medium text-ink"
							>
								{audience}
							</span>
						))}
					</p>
					<div className="mt-6 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
						{workshops.length > 0 ? (
							<a href="#programme" className={buttonVariants({ variant: "primary", size: "lg" })}>
								See the workshops
								<ArrowDown size={16} aria-hidden="true" />
							</a>
						) : null}
						<a
							href="#group-enquiry"
							className={buttonVariants({ variant: "secondary", size: "lg" })}
						>
							Planning for a group or school?
						</a>
					</div>
				</Reveal>
			</PageHero>

			<Section
				id="programme"
				accent="pichwai"
				padded
				containerClassName="pt-(--space-canyon)"
				className="scroll-mt-(--space-page)"
			>
				<SectionHeader
					eyebrow="The programme"
					title={workshops.length > 0 ? "Choose a session" : "Sessions on request"}
					lead={
						workshops.length > 0
							? "Tap Enquire to ask about dates and pricing on WhatsApp."
							: "Ask us about upcoming sessions or a workshop for your group."
					}
					action={
						<Link href="/contact/" className={cn(buttonVariants({ variant: "ghost" }), "group")}>
							Other ways to enquire
							<ArrowRight size={14} aria-hidden="true" />
						</Link>
					}
				/>

				<div className="mt-(--space-block)">
					{workshops.length > 0 ? (
						<WorkshopLedger workshops={ledger} />
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
				</div>

				{/* How booking works: three beats on the section pigment. */}
				<ol className="mt-(--space-canyon) grid gap-px overflow-hidden rounded-(--radius-md) border border-line bg-line md:grid-cols-3">
					{BOOKING_STEPS.map((step, i) => (
						<Reveal
							key={step.title}
							as="li"
							delayMs={staggerDelay(i)}
							className="bg-surface p-(--card-pad-lg)"
						>
							<p className="t-meta text-(--section-accent)">Step {toRoman(i + 1)}</p>
							<h3 className="t-headline mt-3 text-h3">{step.title}</h3>
							<p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
						</Reveal>
					))}
				</ol>

				{/* Group enquiry CTA: rendered in both branches. */}
				<div id="group-enquiry" className="scroll-mt-(--space-page)">
					<ClosingCta
						eyebrow="Group and school enquiries"
						title="Bring a workshop to your space"
						body="Tell us about the group, age range, and preferred dates on WhatsApp."
						action={
							<a
								href={groupEnquiryUrl}
								target="_blank"
								rel="noopener noreferrer"
								className={cn(
									buttonVariants({ variant: "primary", size: "lg" }),
									"w-full whitespace-normal sm:w-auto",
								)}
							>
								Ask about a group workshop
								<ArrowRight size={16} aria-hidden="true" />
							</a>
						}
					/>
				</div>
			</Section>
		</main>
	);
}
