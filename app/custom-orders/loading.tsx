import { Section } from "@/components/ui/section";
import { Skeleton, SkeletonHeader } from "@/components/ui/skeleton";

/** Mirrors the page: wash header, then the 4/8 split with the steps
 *  aside and the commission sheet (eyebrow, brief, style plates, chip rows). */
export default function CustomOrdersLoading() {
	return (
		<main>
			<Section accent="vermillion" background="wash" padded containerClassName="py-(--space-block)">
				<SkeletonHeader />
				<Skeleton className="mt-5 h-11 w-56" />
			</Section>
			<Section accent="vermillion" padded containerClassName="pt-(--space-block)">
				<div className="grid gap-12 md:grid-cols-12 md:gap-14">
					{/* How it works: after the form on phones, beside it from md. */}
					<aside className="order-last flex flex-col gap-6 md:order-none md:col-span-4">
						<div>
							<Skeleton className="h-3 w-24" />
							<Skeleton className="mt-2 h-7 w-3/4" />
						</div>
						{[0, 1, 2].map((i) => (
							<div key={i} className="flex gap-4">
								<Skeleton className="h-8 w-10 shrink-0" />
								<div className="flex flex-1 flex-col gap-2">
									<Skeleton className="h-5 w-1/2" />
									<Skeleton className="h-4 w-full" />
								</div>
							</div>
						))}
					</aside>
					{/* Form: same surface and shadow as the real sheet. */}
					<div className="md:col-span-8">
						<div className="flex flex-col gap-(--form-gap) rounded-(--radius-md) border border-line bg-surface p-(--card-pad-lg) shadow-e1-edged">
							<Skeleton className="h-3 w-32" />
							<Skeleton className="h-24 w-full" />
							<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
								{[0, 1, 2].map((i) => (
									<Skeleton key={i} className="aspect-2/1 w-full" />
								))}
							</div>
							{/* Chip rows: size, budget, timeline. */}
							{[0, 1, 2].map((i) => (
								<div key={i} className="flex flex-wrap gap-2">
									<Skeleton className="h-11 w-32 rounded-full" />
									<Skeleton className="h-11 w-40 rounded-full" />
									<Skeleton className="h-11 w-36 rounded-full" />
								</div>
							))}
							<div className="grid gap-(--form-gap) sm:grid-cols-2">
								<Skeleton className="h-12 w-full" />
								<Skeleton className="h-12 w-full" />
							</div>
							<Skeleton className="h-12 w-full sm:w-56" />
						</div>
					</div>
				</div>
			</Section>
		</main>
	);
}
