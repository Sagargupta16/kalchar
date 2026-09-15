import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SectionCtaProps {
	href: string;
	children: ReactNode;
	className?: string;
}

/**
 * The one secondary "See all X" link every home block ends with. Callers own
 * the `mt-(--space-block)` wrapper and the Reveal so a CTA row can hold a
 * second (primary) button beside it (custom orders).
 */
export function SectionCta({ href, children, className }: Readonly<SectionCtaProps>) {
	return (
		<Link href={href} className={cn(buttonVariants({ variant: "secondary" }), "group", className)}>
			{children}
			<ArrowRight
				size={14}
				aria-hidden="true"
				className="transition-transform group-hover:translate-x-1"
			/>
		</Link>
	);
}
