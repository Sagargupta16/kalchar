import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "accent" | "accent-soft" | "sold" | "overlay" | "success" | "muted";

interface BadgeProps {
	children: ReactNode;
	variant?: BadgeVariant;
	className?: string;
}

const VARIANT_MAP: Record<BadgeVariant, string> = {
	/** Hero chips, category pills. */
	default: "border border-line bg-bg-soft text-ink",
	/** Featured, pinned. Terracotta under /admin because the admin <main> sets no --section-accent. */
	accent: "bg-(--section-accent) text-bg",
	/** Quiet counts. */
	"accent-soft": "bg-(--section-accent)/12 text-(--section-accent)",
	/** ArtworkStatusBadge sold ribbon. */
	sold: "bg-ruby text-bg",
	/** Chips on photos. */
	overlay: "border border-line bg-bg/90 text-ink shadow-e1 backdrop-blur",
	/** DEPRECATED alias of overlay (public-gallery renames its one use); integration deletes. */
	success: "border border-line bg-bg/90 text-ink shadow-e1 backdrop-blur",
	/** Archived, counts. */
	muted: "bg-bg-muted text-muted",
};

export function Badge({ children, variant = "default", className }: Readonly<BadgeProps>) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-micro font-medium uppercase tracking-meta",
				VARIANT_MAP[variant],
				className,
			)}
		>
			{children}
		</span>
	);
}
