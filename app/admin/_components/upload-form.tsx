"use client";

import { ImagePlus, LoaderCircle, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState, useTransition } from "react";
import { unwrap } from "@/lib/action-result";
import { cn, formatBytes, formatInr } from "@/lib/utils";
import { createArtwork } from "../artwork-actions";
import { AdminNotice } from "./admin-notice";
import {
	adminBtnPrimary,
	adminField,
	adminFilePicker,
	adminHelp,
	adminLabel,
	adminSectionTitle,
	ICON_MD,
} from "./controls";
import { PhotoPreview } from "./photo-preview";
import { stageImage } from "./stage-image";
import { UploadProgress, type UploadProgressState } from "./upload-progress";
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
/**
 * Tailwind's `sm` breakpoint: from here the form is open on load with no trigger (D36).
 * The field grid keys off the Add panel's own width (`@container/add` on the panel in
 * page.tsx) rather than the viewport, because from lg the panel sits beside the list
 * (ruling 42) and is narrower than a phone in landscape.
 */
const SM_BREAKPOINT = "(min-width: 40rem)";
const LEGEND = cn(adminSectionTitle, "@lg/add:col-span-2");
const digitsOnly = (value: string) => value.replace(/\D/g, "");

interface UploadFormProps {
	categories: readonly string[];
	suggestions?: ArtworkFieldSuggestions;
	/** Open at every width (the page passes it when the catalog is empty). */
	openByDefault?: boolean;
}

/**
 * The add-piece form: photo first, then Details and Price in the shared field
 * rhythm, a button that keeps its label while it works, and a success line in
 * the artist's words with the next actions. Collapsed behind one "Add a piece"
 * button below sm (D36).
 */
export function UploadForm({
	categories,
	suggestions = EMPTY_SUGGESTIONS,
	openByDefault = false,
}: Readonly<UploadFormProps>) {
	const router = useRouter();
	const id = useId();
	const [pending, startTransition] = useTransition();
	const spinning = usePendingVisible(pending);
	const [open, setOpen] = useState(openByDefault);
	const [focusPicker, setFocusPicker] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [missingPhoto, setMissingPhoto] = useState(false);
	const [added, setAdded] = useState<{ title: string; slug: string } | null>(null);
	const [file, setFile] = useState<File | null>(null);
	const [price, setPrice] = useState("");
	const [year, setYear] = useState("");
	const [progress, setProgress] = useState<UploadProgressState | null>(null);
	const formRef = useRef<HTMLFormElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const titleRef = useRef<HTMLInputElement>(null);

	// From sm up the form is open on load; the layout effect runs before first paint, so no flash.
	useLayoutEffect(() => {
		const query = window.matchMedia(SM_BREAKPOINT);
		const sync = () => {
			if (query.matches) setOpen(true);
		};
		sync();
		query.addEventListener("change", sync);
		return () => query.removeEventListener("change", sync);
	}, []);

	// K3: the picker takes focus without the page jumping. The form is taller than a phone
	// viewport, so "off-screen" is judged by its top edge (where the picker sits).
	useEffect(() => {
		if (!open || !focusPicker) return;
		inputRef.current?.focus({ preventScroll: true });
		const form = formRef.current;
		if (form) {
			const { top } = form.getBoundingClientRect();
			if (top < 0 || top > window.innerHeight) form.scrollIntoView({ block: "nearest" });
		}
		setFocusPicker(false);
	}, [open, focusPicker]);

	// The next piece is one tap away: focus the picker once the fieldsets re-enable after a success.
	useEffect(() => {
		if (added && !pending) inputRef.current?.focus();
	}, [added, pending]);

	const lastUsed = suggestions.lastUsed;
	const lastCategory = lastUsed && categories.includes(lastUsed.style) ? lastUsed.style : "";
	const priceDigits = price !== "" && /^\d+$/.test(price);

	const clearFile = () => {
		setFile(null);
		if (inputRef.current) inputRef.current.value = "";
	};

	function onSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		setError(null);
		setAdded(null);
		const form = e.currentTarget;
		const data = new FormData(form);
		data.delete("image");
		if (!file) {
			setMissingPhoto(true);
			return;
		}
		setMissingPhoto(false);
		const chosen = file;
		const title = String(data.get("title") ?? "").trim();
		const sending = `Sending your photo (${formatBytes(chosen.size)})`;
		startTransition(async () => {
			try {
				// The master goes straight to R2 with live byte progress; only its
				// staged key is submitted, so the action's body stays small.
				setProgress({ label: sending, fraction: 0 });
				const key = await stageImage(chosen, (fraction) =>
					setProgress({ label: sending, fraction }),
				);
				setProgress({ label: "Preparing photo sizes and colours", fraction: null });
				data.set("imageKey", key);
				const { slug } = unwrap(await createArtwork(data));
				setAdded({ title, slug });
				form.reset();
				clearFile();
				setPrice("");
				setYear("");
				router.refresh();
			} catch (err) {
				setError(err instanceof Error ? err.message : "Upload failed.");
			} finally {
				setProgress(null);
			}
		});
	}

	if (!open) {
		return (
			<button
				type="button"
				aria-expanded={false}
				aria-controls={id}
				onClick={() => {
					setFocusPicker(true);
					setOpen(true);
				}}
				className={cn(adminBtnPrimary, "mt-4 w-full")}
			>
				<Plus size={ICON_MD} aria-hidden="true" />
				Add a piece
			</button>
		);
	}

	return (
		<form
			ref={formRef}
			id={id}
			onSubmit={onSubmit}
			className="mt-4 grid gap-(--form-gap) starting:translate-y-2 starting:opacity-0 @lg/add:grid-cols-2 motion-safe:transition-[opacity,translate] motion-safe:duration-(--duration-base) motion-safe:ease-(--ease-out)"
		>
			<fieldset disabled={pending} className="contents">
				<legend className={LEGEND}>Photo</legend>
				<div className="grid gap-3 @lg/add:col-span-2">
					{/* The sr-only input carries focus; the label shows it through has-focus-visible. */}
					<label className={adminFilePicker}>
						<ImagePlus size={ICON_MD} aria-hidden="true" />
						<span>{file ? "Change image" : "Choose image (JPG, PNG, or WebP)"}</span>
						<input
							ref={inputRef}
							name="image"
							type="file"
							accept="image/jpeg,image/png,image/webp"
							onChange={(e) => {
								const chosen = e.currentTarget.files?.[0] ?? null;
								setFile(chosen);
								if (chosen) {
									setMissingPhoto(false);
									titleRef.current?.focus({ preventScroll: true });
								}
							}}
							className="sr-only"
						/>
					</label>
					{file ? <PhotoPreview file={file} disabled={pending} onClear={clearFile} /> : null}
					{missingPhoto ? <AdminNotice variant="error">Choose an image first.</AdminNotice> : null}
					{pending && progress ? <UploadProgress state={progress} /> : null}
				</div>
			</fieldset>

			<p className={cn(adminHelp, "@lg/add:col-span-2")}>Fields marked * are required.</p>

			<fieldset disabled={pending} className="contents">
				<legend className={LEGEND}>Details</legend>
				<div className={adminLabel}>
					<label htmlFor={`${id}-title`}>Title *</label>
					<input
						ref={titleRef}
						id={`${id}-title`}
						name="title"
						placeholder="e.g. Lotus garden"
						autoCorrect="off"
						required
						className={adminField}
					/>
				</div>
				<div className={adminLabel}>
					<label htmlFor={`${id}-category`}>Category *</label>
					<select
						id={`${id}-category`}
						name="style"
						required
						defaultValue={lastCategory}
						aria-describedby={categories.length === 0 ? `${id}-category-help` : undefined}
						className={adminField}
					>
						<option value="" disabled>
							Select a category
						</option>
						{categories.map((category) => (
							<option key={category} value={category}>
								{category}
							</option>
						))}
					</select>
					{categories.length === 0 ? (
						<p id={`${id}-category-help`} className={adminHelp}>
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
						defaultValue={lastUsed?.medium ?? ""}
						placeholder="e.g. Natural pigment on handmade paper"
						autoCorrect="off"
						required
						className={adminField}
					/>
					<datalist id={`${id}-mediums`}>
						{suggestions.mediums.map((medium) => (
							<option key={medium} value={medium} />
						))}
					</datalist>
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
				<div className={cn(adminLabel, "@lg/add:col-span-2")}>
					<label htmlFor={`${id}-description`}>Description (optional)</label>
					<textarea id={`${id}-description`} name="description" rows={3} className={adminField} />
				</div>
			</fieldset>

			<fieldset disabled={pending} className="contents">
				<legend className={LEGEND}>Price</legend>
				<div className={adminLabel}>
					<label htmlFor={`${id}-price`}>Price (optional)</label>
					<input
						id={`${id}-price`}
						name="priceInr"
						type="text"
						inputMode="numeric"
						pattern="[0-9]*"
						value={price}
						onChange={(e) => setPrice(digitsOnly(e.target.value))}
						aria-describedby={`${id}-price-help`}
						className={adminField}
					/>
					<p id={`${id}-price-help`} className={adminHelp}>
						Whole rupees. Leave blank if it is not for sale.
						{priceDigits ? (
							<span className="block">Shows as {formatInr(Number(price))}</span>
						) : null}
					</p>
				</div>
			</fieldset>

			<div className="mt-(--form-group-gap) grid gap-3 @lg/add:col-span-2">
				<button
					type="submit"
					disabled={pending}
					aria-busy={pending || undefined}
					className={cn(adminBtnPrimary, "w-full")}
				>
					{spinning ? (
						<LoaderCircle size={ICON_MD} aria-hidden="true" className="motion-safe:animate-spin" />
					) : null}
					Add piece
				</button>
				{error ? <AdminNotice variant="error">{error}</AdminNotice> : null}
				{added ? <UploadSuccess title={added.title} slug={added.slug} /> : null}
			</div>
		</form>
	);
}
