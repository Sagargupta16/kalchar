import { MastheadSkeleton } from "@/components/editorial/masthead-skeleton";
import { Section } from "@/components/ui/section";
import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton twin of /about: the marigold masthead with the portrait slot,
 *  then the numbered essay chapters. */
export default function AboutLoading() {
	return (
		<main>
			<output className="sr-only">Loading artist details</output>
			<MastheadSkeleton
				accent="marigold"
				aside={
					<div className="mx-auto w-full max-w-64 sm:max-w-72 lg:max-w-80">
						<Skeleton className="aspect-3/4 w-full rounded-(--radius-md)" />
						<Skeleton className="mt-4 h-6 w-2/3" />
						<Skeleton className="mt-2 h-3 w-1/2" />
					</div>
				}
			>
				<Skeleton className="mt-7 h-12 w-full sm:w-52" />
			</MastheadSkeleton>
			<Section accent="marigold" padded rhythm="grand">
				<div className="grid gap-4 md:grid-cols-12 md:gap-10">
					<Skeleton className="h-10 w-12 md:col-span-3" />
					<div className="space-y-3 md:col-span-9">
						<Skeleton className="h-4 w-full max-w-(--measure-essay)" />
						<Skeleton className="h-4 w-full max-w-(--measure-essay)" />
						<Skeleton className="h-4 w-2/3" />
					</div>
				</div>
			</Section>
		</main>
	);
}
