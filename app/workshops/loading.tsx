import { Section } from "@/components/ui/section";
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

/** Skeleton twin of /workshops: wash header, then the numbered ledger rows. */
export default function WorkshopsLoading() {
	return (
		<main>
			<output className="sr-only">Loading workshops</output>
			<Section accent="pichwai" background="wash" padded containerClassName="py-(--space-block)">
				<SkeletonHeader />
				<Skeleton className="mt-5 h-4 w-full max-w-sm" />
				<div className="mt-2 flex flex-wrap gap-x-6">
					<Skeleton className="h-11 w-56 max-w-full" />
					<Skeleton className="h-11 w-40 max-w-full" />
				</div>
			</Section>
			<Section accent="pichwai" padded containerClassName="pt-(--space-block)">
				<ul aria-hidden="true" className="divide-y divide-line border-t border-line">
					{[0, 1, 2, 3, 4].map((i) => (
						<li
							key={i}
							className="grid grid-cols-[2.5rem_1fr] gap-x-3 py-6 md:grid-cols-12 md:items-start md:gap-x-6 md:py-8"
						>
							<Skeleton className="h-7 w-8 md:col-span-1" />
							<div className="min-w-0 md:col-span-7">
								<Skeleton className="h-6 w-2/3" />
								<Skeleton className="mt-2 h-4 w-full" />
							</div>
							<div className="col-start-2 mt-4 flex min-w-0 flex-col gap-3 md:col-span-4 md:col-start-9 md:mt-0 md:items-end">
								<Skeleton className="h-5 w-24" />
								<Skeleton className="h-11 w-full md:w-28" />
							</div>
						</li>
					))}
				</ul>
			</Section>
		</main>
	);
}
