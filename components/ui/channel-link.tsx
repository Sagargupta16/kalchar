import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { cardVariants } from "@/components/ui/card";
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
	if (!href.trim()) return null;
	const external = href.startsWith("http");

	return (
		<a
			href={href}
			target={external ? "_blank" : undefined}
			rel={external ? "noopener noreferrer" : undefined}
			className={cn(
				cardVariants({ padding: "none", interactive: true }),
				"group flex h-full min-w-0 items-center gap-3 p-4",
				highlight && "border-(--section-accent)/40",
				className,
			)}
		>
			<IconCircle className="group-hover:ring-(--section-accent)">{icon}</IconCircle>
			<div className="min-w-0 flex-1">
				<p className="t-eyebrow">{label}</p>
				<p className="mt-1 text-base font-medium leading-snug text-ink [overflow-wrap:anywhere] transition-colors group-hover:text-accent-text">
					{display}
				</p>
				{note ? <p className="mt-1 text-sm text-muted">{note}</p> : null}
			</div>
			<ArrowRight
				size={16}
				aria-hidden="true"
				className="shrink-0 text-muted transition-ui group-hover:translate-x-1 group-hover:text-accent-text"
			/>
		</a>
	);
}
