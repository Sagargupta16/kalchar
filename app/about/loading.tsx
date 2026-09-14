import { Section } from "@/components/ui/section";
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

/** Skeleton twin of /about: wash header, then the monograph spread
 *  (marginalia / essay / portrait plate) at the 12-column rhythm. */
export default function AboutLoading() {
	return (
		<main>
			<Section accent="marigold" background="wash" rhythm="grand" padded>
				<SkeletonHeader />
				<Skeleton className="mt-6 h-4 w-64" />
			</Section>
			<Section accent="marigold" padded containerClassName="pt-(--space-block)">
				<div className="grid gap-12 md:grid-cols-12 md:gap-14">
					<div className="md:col-span-4 md:col-start-9 md:row-start-1">
						<Skeleton className="aspect-3/4 w-full rounded-(--radius-md)" />
						<Skeleton className="mt-4 h-5 w-2/3" />
						<Skeleton className="mt-2 h-3 w-1/2" />
					</div>
					<div className="flex max-w-(--measure-essay) flex-col gap-4 md:col-span-6 md:col-start-3 md:row-start-1">
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-5/6" />
						<Skeleton className="h-4 w-full" />
						<Skeleton className="h-4 w-2/3" />
					</div>
					<aside className="flex flex-col gap-10 md:col-span-2 md:col-start-1 md:row-start-1">
						<Skeleton className="h-20" />
						<Skeleton className="h-20" />
						<Skeleton className="h-32" />
					</aside>
				</div>
			</Section>
		</main>
	);
}
