"use client";

import { AlertCircle, ArrowRight, Check, ChevronDown, ImageUp, Mail } from "lucide-react";
import { motion } from "motion/react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { submitLead } from "@/app/admin/lead-actions";
import { StylePicker, type StyleSample } from "@/components/forms/style-picker";
import { Button, buttonVariants } from "@/components/ui/button";
import { IconCircle } from "@/components/ui/icon-circle";
import { SPRING_ZOOM } from "@/lib/motion";
import type { ArtStyle, CustomOrderDraft } from "@/lib/types";
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
const MAX_BRIEF_LENGTH = 4000;
const MAX_CONTACT_LENGTH = 200;
type SaveStatus = "idle" | "saving" | "saved" | "failed";

interface CustomOrderFormProps {
	phoneE164NoPlus: string;
	emailUrl: string;
	availableStyles: readonly ArtStyle[];
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
	const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
	const [error, setError] = useState<string | null>(null);
	const [draft, setDraft] = useState<CustomOrderDraft | null>(null);
	const submissionVersion = useRef(0);
	const whatsappRef = useRef<HTMLAnchorElement>(null);

	// The submit button unmounts once the draft exists; move focus to the link
	// that took its place so keyboard and screen-reader users are not stranded.
	useEffect(() => {
		if (draft) whatsappRef.current?.focus();
	}, [draft]);

	function readDraft(formData: FormData): CustomOrderDraft | null {
		const briefMessage = (formData.get("brief") as string | null)?.trim() ?? "";
		if (!briefMessage) {
			setError("Tell us a bit about what you'd like.");
			return null;
		}
		const styleVal = formData.get("style") as string | null;
		return {
			name: (formData.get("name") as string | null)?.trim() || undefined,
			contact: (formData.get("contact") as string | null)?.trim() || undefined,
			style: (styleVal as CustomOrderDraft["style"]) || undefined,
			size: (formData.get("size") as string | null) || undefined,
			budget: (formData.get("budget") as string | null) || undefined,
			timeline: (formData.get("timeline") as string | null) || undefined,
			briefMessage,
		};
	}

	async function onSubmit(e: FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		const formData = new FormData(e.currentTarget);
		const next = readDraft(formData);
		if (!next) return;
		const version = ++submissionVersion.current;
		setDraft(next);
		setSaveStatus("saving");
		try {
			const result = await submitLead(formData);
			if (submissionVersion.current === version) {
				setSaveStatus(result.ok ? "saved" : "failed");
			}
		} catch {
			if (submissionVersion.current === version) setSaveStatus("failed");
		}
	}

	const mailtoHref = draft ? customOrderMailto(emailUrl, draft) : null;
	const whatsappHref = draft
		? buildWhatsAppLink({ phoneE164NoPlus, message: customOrderMessage(draft) })
		: null;

	return (
		<form
			onSubmit={onSubmit}
			onChange={() => {
				// An old response must not mark an edited brief as saved.
				submissionVersion.current += 1;
				setDraft(null);
				setSaveStatus("idle");
				setError(null);
			}}
			// relative anchors the off-screen honeypot to the form; @container lets
			// the field pairs split on the form's own width, not the viewport.
			className="@container relative flex flex-col gap-(--form-gap)"
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
			{/* Brief -- the one required field, given hero weight up top. */}
			<Field id="brief" label="What would you like painted?" required>
				<textarea
					id="brief"
					name="brief"
					rows={5}
					required
					maxLength={MAX_BRIEF_LENGTH}
					aria-invalid={error ? true : undefined}
					aria-describedby={error ? "brief-error" : undefined}
					placeholder="Describe the piece: subject, colors, the occasion, anything you'd like reflected."
					className={cn(inputClass, "resize-y")}
				/>
			</Field>

			{/* Visual style picker (replaces the old dropdown). */}
			<StylePicker name="style" styles={availableStyles} samples={styleSamples} />

			<div className="grid gap-(--form-gap) @md:grid-cols-2">
				<SelectField id="size" label="Approx size">
					<select id="size" name="size" defaultValue="" className={selectClass}>
						<option value="">No preference</option>
						{sizes.map((s) => (
							<option key={s} value={s}>
								{s}
							</option>
						))}
					</select>
				</SelectField>

				<SelectField id="budget" label="Budget">
					<select id="budget" name="budget" defaultValue="" className={selectClass}>
						<option value="">Open / not sure</option>
						{budgets.map((b) => (
							<option key={b} value={b}>
								{b}
							</option>
						))}
					</select>
				</SelectField>
			</div>

			<div className="grid gap-(--form-gap) @md:grid-cols-2">
				<SelectField id="timeline" label="Timeline">
					<select id="timeline" name="timeline" defaultValue="" className={selectClass}>
						<option value="">No specific timeline</option>
						{timelines.map((t) => (
							<option key={t} value={t}>
								{t}
							</option>
						))}
					</select>
				</SelectField>

				<Field id="name" label="Your name" optional>
					<input
						id="name"
						name="name"
						type="text"
						autoComplete="name"
						placeholder="What should we call you?"
						className={inputClass}
					/>
				</Field>
			</div>

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
					maxLength={MAX_CONTACT_LENGTH}
					autoCapitalize="none"
					spellCheck={false}
					aria-describedby="contact-hint"
					placeholder="Where can we reply?"
					className={inputClass}
				/>
			</Field>

			{/* Reference images are shared in the conversation. */}
			<div className="flex items-start gap-3 rounded-(--radius-md) border border-line bg-canvas p-4">
				<IconCircle size="sm">
					<ImageUp size={14} />
				</IconCircle>
				<p className="text-sm text-muted">
					<span className="font-medium text-ink">Have a reference or inspiration image?</span> You
					can share photos directly on WhatsApp right after you send this brief.
				</p>
			</div>

			<EnquiryStatus error={error} saveStatus={saveStatus} draft={draft} />

			{/* One primary in one slot: the submit hands over to the WhatsApp link
			    the moment the draft exists (the save runs alongside, never gating it). */}
			<div className="mt-(--form-group-gap) flex flex-col items-start gap-3">
				{whatsappHref ? (
					<a
						ref={whatsappRef}
						href={whatsappHref}
						target="_blank"
						rel="noopener noreferrer"
						className={cn(buttonVariants({ variant: "primary", size: "lg" }), "w-full sm:w-auto")}
					>
						{submitLabel}
						<ArrowRight size={16} aria-hidden="true" className="shrink-0" />
					</a>
				) : (
					<Button type="submit" size="lg" className="w-full sm:w-auto">
						Continue to WhatsApp
						<ArrowRight size={16} aria-hidden="true" className="shrink-0" />
					</Button>
				)}
				{saveStatus === "failed" ? (
					<Button type="submit" variant="secondary" className="w-full sm:w-auto">
						Try saving again
					</Button>
				) : null}
				<p className="text-sm text-muted">
					{whatsappHref
						? "WhatsApp opens with your message ready to review. If it does not open, send the same message by email."
						: "We save your brief, then open WhatsApp with the message ready for you to review."}
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
	);
}

/* ----------------------------- helpers ----------------------------- */

function EnquiryStatus({
	error,
	saveStatus,
	draft,
}: Readonly<{
	error: string | null;
	saveStatus: SaveStatus;
	draft: CustomOrderDraft | null;
}>) {
	return (
		<div aria-live="polite" aria-atomic="true">
			{error ? (
				<p id="brief-error" className="flex items-start gap-2 text-sm text-ruby" role="alert">
					<AlertCircle size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
					<span>{error}</span>
				</p>
			) : null}
			{saveStatus === "saving" ? (
				<p className="text-sm text-muted">Saving your brief. You can send it on WhatsApp now.</p>
			) : null}
			{saveStatus === "failed" ? (
				<p className="flex items-start gap-2 text-sm text-ruby" role="alert">
					<AlertCircle size={15} aria-hidden="true" className="mt-0.5 shrink-0" />
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

// D4 field: inset canvas with a 3:1 boundary, 16px text (no iOS zoom), 44px
// floor. Focus is the global rule (2px accent outline; the border turns accent).
const inputClass =
	"block w-full min-h-control rounded-(--radius-sm) border border-line-strong bg-canvas px-4 py-3 text-base text-ink transition-ui placeholder:text-muted";

// Selects drop the OS chevron (appearance-none) so they match the cream/ink
// fields; a lucide chevron is layered in via the SelectField wrapper. Extra
// right padding leaves room for it.
const selectClass = cn(inputClass, "appearance-none pr-11 cursor-pointer");

function SelectField({
	id,
	label,
	children,
}: Readonly<{
	id: string;
	label: string;
	children: React.ReactNode;
}>) {
	return (
		<Field id={id} label={label} optional>
			<div className="relative">
				{children}
				<ChevronDown
					size={16}
					aria-hidden="true"
					className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted"
				/>
			</div>
		</Field>
	);
}

function Field({
	id,
	label,
	optional,
	required,
	description,
	children,
}: Readonly<{
	id: string;
	label: string;
	optional?: boolean;
	required?: boolean;
	/** Helper line under the control (outside the underline wrapper). */
	description?: React.ReactNode;
	children: React.ReactNode;
}>) {
	let hint: React.ReactNode = null;
	if (required) {
		hint = <span className="text-xs text-muted">required</span>;
	} else if (optional) {
		hint = <span className="text-xs text-muted">optional</span>;
	}
	return (
		<div className="grid gap-(--field-label-gap)">
			<label
				htmlFor={id}
				className="flex items-baseline justify-between text-sm font-medium text-ink"
			>
				<span>{label}</span>
				{hint}
			</label>
			{/* A pigment underline draws under the focused control (additive to the
			    global outline; compositor-only, nothing repaints). */}
			<div className="relative after:pointer-events-none after:absolute after:inset-x-2.5 after:bottom-0 after:h-0.5 after:origin-left after:scale-x-0 after:bg-(--section-accent) after:transition-transform focus-within:after:scale-x-100">
				{children}
			</div>
			{description}
		</div>
	);
}
