"use client";

import { LoaderCircle } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { Artwork } from "@/lib/types";
import { cn, formatBytes } from "@/lib/utils";
import {
	deleteArtwork,
	regeneratePalette,
	replaceArtworkImage,
	updateArtwork,
} from "../artwork-actions";
import { useAdminDraftGuard } from "./admin-draft-guard";
import { AdminNotice } from "./admin-notice";
import { ArtworkEditFields } from "./artwork-edit-fields";
import {
	type ArtworkEditorFields,
	type FieldErrors,
	fieldsFromArtwork,
	parseFields,
	sameFields,
	validateFields,
} from "./artwork-edit-state";
import { ConfirmPanel } from "./confirm-dialog";
import { adminBtn, adminBtnPrimary, adminHelp, adminThumb, ICON_MD } from "./controls";
import { Modal, ModalBody, ModalFooter, useModalExit } from "./modal";
import { stageImage } from "./stage-image";
import type { UploadProgressState } from "./upload-progress";
import { SAVED_BADGE_DURATION_MS, useAdminAction, usePendingVisible } from "./use-admin-action";

/** One sentence for both delete entry points (row and editor): honest about photos, offers the alternative. */
export const DELETE_PIECE_BODY =
	"The piece leaves the site and the admin list. Its photos stay in storage for recovery. To keep it in the gallery but off sale, set its status to Not for sale instead.";

/** The fields a successful save changed, applied to the row behind the sheet at once. */
export type ArtworkPatch = Pick<Artwork, "title" | "style" | "medium" | "status" | "featured"> &
	Partial<Pick<Artwork, "dimensions" | "year" | "description" | "priceInr">>;

type Step = "edit" | "confirmDelete" | "confirmDiscard";

interface ArtworkEditModalProps {
	art: Artwork;
	thumb: string;
	categories: readonly string[];
	onClose: () => void;
	onSaved: (patch: ArtworkPatch) => void;
	onDeleted: () => void;
}

/**
 * The editor (D14): a full-height sheet on phones, the centred card from sm.
 * X top-left, Save changes top-right only while dirty, footer with the result
 * and Discard. Delete and Discard confirmations replace the body instead of
 * stacking a second dialog; Escape steps back one level.
 */
export function ArtworkEditModal({
	art,
	thumb,
	categories,
	onClose,
	onSaved,
	onDeleted,
}: Readonly<ArtworkEditModalProps>) {
	const { pending, err, run } = useAdminAction();
	const { closing, requestClose: closeEditor } = useModalExit(onClose);
	const busy = pending || closing;
	const spinning = usePendingVisible(pending);
	const [fields, setFields] = useState<ArtworkEditorFields>(() => fieldsFromArtwork(art));
	const [savedFields, setSavedFields] = useState(fields);
	const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
	const [validationAttempt, setValidationAttempt] = useState(0);
	const [replacement, setReplacement] = useState<File | null>(null);
	const formId = useId();
	const form = useRef<HTMLFormElement>(null);
	const [step, setStep] = useState<Step>("edit");
	const [success, setSuccess] = useState<string | null>(null);
	const [lastAction, setLastAction] = useState<"delete" | "other">("other");
	const [progress, setProgress] = useState<UploadProgressState | null>(null);
	const dirty = !sameFields(fields, savedFields);
	const hasDraft = dirty || replacement !== null;
	useAdminDraftGuard(hasDraft || pending);

	useEffect(() => {
		if (!validationAttempt) return;
		const invalid = form.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
		const disclosure = invalid?.closest("details");
		if (disclosure) disclosure.open = true;
		invalid?.focus();
	}, [validationAttempt]);

	useEffect(() => {
		if (!success) return;
		const id = window.setTimeout(() => setSuccess(null), SAVED_BADGE_DURATION_MS);
		return () => window.clearTimeout(id);
	}, [success]);

	const update = (patch: Partial<ArtworkEditorFields>) => {
		setFields((current) => ({ ...current, ...patch }));
		// Errors clear per keystroke once shown.
		setFieldErrors((current) => {
			const next = { ...current };
			for (const key of Object.keys(patch) as (keyof FieldErrors)[]) delete next[key];
			return next;
		});
	};

	const runEdit = (fn: () => Promise<unknown>, message: string, after?: () => void) => {
		setLastAction("other");
		setSuccess(null);
		return run(fn, () => {
			setSuccess(message);
			after?.();
		});
	};

	const handleSave = () => {
		if (busy || !dirty) return;
		const errors = validateFields(fields);
		if (Object.keys(errors).length > 0) {
			setFieldErrors(errors);
			setValidationAttempt((attempt) => attempt + 1);
			return;
		}
		const snapshot = fields;
		const parsed = parseFields(snapshot);
		return runEdit(
			() => updateArtwork(art.slug, parsed),
			"Piece updated",
			() => {
				setSavedFields(snapshot);
				onSaved({
					title: parsed.title,
					style: parsed.style,
					medium: parsed.medium,
					dimensions: parsed.dimensions ?? undefined,
					year: parsed.year ?? undefined,
					description: parsed.description ?? undefined,
					priceInr: parsed.priceInr ?? undefined,
					status: parsed.status,
					featured: parsed.featured,
				});
			},
		);
	};

	const handleReplace = async (file: File) => {
		if (busy) return false;
		const sending = `Sending your photo (${formatBytes(file.size)})`;
		setProgress({ label: sending, fraction: 0 });
		const ok = await runEdit(async () => {
			// The master goes straight to R2; the action receives only its staged key.
			const key = await stageImage(file, (fraction) => setProgress({ label: sending, fraction }));
			setProgress({ label: "Preparing photo sizes and colours", fraction: null });
			const data = new FormData();
			data.set("imageKey", key);
			return replaceArtworkImage(art.slug, data);
		}, "Photo replaced");
		setProgress(null);
		return ok;
	};

	const handleDelete = async () => {
		setLastAction("delete");
		setSuccess(null);
		if (await run(() => deleteArtwork(art.slug))) onDeleted();
	};

	/** X, backdrop and Escape all land here; the step decides what "close" means. */
	const requestClose = () => {
		if (busy) return;
		if (step !== "edit") setStep("edit");
		else if (hasDraft) setStep("confirmDiscard");
		else closeEditor();
	};

	const footerError = lastAction === "delete" ? null : err;
	const showFooter = step === "edit" && (hasDraft || success !== null || footerError !== null);

	return (
		<Modal
			title="Edit piece"
			heading={
				<span className="flex min-w-0 items-center gap-3">
					{/* biome-ignore lint/performance/noImgElement: admin-only, R2 URL */}
					<img src={thumb} alt="" className={cn(adminThumb, "size-8")} />
					{/* The one display moment inside the tool (1.1). */}
					<span className="t-display min-w-0 truncate text-base italic">{art.title}</span>
				</span>
			}
			placement="sheet"
			closing={closing}
			size={step === "edit" ? "xl" : "lg"}
			action={
				step === "edit" && dirty ? (
					<button
						type="submit"
						form={formId}
						disabled={busy}
						aria-busy={pending || undefined}
						className={adminBtnPrimary}
					>
						{spinning ? (
							<LoaderCircle size={ICON_MD} aria-hidden="true" className="animate-spin" />
						) : null}
						Save changes
					</button>
				) : null
			}
			onClose={requestClose}
		>
			{step === "edit" ? (
				<ModalBody>
					<form
						ref={form}
						id={formId}
						noValidate
						onSubmit={(event) => {
							event.preventDefault();
							void handleSave();
						}}
					>
						<ArtworkEditFields
							art={art}
							thumb={thumb}
							categories={categories}
							fields={fields}
							errors={fieldErrors}
							pending={busy}
							progress={progress}
							replacement={replacement}
							onReplacementChange={setReplacement}
							onChange={update}
							onRefreshPalette={() =>
								runEdit(() => regeneratePalette(art.slug), "Colours refreshed")
							}
							onReplace={handleReplace}
							onRequestDelete={() => setStep("confirmDelete")}
						/>
					</form>
				</ModalBody>
			) : null}
			{step === "confirmDelete" ? (
				<ModalBody>
					<ConfirmPanel
						headingLevel={3}
						title={`Delete "${art.title}"?`}
						body={DELETE_PIECE_BODY}
						confirmLabel="Delete piece"
						cancelLabel="Keep piece"
						pending={busy}
						error={lastAction === "delete" ? err : null}
						onConfirm={handleDelete}
						onCancel={() => setStep("edit")}
					/>
				</ModalBody>
			) : null}
			{step === "confirmDiscard" ? (
				<ModalBody>
					<ConfirmPanel
						headingLevel={3}
						destructive={false}
						title="Discard changes?"
						body={
							replacement
								? "Your unsaved edits and selected photo will be lost."
								: "Your edits to this piece will be lost."
						}
						confirmLabel="Discard"
						cancelLabel="Keep editing"
						pending={busy}
						onConfirm={closeEditor}
						onCancel={() => setStep("edit")}
					/>
				</ModalBody>
			) : null}
			{showFooter ? (
				<ModalFooter>
					<div className="min-w-0 flex-1">
						{footerError ? (
							<AdminNotice variant="error">{footerError}</AdminNotice>
						) : success ? (
							<AdminNotice variant="success">{success}</AdminNotice>
						) : (
							<p className={adminHelp}>
								{dirty ? "Unsaved changes" : "Photo selected. Choose Replace photo to save it."}
							</p>
						)}
					</div>
					{hasDraft ? (
						<button
							type="button"
							onClick={() => setStep("confirmDiscard")}
							disabled={busy}
							className={adminBtn}
						>
							Discard
						</button>
					) : null}
				</ModalFooter>
			) : null}
		</Modal>
	);
}
