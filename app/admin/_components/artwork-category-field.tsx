"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { adminBtn, adminError, adminLabel } from "./controls";

interface ArtworkCategoryFieldProps {
	id: string;
	categories: readonly string[];
	value: string;
	error?: string;
	onChange: (category: string) => void;
	className?: string;
	children?: ReactNode;
}

/** Native grouping keeps the category chips and their validation focus together. */
export function ArtworkCategoryField({
	id,
	categories,
	value,
	error,
	onChange,
	className,
	children,
}: Readonly<ArtworkCategoryFieldProps>) {
	return (
		<div className={cn(adminLabel, className)}>
			<span id={`${id}-category-label`}>Category *</span>
			<fieldset
				aria-describedby={error ? `${id}-category-error` : undefined}
				data-invalid={error ? true : undefined}
				tabIndex={-1}
				className="flex min-w-0 flex-wrap gap-2"
			>
				<legend className="sr-only">Category</legend>
				{categories.map((name) => (
					<button
						key={name}
						type="button"
						aria-pressed={value === name}
						onClick={() => onChange(name)}
						className={cn(adminBtn, "rounded-full")}
					>
						{name}
					</button>
				))}
			</fieldset>
			{error ? (
				<p id={`${id}-category-error`} className={adminError}>
					{error}
				</p>
			) : null}
			{children}
		</div>
	);
}
