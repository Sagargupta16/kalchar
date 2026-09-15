"use client";

import { useEffect, useId, useState } from "react";
import type { Artwork } from "@/lib/types";
import { formatBytes } from "@/lib/utils";
import { deleteArtwork, replaceArtworkImage, updateArtwork } from "../artwork-actions";
import { useAdminDraftGuard } from "./admin-draft-guard";
import {
	type ArtworkEditorFields,
	type FieldErrors,
	fieldsFromArtwork,
	parseFields,
	sameFields,
	validateFields,
} from "./artwork-edit-state";
import { useModalExit } from "./modal";
import { stageImage } from "./stage-image";
import type { UploadProgressState } from "./upload-progress";
import { SAVED_BADGE_DURATION_MS, useAdminAction, usePendingVisible } from "./use-admin-action";
import { useArtworkValidationFocus } from "./use-artwork-validation-focus";

/** Successful saves update the row behind the editor immediately. */
export type ArtworkPatch = Pick<Artwork, "title" | "style" | "medium" | "status" | "featured"> &
	Partial<Pick<Artwork, "dimensions" | "year" | "description" | "priceInr">>;

type Step = "edit" | "confirmDelete" | "confirmDiscard";

export interface ArtworkEditorProps {
	art: Artwork;
	onClose: () => void;
	onSaved: (patch: ArtworkPatch) => void;
	onDeleted: () => void;
}

/** Keeps draft, validation and action lifecycles independent of the editor layout. */
export function useArtworkEditor({ art, onClose, onSaved, onDeleted }: ArtworkEditorProps) {
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
	const form = useArtworkValidationFocus(validationAttempt);
	const [step, setStep] = useState<Step>("edit");
	const [success, setSuccess] = useState<string | null>(null);
	const [lastAction, setLastAction] = useState<"delete" | "other">("other");
	const [progress, setProgress] = useState<UploadProgressState | null>(null);
	const dirty = !sameFields(fields, savedFields);
	const hasDraft = dirty || replacement !== null;
	useAdminDraftGuard(hasDraft || pending);

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

	return {
		busy,
		pending,
		spinning,
		closing,
		form,
		formId,
		fields,
		fieldErrors,
		dirty,
		hasDraft,
		replacement,
		setReplacement,
		step,
		setStep,
		success,
		err,
		lastAction,
		progress,
		footerError,
		showFooter,
		update,
		runEdit,
		handleSave,
		handleReplace,
		handleDelete,
		requestClose,
		closeEditor,
	};
}

export type ArtworkEditorState = ReturnType<typeof useArtworkEditor>;
