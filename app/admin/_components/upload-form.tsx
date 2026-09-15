"use client";

import { ArrowLeft, ArrowRight, Check, LoaderCircle } from "lucide-react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { useEffect, useId, useRef } from "react";
import { DUR, EASE_IN, REVEAL_DISTANCE, SPRING_PANEL } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { AdminNotice } from "./admin-notice";
import { adminBtn, adminBtnPrimary, adminHelp, ICON_MD } from "./controls";
import { UploadDetailsStep } from "./upload-details-step";
import { UploadPhotoStep } from "./upload-photo-step";
import { UploadSuccess } from "./upload-success";
import {
	type UploadComposerState,
	type UploadFormProps,
	useUploadComposer,
} from "./use-upload-composer";

export type { ArtworkFieldSuggestions } from "./use-upload-composer";

const FIELD_LIST = new Intl.ListFormat("en", { type: "conjunction" });

/** Standalone form; Add supplies a persistent controller to the same composer view. */
export function UploadForm(props: Readonly<UploadFormProps>) {
	const composer = useUploadComposer(props);
	return <UploadComposer composer={composer} />;
}

export function UploadComposer({ composer }: Readonly<{ composer: UploadComposerState }>) {
	const {
		step,
		direction,
		file,
		fields,
		validationAttempt,
		stagedKey,
		stageError,
		pending,
		added,
		error,
	} = composer;
	const id = useId();
	const form = useRef<HTMLFormElement>(null);
	const heading = useRef<HTMLHeadingElement>(null);
	const focusedStep = useRef<string | null>(null);
	const missingFields = [
		!fields.title.trim() && "a title",
		!fields.style && "a category",
		!fields.medium.trim() && "a medium",
	].filter((field): field is string => !!field);
	const ready = stagedKey !== null && missingFields.length === 0;
	const blockers = [
		missingFields.length ? `Add ${FIELD_LIST.format(missingFields)} to publish.` : "",
		stageError
			? "Choose another photo or retry the upload."
			: !stagedKey
				? "Your photo is still uploading."
				: "",
	].filter(Boolean);
	const publishHelp = pending
		? "Keep this window open while your piece is published."
		: blockers.length
			? blockers.join(" ")
			: "Publishing adds this piece to the public gallery.";

	useEffect(() => {
		if (validationAttempt > 0) {
			const invalid = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
			const disclosure = invalid?.closest("details");
			if (disclosure) disclosure.open = true;
			invalid?.focus();
		}
	}, [validationAttempt]);

	return (
		<MotionConfig reducedMotion="never">
			<form
				ref={form}
				id={id}
				noValidate
				onSubmit={(event) => {
					event.preventDefault();
					if (step === "photo") composer.goTo("details");
					else composer.publish();
				}}
				className="grid gap-(--space-group)"
			>
				{!added ? (
					<ol aria-label="Add piece progress" className="flex items-center gap-3 text-label">
						<li
							aria-current={step === "photo" ? "step" : undefined}
							className="flex items-center gap-2 text-ink"
						>
							<span className="grid size-7 place-items-center rounded-full bg-accent text-bg">
								{step === "details" ? <Check size={ICON_MD} aria-hidden="true" /> : "1"}
							</span>
							Photo
						</li>
						<li aria-hidden="true" className="h-px w-8 bg-line" />
						<li
							aria-current={step === "details" ? "step" : undefined}
							className={cn(
								"flex items-center gap-2",
								step === "details" ? "text-ink" : "text-muted",
							)}
						>
							<span
								className={cn(
									"grid size-7 place-items-center rounded-full",
									step === "details" ? "bg-accent text-bg" : "bg-canvas",
								)}
							>
								2
							</span>
							Details
						</li>
					</ol>
				) : null}
				<div className="grid min-w-0 items-start gap-(--space-group) lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:gap-8">
					<UploadPhotoStep composer={composer} />
					<div className="min-w-0 overflow-x-clip">
						<AnimatePresence mode="wait" initial={false} custom={direction}>
							<motion.section
								key={added ? "success" : step}
								custom={direction}
								variants={{
									enter: (travel: number) => ({ opacity: 0, x: travel * REVEAL_DISTANCE.block }),
									active: { opacity: 1, x: 0, transition: SPRING_PANEL },
									exit: (travel: number) => ({
										opacity: 0,
										x: -travel * REVEAL_DISTANCE.item,
										transition: { duration: DUR.fast, ease: EASE_IN },
									}),
								}}
								initial="enter"
								animate="active"
								exit="exit"
								onAnimationComplete={(animation) => {
									const current = added ? "success" : step;
									if (animation === "active" && focusedStep.current !== current) {
										focusedStep.current = current;
										// A user may already be typing before the entrance finishes.
										if (!heading.current?.parentElement?.contains(document.activeElement)) {
											heading.current?.focus({ preventScroll: true });
										}
									}
								}}
								aria-labelledby={`${id}-step`}
								className="grid gap-(--form-gap)"
							>
								<h2
									ref={heading}
									id={`${id}-step`}
									tabIndex={-1}
									className="text-2xl font-medium tracking-tight text-ink"
								>
									{added
										? "Your piece is live"
										: step === "photo"
											? "Start with your artwork"
											: "Give it a name"}
								</h2>
								{added ? (
									<UploadSuccess
										title={added.title}
										slug={added.slug}
										onAddAnother={composer.reset}
									/>
								) : step === "photo" ? (
									<div className="grid gap-4">
										<p className="text-sm leading-relaxed text-muted">
											Choose a clear photo of the whole piece. Then add a title and a few details.
										</p>
										<p className={adminHelp}>
											{file
												? "Your photo uploads while you add the details."
												: "Nothing appears in the gallery until you publish."}
										</p>
									</div>
								) : (
									<UploadDetailsStep composer={composer} id={id} />
								)}
							</motion.section>
						</AnimatePresence>
					</div>
				</div>
				{!added && file ? (
					<div className="sticky bottom-0 z-raised grid gap-2 border-t border-line bg-surface-raised py-3">
						{error ? (
							<AdminNotice variant="error">
								{error} Your photo and details are still here.
							</AdminNotice>
						) : null}
						<div className="flex items-center justify-between gap-3">
							{step === "details" ? (
								<button
									type="button"
									disabled={pending}
									onClick={() => composer.goTo("photo")}
									className={adminBtn}
								>
									<ArrowLeft size={ICON_MD} aria-hidden="true" /> Back
								</button>
							) : (
								<span className={cn(adminHelp, "min-w-0")}>One piece at a time.</span>
							)}
							<button
								type="submit"
								disabled={pending || (step === "photo" ? !file : !ready)}
								aria-busy={pending || undefined}
								aria-describedby={step === "details" ? `${id}-publish-help` : undefined}
								className={cn(adminBtnPrimary, "min-w-40")}
							>
								{pending ? (
									<LoaderCircle size={ICON_MD} aria-hidden="true" className="animate-spin" />
								) : null}
								{step === "photo"
									? "Continue to details"
									: pending
										? "Publishing…"
										: error
											? "Retry publish"
											: "Publish piece"}
								{step === "photo" ? <ArrowRight size={ICON_MD} aria-hidden="true" /> : null}
							</button>
						</div>
						{step === "details" ? (
							<p id={`${id}-publish-help`} role="status" className={cn(adminHelp, "text-right")}>
								{publishHelp}
							</p>
						) : null}
					</div>
				) : null}
			</form>
		</MotionConfig>
	);
}
