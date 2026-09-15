"use client";

import { Search, X } from "lucide-react";
import { type RefObject, useId } from "react";

export function GallerySearch({
	query,
	onQuery,
	inputRef,
	resultsId,
}: Readonly<{
	query: string;
	onQuery: (value: string) => void;
	inputRef: RefObject<HTMLInputElement | null>;
	resultsId: string;
}>) {
	const id = useId();
	return (
		<div className="w-full min-w-0 sm:max-w-xl sm:flex-1">
			<label htmlFor={id} className="mb-2 block text-sm font-medium">
				Find a piece you love
			</label>
			<div className="relative">
				<Search
					size={18}
					aria-hidden="true"
					className="absolute top-1/2 left-3 -translate-y-1/2 text-muted"
				/>
				<input
					ref={inputRef}
					id={id}
					type="search"
					aria-describedby={resultsId}
					placeholder="Title, art style or medium"
					autoComplete="off"
					value={query}
					onChange={(event) => onQuery(event.target.value)}
					className="min-h-control w-full rounded-md border border-line-strong bg-canvas py-2 pr-12 pl-10 text-base text-ink transition-ui placeholder:text-muted [&::-webkit-search-cancel-button]:appearance-none"
				/>
				{query ? (
					<button
						type="button"
						aria-label="Clear artwork search"
						onClick={() => {
							onQuery("");
							inputRef.current?.focus();
						}}
						className="absolute top-1/2 right-1 grid size-control -translate-y-1/2 place-items-center rounded-md text-muted transition-colors hover:text-ink"
					>
						<X size={18} aria-hidden="true" />
					</button>
				) : null}
			</div>
		</div>
	);
}
