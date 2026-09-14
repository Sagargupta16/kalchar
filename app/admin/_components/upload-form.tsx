"use client";

import { ChevronDown, ImagePlus, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { unwrap } from "@/lib/action-result";
import { cn, formatBytes, formatInr } from "@/lib/utils";
import { createArtwork } from "../artwork-actions";
import { useAddSheet } from "./add-sheet";
import { AdminNotice } from "./admin-notice";
import {
	adminBtn,
	adminBtnPrimary,
	adminField,
	adminFilePicker,
	adminHelp,
	adminLabel,
	FOCUS_WITHIN,
	ICON_MD,
} from "./controls";
import { PHOTO_CHIP, useObjectUrl } from "./photo-preview";
import { stageImage } from "./stage-image";
import { UploadProgressEdge, type UploadProgressState } from "./upload-progress";
import { UploadSuccess } from "./upload-success";
import { usePendingVisible } from "./use-admin-action";

/**
 * Last-used defaults and catalog suggestions for the add form (D23, D30). The
 * reader is admin-content's `getArtworkFieldSuggestions()` in lib/data.ts; the
 * shape is mirrored here so the form compiles before and after that lands.
 */
export interface ArtworkFieldSuggestions {
	/** Distinct mediums, most used first, then alphabetical. */
	mediums: readonly string[];
	/** Distinct non-empty dimensions strings, most used first, then alphabetical. */
	dimensions: readonly string[];
	/** Category and medium of the piece with the highest `order`, or null on an empty catalog. */
	lastUsed: { style: string; medium: string } | null;
}

const EMPTY_SUGGESTIONS: ArtworkFieldSuggestions = { mediums: [], dimensions: [], lastUsed: null };
const digitsOnly = (value: string) => value.replace(/\D/g, "");

/**
 * The raised Add stores its pick in the provider's one-shot ref with no
 * re-render signal, so the form pulls it on focus, visibility and this poll.
 */
const PICK_POLL_MS = 300;

/** Borderless title (Tier 1c): the underline is the field boundary (3:1 line-strong, D4). */
const TITLE_FIELD =
	"min-h-control w-full rounded-none border-0 border-b border-line-strong bg-transparent px-0 text-xl font-medium text-ink transition-ui placeholder:text-muted focus-visible:border-accent";

interface UploadFormProps {
	categories: readonly string[];
	suggestions?: ArtworkFieldSuggestions;
	/** Accepted for the landed AddSheet call; the sheet form is always open (D-A5 retired the collapsed panel). */
	openByDefault?: boolean;
	/** Adopt this photo on mount and start staging at once. */
	initialFile?: File;
}

/**
 * The add-piece sheet form (Tier 1c): camera-roll first. Picking a photo
 * starts the presigned PUT immediately with real byte progress riding the
 * photo hero's bottom edge; the fields follow (borderless title, category
 * chip rail, price with the live INR echo, a More details disclosure) and
 * the primary stays disabled until title, category, medium and the staging
 * are done. Success stays in the sheet with View and Add another (the shell
 * owns the sheet's close; a BottomBar toast would sit under the top-layer
 * dialog).
 */
export function UploadForm({
	categories,
	suggestions = EMPTY_SUGGESTIONS,
	initialFile,
}: Readonly<UploadFormProps>) {
	const router = useRouter();
	const id = useId();
	const { openPiece, takePieceFile } = useAddSheet();
	const [pending, startTransition] = useTransition();
	const spinning = usePendingVisible(pending);
	const [error, setError] = useState<string | null>(null);
	const [missingPhoto, setMissingPhoto] = useState(false);
	const [added, setAdded] = useState<{ title: string; slug: string } | null>(null);
	const [file, setFile] = useState<File | null>(null);
	const [stagedKey, setStagedKey] = useState<string | null>(null);
	const [stageError, setStageError] = useState<string | null>(null);
	const [progress, setProgress] = useState<UploadProgressState | null>(null);
	const lastUsed = suggestions.lastUsed;
	const lastCategory = lastUsed && categories.includes(lastUsed.style) ? lastUsed.style : "";
	const [title, setTitle] = useState("");
	const [category, setCategory] = useState(lastCategory);
	const [medium, setMedium] = useState(lastUsed?.medium ?? "");
	const [price, setPrice] = useState("");
	const [year, setYear] = useState("");
	const [detailsOpen, setDetailsOpen] = useState(false);
	const formRef = useRef<HTMLFormElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const titleRef = useRef<HTMLInputElement>(null);
	const stagingRun = useRef(0);
	const url = useObjectUrl(file);

	/** Upload to R2 the moment a photo exists; the PUT races the typing. */
	const stage = useCallback((chosen: File) => {
		stagingRun.current += 1;
		const run = stagingRun.current;
		setStagedKey(null);
		setStageError(null);
		const total = formatBytes(chosen.size);
		setProgress({ label: `Uploading photo, ${formatBytes(0)} of ${total}`, fraction: 0 });
		stageImage(chosen, (fraction) => {
			if (stagingRun.current !== run) return;
			setProgress({
				label: `Uploading photo, ${formatBytes(fraction * chosen.size)} of ${total}`,
				fraction,
			});
		})
			.then((key) => {
				if (stagingRun.current !== run) return;
				setStagedKey(key);
				setProgress({ label: "Photo uploaded.", fraction: 1 });
			})
			.catch((thrown) => {
				if (stagingRun.current !== run) return;
				setProgress(null);
				setStageError(thrown instanceof Error ? thrown.message : "Upload failed.");
			});
	}, []);

	const adopt = useCallback(
		(chosen: File) => {
			setFile(chosen);
			setMissingPhoto(false);
			stage(chosen);
		},
		[stage],
	);

	// Adopt the initialFile once on mount.
	const adoptedInitial = useRef(false);
	useEffect(() => {
		if (adoptedInitial.current) return;
		adoptedInitial.current = true;
		if (initialFile) adopt(initialFile);
	}, [initialFile, adopt]);

	// Pull the raised-Add pick until a photo is adopted (see PICK_POLL_MS).
	useEffect(() => {
		if (file) return;
		const pull = () => {
			const picked = takePieceFile();
			if (picked) adopt(picked);
		};
		pull();
		window.addEventListener("focus", pull);
		document.addEventListener("visibilitychange", pull);
		const timer = window.setInterval(pull, PICK_POLL_MS);
		return () => {
			window.removeEventListener("focus", pull);
			document.removeEventListener("visibilitychange", pull);
			window.clearInterval(timer);
		};
	}, [file, takePieceFile, adopt]);

	// The next piece is one tap away: focus the picker once the form re-enables.
	useEffect(() => {
		if (added && !pending) inputRef.current?.focus();
	}, [added, pending]);

	const priceDigits = price !== "" && /^\d+$/.test(price);
	const ready =
		stagedKey !== null && title.trim() !== "" && category !== "" && medium.trim() !== "";

	const clearToDefaults = () => {
		formRef.current?.reset();
		stagingRun.current += 1;
		setFile(null);
		setStagedKey(null);
		setStageError(null);
		setProgress(null);
		setTitle("");
		setCategory(lastCategory);
		setMedium(lastUsed?.medium ?? "");
		setPrice("");
		setYear("");
		setDetailsOpen(false);
		if (inputRef.current) inputRef.current.value = "";
	};

	/** Reopens the picker in the same tap; the sheet is already open. */
	const addAnother = () => {
		setAdded(null);
		setError(null);
		clearToDefaults();
		openPiece();
	};

	const onPick = (event: React.ChangeEvent<HTMLInputElement>) => {
		const chosen = event.currentTarget.files?.[0] ?? null;
		if (!chosen) return;
		adopt(chosen);
		titleRef.current?.focus({ preventScroll: true });
	};

	function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setAdded(null);
		const data = new FormData(e.currentTarget);
		data.delete("image");
		if (!file) {
			setMissingPhoto(true);
			return;
		}
		if (!stagedKey) return;
		const key = stagedKey;
		const pieceTitle = title.trim();
		startTransition(async () => {
			try {
				setProgress({ label: "Preparing sizes for phones and desktops.", fraction: null });
				data.set("imageKey", key);
				const { slug } = unwrap(await createArtwork(data));
				setAdded({ title: pieceTitle, slug });
				clearToDefaults();
				router.refresh();
			} catch (thrown) {
				setError(thrown instanceof Error ? thrown.message : "Upload failed.");
				// The master is still staged; a retry submits the same key.
				setProgress({ label: "Photo uploaded.", fraction: 1 });
			}
		});
	}

	return (
		<form ref={formRef} id={id} onSubmit={onSubmit} className="grid gap-(--form-gap)">
			<fieldset disabled={pending} className="contents">
				<legend className="sr-only">Photo</legend>
				{file ? (
					<div className="grid gap-2">
						<div className="relative overflow-hidden rounded-(--radius-md) bg-canvas">
							{url ? (
								// biome-ignore lint/performance/noImgElement: local object URL preview, not a remote asset
								<img src={url} alt="" className="aspect-post max-h-[44svh] w-full object-cover" />
							) : (
								<div aria-hidden="true" className="aspect-post max-h-[44svh] w-full" />
							)}
							<label className={cn(PHOTO_CHIP, "absolute right-2 bottom-2", FOCUS_WITHIN)}>
								Change photo
								<input
									ref={inputRef}
									name="image"
									type="file"
									accept="image/jpeg,image/png,image/webp"
									onChange={onPick}
									className="sr-only"
								/>
							</label>
							{stageError && file ? (
								<button
									type="button"
									onClick={() => stage(file)}
									className={cn(PHOTO_CHIP, "absolute bottom-2 left-2")}
								>
									Retry upload
								</button>
							) : progress ? (
								<UploadProgressEdge state={progress} />
							) : null}
						</div>
						{progress ? (
							<p aria-live="polite" className={cn(adminHelp, "tabular-nums")}>
								{progress.label}
							</p>
						) : null}
						{stageError ? <AdminNotice variant="error">{stageError}</AdminNotice> : null}
					</div>
				) : (
					<div className="grid gap-2">
						<label
							className={cn(
								adminFilePicker,
								"grid aspect-post max-h-[40svh] place-items-center rounded-(--radius-md)",
							)}
						>
							<span className="grid justify-items-center gap-2 text-center">
								{/* 32px: the one oversized glyph the dashed hero card carries (Tier 1c). */}
								<ImagePlus size={32} aria-hidden="true" />
								<span className="text-sm font-medium text-ink">Choose a photo</span>
								<span className={adminHelp}>JPG, PNG, or WebP up to 20 MB</span>
							</span>
							<input
								ref={inputRef}
								name="image"
								type="file"
								accept="image/jpeg,image/png,image/webp"
								onChange={onPick}
								className="sr-only"
							/>
						</label>
						{missingPhoto ? <AdminNotice variant="error">Choose a photo first.</AdminNotice> : null}
					</div>
				)}
			</fieldset>

			<p className={adminHelp}>Fields marked * are required.</p>

			<fieldset disabled={pending} className="contents">
				<legend className="sr-only">Details</legend>
				<div className={adminLabel}>
					<label htmlFor={`${id}-title`}>Title *</label>
					<input
						ref={titleRef}
						id={`${id}-title`}
						name="title"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						placeholder="e.g. Lotus garden"
						autoCorrect="off"
						required
						className={TITLE_FIELD}
					/>
				</div>
				<div className={adminLabel}>
					<span>Category *</span>
					<div role="group" aria-label="Category" className="flex flex-wrap gap-2">
						{categories.map((name) => (
							<button
								key={name}
								type="button"
								aria-pressed={category === name}
								onClick={() => setCategory(name)}
								className={cn(adminBtn, "rounded-full")}
							>
								{name}
							</button>
						))}
					</div>
					<input type="hidden" name="style" value={category} />
					{categories.length === 0 ? (
						<p className={adminHelp}>
							No categories yet.{" "}
							<Link
								href="/admin/categories"
								className="underline underline-offset-2 hover:text-accent-text"
							>
								Add one in Categories
							</Link>{" "}
							first.
						</p>
					) : null}
				</div>
				<div className={adminLabel}>
					<label htmlFor={`${id}-medium`}>Medium *</label>
					<input
						id={`${id}-medium`}
						name="medium"
						list={`${id}-mediums`}
						value={medium}
						onChange={(e) => setMedium(e.target.value)}
						placeholder="e.g. Natural pigment on handmade paper"
						autoCorrect="off"
						required
						className={adminField}
					/>
					<datalist id={`${id}-mediums`}>
						{suggestions.mediums.map((option) => (
							<option key={option} value={option} />
						))}
					</datalist>
				</div>
			</fieldset>

			<fieldset disabled={pending} className="contents">
				<legend className="sr-only">Price</legend>
				<div className={adminLabel}>
					<label htmlFor={`${id}-price`}>Price (optional)</label>
					<div className={cn(adminField, "flex items-center gap-2")}>
						<span aria-hidden="true" className="text-sm text-muted">
							INR
						</span>
						<input
							id={`${id}-price`}
							name="priceInr"
							type="text"
							inputMode="numeric"
							pattern="[0-9]*"
							value={price}
							onChange={(e) => setPrice(digitsOnly(e.target.value))}
							aria-describedby={`${id}-price-help`}
							className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base text-ink placeholder:text-muted"
						/>
					</div>
					<p id={`${id}-price-help`} className={adminHelp}>
						Whole rupees. Leave blank if it is not for sale.
						{priceDigits ? (
							<span
								key={price}
								className="block tabular-nums starting:opacity-0 motion-safe:transition-opacity motion-safe:duration-(--duration-fast)"
							>
								Shows as {formatInr(Number(price))}
							</span>
						) : null}
					</p>
				</div>
			</fieldset>

			<fieldset disabled={pending} className="contents">
				<legend className="sr-only">More details</legend>
				<details
					open={detailsOpen}
					onToggle={(e) => setDetailsOpen(e.currentTarget.open)}
					className="group"
				>
					<summary className={cn(adminBtn, "w-full list-none justify-between")}>
						More details (Year, Dimensions, Description)
						<ChevronDown
							size={ICON_MD}
							aria-hidden="true"
							className="transition-transform group-open:rotate-180"
						/>
					</summary>
					<div className="mt-3 grid gap-(--form-gap)">
						<div className={adminLabel}>
							<label htmlFor={`${id}-year`}>Year (optional)</label>
							<input
								id={`${id}-year`}
								name="year"
								type="text"
								inputMode="numeric"
								pattern="[0-9]*"
								maxLength={4}
								placeholder="e.g. 2026"
								value={year}
								onChange={(e) => setYear(digitsOnly(e.target.value))}
								className={adminField}
							/>
						</div>
						<div className={adminLabel}>
							<label htmlFor={`${id}-dimensions`}>Dimensions (optional)</label>
							<input
								id={`${id}-dimensions`}
								name="dimensions"
								list={`${id}-dimensions-list`}
								placeholder="e.g. 30 x 40 cm"
								className={adminField}
							/>
							<datalist id={`${id}-dimensions-list`}>
								{suggestions.dimensions.map((value) => (
									<option key={value} value={value} />
								))}
							</datalist>
						</div>
						<div className={adminLabel}>
							<label htmlFor={`${id}-description`}>Description (optional)</label>
							<textarea
								id={`${id}-description`}
								name="description"
								rows={3}
								className={adminField}
							/>
						</div>
					</div>
				</details>
			</fieldset>

			<div className="grid gap-3">
				<button
					type="submit"
					disabled={pending || !ready}
					aria-busy={pending || undefined}
					className={cn(adminBtnPrimary, "w-full")}
				>
					{spinning ? (
						<LoaderCircle size={ICON_MD} aria-hidden="true" className="motion-safe:animate-spin" />
					) : null}
					{pending ? "Adding..." : "Add piece"}
				</button>
				{error ? <AdminNotice variant="error">{error}</AdminNotice> : null}
				{added ? (
					<UploadSuccess title={added.title} slug={added.slug} onAddAnother={addAnother} />
				) : null}
			</div>
		</form>
	);
}
