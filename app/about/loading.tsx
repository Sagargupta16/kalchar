import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";
import { getSite } from "@/lib/data";
import { cn } from "@/lib/utils";

/** Keep the known heading and onward link available while artist details load. */
export default function AboutLoading() {
	const about = getSite().sections.about;

	return (
		<main>
			<p role="status" className="sr-only">
				Loading artist details
			</p>
			<Section accent="marigold" background="wash" padded containerClassName="py-(--space-block)">
				<PageHeader
					eyebrow={about?.eyebrow ?? "About"}
					title={about?.title ?? "On preserving folk traditions through practice"}
				>
					<Skeleton className="mt-6 h-8 w-72 max-w-full" />
					<Link
						href="/work"
						className={cn(buttonVariants({ variant: "secondary" }), "mt-5 w-full sm:w-auto")}
					>
						Explore the artwork
						<ArrowRight size={16} aria-hidden="true" />
					</Link>
				</PageHeader>
			</Section>
			<Section accent="marigold" padded containerClassName="pt-(--space-block)">
				<div className="grid gap-8 md:grid-cols-12 md:gap-10">
					<div className="mx-auto w-full max-w-64 md:col-span-4 md:col-start-9 md:row-span-2 md:row-start-1 md:max-w-none">
						<Skeleton className="aspect-3/4 w-full rounded-(--radius-md)" />
						<Skeleton className="mt-4 h-5 w-2/3" />
						<Skeleton className="mt-2 h-3 w-1/2" />
					</div>
					<div className="flex max-w-(--measure-essay) flex-col gap-4 md:col-span-8 md:col-start-1 md:row-start-1">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-5/6" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-2/3" />
					</div>
					<aside className="grid gap-8 border-t border-line pt-8 sm:grid-cols-2 md:col-span-8 md:col-start-1 md:row-start-2">
						<Skeleton className="h-20" />
						<Skeleton className="h-20" />
						<Skeleton className="h-32" />
					</aside>
				</div>
			</Section>
		</main>
	);
}
