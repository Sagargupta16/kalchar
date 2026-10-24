"use client";

import { AlertCircle, ArrowRight, ImageUp, Mail } from "lucide-react";
import { motion } from "motion/react";
import { type SubmitEvent, useEffect, useMemo, useRef, useState } from "react";
import { submitLead } from "@/app/admin/lead-actions";
import { BriefProgress, BriefStepSection } from "@/components/forms/brief-progress";
import { BriefSummary, EnquiryStatus } from "@/components/forms/brief-summary";
import { Field, inputClass, PresetRow } from "@/components/forms/custom-order-fields";
import { StylePicker, type StyleSample } from "@/components/forms/style-picker";
import {
	MAX_BRIEF_LENGTH,
	MAX_SHORT_LENGTH,
	type OrderField,
	orderDraft,
	readOrderValues,
	useCustomOrderDraft,
} from "@/components/forms/use-custom-order-draft";
import { WhatsAppIcon } from "@/components/ui/brand-icons";
import { Button, buttonVariants } from "@/components/ui/button";
import { IconCircle } from "@/components/ui/icon-circle";
import { SPRING_ZOOM } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { buildWhatsAppLink, customOrderMailto, customOrderMessage } from "@/lib/whatsapp";

/**
 * Custom-order form as a stepped brief: four numbered steps down the left
 * (idea, style, details, you) and a fifth, "Review and send", that holds a
 * live summary of every answer and the one action. A sticky progress rail
 * fills as the steps get answers. Everything stays on one page, so nothing is
 * hidden from a visitor who scrolls, and the draft/restore behaviour is the
 * same as before.
 *
 * One visible action that says what happens: "Continue to WhatsApp" saves the
 * brief and, in the same slot, becomes the "Send on WhatsApp" link (focus moves
 * to it). The save never gates the link; persistence status never claims that a
 * message was opened or sent. Catalog presets come from the server through the
 * data seam.
 */
interface CustomOrderFormProps {
	phoneE164NoPlus: string;
	emailUrl: string;
	availableStyles: readonly string[];
	/** style -> representative artwork thumbnail for the visual picker. */
	styleSamples: Record<string, StyleSample>;
	sizes: readonly string[];
	budgets: readonly string[];
	timelines: readonly string[];
	submitLabel: string;
	fallbackEmailLabel: string;
}

const NEUTRAL = {
	style: "Open to suggestion",
	size: "No preference",
	budget: "Open / not sure",
	timeline: "No specific timeline",
} as const;

export function CustomOrderForm({
	phoneE164NoPlus,
	emailUrl,
	availableStyles,
	styleSamples,
	sizes,
	budgets,
	timelines,
	submitLabel,
	fallbackEmailLabel,
}: Readonly<CustomOrderFormProps>) {
	const [{ values, saveStatus }, setSession] = useCustomOrderDraft();
	const [error, setError] = useState<string | null>(null);
	const prepared = saveStatus !== "idle";
	const draft = useMemo(() => (prepared ? orderDraft(values) : null), [prepared, values]);
	const submissionVersion = useRef(0);
	const focusHandoff = useRef(false);
	const whatsappRef = useRef<HTMLAnchorElement>(null);
	const briefRef = useRef<HTMLTextAreaElement>(null);

	// The submit button unmounts once the draft exists; move focus to the link
	// that took its place so keyboard and screen-reader users are not stranded.
	useEffect(() => {
		if (draft && focusHandoff.current) {
			whatsappRef.current?.focus();
			focusHandoff.current = false;
		}
	}, [draft]);

	function updateField(name: OrderField, value: string) {
		submissionVersion.current += 1;
		setSession((current) => ({
			values: { ...current.values, [name]: value },
			saveStatus: "idle",
		}));
	}

	async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		const formData = new FormData(e.currentTarget);
		const nextValues = readOrderValues(formData);
		const next = orderDraft(nextValues);
		if (!next) {
			// Single-error recipe (forms-copy c1/P2): focus moves to the failing field,
			// whose aria-describedby reads the message out.
			setError("Tell us a bit about what you'd like.");
			briefRef.current?.focus();
			return;
		}
		const version = ++submissionVersion.current;
		focusHandoff.current = true;
		setSession({ values: nextValues, saveStatus: "saving" });
		try {
			const result = await submitLead(formData);
			if (submissionVersion.current === version) {
				setSession((current) => ({ ...current, saveStatus: result.ok ? "saved" : "failed" }));
			}
		} catch {
			if (submissionVersion.current === version) {
				setSession((current) => ({ ...current, saveStatus: "failed" }));
			}
		}
	}

	const mailtoHref = draft ? customOrderMailto(emailUrl, draft) : null;
	const whatsappHref = draft
		? buildWhatsAppLink({ phoneE164NoPlus, message: customOrderMessage(draft) })
		: null;

	const steps = [
		{ id: "step-idea", label: "Idea", done: values.brief.trim().length > 0 },
		{ id: "step-style", label: "Style", done: values.style.trim().length > 0 },
		{
			id: "step-details",
			label: "Details",
			done: Boolean(values.size || values.budget || values.timeline),
		},
		{ id: "step-you", label: "You", done: Boolean(values.name.trim() || values.contact.trim()) },
		{ id: "step-send", label: "Send", done: prepared },
	];
	const summary = [
		{ key: "brief", label: "Idea", value: values.brief.trim(), placeholder: "Not written yet" },
		{ key: "style", label: "Style", value: values.style, placeholder: NEUTRAL.style },
		{ key: "size", label: "Size", value: values.size, placeholder: NEUTRAL.size },
		{ key: "budget", label: "Budget", value: values.budget, placeholder: NEUTRAL.budget },
		{ key: "timeline", label: "When", value: values.timeline, placeholder: NEUTRAL.timeline },
		{
			key: "reply",
			label: "Reply to",
			value: [values.name.trim(), values.contact.trim()].filter(Boolean).join(", "),
			placeholder: "WhatsApp chat",
		},
	];

	return (
		<div
			data-slot="commission-card"
			className="rounded-(--radius-sheet) border border-line bg-surface p-(--card-pad-lg) shadow-e1 sm:p-8 lg:p-10"
		>
			<p className="t-eyebrow">Commission brief</p>
			<p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">
				Only your idea is required. Leave any other details open and we can work them out together.
			</p>
			<form
				onSubmit={onSubmit}
				// relative anchors the off-screen honeypot to the form; @container lets
				// the field pairs split on the form's own width, not the viewport.
				className="@container relative mt-4"
				noValidate
			>
				{/* Honeypot: hidden from users + assistive tech; bots fill it and the
			    lead is silently dropped server-side. Not display:none (some bots
			    skip those) -- off-screen + aria-hidden + no tab stop. */}
				<div
					aria-hidden="true"
					className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden"
				>
					<label htmlFor="website">Leave this field empty</label>
					<input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
				</div>

				<BriefProgress steps={steps} />

				<div className="mt-8 grid gap-(--form-group-gap) lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-12">
					<div className="flex min-w-0 flex-col gap-(--form-group-gap)">
						<BriefStepSection
							id="step-idea"
							index={1}
							title="Your idea"
							note="The one thing we need to start."
						>
							{/* Brief: the one required field. Its error renders between label and
							    control with the hidden "Error:" prefix (forms-copy c1/P2). */}
							<Field
								id="brief"
								label="What would you like painted?"
								required
								description={
									<p id="brief-hint" className="text-sm leading-relaxed text-muted">
										Tell us the subject, colours, or occasion. If you have a specific date in mind,
										include it here. Up to {MAX_BRIEF_LENGTH.toLocaleString("en-IN")} characters.
									</p>
								}
								error={
									error ? (
										<p
											id="brief-error"
											role="alert"
											className="flex items-start gap-2 text-sm text-ruby"
										>
											<AlertCircle size={16} aria-hidden="true" className="mt-1 shrink-0" />
											<span>
												<span className="sr-only">Error: </span>
												{error}
											</span>
										</p>
									) : null
								}
							>
								<textarea
									ref={briefRef}
									id="brief"
									name="brief"
									rows={5}
									value={values.brief}
									required
									maxLength={MAX_BRIEF_LENGTH}
									autoCapitalize="sentences"
									aria-invalid={error ? true : undefined}
									aria-describedby={error ? "brief-hint brief-error" : "brief-hint"}
									onChange={(event) => {
										updateField("brief", event.currentTarget.value);
										// P7 re-check rule: after a failed submit the brief revalidates on
										// every input and the message clears the instant it passes.
										if (error && event.currentTarget.value.trim()) setError(null);
									}}
									placeholder="For example, a lotus painting for our living room."
									className={cn(
										inputClass,
										"resize-y text-lg",
										error && "border-ruby-line bg-ruby-soft",
									)}
								/>
							</Field>
							<a
								href="#send-enquiry"
								className="inline-flex min-h-control w-fit items-center gap-2 text-sm font-medium text-accent-text underline underline-offset-4"
							>
								Skip optional details
								<ArrowRight size={14} aria-hidden="true" />
							</a>
						</BriefStepSection>

						<BriefStepSection
							id="step-style"
							index={2}
							title="Pick a style"
							note="Or leave it open and we will suggest one."
						>
							<StylePicker
								name="style"
								styles={availableStyles}
								samples={styleSamples}
								value={values.style}
								onChange={(value) => updateField("style", value)}
							/>
						</BriefStepSection>

						{/* Structured preferences as chip rows (forms-copy c1 order: size, budget,
						    timeline). Each group takes the full measure so the pills can wrap. */}
						<BriefStepSection
							id="step-details"
							index={3}
							title="A few details"
							note="Starting points for our conversation, if you know them."
						>
							<PresetRow
								name="size"
								label="Approximate size"
								neutralLabel={NEUTRAL.size}
								options={sizes}
								value={values.size}
								onChange={(value) => updateField("size", value)}
							/>
							<PresetRow
								name="budget"
								label="Budget"
								neutralLabel={NEUTRAL.budget}
								options={budgets}
								value={values.budget}
								onChange={(value) => updateField("budget", value)}
							/>
							<PresetRow
								name="timeline"
								label="Timeline"
								neutralLabel={NEUTRAL.timeline}
								options={timelines}
								value={values.timeline}
								onChange={(value) => updateField("timeline", value)}
							/>
						</BriefStepSection>

						<BriefStepSection
							id="step-you"
							index={4}
							title="About you"
							note="So we know who we are talking to."
						>
							<div className="grid gap-(--form-gap) @md:grid-cols-2">
								<Field id="name" label="Your name" optional>
									<input
										id="name"
										name="name"
										type="text"
										value={values.name}
										onChange={(event) => updateField("name", event.currentTarget.value)}
										maxLength={MAX_SHORT_LENGTH}
										autoComplete="name"
										autoCorrect="off"
										autoCapitalize="words"
										className={inputClass}
									/>
								</Field>

								<Field
									id="contact"
									label="Email or WhatsApp number"
									optional
									description={
										<p id="contact-hint" className="text-sm text-muted">
											Leave a way for us to reply if you cannot send your message on WhatsApp.
										</p>
									}
								>
									<input
										id="contact"
										name="contact"
										type="text"
										value={values.contact}
										onChange={(event) => updateField("contact", event.currentTarget.value)}
										maxLength={MAX_SHORT_LENGTH}
										autoCapitalize="none"
										autoCorrect="off"
										spellCheck={false}
										aria-describedby="contact-hint"
										placeholder="Email address or number with country code"
										className={inputClass}
									/>
								</Field>
							</div>

							{/* Reference images are shared in the conversation. */}
							<div className="flex items-start gap-3 rounded-(--radius-md) border border-dashed border-line-strong bg-canvas p-4">
								<IconCircle size="sm">
									<ImageUp size={14} aria-hidden="true" />
								</IconCircle>
								<p className="text-sm text-muted">
									<span className="font-medium text-ink">
										Have a reference or inspiration image?
									</span>{" "}
									You can share photos directly on WhatsApp right after you send this brief.
								</p>
							</div>
						</BriefStepSection>
					</div>

					{/* Step 05: the live summary and the one action. Sticks beside the
					    steps from lg; on phones it closes the form as the review step. */}
					<div className="min-w-0 border-t border-line pt-(--form-group-gap) lg:border-t-0 lg:pt-0">
						<section
							id="step-send"
							aria-labelledby="step-send-title"
							className="scroll-mt-[calc(var(--header-h-shrunk)+6rem)] rounded-(--radius-md) border border-line bg-canvas p-5 lg:sticky lg:top-[calc(var(--header-h-shrunk)+6.5rem)]"
						>
							<div className="flex items-start gap-3">
								<span aria-hidden="true" className="t-numeral type-section text-(--section-accent)">
									05
								</span>
								<div className="min-w-0 pt-1">
									<h3 id="step-send-title" className="t-headline text-title">
										Review and send
									</h3>
									<p className="mt-1 text-sm text-muted">Your message, as it stands.</p>
								</div>
							</div>

							<div className="mt-4">
								<BriefSummary rows={summary} />
							</div>

							<div className="mt-4">
								<EnquiryStatus saveStatus={saveStatus} draft={draft} />
							</div>

							{/* One primary in one slot: the submit hands over to the WhatsApp link
							    the moment the draft exists (the save runs alongside, never gating it). */}
							<div className="mt-5 flex flex-col items-stretch gap-3">
								{whatsappHref ? (
									<motion.div
										initial={{ scale: 0.92, opacity: 0 }}
										animate={{ scale: 1, opacity: 1 }}
										transition={SPRING_ZOOM}
									>
										<a
											id="send-enquiry"
											ref={whatsappRef}
											href={whatsappHref}
											target="_blank"
											rel="noopener noreferrer"
											aria-describedby="whatsapp-hint"
											className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full")}
										>
											<WhatsAppIcon className="size-5 shrink-0" aria-hidden="true" />
											{submitLabel}
											<ArrowRight size={16} aria-hidden="true" className="shrink-0" />
										</a>
									</motion.div>
								) : (
									<Button id="send-enquiry" type="submit" size="lg" className="w-full">
										Continue to WhatsApp
										<ArrowRight size={16} aria-hidden="true" className="shrink-0" />
									</Button>
								)}
								{saveStatus === "failed" ? (
									<Button type="submit" variant="secondary" className="w-full">
										Try saving again
									</Button>
								) : null}
								<p id="whatsapp-hint" className="text-sm text-muted">
									{whatsappHref
										? "WhatsApp opens with your message ready to review. If it does not open, send the same message by email."
										: "Continue saves your brief and prepares a WhatsApp link. You review and send the message yourself."}
								</p>
								<p className="text-xs text-muted">
									We use your brief and contact details only to reply to your enquiry.
								</p>
								{mailtoHref ? (
									<a
										href={mailtoHref}
										className="inline-flex min-h-control items-center gap-2 text-sm text-accent-text underline-offset-4 hover:underline"
									>
										<Mail size={14} aria-hidden="true" /> {fallbackEmailLabel}
									</a>
								) : null}
							</div>
						</section>
					</div>
				</div>
			</form>
		</div>
	);
}
