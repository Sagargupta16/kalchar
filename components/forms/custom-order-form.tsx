"use client";

import { AlertCircle, ArrowRight, Check, ImageUp, Mail } from "lucide-react";
import { motion } from "motion/react";
import { type SubmitEvent, useEffect, useMemo, useRef, useState } from "react";
import { submitLead } from "@/app/admin/lead-actions";
import { Field, inputClass, PresetRow } from "@/components/forms/custom-order-fields";
import { StylePicker, type StyleSample } from "@/components/forms/style-picker";
import {
	MAX_BRIEF_LENGTH,
	MAX_SHORT_LENGTH,
	type OrderField,
	orderDraft,
	readOrderValues,
	type SaveStatus,
	useCustomOrderDraft,
} from "@/components/forms/use-custom-order-draft";
import { Button, buttonVariants } from "@/components/ui/button";
import { IconCircle } from "@/components/ui/icon-circle";
import { SPRING_ZOOM } from "@/lib/motion";
import type { CustomOrderDraft } from "@/lib/types";
import { cn } from "@/lib/utils";
import { buildWhatsAppLink, customOrderMailto, customOrderMessage } from "@/lib/whatsapp";

/**
 * Custom-order form.
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

	return (
		<div
			data-slot="commission-card"
			className="rounded-(--radius-md) border border-line bg-surface p-(--card-pad-lg) shadow-e1"
		>
			<p className="t-eyebrow">Commission brief</p>
			<p className="mt-4 text-sm leading-relaxed text-muted">
				Only your idea is required. Leave any other details open and we can work them out together.
			</p>
			<form
				onSubmit={onSubmit}
				// relative anchors the off-screen honeypot to the form; @container lets
				// the field pairs split on the form's own width, not the viewport.
				className="@container relative mt-6 flex flex-col gap-(--form-gap)"
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
				{/* Brief -- the one required field, given hero weight up top. Its error
			    renders between label and control with the hidden "Error:" prefix
			    (forms-copy c1/P2, GOV.UK error-message anatomy). */}
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
							<p id="brief-error" role="alert" className="flex items-start gap-2 text-sm text-ruby">
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
						className={cn(inputClass, "resize-y", error && "border-ruby-line bg-ruby-soft")}
					/>
				</Field>
				<a
					href="#send-enquiry"
					className="inline-flex min-h-control w-fit items-center gap-2 text-sm text-accent-text underline underline-offset-4"
				>
					Skip optional details
					<ArrowRight size={14} aria-hidden="true" />
				</a>

				<div className="border-t border-line pt-(--form-group-gap)">
					<h3 className="t-display text-h3">A few details, if you know them</h3>
					<p className="mt-2 text-sm text-muted">These are starting points for our conversation.</p>
				</div>
				<StylePicker
					name="style"
					styles={availableStyles}
					samples={styleSamples}
					value={values.style}
					onChange={(value) => updateField("style", value)}
				/>

				{/* Structured preferences as chip rows (forms-copy c1 order: size, budget,
			    timeline). Each group takes the full measure so the pills can wrap. */}
				<PresetRow
					name="size"
					label="Approximate size"
					neutralLabel="No preference"
					options={sizes}
					value={values.size}
					onChange={(value) => updateField("size", value)}
				/>
				<PresetRow
					name="budget"
					label="Budget"
					neutralLabel="Open / not sure"
					options={budgets}
					value={values.budget}
					onChange={(value) => updateField("budget", value)}
				/>
				<PresetRow
					name="timeline"
					label="Timeline"
					neutralLabel="No specific timeline"
					options={timelines}
					value={values.timeline}
					onChange={(value) => updateField("timeline", value)}
				/>

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
				<div className="flex items-start gap-3 rounded-(--radius-md) border border-line bg-canvas p-4">
					<IconCircle size="sm">
						<ImageUp size={14} aria-hidden="true" />
					</IconCircle>
					<p className="text-sm text-muted">
						<span className="font-medium text-ink">Have a reference or inspiration image?</span> You
						can share photos directly on WhatsApp right after you send this brief.
					</p>
				</div>

				<EnquiryStatus saveStatus={saveStatus} draft={draft} />

				{/* One primary in one slot: the submit hands over to the WhatsApp link
			    the moment the draft exists (the save runs alongside, never gating it). */}
				<div className="mt-(--form-group-gap) flex flex-col items-start gap-3">
					{whatsappHref ? (
						<a
							id="send-enquiry"
							ref={whatsappRef}
							href={whatsappHref}
							target="_blank"
							rel="noopener noreferrer"
							aria-describedby="whatsapp-hint"
							className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full sm:w-auto")}
						>
							{submitLabel}
							<ArrowRight size={16} aria-hidden="true" className="shrink-0" />
						</a>
					) : (
						<Button id="send-enquiry" type="submit" size="lg" className="w-full sm:w-auto">
							Continue to WhatsApp
							<ArrowRight size={16} aria-hidden="true" className="shrink-0" />
						</Button>
					)}
					{saveStatus === "failed" ? (
						<Button type="submit" variant="secondary" className="w-full sm:w-auto">
							Try saving again
						</Button>
					) : null}
					<p id="whatsapp-hint" className="text-sm text-muted">
						{whatsappHref
							? "WhatsApp opens with your message ready to review. If it does not open, send the same message by email."
							: "Continue saves your brief and prepares a WhatsApp link. You review and send the message yourself."}
					</p>
					<p className="text-sm text-muted">
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
			</form>
		</div>
	);
}

/* ----------------------------- helpers ----------------------------- */

function EnquiryStatus({
	saveStatus,
	draft,
}: Readonly<{
	saveStatus: SaveStatus;
	draft: CustomOrderDraft | null;
}>) {
	// Specific beats generic (forms-copy c1 success anatomy): echo the choices
	// the visitor made so the record reads back, skipping empty selections.
	const echo = draft
		? [
				draft.style,
				draft.size ? `around ${draft.size}` : null,
				draft.budget ? `budget ${draft.budget}` : null,
				draft.timeline,
			]
				.filter(Boolean)
				.join(", ")
		: "";
	return (
		<div aria-live="polite" aria-atomic="true">
			{saveStatus === "saving" ? (
				<p className="text-sm text-muted">Saving your brief. You can send it on WhatsApp now.</p>
			) : null}
			{saveStatus === "failed" ? (
				<p className="flex items-start gap-2 text-sm text-ruby" role="alert">
					<AlertCircle size={16} aria-hidden="true" className="mt-1 shrink-0" />
					<span>
						We couldn&rsquo;t confirm your enquiry was saved. Send it on WhatsApp or by email, or
						try saving again.
					</span>
				</p>
			) : null}
			{saveStatus === "saved" && draft ? (
				<div className="flex items-start gap-3 rounded-(--radius-md) border border-(--section-accent)/40 bg-(--section-accent)/5 p-4">
					{/* The check pops in on the zoom spring (a response to the visitor's tap, no bounce). */}
					<motion.span
						initial={{ scale: 0.8 }}
						animate={{ scale: 1 }}
						transition={SPRING_ZOOM}
						className="flex shrink-0"
					>
						<IconCircle size="sm" className="bg-(--section-accent) text-bg ring-0">
							<Check size={14} />
						</IconCircle>
					</motion.span>
					<div>
						<p className="text-sm font-medium text-ink">Your enquiry is saved.</p>
						{echo ? <p className="mt-1 text-sm text-muted">{echo}.</p> : null}
						<p className="mt-1 text-sm text-muted">
							{draft.contact
								? "We'll use your contact details to reply. You can also send your message on WhatsApp."
								: "Send it on WhatsApp or email so we have a way to reply."}
						</p>
					</div>
				</div>
			) : null}
		</div>
	);
}
