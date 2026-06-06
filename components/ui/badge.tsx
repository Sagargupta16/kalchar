import { cn } from "@/lib/utils";

interface BadgeProps {
	children: React.ReactNode;
	variant?: "default" | "accent" | "success" | "muted";
	className?: string;
}

const VARIANT_MAP = {
	default: "bg-bg-soft text-ink border border-line",
	accent: "bg-(--section-accent) text-bg",
	success: "bg-bg/90 text-ink border border-line backdrop-blur",
	muted: "bg-bg-muted text-muted",
};

export function Badge({ children, variant = "default", className }: Readonly<BadgeProps>) {
	return (
		<span
			className={cn(
				"inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-[var(--tracking-meta)]",
				VARIANT_MAP[variant],
				className,
			)}
		>
			{children}
		</span>
	);
}
