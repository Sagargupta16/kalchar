import { Section } from "@/components/ui/section";
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

/** Skeleton twin of /workshops: wash header, then the numbered ledger rows. */
export default function WorkshopsLoading() {
	return (
		<main>
			<Section accent="pichwai" background="wash" rhythm="grand" padded>
				<SkeletonHeader />
			</Section>
			<Section accent="pichwai" padded containerClassName="pt-(--space-block)">
				<ul className="divide-y divide-line border-t border-line">
					{[0, 1, 2, 3, 4].map((i) => (
						<li
							key={i}
							className="grid grid-cols-[2.5rem_1fr] gap-x-3 py-6 md:grid-cols-12 md:items-center md:gap-x-6 md:py-8"
						>
							<Skeleton className="h-7 w-8 md:col-span-1" />
							<div className="md:col-span-7">
								<Skeleton className="h-6 w-2/3" />
								<Skeleton className="mt-2 h-4 w-full" />
							</div>
							<div className="col-start-2 mt-4 flex flex-col gap-4 md:col-span-4 md:col-start-9 md:mt-0 md:flex-row md:items-center md:justify-end">
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
