import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { IconCircle } from "@/components/ui/icon-circle";
import { cn } from "@/lib/utils";

interface ChannelLinkProps {
	href: string;
	icon: ReactNode;
	label: string;
	display: string;
	note?: string;
	highlight?: boolean;
	className?: string;
}

export function ChannelLink({
	href,
	icon,
	label,
	display,
	note,
	highlight = false,
	className,
}: Readonly<ChannelLinkProps>) {
	const external = href.startsWith("http");

	return (
		<a
			href={href}
			target={external ? "_blank" : undefined}
			rel={external ? "noopener noreferrer" : undefined}
			className={cn(
				"group flex h-full items-start gap-4 rounded-(--radius-md) border bg-bg p-5 transition-all duration-(--duration-base) ease-(--ease-out) hover:-translate-y-0.5 hover:border-(--section-accent) hover:shadow-lg",
				highlight ? "border-(--section-accent)/40" : "border-line",
				className,
			)}
		>
			<IconCircle className="group-hover:ring-(--section-accent)">{icon}</IconCircle>
			<div className="min-w-0 flex-1">
				<p className="t-eyebrow">{label}</p>
				<p className="t-display mt-1 truncate text-base transition-colors duration-(--duration-base) ease-(--ease-out) group-hover:text-(--section-accent) sm:text-lg">
					{display}
				</p>
				{note ? <p className="mt-1 text-xs text-muted">{note}</p> : null}
			</div>
			<ArrowRight
				size={14}
				aria-hidden="true"
				className="mt-1 shrink-0 text-muted transition-all duration-(--duration-base) ease-(--ease-out) group-hover:translate-x-1 group-hover:text-(--section-accent)"
			/>
		</a>
	);
}
