"use client";

import { ArrowLeft, ArrowRight, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { AdminNotice } from "./admin-notice";
import type { EditorFields } from "./artwork-edit-state";
import { adminBtn, adminBtnPrimary, adminHelp, ICON_MD } from "./controls";
import type { UploadComposerState } from "./use-upload-composer";

const FIELD_LIST = new Intl.ListFormat("en", { type: "conjunction" });

function missingPublishFields(fields: EditorFields): string[] {
	return [
		!fields.title.trim() && "a title",
		!fields.style && "a category",
		!fields.medium.trim() && "a medium",
	].filter((field): field is string => !!field);
}

function publishHelp(composer: UploadComposerState, missingFields: string[]): string {
	if (composer.pending) return "Keep this window open while your piece is published.";
	const blockers: string[] = [];
	if (missingFields.length > 0) {
		blockers.push(`Add ${FIELD_LIST.format(missingFields)} to publish.`);
	}
	if (composer.stageError) blockers.push("Choose another photo or retry the upload.");
	else if (!composer.stagedKey) blockers.push("Your photo is still uploading.");
	if (blockers.length > 0) return blockers.join(" ");
	return "Publishing adds this piece to the public gallery.";
}

function publishLabel({ step, pending, error }: UploadComposerState): string {
	if (step === "photo") return "Continue to details";
	if (pending) return "Publishing…";
	if (error) return "Retry publish";
	return "Publish piece";
}

/** Publishing readiness and navigation share one persistent footer. */
export function UploadComposerControls({
	composer,
	id,
}: Readonly<{ composer: UploadComposerState; id: string }>) {
	const { added, file, fields, stagedKey, step, pending, error } = composer;
	if (added || !file) return null;
	const missingFields = missingPublishFields(fields);
	const ready = stagedKey !== null && missingFields.length === 0;
	const blocked = step === "details" && !ready;
	return (
		<div className="sticky bottom-0 z-raised grid gap-2 border-t border-line bg-surface-raised py-3">
			{error ? (
				<AdminNotice variant="error">{error} Your photo and details are still here.</AdminNotice>
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
					disabled={pending || blocked}
					aria-busy={pending || undefined}
					aria-describedby={step === "details" ? `${id}-publish-help` : undefined}
					className={cn(adminBtnPrimary, "min-w-40")}
				>
					{pending ? (
						<LoaderCircle size={ICON_MD} aria-hidden="true" className="animate-spin" />
					) : null}
					{publishLabel(composer)}
					{step === "photo" ? <ArrowRight size={ICON_MD} aria-hidden="true" /> : null}
				</button>
			</div>
			{step === "details" ? (
				<output className={cn(adminHelp, "block text-right")}>
					<span id={`${id}-publish-help`}>{publishHelp(composer, missingFields)}</span>
				</output>
			) : null}
		</div>
	);
}
