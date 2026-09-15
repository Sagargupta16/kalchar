"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { LightboxIconButton } from "./viewer-dialog";

interface ArtworkViewerToolbarProps {
	position: number;
	total: number;
	hidden: boolean;
	onPrevious: () => void;
	onNext: () => void;
}

/** One quiet control group; Close is supplied by the dialog so focus stays stable. */
export function ArtworkViewerToolbar({
	position,
	total,
	hidden,
	onPrevious,
	onNext,
}: Readonly<ArtworkViewerToolbarProps>) {
	const buttonClass =
		"border-transparent bg-transparent shadow-none backdrop-blur-none hover:bg-ink/5 disabled:pointer-events-none disabled:opacity-40";

	return (
		<fieldset
			inert={hidden || undefined}
			className={cn(
				"m-0 flex min-w-0 items-center gap-1 border-0 p-0 text-ink transition-ui",
				hidden && "pointer-events-none opacity-0",
			)}
		>
			<legend className="sr-only">Artwork navigation</legend>
			{total > 1 ? (
				<LightboxIconButton
					aria-label="Previous artwork"
					onClick={onPrevious}
					disabled={total === 2 && position === 1}
					className={buttonClass}
				>
					<ChevronLeft size={20} aria-hidden="true" />
				</LightboxIconButton>
			) : null}
			<span
				aria-hidden="true"
				className="shrink-0 whitespace-nowrap px-2 text-sm font-medium tabular-nums"
			>
				{String(position).padStart(2, "0")} / {total}
			</span>
			{total > 1 ? (
				<LightboxIconButton
					aria-label="Next artwork"
					onClick={onNext}
					disabled={total === 2 && position === total}
					className={buttonClass}
				>
					<ChevronRight size={20} aria-hidden="true" />
				</LightboxIconButton>
			) : null}
		</fieldset>
	);
}
