"use client";

import { Check, Star } from "lucide-react";
import { useId, useState } from "react";
import {
	ARTWORK_STATUS_OPTIONS,
	artworkStatusHelp,
	artworkStatusLabel,
	quickStateBlockedReason,
} from "@/lib/artwork-status";
import type { ArtworkStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { adminBtn, adminHelp, adminIconBtn, ICON_MD } from "./controls";
import { Modal, ModalBody, ModalFooter } from "./modal";

/**
 * The status chip: the same tokens as adminBtn but rounded-full (pills rule)
 * and 14px text (interactive text is never the 11px Badge). One fixed width
 * (min-w-32 fits "Not for sale") so every row's star and Delete line up
 * (alignment rule 2). The dot is a secondary cue; the text always names the state.
 */
const CHIP =
	"inline-flex min-h-control min-w-32 items-center justify-center gap-1.5 rounded-full border border-line bg-surface px-3 text-sm font-medium text-ink transition-ui pressable hover:border-accent hover:text-accent-text disabled:pointer-events-none disabled:opacity-50";

const DOT: Record<ArtworkStatus, string> = {
	available: "bg-accent",
	sold: "bg-ruby",
	archive: "bg-muted",
};

interface StatusChipProps {
	title: string;
	status: ArtworkStatus;
	priceInr: number | null | undefined;
	disabled: boolean;
	onChange: (status: ArtworkStatus) => void;
}

/** Row chip that opens the quick-state sheet; choosing an option applies at once (D37). */
export function StatusChip({
	title,
	status,
	priceInr,
	disabled,
	onChange,
}: Readonly<StatusChipProps>) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<button
				type="button"
				disabled={disabled}
				aria-haspopup="dialog"
				aria-expanded={open}
				aria-label={`Status of ${title}: ${artworkStatusLabel(status)}`}
				onClick={() => setOpen(true)}
				className={CHIP}
			>
				<span aria-hidden="true" className={cn("size-1.5 rounded-full", DOT[status])} />
				{artworkStatusLabel(status)}
			</button>
			{open ? (
				<QuickStateSheet
					title={title}
					status={status}
					priceInr={priceInr}
					onChange={onChange}
					onClose={() => setOpen(false)}
				/>
			) : null}
		</>
	);
}

interface QuickStateSheetProps {
	title: string;
	status: ArtworkStatus;
	priceInr: number | null | undefined;
	onChange: (status: ArtworkStatus) => void;
	onClose: () => void;
}

/**
 * Three 56px option buttons with the public effect under each, the current one
 * pressed with a check, and an explicit Close. No confirmation: the undo bar is
 * the safety net (hig, ux-writing, seller-tools: never confirm reversible toggles).
 */
function QuickStateSheet({
	title,
	status,
	priceInr,
	onChange,
	onClose,
}: Readonly<QuickStateSheetProps>) {
	const ids = useId();
	return (
		<Modal title={title} placement="sheet" size="md" onClose={onClose}>
			<ModalBody>
				<p className={adminHelp}>Choose how this piece shows on the site.</p>
				<div role="group" aria-label={`Status of ${title}`} className="mt-4 grid gap-2">
					{ARTWORK_STATUS_OPTIONS.map((option) => {
						const blocked = quickStateBlockedReason(option, priceInr);
						const blocking = option === "archive" && blocked !== null;
						return (
							<button
								key={option}
								type="button"
								aria-pressed={option === status}
								disabled={blocking}
								aria-labelledby={`${ids}-${option}-label`}
								aria-describedby={`${ids}-${option}`}
								onClick={() => {
									onChange(option);
									onClose();
								}}
								className={cn(adminBtn, "min-h-14 w-full justify-start px-4 text-left")}
							>
								<span
									aria-hidden="true"
									className={cn("size-1.5 shrink-0 rounded-full", DOT[option])}
								/>
								<span className="min-w-0 flex-1">
									<span id={`${ids}-${option}-label`} className="block">
										{artworkStatusLabel(option)}
									</span>
									{/* mt-0.5 is the same optical alignment exception AdminNotice uses. */}
									<span
										id={`${ids}-${option}`}
										className={cn(adminHelp, "mt-0.5 block font-normal")}
									>
										{blocked ?? artworkStatusHelp(option)}
									</span>
								</span>
								{option === status ? (
									<Check size={ICON_MD} aria-hidden="true" className="shrink-0 text-accent-text" />
								) : null}
							</button>
						);
					})}
				</div>
			</ModalBody>
			<ModalFooter>
				<button type="button" onClick={onClose} className={cn(adminBtn, "ml-auto")}>
					Close
				</button>
			</ModalFooter>
		</Modal>
	);
}

interface FeaturedToggleProps {
	title: string;
	featured: boolean;
	disabled: boolean;
	onChange: (featured: boolean) => void;
}

/**
 * The star. adminIconBtn already renders aria-pressed:border-accent and
 * aria-pressed:text-accent-text, so the pressed state needs no extra class; the
 * label is the verb phrase in both states (the state is aria-pressed).
 */
export function FeaturedToggle({
	title,
	featured,
	disabled,
	onChange,
}: Readonly<FeaturedToggleProps>) {
	return (
		<button
			type="button"
			disabled={disabled}
			aria-pressed={featured}
			aria-label={`Feature ${title}`}
			title={featured ? "Featured on the home page" : "Feature on the home page"}
			onClick={() => onChange(!featured)}
			className={adminIconBtn}
		>
			<Star size={ICON_MD} aria-hidden="true" className={featured ? "fill-current" : undefined} />
		</button>
	);
}
