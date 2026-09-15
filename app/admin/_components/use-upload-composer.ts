"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { unwrap } from "@/lib/action-result";
import { formatBytes } from "@/lib/utils";
import { createArtwork } from "../artwork-actions";
import { useBeforeUnloadGuard } from "./admin-draft-guard";
import { type EditorFields, type FieldErrors, validateFields } from "./artwork-edit-state";
import { stageImage } from "./stage-image";
import type { UploadProgressState } from "./upload-progress";

export interface ArtworkFieldSuggestions {
	mediums: readonly string[];
	dimensions: readonly string[];
	lastUsed: { style: string; medium: string } | null;
}

export interface UploadFormProps {
	categories: readonly string[];
	suggestions?: ArtworkFieldSuggestions;
	openByDefault?: boolean;
	initialFile?: File;
}

export type UploadStep = "photo" | "details";
const UPLOAD_STEPS: readonly UploadStep[] = ["photo", "details"];
const EMPTY_SUGGESTIONS: ArtworkFieldSuggestions = { mediums: [], dimensions: [], lastUsed: null };

/** The sheet keeps this controller mounted when closed, preserving the session draft and upload. */
export function useUploadComposer({
	categories,
	suggestions = EMPTY_SUGGESTIONS,
	initialFile,
}: UploadFormProps) {
	const router = useRouter();
	const lastUsed = suggestions.lastUsed;
	const defaults: EditorFields = {
		title: "",
		style: lastUsed && categories.includes(lastUsed.style) ? lastUsed.style : "",
		medium: lastUsed?.medium ?? "",
		price: "",
		year: "",
		dimensions: "",
		description: "",
	};
	const [fields, setFields] = useState(defaults);
	const [errors, setErrors] = useState<FieldErrors>({});
	const [validationAttempt, setValidationAttempt] = useState(0);
	const [step, setStep] = useState<UploadStep>("photo");
	const [direction, setDirection] = useState(1);
	const [file, setFile] = useState<File | null>(null);
	const [stagedKey, setStagedKey] = useState<string | null>(null);
	const [stageError, setStageError] = useState<string | null>(null);
	const [progress, setProgress] = useState<UploadProgressState | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [added, setAdded] = useState<{ title: string; slug: string } | null>(null);
	const [pending, startTransition] = useTransition();
	const publishing = useRef(false);
	const stagingRun = useRef(0);
	const mounted = useRef(true);
	const adoptedInitial = useRef(false);
	useBeforeUnloadGuard(pending || (file !== null && !added));

	const stage = useCallback((chosen: File) => {
		if (publishing.current) return;
		const run = ++stagingRun.current;
		setStagedKey(null);
		setStageError(null);
		const total = formatBytes(chosen.size);
		setProgress({ label: `Uploading photo, ${formatBytes(0)} of ${total}`, fraction: 0 });
		stageImage(chosen, (fraction) => {
			if (!mounted.current || stagingRun.current !== run) return;
			setProgress({
				label: `Uploading photo, ${formatBytes(fraction * chosen.size)} of ${total}`,
				fraction,
			});
		})
			.then((key) => {
				if (!mounted.current || stagingRun.current !== run) return;
				setStagedKey(key);
				setProgress({ label: "Photo uploaded.", fraction: 1 });
			})
			.catch((error_) => {
				if (!mounted.current || stagingRun.current !== run) return;
				setProgress(null);
				setStageError(error_ instanceof Error ? error_.message : "Upload failed. Try again.");
			});
	}, []);

	const adopt = useCallback(
		(chosen: File) => {
			if (publishing.current) return;
			setFile(chosen);
			setError(null);
			setDirection(1);
			setStep("details");
			stage(chosen);
		},
		[stage],
	);

	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	useEffect(() => {
		if (adoptedInitial.current) return;
		adoptedInitial.current = true;
		if (initialFile) adopt(initialFile);
	}, [initialFile, adopt]);

	const change = (patch: Partial<EditorFields>) => {
		setFields((current) => ({ ...current, ...patch }));
		setError(null);
		setErrors((current) => {
			const next = { ...current };
			for (const key of Object.keys(patch)) delete next[key as keyof FieldErrors];
			return next;
		});
	};

	const goTo = (next: UploadStep) => {
		if (publishing.current || (next !== "photo" && !file)) return;
		setDirection(UPLOAD_STEPS.indexOf(next) > UPLOAD_STEPS.indexOf(step) ? 1 : -1);
		setStep(next);
	};

	const publish = () => {
		if (publishing.current || !stagedKey || step !== "details" || added) return;
		const nextErrors = validateFields(fields);
		setErrors(nextErrors);
		if (Object.keys(nextErrors).length) {
			setValidationAttempt((attempt) => attempt + 1);
			return;
		}
		publishing.current = true;
		setError(null);
		const data = new FormData();
		for (const [key, value] of Object.entries(fields)) {
			data.set(key === "price" ? "priceInr" : key, value);
		}
		data.set("imageKey", stagedKey);
		setProgress({ label: "Preparing photo sizes and publishing your piece…", fraction: null });
		startTransition(async () => {
			try {
				const { slug } = unwrap(await createArtwork(data));
				setAdded({ title: fields.title.trim(), slug });
				setProgress(null);
				router.refresh();
			} catch (error_) {
				setError(error_ instanceof Error ? error_.message : "Publishing failed. Please try again.");
				// Publishing retries reuse the master already staged; the draft stays intact.
				setProgress({ label: "Photo uploaded.", fraction: 1 });
			} finally {
				publishing.current = false;
			}
		});
	};

	const reset = () => {
		if (publishing.current) return;
		stagingRun.current += 1;
		setFields(defaults);
		setErrors({});
		setValidationAttempt(0);
		setFile(null);
		setStagedKey(null);
		setStageError(null);
		setProgress(null);
		setError(null);
		setAdded(null);
		setDirection(-1);
		setStep("photo");
	};

	return {
		categories,
		suggestions,
		fields,
		errors,
		validationAttempt,
		step,
		direction,
		file,
		stagedKey,
		stageError,
		progress,
		error,
		added,
		pending,
		adopt,
		change,
		goTo,
		publish,
		reset,
		retry: () => {
			if (file) stage(file);
		},
	};
}

export type UploadComposerState = ReturnType<typeof useUploadComposer>;
