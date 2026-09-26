import Image from "next/image";
import Link from "next/link";
import { getSite } from "@/lib/data";
import { cn } from "@/lib/utils";

/**
 * The admin brand mark: the round logo plate and the Kalचर wordmark from the
 * public header (same t-headline + devanagari-display recipe, smaller), then a
 * quiet mono "Admin" tag so the tool never reads as the public site.
 */
export function AdminBrand({ className }: Readonly<{ className?: string }>) {
	const { brand } = getSite();
	return (
		<Link
			href="/admin"
			aria-label="Kalchar Admin"
			className={cn(
				"group flex min-h-control min-w-0 items-center gap-2 rounded-(--radius-sm) pr-1 transition-colors",
				className,
			)}
		>
			<Image
				src="/logo.jpg"
				alt=""
				width={32}
				height={32}
				priority
				className="size-8 shrink-0 rounded-full ring-1 ring-line transition-ui group-hover:ring-accent"
			/>
			<span aria-hidden="true" className="t-headline truncate text-xl leading-none text-ink">
				<span>{brand.headline.latinPrefix}</span>
				<span lang="hi" className="devanagari-display text-accent">
					{brand.headline.devanagariCore}
				</span>
			</span>
			<span
				aria-hidden="true"
				className="grid h-5 shrink-0 place-items-center rounded-(--radius-sm) bg-bg-muted px-1.5 font-mono text-micro font-medium uppercase tracking-meta text-muted ring-1 ring-line"
			>
				Admin
			</span>
		</Link>
	);
}
